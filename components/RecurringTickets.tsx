import React, { useState, useEffect } from 'react';
import { User, TicketPriority, TicketStatus } from '../types';
import { Plus, Repeat, Trash2, ToggleLeft, ToggleRight, Calendar } from 'lucide-react';
import { supabase } from '../services/supabase';

export interface RecurringTemplate {
  id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number; // 0=Sunday
  dayOfMonth?: number; // 1-31
  hour: number; // 0-23
  requesterId: string;
  requesterName: string;
  active: boolean;
  lastRun?: string; // ISO date string (date only: YYYY-MM-DD)
}

const STORAGE_KEY = 'recurring_tickets';

export const loadRecurringTemplates = (): RecurringTemplate[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveTemplates = (templates: RecurringTemplate[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
};

const getNextRunDate = (template: RecurringTemplate): Date => {
  const now = new Date();
  const next = new Date();
  next.setHours(template.hour, 0, 0, 0);

  if (template.frequency === 'daily') {
    if (next <= now) next.setDate(next.getDate() + 1);
  } else if (template.frequency === 'weekly') {
    const dow = template.dayOfWeek ?? 1;
    const diff = (dow - now.getDay() + 7) % 7;
    next.setDate(now.getDate() + (diff === 0 && next <= now ? 7 : diff));
  } else if (template.frequency === 'monthly') {
    const dom = template.dayOfMonth ?? 1;
    next.setDate(dom);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
      next.setDate(dom);
    }
  }
  return next;
};

const shouldRunToday = (template: RecurringTemplate): boolean => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (template.lastRun === todayStr) return false;
  if (!template.active) return false;

  if (template.frequency === 'daily') return true;
  if (template.frequency === 'weekly') return today.getDay() === (template.dayOfWeek ?? 1);
  if (template.frequency === 'monthly') return today.getDate() === (template.dayOfMonth ?? 1);
  return false;
};

export const checkAndRunRecurringTickets = async (currentUserId: string): Promise<void> => {
  const templates = loadRecurringTemplates();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  for (const template of templates) {
    if (!shouldRunToday(template)) continue;
    try {
      await supabase.from('tickets').insert({
        title: template.title,
        description: template.description,
        requester_name: template.requesterName,
        requester_id: template.requesterId,
        priority: template.priority,
        category: template.category,
        status: TicketStatus.OPEN,
        created_at: new Date().toISOString()
      });
      template.lastRun = todayStr;
    } catch (err) {
      console.error('Failed to create recurring ticket:', err);
    }
  }
  saveTemplates(templates);
};

interface Props {
  currentUser: User;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const DAYS_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export const RecurringTickets: React.FC<Props> = ({ currentUser, showToast }) => {
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

  // Form
  const [fTitle, setFTitle] = useState('');
  const [fDescription, setFDescription] = useState('');
  const [fPriority, setFPriority] = useState<TicketPriority>(TicketPriority.MEDIUM);
  const [fCategory, setFCategory] = useState('Outro');
  const [fFrequency, setFFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [fDayOfWeek, setFDayOfWeek] = useState(1);
  const [fDayOfMonth, setFDayOfMonth] = useState(1);
  const [fHour, setFHour] = useState(8);
  const [fRequesterId, setFRequesterId] = useState(currentUser.id);

  useEffect(() => {
    setTemplates(loadRecurringTemplates());
    if (currentUser.role === 'ADMIN') {
      supabase.from('profiles').select('id, name').order('name').then(({ data }) => {
        if (data) setUsers(data);
      });
    }
  }, [currentUser.role, currentUser.id]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const requesterName = users.find(u => u.id === fRequesterId)?.name || currentUser.name;
    const newTemplate: RecurringTemplate = {
      id: `rt-${Date.now()}`,
      title: fTitle,
      description: fDescription,
      priority: fPriority,
      category: fCategory,
      frequency: fFrequency,
      dayOfWeek: fFrequency === 'weekly' ? fDayOfWeek : undefined,
      dayOfMonth: fFrequency === 'monthly' ? fDayOfMonth : undefined,
      hour: fHour,
      requesterId: fRequesterId,
      requesterName,
      active: true
    };
    const updated = [...templates, newTemplate];
    saveTemplates(updated);
    setTemplates(updated);
    setShowForm(false);
    setFTitle(''); setFDescription('');
    showToast('Template criado com sucesso!');
  };

  const toggleActive = (id: string) => {
    const updated = templates.map(t => t.id === id ? { ...t, active: !t.active } : t);
    saveTemplates(updated);
    setTemplates(updated);
  };

  const deleteTemplate = (id: string) => {
    const updated = templates.filter(t => t.id !== id);
    saveTemplates(updated);
    setTemplates(updated);
    showToast('Template removido.');
  };

  const freqLabel = (f: string) => f === 'daily' ? 'Diário' : f === 'weekly' ? 'Semanal' : 'Mensal';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white border border-slate-200 p-6 rounded-none shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Repeat size={24} className="text-primary-600" />
          <div>
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Chamados Recorrentes</h2>
            <p className="text-xs text-slate-500 font-mono">{templates.length} templates configurados</p>
          </div>
        </div>
        {currentUser.role === 'ADMIN' && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-xs font-bold uppercase tracking-widest rounded-none hover:bg-primary-700 transition-colors"
          >
            <Plus size={16} />
            Novo Template
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-none shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 border-b pb-3">Criar Template</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Título</label>
                <input required value={fTitle} onChange={e => setFTitle(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-none text-sm focus:ring-1 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Categoria</label>
                <input required value={fCategory} onChange={e => setFCategory(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-none text-sm focus:ring-1 focus:ring-primary-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Descrição</label>
              <textarea required rows={3} value={fDescription} onChange={e => setFDescription(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-none text-sm focus:ring-1 focus:ring-primary-500 outline-none resize-none" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Prioridade</label>
                <select value={fPriority} onChange={e => setFPriority(e.target.value as TicketPriority)} className="w-full px-3 py-2 border border-slate-300 rounded-none text-sm outline-none bg-white">
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Média</option>
                  <option value="HIGH">Alta</option>
                  <option value="CRITICAL">Crítica</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Frequência</label>
                <select value={fFrequency} onChange={e => setFFrequency(e.target.value as any)} className="w-full px-3 py-2 border border-slate-300 rounded-none text-sm outline-none bg-white">
                  <option value="daily">Diário</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Hora</label>
                <input type="number" min={0} max={23} value={fHour} onChange={e => setFHour(parseInt(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-none text-sm focus:ring-1 focus:ring-primary-500 outline-none" />
              </div>
            </div>
            {fFrequency === 'weekly' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Dia da Semana</label>
                <select value={fDayOfWeek} onChange={e => setFDayOfWeek(parseInt(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-none text-sm outline-none bg-white">
                  {DAYS_PT.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
            )}
            {fFrequency === 'monthly' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Dia do Mês</label>
                <input type="number" min={1} max={28} value={fDayOfMonth} onChange={e => setFDayOfMonth(parseInt(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-none text-sm focus:ring-1 focus:ring-primary-500 outline-none" />
              </div>
            )}
            {users.length > 0 && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Solicitante</label>
                <select value={fRequesterId} onChange={e => setFRequesterId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-none text-sm outline-none bg-white">
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold uppercase tracking-widest rounded-none hover:bg-slate-50 transition-colors">Cancelar</button>
              <button type="submit" className="px-6 py-2 bg-primary-600 text-white text-xs font-bold uppercase tracking-widest rounded-none hover:bg-primary-700 transition-colors">Salvar</button>
            </div>
          </form>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-none">
          <Repeat size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhum template configurado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(t => {
            const nextRun = getNextRunDate(t);
            return (
              <div key={t.id} className={`bg-white border rounded-none shadow-sm p-4 flex items-center justify-between gap-4 ${t.active ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border rounded-none ${t.priority === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200' : t.priority === 'HIGH' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>{t.priority}</span>
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold uppercase tracking-widest rounded-none">{freqLabel(t.frequency)}</span>
                  </div>
                  <p className="font-bold text-slate-900 text-sm uppercase tracking-tight truncate">{t.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-slate-500 font-mono">Por: {t.requesterName}</span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                      <Calendar size={10} />
                      Próxima: {nextRun.toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggleActive(t.id)} className="text-slate-400 hover:text-primary-600 transition-colors p-1" title={t.active ? 'Desativar' : 'Ativar'}>
                    {t.active ? <ToggleRight size={22} className="text-green-600" /> : <ToggleLeft size={22} />}
                  </button>
                  <button onClick={() => deleteTemplate(t.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
