import React, { useMemo } from 'react';
import { Ticket, TicketPriority, TicketStatus } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertCircle, CheckCircle, Clock, Search } from 'lucide-react';

interface TicketListProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export const TicketList: React.FC<TicketListProps> = ({ tickets, onSelectTicket }) => {
  
  const stats = useMemo(() => {
    const priorityCounts = [
      { name: 'Low', value: tickets.filter(t => t.priority === TicketPriority.LOW).length },
      { name: 'Medium', value: tickets.filter(t => t.priority === TicketPriority.MEDIUM).length },
      { name: 'High', value: tickets.filter(t => t.priority === TicketPriority.HIGH).length },
      { name: 'Critical', value: tickets.filter(t => t.priority === TicketPriority.CRITICAL).length },
    ].filter(x => x.value > 0);

    return { priorityCounts };
  }, [tickets]);

  const getPriorityColor = (p: TicketPriority) => {
    switch(p) {
      case TicketPriority.CRITICAL: return 'bg-red-100 text-red-800 border-red-200';
      case TicketPriority.HIGH: return 'bg-orange-100 text-orange-800 border-orange-200';
      case TicketPriority.MEDIUM: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case TicketPriority.LOW: return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800';
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
           <h3 className="text-gray-500 text-sm font-medium">Total Tickets</h3>
           <p className="text-3xl font-bold text-gray-900 mt-2">{tickets.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
           <h3 className="text-gray-500 text-sm font-medium">Pending Critical</h3>
           <p className="text-3xl font-bold text-red-600 mt-2">
             {tickets.filter(t => t.priority === TicketPriority.CRITICAL && t.status !== TicketStatus.CLOSED).length}
           </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
            <h3 className="text-gray-500 text-sm font-medium mb-2">Priority Distribution</h3>
            <div className="flex-1 min-h-[100px]">
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                    data={stats.priorityCounts}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={40}
                    paddingAngle={5}
                    dataKey="value"
                    >
                    {stats.priorityCounts.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    </Pie>
                    <Tooltip />
                </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="font-semibold text-gray-800">Recent Tickets</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input 
                type="text" 
                placeholder="Search tickets..." 
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-6 py-3 font-medium">Details</th>
                <th className="px-6 py-3 font-medium">Category</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Priority</th>
                <th className="px-6 py-3 font-medium">Requester</th>
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
                        <span className="text-sm text-gray-700 capitalize">{ticket.status.replace('_', ' ').toLowerCase()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {ticket.requester}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};