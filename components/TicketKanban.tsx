
import React, { useMemo } from 'react';
import { Ticket, TicketStatus, TicketPriority } from '../types';
import { Clock, CheckCircle, AlertCircle, AlertTriangle, MoreHorizontal, User as UserIcon } from 'lucide-react';

interface TicketKanbanProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  onUpdateStatus: (id: string, status: TicketStatus) => void;
}

const COLUMNS = [
  { id: TicketStatus.OPEN, label: 'Aberto', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: TicketStatus.IN_PROGRESS, label: 'Em Progresso', color: 'bg-sky-100 text-sky-800 border-sky-200' },
  { id: TicketStatus.RESOLVED, label: 'Resolvido', color: 'bg-green-100 text-green-800 border-green-200' }
];

export const TicketKanban: React.FC<TicketKanbanProps> = ({ tickets, onSelectTicket, onUpdateStatus }) => {
  
  const columns = useMemo(() => {
    const cols = {
      [TicketStatus.OPEN]: [] as Ticket[],
      [TicketStatus.IN_PROGRESS]: [] as Ticket[],
      [TicketStatus.RESOLVED]: [] as Ticket[],
    };

    tickets.forEach(ticket => {
      // Safety check: only add if the status exists in our defined columns (handles legacy 'CLOSED' tickets gracefully-ish)
      if (cols[ticket.status as TicketStatus]) {
        cols[ticket.status as TicketStatus].push(ticket);
      }
    });

    return cols;
  }, [tickets]);

  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    e.dataTransfer.setData('ticketId', ticketId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: TicketStatus) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData('ticketId');
    if (ticketId) {
      onUpdateStatus(ticketId, status);
    }
  };

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.CRITICAL: return 'border-l-4 border-l-red-500';
      case TicketPriority.HIGH: return 'border-l-4 border-l-orange-500';
      case TicketPriority.MEDIUM: return 'border-l-4 border-l-blue-500';
      default: return 'border-l-4 border-l-slate-400'; // Low
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-280px)] min-h-[500px]">
      {COLUMNS.map(col => (
        <div 
          key={col.id} 
          className="flex-1 min-w-[280px] bg-slate-50/50 rounded-none border border-slate-200 flex flex-col max-w-xs"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, col.id)}
        >
          {/* Column Header */}
          <div className={`p-3 border-b border-slate-200 flex justify-between items-center rounded-none ${col.id === TicketStatus.OPEN ? 'bg-amber-50/30' : col.id === TicketStatus.IN_PROGRESS ? 'bg-sky-50/30' : col.id === TicketStatus.RESOLVED ? 'bg-green-50/30' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-none text-[10px] font-bold border ${col.color}`}>
                {columns[col.id]?.length || 0}
              </span>
              <span className="font-bold text-slate-700 text-[10px] uppercase tracking-wider">{col.label}</span>
            </div>
          </div>

          {/* Cards Container */}
          <div className="p-2 flex-1 overflow-y-auto space-y-2.5 scrollbar-thin scrollbar-thumb-slate-200">
            {columns[col.id]?.map(ticket => (
              <div
                key={ticket.id}
                draggable
                onDragStart={(e) => handleDragStart(e, ticket.id)}
                onClick={() => onSelectTicket(ticket)}
                className={`bg-white p-3 rounded-none shadow-sm border border-slate-200 cursor-move hover:shadow-md transition-shadow group relative ${getPriorityColor(ticket.priority)}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold text-slate-400 font-mono">#{ticket.ticketNumber}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{ticket.createdAt.toLocaleDateString('pt-BR')}</span>
                </div>
                
                <h4 className="text-sm font-bold text-slate-800 mb-1 leading-snug line-clamp-2 group-hover:text-primary-600 transition-colors uppercase tracking-tight">{ticket.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">{ticket.description}</p>
                
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                    <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-none bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                            {ticket.requester.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[10px] text-slate-500 truncate max-w-[80px] font-medium">{ticket.requester}</span>
                    </div>
                    
                    <div className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded-none text-[10px] text-slate-600 font-bold uppercase tracking-tighter truncate max-w-[80px]">
                        {ticket.category}
                    </div>
                </div>
              </div>
            ))}
            
            {(columns[col.id]?.length || 0) === 0 && (
                <div className="h-24 border-2 border-dashed border-slate-200 rounded-none flex items-center justify-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                    Arraste aqui
                </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
