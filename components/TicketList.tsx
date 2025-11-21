import React from 'react';
import { Ticket, TicketPriority, TicketStatus } from '../types';
import { AlertCircle, CheckCircle, Clock, Search, Plus } from 'lucide-react';

interface TicketListProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  onCreateTicket: () => void;
}

export const TicketList: React.FC<TicketListProps> = ({ tickets, onSelectTicket, onCreateTicket }) => {
  
  const getPriorityColor = (p: TicketPriority) => {
    switch(p) {
      case TicketPriority.CRITICAL: return 'bg-red-100 text-red-800 border-red-200';
      case TicketPriority.HIGH: return 'bg-orange-100 text-orange-800 border-orange-200';
      case TicketPriority.MEDIUM: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case TicketPriority.LOW: return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800';
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
      case TicketStatus.RESOLVED: return <CheckCircle size={16} className="text-green-500" />;
      case TicketStatus.CLOSED: return <CheckCircle size={16} className="text-gray-500" />;
      case TicketStatus.IN_PROGRESS: return <Clock size={16} className="text-blue-500" />;
      default: return <AlertCircle size={16} className="text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Botão de criar chamado (Apenas aqui, não no Dashboard) */}
      <div className="flex justify-end">
          <button 
                onClick={onCreateTicket}
                className="flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all shadow-md hover:shadow-lg text-base font-semibold"
            >
                <Plus size={20} />
                <span>Abrir Novo Chamado</span>
          </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center bg-gray-50 gap-4">
          <h2 className="font-semibold text-gray-800">Lista de Chamados</h2>
          
          <div className="flex w-full sm:w-auto space-x-2">
            <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Buscar chamados..." 
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-6 py-3 font-medium">Detalhes</th>
                <th className="px-6 py-3 font-medium">Categoria</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Prioridade</th>
                <th className="px-6 py-3 font-medium">Solicitante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tickets.map((ticket) => (
                <tr 
                    key={ticket.id} 
                    onClick={() => onSelectTicket(ticket)}
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{ticket.title}</p>
                    <p className="text-sm text-gray-500 truncate max-w-xs">{ticket.description}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {ticket.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                        {getStatusIcon(ticket.status)}
                        <span className="text-sm text-gray-700 capitalize">{translateStatus(ticket.status)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(ticket.priority)}`}>
                      {translatePriority(ticket.priority)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {ticket.requester}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tickets.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">
                  Nenhum chamado encontrado.
              </div>
          )}
        </div>
      </div>
    </div>
  );
};
