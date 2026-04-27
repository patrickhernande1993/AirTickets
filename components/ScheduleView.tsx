import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Calendar, Clock, AlertTriangle,
  CheckCircle, Circle, X, CalendarDays, Inbox, Info,
  ArrowRight, User, Tag, Layers
} from 'lucide-react';
import { Ticket, TicketStatus, TicketPriority, User as AppUser } from '../types';
import { supabase } from '../services/supabase';

interface ScheduleViewProps {
  tickets: Ticket[];
  currentUser: AppUser;
  onRefresh: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error') => void;
  onSelectTicket: (ticket: Ticket) => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; dot: string; badge: string }> = {
  [TicketPriority.CRITICAL]: { label: 'Crítico',  dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700 border-red-200' },
  [TicketPriority.HIGH]:     { label: 'Alto',      dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
  [TicketPriority.MEDIUM]:   { label: 'Médio',     dot: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  [TicketPriority.LOW]:      { label: 'Baixo',     dot: 'bg-green-500',  badge: 'bg-green-100 text-green-700 border-green-200' },
};

const STATUS_CONFIG: Record<TicketStatus, { label: string; icon: React.ElementType; color: string }> = {
  [TicketStatus.OPEN]:        { label: 'Aberto',       icon: Circle,        color: 'text-blue-600' },
  [TicketStatus.IN_PROGRESS]: { label: 'Em Andamento', icon: Clock,         color: 'text-amber-600' },
  [TicketStatus.RESOLVED]:    { label: 'Resolvido',    icon: CheckCircle,   color: 'text-green-600' },
};

// ─── Sub-components ─────────────────────────────────────────────────────────

const PriorityDot: React.FC<{ priority: TicketPriority }> = ({ priority }) => (
  <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_CONFIG[priority]?.dot || 'bg-gray-400'}`} />
);

const TicketCard: React.FC<{
  ticket: Ticket;
  isScheduled?: boolean;
  onSchedule?: (ticket: Ticket) => void;
  onUnschedule?: (ticket: Ticket) => void;
  onView: (ticket: Ticket) => void;
  isAdmin: boolean;
  compact?: boolean;
}> = ({ ticket, isScheduled, onSchedule, onUnschedule, onView, isAdmin, compact }) => {
  const p = PRIORITY_CONFIG[ticket.priority];
  const s = STATUS_CONFIG[ticket.status];
  const StatusIcon = s.icon;

  return (
    <div
      className={`group relative bg-white border rounded-xl transition-all duration-200 hover:shadow-md cursor-pointer ${
        isScheduled
          ? 'border-primary-200 bg-primary-50/30'
          : 'border-slate-200 hover:border-slate-300'
      } ${compact ? 'p-2.5' : 'p-3.5'}`}
    >
      <div className="flex items-start gap-2.5">
        <PriorityDot priority={ticket.priority} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-mono text-slate-400">#{ticket.ticketNumber}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${p?.badge}`}>
              {p?.label}
            </span>
          </div>
          <p className={`font-medium text-slate-800 leading-snug truncate ${compact ? 'text-xs' : 'text-sm'}`}>
            {ticket.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <StatusIcon size={10} className={s.color} />
            <span className={`text-slate-500 ${compact ? 'text-[10px]' : 'text-xs'}`}>{s.label}</span>
            <span className="text-slate-300">·</span>
            <User size={10} className="text-slate-400" />
            <span className={`text-slate-500 truncate ${compact ? 'text-[10px]' : 'text-xs'}`}>{ticket.requester}</span>
          </div>
          {ticket.category && !compact && (
            <div className="flex items-center gap-1 mt-1">
              <Tag size={10} className="text-slate-400" />
              <span className="text-[10px] text-slate-400">{ticket.category}</span>
            </div>
          )}
        </div>
        {/* Action Buttons */}
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onView(ticket); }}
            title="Ver chamado"
            className="p-1 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
          >
            <ArrowRight size={14} />
          </button>
          {isAdmin && !isScheduled && onSchedule && (
            <button
              onClick={(e) => { e.stopPropagation(); onSchedule(ticket); }}
              title="Agendar para este dia"
              className="p-1 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
            >
              <CalendarDays size={14} />
            </button>
          )}
          {isAdmin && isScheduled && onUnschedule && (
            <button
              onClick={(e) => { e.stopPropagation(); onUnschedule(ticket); }}
              title="Remover do calendário"
              className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  tickets,
  currentUser,
  onRefresh,
  showToast,
  onSelectTicket,
}) => {
  const isAdmin = currentUser.role === 'ADMIN';
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDateKey(today), [today]);

  const [calendarDate, setCalendarDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDayKey, setSelectedDayKey] = useState<string>(todayKey);
  const [saving, setSaving] = useState<string | null>(null); // ticket id being saved

  // Filter tickets visible to this user
  const visibleTickets = useMemo(() => {
    if (isAdmin) return tickets;
    return tickets.filter(t => t.requesterId === currentUser.id);
  }, [tickets, currentUser, isAdmin]);

  // Scheduled tickets: have a scheduledDate
  const scheduledTickets = useMemo(() =>
    visibleTickets.filter(t => t.scheduledDate),
  [visibleTickets]);

  // Pool: tickets that are open/in-progress and NOT yet scheduled (admin only)
  const poolTickets = useMemo(() => {
    if (!isAdmin) return [];
    return tickets.filter(
      t => t.status !== TicketStatus.RESOLVED && !t.scheduledDate
    );
  }, [tickets, isAdmin]);

  // Map: dateKey → Ticket[]
  const calendarMap = useMemo(() => {
    const map = new Map<string, Ticket[]>();
    scheduledTickets.forEach(t => {
      if (!t.scheduledDate) return;
      const key = toDateKey(t.scheduledDate);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return map;
  }, [scheduledTickets]);

  // Calendar grid days
  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: { key: string; date: Date; isCurrentMonth: boolean }[] = [];

    // Leading days from previous month
    for (let i = firstDow - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      days.push({ key: toDateKey(d), date: d, isCurrentMonth: false });
    }
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({ key: toDateKey(d), date: d, isCurrentMonth: true });
    }
    // Trailing days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ key: toDateKey(d), date: d, isCurrentMonth: false });
    }
    return days;
  }, [calendarDate]);

  // Tickets for the selected day
  const selectedDayTickets = useMemo(() =>
    calendarMap.get(selectedDayKey) || [],
  [calendarMap, selectedDayKey]);

  // Schedule a ticket to the selected day
  const handleSchedule = useCallback(async (ticket: Ticket) => {
    if (!selectedDayKey) return;
    setSaving(ticket.id);
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ scheduled_date: selectedDayKey })
        .eq('id', ticket.id);

      if (error) throw error;

      // Notify the requester
      if (ticket.requesterId !== currentUser.id) {
        const selectedDate = parseKey(selectedDayKey);
        const formattedDate = selectedDate.toLocaleDateString('pt-BR', {
          weekday: 'long', day: '2-digit', month: 'long'
        });
        await supabase.from('notifications').insert({
          user_id: ticket.requesterId,
          title: '📅 Chamado Agendado',
          message: `Seu chamado #${ticket.ticketNumber} "${ticket.title}" foi agendado para atendimento em ${formattedDate}.`,
          ticket_id: ticket.id,
        });
      }

      showToast(`Chamado #${ticket.ticketNumber} agendado com sucesso!`, 'success');
      await onRefresh();
    } catch (err: any) {
      showToast('Erro ao agendar chamado.', 'error');
      console.error(err);
    } finally {
      setSaving(null);
    }
  }, [selectedDayKey, currentUser, showToast, onRefresh]);

  // Remove a ticket from the schedule
  const handleUnschedule = useCallback(async (ticket: Ticket) => {
    setSaving(ticket.id);
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ scheduled_date: null })
        .eq('id', ticket.id);

      if (error) throw error;

      showToast(`Chamado #${ticket.ticketNumber} removido da agenda.`, 'success');
      await onRefresh();
    } catch (err: any) {
      showToast('Erro ao remover agendamento.', 'error');
      console.error(err);
    } finally {
      setSaving(null);
    }
  }, [showToast, onRefresh]);

  const changeMonth = (offset: number) => {
    setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const selectedDayFormatted = useMemo(() => {
    if (!selectedDayKey) return '';
    const d = parseKey(selectedDayKey);
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }, [selectedDayKey]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar size={22} className="text-primary-600" />
            Agenda de Atendimento
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {isAdmin
              ? 'Programe os chamados abertos para os dias de atendimento'
              : 'Veja quando seus chamados serão atendidos'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          <Info size={14} className="text-primary-500 flex-shrink-0" />
          {isAdmin
            ? 'Clique num dia e depois em "+ Agendar" para programar um chamado'
            : 'Os dias marcados indicam quando seu chamado será atendido'}
        </div>
      </div>

      {/* Main layout: Calendar + Side Panel */}
      <div className="flex flex-col xl:flex-row gap-4">

        {/* ── Left Column: Calendar + Selected Day ── */}
        <div className="flex-1 flex flex-col gap-4">
          
          {/* Calendar */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Month navigator */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <button
                onClick={() => changeMonth(-1)}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <h3 className="font-semibold text-slate-800 text-base tracking-tight">
                {MONTH_NAMES[calendarDate.getMonth()]} {calendarDate.getFullYear()}
              </h3>
              <button
                onClick={() => changeMonth(1)}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 px-3 pt-3">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wide pb-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 px-3 pb-4 gap-y-1">
              {calendarDays.map(({ key, date, isCurrentMonth }) => {
                const dayTickets = calendarMap.get(key) || [];
                const isToday = key === todayKey;
                const isSelected = key === selectedDayKey;
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDayKey(key)}
                    className={`relative flex flex-col items-center rounded-xl py-1.5 px-0.5 mx-0.5 transition-all duration-150 min-h-[52px] group
                      ${!isCurrentMonth ? 'opacity-30 pointer-events-none' : ''}
                      ${isSelected
                        ? 'bg-primary-600 shadow-md shadow-primary-200'
                        : isToday
                          ? 'bg-primary-50 border-2 border-primary-300'
                          : isWeekend
                            ? 'hover:bg-slate-50'
                            : 'hover:bg-slate-50'
                      }
                    `}
                  >
                    <span className={`text-sm font-semibold leading-none
                      ${isSelected ? 'text-white' : isToday ? 'text-primary-700' : 'text-slate-700'}
                    `}>
                      {date.getDate()}
                    </span>

                    {/* Ticket badges */}
                    {dayTickets.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-0.5 mt-1.5 px-0.5">
                        {dayTickets.slice(0, 3).map(t => (
                          <span
                            key={t.id}
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                              ${isSelected ? 'bg-white/80' : PRIORITY_CONFIG[t.priority]?.dot || 'bg-slate-400'}
                            `}
                          />
                        ))}
                        {dayTickets.length > 3 && (
                          <span className={`text-[9px] font-bold leading-none ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                            +{dayTickets.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <span className="text-[11px] text-slate-400 font-medium">Prioridade:</span>
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${v.dot}`} />
                  <span className="text-[11px] text-slate-500">{v.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Day Panel */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} className="text-primary-600" />
                <span className="text-sm font-semibold text-slate-800 capitalize">
                  {selectedDayFormatted}
                </span>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                ${selectedDayKey === todayKey
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-slate-100 text-slate-500'}
              `}>
                {selectedDayKey === todayKey ? 'Hoje' : `${selectedDayTickets.length} chamado${selectedDayTickets.length !== 1 ? 's' : ''}`}
              </span>
            </div>

            <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3 min-h-[120px] max-h-[400px] overflow-y-auto">
              {selectedDayTickets.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-8 text-center">
                  <CalendarDays size={32} className="text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400 font-medium">Nenhum chamado agendado</p>
                  {isAdmin && (
                    <p className="text-xs text-slate-400 mt-1">Adicione chamados à direita usando o botão <strong>Agendar</strong></p>
                  )}
                </div>
              ) : (
                selectedDayTickets.map(ticket => (
                  <div key={ticket.id} className={`transition-opacity ${saving === ticket.id ? 'opacity-50' : ''}`}>
                    <TicketCard
                      ticket={ticket}
                      isScheduled
                      onUnschedule={isAdmin ? handleUnschedule : undefined}
                      onView={onSelectTicket}
                      isAdmin={isAdmin}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Side Panel ── */}
        <div className="xl:w-96 flex flex-col gap-3">



          {/* Pool Panel (Admin only: unscheduled open tickets) */}
          {isAdmin && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <Inbox size={15} className="text-amber-500" />
                <span className="text-sm font-semibold text-slate-800">Chamados sem data</span>
                {poolTickets.length > 0 && (
                  <span className="ml-auto text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    {poolTickets.length}
                  </span>
                )}
              </div>

              <div className="p-3 flex flex-col gap-2 max-h-80 overflow-y-auto">
                {poolTickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <CheckCircle size={28} className="text-green-300 mb-2" />
                    <p className="text-sm text-slate-400 font-medium">Todos os chamados estão agendados!</p>
                  </div>
                ) : (
                  poolTickets.map(ticket => (
                    <div key={ticket.id} className={`transition-opacity ${saving === ticket.id ? 'opacity-50 pointer-events-none' : ''}`}>
                      <TicketCard
                        ticket={ticket}
                        onSchedule={handleSchedule}
                        onView={onSelectTicket}
                        isAdmin={isAdmin}
                        compact
                      />
                    </div>
                  ))
                )}
              </div>

              {poolTickets.length > 0 && (
                <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50">
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Layers size={11} />
                    Passe o mouse sobre um chamado e clique em <CalendarDays size={11} className="inline mx-0.5" /> para agendar no dia selecionado
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Info panel for regular users */}
          {!isAdmin && scheduledTickets.length === 0 && (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-5 flex flex-col items-center text-center gap-2">
              <AlertTriangle size={28} className="text-slate-300" />
              <p className="text-sm font-medium text-slate-500">Nenhum chamado agendado</p>
              <p className="text-xs text-slate-400">
                Quando a equipe de TI programar o atendimento de um chamado seu, ele aparecerá aqui e você receberá uma notificação.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
