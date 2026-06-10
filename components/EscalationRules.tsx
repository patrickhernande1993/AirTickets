import React, { useState, useEffect } from 'react';
import { User, Ticket, TicketPriority, TicketStatus } from '../types';
import { AlertTriangle, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../services/supabase';

export interface EscalationRule {
  id: string;
  name: string;
  triggerPriority: TicketPriority | 'ALL';
  triggerStatus: TicketStatus | 'OPEN_OR_IN_PROGRESS';
  hoursThreshold: number;
  action: 'notify' | 'change_priority';
  notifyEmail?: string;
  active: boolean;
}

const STORAGE_KEY = 'escalation_rules';
const FIRED_KEY = 'escalation_fired'; // { ruleId_ticketId: timestamp }

export const loadEscalationRules = (): EscalationRule[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveRules = (rules: EscalationRule[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
};

const getFired = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

const setFired = (key: string) => {
  const fired = getFired();
  fired[key] = Date.now();
  localStorage.setItem(FIRED_KEY, JSON.stringify(fired));
};

export const checkEscalationRules = async (tickets: Ticket[], currentUserId: string, onAlert?: (msg: string) => void): Promise<void> => {
  const rules = loadEscalationRules().filter(r => r.active);
  if (rules.length === 0) return;

  const fired = getFired();
  const now = Date.now();

  for (const ticket of tickets) {
    if (ticket.status === TicketStatus.RESOLVED) continue;

    const ticketAgeHours = (now - ticket.createdAt.getTime()) / (1000 * 60 * 60);

    for (const rule of rules) {
      const key = `${rule.id}_${ticket.id}`;
      if (fired[key]) continue; // Already fired for this ticket+rule

      // Check priority match
      const priorityMatch = rule.triggerPriority === 'ALL' || ticket.priority === rule.triggerPriority;

      // Check status match
      let statusMatch = false;
      if (rule.triggerStatus === 'OPEN_OR_IN_PROGRESS') {
        statusMatch = ticket.status === TicketStatus.OPEN || ticket.status === TicketStatus.IN_PROGRESS;
      } else {
        statusMatch = ticket.status === rule.triggerStatus;
      }

      if (!priorityMatch || !statusMatch) continue;
      if (ticketAgeHours < rule.hoursThreshold) continue;

      // Fire the rule
      setFired(key);

      try {
        if (rule.action === 'notify') {
          // Create notification in Supabase
          const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'ADMIN');
          if (admins) {
            const notifications = admins.map((a: any) => ({
              user_id: a.id,
              title: `Escalonamento: ${rule.name}`,
              message: `Chamado #${ticket.ticketNumber} "${ticket.title}" está aberto há mais de ${rule.hoursThreshold}h.`,
              ticket_id: ticket.id
            }));
            await supabase.from('notifications').insert(notifications);
          }
          onAlert?.(`Escalonamento disparado: Chamado #${ticket.ticketNumber} — ${rule.name}`);
        } else if (rule.action === 'change_priority') {
          await supabase.from('tickets').update({ priority: TicketPriority.CRITICAL }).eq('id', ticket.id);
          onAlert?.(`Prioridade do chamado #${ticket.ticketNumber} elevada para CRÍTICA`);
        }
      } catch (err) {
        console.error('Escalation rule error:', err);
      }
    }
  }
};

interface Props {
  currentUser: User;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const EscalationRules: React.FC<Props> = ({ currentUser, showToast }) => {
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [fName, setFName] = useState('');
  const [fPriority, setFPriority] = useState<TicketPriority | 'ALL'>('ALL');
  const [fStatus, setFStatus] = useState<TicketStatus | 'OPEN_OR_IN_PROGRESS'>('OPEN_OR_IN_PROGRESS');
  const [fHours, setFHours] = useState(4);
  const [fAction, setFAction] = useState<'notify' | 'change_priority'>('notify');
  const [fEmail, setFEmail] = useState('');

  useEffect(() => {
    setRules(loadEscalationRules());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newRule: EscalationRule = {
      id: `er-${Date.now()}`,
      name: fName,
      triggerPriority: fPriority,
      triggerStatus: fStatus,
      hoursThreshold: fHours,
      action: fAction,
      notifyEmail: fEmail || undefined,
      active: true
    };
    const updated = [...rules, newRule];
    saveRules(updated);
    setRules(updated);
    setShowForm(false);
    setFName(''); setFEmail('');
    showToast('Regra de escalonamento criada!');
  };

  const toggleActive = (id: string) => {
    const updated = rules.map(r => r.id === id ? { ...r, active: !r.active } : r);
    saveRules(updated);
    setRules(updated);
  };

  const deleteRule = (id: string) => {
    const updated = rules.filter(r => r.id !== id);
    saveRules(updated);
    setRules(updated);
    showToast('Regra removida.');
  };

  const priorityLabel = (p: string) => {
    if (p === 'ALL') return 'Qualquer';
    if (p === 'CRITICAL') return 'Crítica';
    if (p === 'HIGH') return 'Alta';
    if (p === 'MEDIUM') return 'Média';
    return 'Baixa';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white border border-slate-200 p-6 rounded-none shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle size={24} className="text-orange-500" />
          <div>
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Regras de Escalonamento</h2>
            <p className="text-xs text-slate-500 font-mono">{rules.length} regras configuradas — verificadas a cada 15 min</p>
          </div>
        </div>
        {currentUser.role === 'ADMIN' && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-xs font-bold uppercase tracking-widest rounded-none hover:bg-orange-700 transition-colors"
          >
            <Plus size={16} />
            Nova Regra
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-none shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 border-b pb-3">Nova Regra de Escalonamento</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Nome da Regra</label>
              <input required value={fName} onChange={e => setFName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-none text-sm focus:ring-1 focus:ring-orange-500 outline-none" placeholder="Ex: Crítico sem resposta" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Prioridade</label>
                <select value={fPriority} onChange={e => setFPriority(e.target.value as any)} className="w-full px-3 py-2 border border-slate-300 rounded-none text-sm outline-none bg-white">
                  <option value="ALL">Qualquer</option>
                  <option value="CRITICAL">Crítica</option>
                  <option value="HIGH">Alta</option>
                  <option value="MEDIUM">Média</option>
                  <option value="LOW">Baixa</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Status</label>
                <select value={fStatus} onChange={e => setFStatus(e.target.value as any)} className="w-full px-3 py-2 border border-slate-300 rounded-none text-sm outline-none bg-white">
                  <option value="OPEN_OR_IN_PROGRESS">Aberto ou Em Prog.</option>
                  <option value="OPEN">Aberto</option>
                  <option value="IN_PROGRESS">Em Progresso</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Após (horas)</label>
                <input type="number" min={1} value={fHours} onChange={e => setFHours(parseInt(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-none text-sm focus:ring-1 focus:ring-orange-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Ação</label>
              <div className="flex gap-3">
                <label className={`flex-1 flex items-center justify-center py-2 border cursor-pointer rounded-none text-xs font-bold uppercase tracking-widest transition-all ${fAction === 'notify' ? 'bg-orange-50 border-orange-400 text-orange-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                  <input type="radio" className="hidden" value="notify" checked={fAction === 'notify'} onChange={() => setFAction('notify')} />
                  Notificar Admin
                </label>
                <label className={`flex-1 flex items-center justify-center py-2 border cursor-pointer rounded-none text-xs font-bold uppercase tracking-widest transition-all ${fAction === 'change_priority' ? 'bg-red-50 border-red-400 text-red-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                  <input type="radio" className="hidden" value="change_priority" checked={fAction === 'change_priority'} onChange={() => setFAction('change_priority')} />
                  Elevar para Crítica
                </label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold uppercase tracking-widest rounded-none hover:bg-slate-50 transition-colors">Cancelar</button>
              <button type="submit" className="px-6 py-2 bg-orange-600 text-white text-xs font-bold uppercase tracking-widest rounded-none hover:bg-orange-700 transition-colors">Salvar Regra</button>
            </div>
          </form>
        </div>
      )}

      {rules.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-none">
          <AlertTriangle size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhuma regra configurada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <div key={rule.id} className={`bg-white border rounded-none shadow-sm p-4 flex items-center justify-between gap-4 ${rule.active ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-sm uppercase tracking-tight">{rule.name}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-1">
                  Se chamado <span className="font-bold text-slate-700">{priorityLabel(rule.triggerPriority)}</span> ficar {rule.triggerStatus === 'OPEN_OR_IN_PROGRESS' ? 'aberto/em prog.' : rule.triggerStatus} por mais de <span className="font-bold text-orange-700">{rule.hoursThreshold}h</span>
                  {' → '}
                  <span className="font-bold text-slate-700">{rule.action === 'notify' ? 'Notificar Admin' : 'Elevar para Crítica'}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggleActive(rule.id)} className="transition-colors p-1" title={rule.active ? 'Desativar' : 'Ativar'}>
                  {rule.active ? <ToggleRight size={22} className="text-green-600" /> : <ToggleLeft size={22} className="text-slate-400" />}
                </button>
                <button onClick={() => deleteRule(rule.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
