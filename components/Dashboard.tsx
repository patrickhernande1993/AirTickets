
import React, { useEffect, useState, useMemo } from 'react';
import { Ticket, TicketStatus, AuditLog, User } from '../types';
import { supabase } from '../services/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, CheckCircle, Clock, AlertCircle, FileText, User as UserIcon } from 'lucide-react';

interface DashboardProps {
  tickets: Ticket[];
  currentUser: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ tickets, currentUser }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    fetchGlobalLogs();
  }, []);

  const fetchGlobalLogs = async () => {
      // Join with tickets table to get ticket_number
      const { data } = await supabase
        .from('audit_logs')
        .select('*, profiles(name), tickets(ticket_number)')
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
          setLogs(data.map((l: any) => ({
            id: l.id,
            ticketId: l.ticket_id,
            // Use the joined ticket number
            ticketNumber: l.tickets?.ticket_number,
            actorId: l.actor_id,
            actorName: l.profiles?.name || 'Sistema',
            action: l.action,
            details: l.details,
            createdAt: new Date(l.created_at)
          })));
      }
  };

  const stats = useMemo(() => {
    return {
      total: tickets.length,
      open: tickets.filter(t => t.status === TicketStatus.OPEN).length,
      inProgress: tickets.filter(t => t.status === TicketStatus.IN_PROGRESS).length,
      resolved: tickets.filter(t => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED).length,
    };
  }, [tickets]);

  const chartData = useMemo(() => {
      const data: any[] = [];
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      
      // Initialize
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          data.push({
              name: `${months[d.getMonth()]}`,
              Abertos: 0,
              Resolvidos: 0,
              monthIndex: d.getMonth(),
              year: d.getFullYear()
          });
      }

      tickets.forEach(t => {
          const d = t.createdAt;
          const item = data.find(i => i.monthIndex === d.getMonth() && i.year === d.getFullYear());
          if (item) {
              item.Abertos += 1;
              if (t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED) {
                  item.Resolvidos += 1;
              }
          }
      });

      return data;
  }, [tickets]);

  const translateLogAction = (action: string) => {
      switch(action) {
          case 'CREATED': return 'Chamado Criado';
          case 'STATUS_CHANGE': return 'Status Alterado';
          case 'EDITED': return 'Editado';
          default: return action;
      }
  };

  return (
    <div className="space-y-6">
      {/* Greeting Banner */}
      <div className="flex justify-between items-end">
        <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Olá, {currentUser.name.split(' ')[0]}</h1>
            <p className="text-sm text-gray-500 mt-1">Aqui está o resumo da operação hoje.</p>
        </div>
        <div className="text-sm text-gray-400">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* Clean KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-gray-50 rounded-lg text-gray-600">
                    <FileText size={20} />
                </div>
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total de Chamados</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</h3>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-yellow-50 rounded-lg text-yellow-600">
                    <AlertCircle size={20} />
                </div>
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Em Aberto</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.open}</h3>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <Clock size={20} />
                </div>
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Em Andamento</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.inProgress}</h3>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-green-50 rounded-lg text-green-600">
                    <CheckCircle size={20} />
                </div>
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Resolvidos</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.resolved}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-base font-semibold text-gray-900 mb-6">Desempenho Mensal</h3>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#9ca3af', fontSize: 12 }} 
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#9ca3af', fontSize: 12 }} 
                        />
                        <Tooltip 
                            cursor={{ fill: '#f9fafb' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar name="Abertos" dataKey="Abertos" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                        <Bar name="Resolvidos" dataKey="Resolvidos" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Recent Activity Log */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                  <Activity size={20} className="mr-2 text-gray-400" />
                  Atividade Recente
              </h3>
          </div>
          <div className="overflow-y-auto max-h-[320px] pr-2 space-y-4">
             {logs.length === 0 ? (
                 <p className="text-gray-500 text-sm text-center py-4">Nenhuma atividade recente.</p>
             ) : (
                 logs.map(log => (
                     <div key={log.id} className="flex gap-3 pb-3 border-b border-gray-50 last:border-0">
                         <div className="mt-1 text-gray-400">
                             {log.action === 'CREATED' && <CheckCircle size={16} className="text-green-500" />}
                             {log.action === 'STATUS_CHANGE' && <Clock size={16} className="text-blue-500" />}
                             {log.action === 'EDITED' && <FileText size={16} className="text-orange-500" />}
                         </div>
                         <div>
                             <div className="flex items-baseline space-x-2">
                                 <p className="text-sm font-medium text-gray-900">{translateLogAction(log.action)}</p>
                                 {log.ticketNumber && (
                                     <span className="text-xs text-gray-400">#{log.ticketNumber}</span>
                                 )}
                             </div>
                             <p className="text-xs text-gray-500">
                                 {log.details}
                             </p>
                             <p className="text-[10px] text-gray-400 mt-1">
                                 {log.actorName} • {log.createdAt.toLocaleString('pt-BR')}
                             </p>
                         </div>
                     </div>
                 ))
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
