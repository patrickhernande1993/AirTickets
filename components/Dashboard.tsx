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
      const { data } = await supabase
        .from('audit_logs')
        .select('*, profiles(name)')
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
          setLogs(data.map((l: any) => ({
            id: l.id,
            ticketId: l.ticket_id,
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
      <div className="bg-gradient-to-r from-primary-600 to-purple-600 rounded-xl p-8 text-white shadow-lg">
        <div className="flex items-center space-x-4">
            <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                <UserIcon size={32} className="text-white" />
            </div>
            <div>
                <h1 className="text-3xl font-bold">Olá, {currentUser.name}!</h1>
                <p className="text-primary-100 mt-1 text-lg">
                    Bem-vindo ao seu painel de controle. Aqui está o resumo das atividades recentes.
                </p>
            </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Total de Chamados</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
              <FileText size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Em Aberto</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.open}</h3>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg text-yellow-600">
              <AlertCircle size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Em Andamento</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.inProgress}</h3>
            </div>
            <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
              <Clock size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Resolvidos</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.resolved}</h3>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-green-600">
              <CheckCircle size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Volume de Chamados (Últimos 6 meses)</h3>
          <div className="h-80">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} />
                 <XAxis dataKey="name" />
                 <YAxis />
                 <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                 />
                 <Legend />
                 <Bar dataKey="Abertos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                 <Bar dataKey="Resolvidos" fill="#22c55e" radius={[4, 4, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity Log */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                  <Activity size={20} className="mr-2 text-primary-600" />
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
                             <p className="text-sm font-medium text-gray-900">{translateLogAction(log.action)}</p>
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