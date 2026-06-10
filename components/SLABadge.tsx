
import React from 'react';
import { Ticket, TicketPriority, TicketStatus } from '../types';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

const SLA_HOURS: Record<TicketPriority, number> = {
  [TicketPriority.CRITICAL]: 2,
  [TicketPriority.HIGH]: 8,
  [TicketPriority.MEDIUM]: 24,
  [TicketPriority.LOW]: 72,
};

interface SLABadgeProps {
  ticket: Ticket;
  compact?: boolean;
}

export const SLABadge: React.FC<SLABadgeProps> = ({ ticket, compact = false }) => {
  const slaHours = SLA_HOURS[ticket.priority];
  const slaMs = slaHours * 60 * 60 * 1000;
  const startTime = ticket.createdAt.getTime();
  const isResolved = ticket.status === TicketStatus.RESOLVED;
  const endTime = isResolved && ticket.resolvedAt ? ticket.resolvedAt.getTime() : Date.now();
  const elapsed = endTime - startTime;
  const remaining = slaMs - elapsed;
  const percentUsed = Math.min((elapsed / slaMs) * 100, 100);
  const percentRemaining = 100 - percentUsed;

  const formatDuration = (ms: number): string => {
    const absMs = Math.abs(ms);
    const hours = Math.floor(absMs / (1000 * 60 * 60));
    const minutes = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  };

  const barColor =
    percentRemaining > 50
      ? 'bg-green-500'
      : percentRemaining > 20
      ? 'bg-amber-400'
      : 'bg-red-500';

  if (isResolved) {
    const onTime = elapsed <= slaMs;
    if (compact) {
      return (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-tighter border ${
            onTime
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          {onTime ? <CheckCircle size={8} className="mr-1" /> : <XCircle size={8} className="mr-1" />}
          {onTime ? 'SLA OK' : 'SLA NOK'}
        </span>
      );
    }
    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-widest ${
          onTime
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-red-50 text-red-700 border-red-200'
        }`}
      >
        {onTime ? <CheckCircle size={14} /> : <XCircle size={14} />}
        {onTime
          ? `Resolvido dentro do prazo (${formatDuration(elapsed)} / ${slaHours}h)`
          : `Resolvido fora do prazo (excedeu ${formatDuration(-remaining)})`}
      </div>
    );
  }

  const overdue = remaining < 0;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-tighter border ${
          overdue
            ? 'bg-red-50 text-red-700 border-red-200'
            : percentRemaining <= 20
            ? 'bg-red-50 text-red-700 border-red-200'
            : percentRemaining <= 50
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-green-50 text-green-700 border-green-200'
        }`}
      >
        <Clock size={8} className="mr-1" />
        {overdue ? `Vencido ${formatDuration(remaining)}` : formatDuration(remaining)}
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          SLA ({slaHours}h)
        </span>
        <span
          className={
            overdue
              ? 'text-red-600'
              : percentRemaining <= 20
              ? 'text-red-600'
              : percentRemaining <= 50
              ? 'text-amber-600'
              : 'text-green-600'
          }
        >
          {overdue
            ? `Vencido há ${formatDuration(remaining)}`
            : `${formatDuration(remaining)} restantes`}
        </span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
        <div
          className={`h-full transition-all duration-300 ${barColor}`}
          style={{ width: `${percentUsed}%` }}
        />
      </div>
    </div>
  );
};
