
import React, { useEffect, useState, useMemo } from 'react';
import { Ticket, TicketStatus, AuditLog, User } from '../types';
import { supabase } from '../services/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, CheckCircle, Clock, AlertCircle, FileText } from 'lucide-react';

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
      const { data } = await supabase
        .from('audit_logs')
        .select('*, profiles(name), tickets(ticket_number)')
        .order('created_at', { ascending: false })
        .limit(8);

      if (data) {
          setLogs(data.map((l: any) => ({
            id: l.id,
            ticketId: l.ticket_id,
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
          case 'CREATED': return 'Criado';
          case 'STATUS_CHANGE': return 'Status';
          case 'EDITED': return 'Editado';
          default: return action;
      }
  };

  return (
    <div className="space-y-8">
      {/* Minimalist Greeting */}
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

        {/* Activity Log */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-semibold text-gray-900">Atividade Recente</h3>
                <Activity size={16} className="text-gray-400" />
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-5 max-h-[300px]">
                {logs.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-10">Nenhuma atividade recente.</p>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} className="flex items-start gap-3 group">
                            <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${
                                log.action === 'CREATED' ? 'bg-green-500' :
                                log.action === 'STATUS_CHANGE' ? 'bg-blue-500' :
                                'bg-orange-500'
                            }`} />
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-0.5">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        Chamado #{log.ticketNumber || log.ticketId.slice(0,4)}
                                    </p>
                                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                                        {log.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mb-1">
                                    <span className="capitalize text-gray-700 font-medium">{translateLogAction(log.action)}</span> por {log.actorName?.split(' ')[0] || 'Sistema'}
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
