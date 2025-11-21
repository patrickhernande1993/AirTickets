
import React from 'react';
import { Ticket, TicketPriority, TicketStatus } from '../types';
import { AlertCircle, CheckCircle, Clock, Search, Plus, Calendar, Hash } from 'lucide-react';

interface TicketListProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  onCreateTicket: () => void;
}

export const TicketList: React.FC<TicketListProps> = ({ tickets, onSelectTicket, onCreateTicket }) => {
  
  const getPriorityColor = (p: TicketPriority) => {
    switch(p) {
      case TicketPriority.CRITICAL: return 'bg-red-50 text-red-700 border-red-100 ring-1 ring-red-600/20';
      case TicketPriority.HIGH: return 'bg-orange-50 text-orange-700 border-orange-100 ring-1 ring-orange-600/20';
      case TicketPriority.MEDIUM: return 'bg-yellow-50 text-yellow-700 border-yellow-100 ring-1 ring-yellow-600/20';
      case TicketPriority.LOW: return 'bg-green-50 text-green-700 border-green-100 ring-1 ring-green-600/20';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  const translatePriority = (p: TicketPriority) => {
    switch(p) {
        case TicketPriority.LOW: return 'Baixa';
        case TicketPriority.MEDIUM: return 'Média';
        case TicketPriority.HIGH: return 'Alta';
        case TicketPriority.CRITICAL: return 'Crítica';
        default: return p;
    }
  };

  const translateStatus = (s: TicketStatus) => {
      switch(s) {
          case TicketStatus.OPEN: return 'Aberto';
          case TicketStatus.IN_PROGRESS: return 'Em Progresso';
          case TicketStatus.RESOLVED: return 'Resolvido';
          case TicketStatus.CLOSED: return 'Fechado';
          default: return s;
      }
  };

  const getStatusIcon = (s: TicketStatus) => {
    switch(s) {
      case TicketStatus.RESOLVED: return <CheckCircle size={14} className="text-green-500" />;
      case TicketStatus.CLOSED: return <CheckCircle size={14} className="text-gray-400" />;
      case TicketStatus.IN_PROGRESS: return <Clock size={14} className="text-blue-500" />;
      default: return <AlertCircle size={14} className="text-yellow-500" />;
    }
  };

  const formatDate = (date?: Date) => {
      if (!date) return '-';
      return date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
      });
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar por ID, assunto ou categoria..." 
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm"
                />
          </div>
          <button 
                onClick={onCreateTicket}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all shadow-sm hover:shadow text-sm font-medium"
            >
                <Plus size={18} />
                <span>Novo Chamado</span>
          </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">ID</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assunto</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoria</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Prioridade</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Data Abertura</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Data Resolução</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Última At.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.map((ticket) => (
                <tr 
                    key={ticket.id} 
                    onClick={() => onSelectTicket(ticket)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors group"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-gray-500 font-mono text-xs">
                        <Hash size={12} className="mr-1" />
                        {ticket.id.slice(0, 8)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                        <span className="font-medium text-gray-900 text-sm group-hover:text-primary-600 transition-colors">{ticket.title}</span>
                        <div className="flex items-center mt-1 space-x-2">
                             {getStatusIcon(ticket.status)}
                             <span className="text-xs text-gray-500 capitalize">{translateStatus(ticket.status)}</span>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                        {ticket.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                      {translatePriority(ticket.priority)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(ticket.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(ticket.resolvedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(ticket.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tickets.length === 0 && (
              <div className="p-12 text-center">
                  <div className="bg-gray-50 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-3">
                      <Search size={20} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">Nenhum chamado encontrado.</p>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};
