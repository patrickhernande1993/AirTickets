
import React, { useEffect, useState } from 'react';
import { PlusCircle, RefreshCw, Edit3, MessageCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';

interface TimelineEntry {
  id: string;
  action: string;
  actorName: string;
  details?: string;
  createdAt: Date;
}

interface TicketTimelineProps {
  ticketId: string;
  ticketNumber: number;
}

const getActionConfig = (action: string): { icon: React.ReactNode; label: string; color: string; dot: string } => {
  switch (action) {
    case 'CREATED':
      return {
        icon: <PlusCircle size={16} />,
        label: 'Chamado Criado',
        color: 'text-green-600',
        dot: 'bg-green-500 border-green-200',
      };
    case 'STATUS_CHANGE':
      return {
        icon: <RefreshCw size={16} />,
        label: 'Status Alterado',
        color: 'text-blue-600',
        dot: 'bg-blue-500 border-blue-200',
      };
    case 'EDITED':
      return {
        icon: <Edit3 size={16} />,
        label: 'Chamado Editado',
        color: 'text-orange-600',
        dot: 'bg-orange-500 border-orange-200',
      };
    case 'COMMENT':
      return {
        icon: <MessageCircle size={16} />,
        label: 'Comentário',
        color: 'text-purple-600',
        dot: 'bg-purple-500 border-purple-200',
      };
    default:
      return {
        icon: <CheckCircle size={16} />,
        label: action,
        color: 'text-slate-600',
        dot: 'bg-slate-400 border-slate-200',
      };
  }
};

export const TicketTimeline: React.FC<TicketTimelineProps> = ({ ticketId }) => {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*, profiles:actor_id(name)')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true });

        if (!error && data) {
          setEntries(
            data.map((l: any) => ({
              id: l.id,
              action: l.action,
              actorName: l.profiles?.name || 'Sistema',
              details: l.details,
              createdAt: new Date(l.created_at),
            }))
          );
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, [ticketId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-400">
        <Loader2 size={20} className="animate-spin mr-2" />
        <span className="text-[10px] font-bold uppercase tracking-widest">Carregando histórico...</span>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-400">
        <CheckCircle size={32} className="mb-2 opacity-20" />
        <p className="text-[10px] font-bold uppercase tracking-widest">Nenhum histórico disponível</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {entries.map((entry, index) => {
        const config = getActionConfig(entry.action);
        const isLast = index === entries.length - 1;
        return (
          <div key={entry.id} className="relative flex gap-4 pb-6">
            {/* Vertical line */}
            {!isLast && (
              <div className="absolute left-[15px] top-8 bottom-0 w-[2px] bg-slate-100" />
            )}

            {/* Icon */}
            <div
              className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-none border-2 bg-white flex items-center justify-center ${config.color} ${config.dot.replace('bg-', 'border-')}`}
            >
              <div className={config.color}>{config.icon}</div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-tight">{config.label}</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${config.color}`}>
                  {entry.actorName}
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-400">
                {entry.createdAt.toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              {entry.details && (
                <p className="mt-1.5 text-[10px] font-medium text-slate-600 bg-slate-50 border border-slate-100 px-2 py-1 inline-block">
                  {entry.details}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
