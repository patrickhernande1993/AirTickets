
import React from 'react';
import { Ticket, TicketPriority, TicketStatus } from '../types';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

const SLA_HOURS: Record<TicketPriority, number> = {
  [TicketPriority.CRITICAL]: 2,
  [TicketPriority.HIGH]: 8,
  [TicketPriority.MEDIUM]: 24,
  [TicketPriority.LOW]: 72,
};

const WORK_START = { h: 8, m: 0 };   // 08:00
const WORK_END   = { h: 17, m: 45 }; // 17:45
const WORK_DAY_MINUTES = (WORK_END.h * 60 + WORK_END.m) - (WORK_START.h * 60 + WORK_START.m); // 585 min

function isWorkday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5; // seg–sex
}

function minutesInWorkday(date: Date): number {
  if (!isWorkday(date)) return 0;
  const startMin = WORK_START.h * 60 + WORK_START.m;
  const endMin   = WORK_END.h   * 60 + WORK_END.m;
  const nowMin   = date.getHours() * 60 + date.getMinutes();
  if (nowMin <= startMin) return 0;
  if (nowMin >= endMin)   return WORK_DAY_MINUTES;
  return nowMin - startMin;
}

// Returns elapsed business minutes between two dates
function businessMinutesBetween(start: Date, end: Date): number {
  if (end <= start) return 0;

  let total = 0;
  const cursor = new Date(start);

  // If start is before work hours, jump to start of day
  const startMin = WORK_START.h * 60 + WORK_START.m;
  const endMin   = WORK_END.h   * 60 + WORK_END.m;

  while (cursor < end) {
    if (!isWorkday(cursor)) {
      // Skip to next Monday 08:00
      cursor.setDate(cursor.getDate() + (cursor.getDay() === 0 ? 1 : 8 - cursor.getDay()));
      cursor.setHours(WORK_START.h, WORK_START.m, 0, 0);
      continue;
    }

    const curMin = cursor.getHours() * 60 + cursor.getMinutes();

    if (curMin < startMin) {
      cursor.setHours(WORK_START.h, WORK_START.m, 0, 0);
      continue;
    }

    if (curMin >= endMin) {
      // Move to next workday start
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(WORK_START.h, WORK_START.m, 0, 0);
      continue;
    }

    // How many minutes remain today (work hours)?
    const endOfDay = new Date(cursor);
    endOfDay.setHours(WORK_END.h, WORK_END.m, 0, 0);

    const segmentEnd = end < endOfDay ? end : endOfDay;
    const segmentMin = (segmentEnd.getTime() - cursor.getTime()) / 60000;
    total += segmentMin;

    cursor.setTime(endOfDay.getTime());
  }

  return total;
}

interface SLABadgeProps {
  ticket: Ticket;
  compact?: boolean;
}

export const SLABadge: React.FC<SLABadgeProps> = ({ ticket, compact = false }) => {
  const slaHours = SLA_HOURS[ticket.priority];
  const slaMinutes = slaHours * 60;

  const startTime = ticket.createdAt;
  const isResolved = ticket.status === TicketStatus.RESOLVED;
  const endTime = isResolved && ticket.resolvedAt ? ticket.resolvedAt : new Date();

  const elapsedMin = businessMinutesBetween(startTime, endTime);
  const remainingMin = slaMinutes - elapsedMin;
  const percentUsed = Math.min((elapsedMin / slaMinutes) * 100, 100);
  const percentRemaining = 100 - percentUsed;

  const formatDuration = (minutes: number): string => {
    const abs = Math.abs(Math.round(minutes));
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    if (h > 0) return `${h}h ${m}min`;
    return `${m}min`;
  };

  const barColor =
    percentRemaining > 50
      ? 'bg-green-500'
      : percentRemaining > 20
      ? 'bg-amber-400'
      : 'bg-red-500';

  if (isResolved) {
    const onTime = elapsedMin <= slaMinutes;
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
          ? `Resolvido dentro do prazo (${formatDuration(elapsedMin)} úteis / ${slaHours}h)`
          : `Resolvido fora do prazo (excedeu ${formatDuration(-remainingMin)} úteis)`}
      </div>
    );
  }

  const overdue = remainingMin < 0;

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
        {overdue ? `Vencido ${formatDuration(remainingMin)}` : formatDuration(remainingMin)}
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          SLA ({slaHours}h úteis)
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
            ? `Vencido há ${formatDuration(remainingMin)}`
            : `${formatDuration(remainingMin)} restantes`}
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
