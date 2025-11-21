import React, { useEffect, useState, useMemo } from 'react';
import { Ticket, TicketStatus, AuditLog } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CheckCircle, Clock, AlertCircle, FileText, Activity } from 'lucide-react';
import { supabase } from '../services/supabase';

interface DashboardProps {
  tickets: Ticket[];
}

export const Dashboard: React.FC<DashboardProps> = ({ tickets }) => {
  const [globalLogs, setGlobalLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    fetchGlobalLogs();
  }, []);

  const fetchGlobalLogs = async () => {
    // Busca os últimos 20 logs de auditoria do sistema
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        tickets ( title ),
        profiles ( name )
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setGlobalLogs(data);
    }
    setLoadingLogs(false);
  };

  // Cálculo dos Cards (KPIs)
  const stats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter(t => t.status === TicketStatus.OPEN).length;
    const inProgress = tickets.filter(t => t.status === TicketStatus.IN_PROGRESS).length;
    const resolved = tickets.filter(t => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED).length;

    return { total, open, inProgress, resolved };
  }, [tickets]);

  // Dados para o Gráfico (Agrupados por Mês/Ano)
  const chartData = useMemo(() => {
    const dataMap = new Map<string, { name: string; Abertos: number; Resolvidos: number }>();

    tickets.forEach(ticket => {
      const date = new Date(ticket.createdAt);
      const key = `${date.getMonth() + 1}/${date.getFullYear()}`; // ex: 11/2025
      const label = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }); // ex: nov. 2025

      if (!dataMap.has(key)) {
        dataMap.set(key, { name: label, Abertos: 0, Resolvidos: 0 });
      }

      const entry = dataMap.get(key)!;
      
      if (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED) {
        entry.Resolvidos += 1;
      } else {
        entry.Abertos += 1;
      }
    });

    // Converte Map para Array e ordena por data (simplificado pela chave mm/yyyy aproximada)
    return Array.from(dataMap.values()).reverse(); 
  }, [tickets]);

  const translateAction = (action: string) => {
      switch(action) {
          case 'CREATED': return 'Criação de Ticket';
          case 'STATUS_CHANGE': return 'Alteração de Status';
          case 'EDITED': return 'Edição de Ticket';
          default: return action;
      }
  };

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 uppercase">Total de Chamados</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
                <FileText size={24} />
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 uppercase">Em Aberto</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.open}</p>
            </div>
            <div className="h-12 w-12 bg-yellow-50 rounded-full flex items-center justify-center text-yellow-600">
                <AlertCircle size={24} />
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 uppercase">Em Andamento</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.inProgress}</p>
            </div>
            <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                <Clock size={24} />
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 uppercase">Resolvidos</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.resolved}</p>
            </div>
            <div className="h-12 w-12 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                <CheckCircle size={24} />
            </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Volume de Chamados (Abertos x Resolvidos)</h3>
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                        cursor={{fill: '#f3f4f6'}}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="Abertos" fill="#fbbf24" radius={[4, 4, 0, 0]} name="Abertos/Pendentes" />
                    <Bar dataKey="Resolvidos" fill="#22c55e" radius={[4, 4, 0, 0]} name="Resolvidos/Fechados" />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Audit Logs Grid */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center gap-2">
            <Activity size={20} className="text-primary-600" />
            <h3 className="text-lg font-bold text-gray-900">Log de Atividades Recentes</h3>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                    <tr>
                        <th className="px-6 py-3 font-medium">ID Chamado</th>
                        <th className="px-6 py-3 font-medium">Ação</th>
                        <th className="px-6 py-3 font-medium">Detalhes</th>
                        <th className="px-6 py-3 font-medium">Data/Hora</th>
                        <th className="px-6 py-3 font-medium">Usuário</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                    {loadingLogs ? (
                         <tr>
                             <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Carregando histórico...</td>
                         </tr>
                    ) : globalLogs.length === 0 ? (
                        <tr>
                             <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhuma atividade registrada.</td>
                         </tr>
                    ) : (
                        globalLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                    {log.tickets ? (
                                        <div>
                                            <span className="block font-bold text-primary-600">#{log.ticket_id.slice(0,6)}</span>
                                            <span className="truncate max-w-[150px] block">{log.tickets.title}</span>
                                        </div>
                                    ) : 'N/A'}
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-900">
                                    {translateAction(log.action)}
                                </td>
                                <td className="px-6 py-4 text-gray-600">
                                    {log.details || '-'}
                                </td>
                                <td className="px-6 py-4 text-gray-500">
                                    {new Date(log.created_at).toLocaleString('pt-BR')}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                            {log.profiles?.name?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <span className="text-gray-700">{log.profiles?.name || 'Sistema'}</span>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};
