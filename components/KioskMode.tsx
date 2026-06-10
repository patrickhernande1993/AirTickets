import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { TicketPriority, TicketStatus } from '../types';
import { X, CheckCircle } from 'lucide-react';

const INACTIVITY_TIMEOUT = 30000; // 30 seconds
const SUPPORT_PHONE = '(11) 99999-9999';

type KioskScreen = 'HOME' | 'OPEN_TICKET' | 'CHECK_STATUS' | 'KNOWLEDGE' | 'SUPPORT';

interface KioskModeProps {
  onExit: () => void;
}

export const KioskMode: React.FC<KioskModeProps> = ({ onExit }) => {
  const [screen, setScreen] = useState<KioskScreen>('HOME');
  const [inactivityTimer, setInactivityTimer] = useState(INACTIVITY_TIMEOUT / 1000);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>(TicketPriority.MEDIUM);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Status check
  const [statusTicketNum, setStatusTicketNum] = useState('');
  const [statusResult, setStatusResult] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const resetToHome = useCallback(() => {
    setScreen('HOME');
    setName(''); setEmail(''); setDescription(''); setPriority(TicketPriority.MEDIUM);
    setSuccess(false); setStatusTicketNum(''); setStatusResult(null);
    setInactivityTimer(INACTIVITY_TIMEOUT / 1000);
  }, []);

  const resetInactivity = useCallback(() => {
    setInactivityTimer(INACTIVITY_TIMEOUT / 1000);
  }, []);

  useEffect(() => {
    if (screen === 'HOME') {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }

    // Start inactivity countdown
    setInactivityTimer(INACTIVITY_TIMEOUT / 1000);
    countdownRef.current = setInterval(() => {
      setInactivityTimer(prev => {
        if (prev <= 1) {
          resetToHome();
          return INACTIVITY_TIMEOUT / 1000;
        }
        return prev - 1;
      });
    }, 1000);

    const events = ['mousemove', 'keydown', 'click', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetInactivity));

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      events.forEach(e => window.removeEventListener(e, resetInactivity));
    };
  }, [screen, resetToHome, resetInactivity]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await supabase.from('tickets').insert({
        title: `[QUIOSQUE] ${description.substring(0, 60)}`,
        description,
        requester_name: name,
        requester_id: '00000000-0000-0000-0000-000000000000',
        priority,
        category: 'Outro',
        status: TicketStatus.OPEN,
        created_at: new Date().toISOString()
      });
      setSuccess(true);
      setTimeout(() => resetToHome(), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusLoading(true);
    try {
      const { data } = await supabase
        .from('tickets')
        .select('ticket_number, title, status, priority, created_at')
        .eq('ticket_number', parseInt(statusTicketNum))
        .maybeSingle();
      setStatusResult(data);
    } catch { setStatusResult(null); }
    setStatusLoading(false);
  };

  const translateStatus = (s: string) => {
    switch (s) {
      case 'OPEN': return 'Aberto';
      case 'IN_PROGRESS': return 'Em Progresso';
      case 'RESOLVED': return 'Resolvido';
      default: return s;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)' }}
    >
      {/* Exit button */}
      <button
        onClick={onExit}
        className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition-colors p-2"
        title="Sair do Modo Quiosque"
      >
        <X size={20} />
      </button>

      {screen !== 'HOME' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/40 text-xs font-mono">
          Voltando em {inactivityTimer}s
        </div>
      )}

      {screen === 'HOME' && (
        <div className="flex flex-col items-center gap-8 w-full max-w-2xl px-6">
          <div className="text-center mb-4">
            <h1 className="text-5xl font-black text-white tracking-tight uppercase">AirService</h1>
            <p className="text-blue-300 text-lg mt-2 font-light tracking-widest uppercase">Sistema de Chamados</p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            <button
              onClick={() => setScreen('OPEN_TICKET')}
              className="bg-green-600 hover:bg-green-500 text-white font-bold rounded-none p-8 flex flex-col items-center gap-3 transition-all active:scale-95 border-2 border-green-500"
            >
              <span className="text-4xl">🆕</span>
              <span className="text-lg uppercase tracking-widest">Abrir Chamado</span>
            </button>
            <button
              onClick={() => setScreen('CHECK_STATUS')}
              className="bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-none p-8 flex flex-col items-center gap-3 transition-all active:scale-95 border-2 border-blue-500"
            >
              <span className="text-4xl">🔍</span>
              <span className="text-lg uppercase tracking-widest">Verificar Status</span>
            </button>
            <button
              onClick={() => setScreen('KNOWLEDGE')}
              className="bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-none p-8 flex flex-col items-center gap-3 transition-all active:scale-95 border-2 border-purple-500"
            >
              <span className="text-4xl">📋</span>
              <span className="text-lg uppercase tracking-widest">Base de Conhecimento</span>
            </button>
            <button
              onClick={() => setScreen('SUPPORT')}
              className="bg-red-700 hover:bg-red-600 text-white font-bold rounded-none p-8 flex flex-col items-center gap-3 transition-all active:scale-95 border-2 border-red-500"
            >
              <span className="text-4xl">📞</span>
              <span className="text-lg uppercase tracking-widest">Suporte Urgente</span>
            </button>
          </div>
        </div>
      )}

      {screen === 'OPEN_TICKET' && (
        <div className="w-full max-w-lg bg-white/10 backdrop-blur-sm border border-white/20 rounded-none p-8">
          <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-6 text-center">Abrir Chamado</h2>
          {success ? (
            <div className="text-center py-8">
              <CheckCircle size={64} className="text-green-400 mx-auto mb-4" />
              <p className="text-white text-xl font-bold uppercase tracking-widest">Chamado criado com sucesso!</p>
              <p className="text-white/60 mt-2 text-sm">Voltando à tela inicial...</p>
            </div>
          ) : (
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">Nome</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-none focus:outline-none focus:border-white/60 text-sm" placeholder="Seu nome completo" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">E-mail</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-none focus:outline-none focus:border-white/60 text-sm" placeholder="seu@email.com" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">Descrição do Problema</label>
                <textarea required rows={4} value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-none focus:outline-none focus:border-white/60 text-sm resize-none" placeholder="Descreva o que está acontecendo..." />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-2">Prioridade</label>
                <div className="grid grid-cols-2 gap-2">
                  {([TicketPriority.LOW, TicketPriority.MEDIUM, TicketPriority.HIGH, TicketPriority.CRITICAL] as TicketPriority[]).map(p => (
                    <button key={p} type="button" onClick={() => setPriority(p)}
                      className={`py-2 text-xs font-bold uppercase tracking-widest rounded-none border transition-all ${priority === p ? 'bg-white text-slate-900 border-white' : 'bg-transparent text-white/60 border-white/30 hover:border-white/60'}`}
                    >
                      {p === 'LOW' ? 'Baixa' : p === 'MEDIUM' ? 'Média' : p === 'HIGH' ? 'Alta' : 'Crítica'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetToHome} className="flex-1 py-3 border border-white/30 text-white/70 text-sm font-bold uppercase tracking-widest rounded-none hover:bg-white/10 transition-colors">Cancelar</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white text-sm font-bold uppercase tracking-widest rounded-none transition-colors disabled:opacity-50">{isSaving ? 'Enviando...' : 'Enviar'}</button>
              </div>
            </form>
          )}
        </div>
      )}

      {screen === 'CHECK_STATUS' && (
        <div className="w-full max-w-lg bg-white/10 backdrop-blur-sm border border-white/20 rounded-none p-8">
          <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-6 text-center">Verificar Status</h2>
          <form onSubmit={handleCheckStatus} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">Número do Chamado</label>
              <input required value={statusTicketNum} onChange={e => setStatusTicketNum(e.target.value)} type="number" className="w-full px-4 py-3 bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-none focus:outline-none focus:border-white/60 text-lg font-mono text-center" placeholder="Ex: 42" />
            </div>
            <button type="submit" disabled={statusLoading} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold uppercase tracking-widest rounded-none transition-colors disabled:opacity-50">{statusLoading ? 'Buscando...' : 'Consultar'}</button>
          </form>
          {statusResult && (
            <div className="mt-6 bg-white/10 border border-white/20 rounded-none p-4 space-y-2">
              <p className="text-white font-bold uppercase tracking-tight">#{statusResult.ticket_number} — {statusResult.title}</p>
              <p className="text-white/80 text-sm">Status: <span className="font-bold text-yellow-300">{translateStatus(statusResult.status)}</span></p>
              <p className="text-white/60 text-xs font-mono">Aberto em: {new Date(statusResult.created_at).toLocaleDateString('pt-BR')}</p>
            </div>
          )}
          {statusResult === null && statusTicketNum && !statusLoading && (
            <p className="mt-4 text-center text-red-300 text-sm font-mono">Chamado não encontrado.</p>
          )}
          <button onClick={resetToHome} className="mt-4 w-full py-2 border border-white/20 text-white/50 text-xs font-bold uppercase tracking-widest rounded-none hover:bg-white/10 transition-colors">Voltar</button>
        </div>
      )}

      {screen === 'KNOWLEDGE' && (
        <div className="w-full max-w-lg bg-white/10 backdrop-blur-sm border border-white/20 rounded-none p-8 text-center">
          <span className="text-6xl mb-4 block">📋</span>
          <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-4">Base de Conhecimento</h2>
          <p className="text-white/60 mb-6">Acesse o sistema completo para consultar artigos e soluções.</p>
          <button onClick={resetToHome} className="py-3 px-8 border border-white/30 text-white text-sm font-bold uppercase tracking-widest rounded-none hover:bg-white/10 transition-colors">Voltar</button>
        </div>
      )}

      {screen === 'SUPPORT' && (
        <div className="w-full max-w-lg bg-white/10 backdrop-blur-sm border border-white/20 rounded-none p-8 text-center">
          <span className="text-6xl mb-4 block">📞</span>
          <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-4">Suporte Urgente</h2>
          <p className="text-white/60 mb-4 text-sm uppercase tracking-widest">Entre em contato diretamente:</p>
          <p className="text-4xl font-black text-yellow-300 tracking-widest mb-8">{SUPPORT_PHONE}</p>
          <button onClick={resetToHome} className="py-3 px-8 border border-white/30 text-white text-sm font-bold uppercase tracking-widest rounded-none hover:bg-white/10 transition-colors">Voltar</button>
        </div>
      )}
    </div>
  );
};
