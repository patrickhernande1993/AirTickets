
import React, { useMemo } from 'react';
import { Ticket, TicketStatus, TicketPriority, User } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, CheckCircle, Clock, Plus, TrendingUp, AlertTriangle } from 'lucide-react';

interface DashboardProps {
  tickets: Ticket[];
  currentUser: User;
  onCreateTicket: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ tickets, currentUser, onCreateTicket }) => {
  
  const stats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter(t => t.status === TicketStatus.OPEN).length;
    const resolved = tickets.filter(t => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED).length;
    // Críticos ativos (Críticos que não estão resolvidos ou fechados)
    const criticalActive = tickets.filter(t => 
        t.priority === TicketPriority.CRITICAL && 
        t.status !== TicketStatus.RESOLVED && 
        t.status !== TicketStatus.CLOSED
    ).length;

    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    return {
      total,
      open,
      resolved,
      criticalActive,
      resolutionRate
    };
  }, [tickets]);

  const chartData = useMemo(() => {
      const data: any[] = [];
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      
      const now = new Date();
      // Mostra os últimos 12 meses para preencher bem a tela
      for (let i = 11; i >= 0; i--) {
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

  return (
    <div className="space-y-6">
      
      {/* Top Action Row matches the image's "Novo Chamado" button position */}
      <div className="flex justify-end">
          <button 
            onClick={onCreateTicket}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-sm"
          >
              <Plus size={18} />
              <span>Novo Chamado</span>
          </button>
      </div>

      {/* Welcome Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  Olá, {currentUser.name.split(' ')[0]}! <span className="text-2xl">👋</span>
              </h1>
              <p className="text-gray-500 mt-1">Visão geral do desempenho do suporte técnico e métricas.</p>
          </div>
          
          <div className="bg-primary-50 rounded-lg p-4 flex items-center gap-4 min-w-[200px] border border-primary-100">
              <div className="p-2 bg-primary-100 rounded-lg text-primary-600">
                  <TrendingUp size={24} />
              </div>
              <div>
                  <p className="text-xs font-bold text-primary-800 uppercase tracking-wide">TAXA DE RESOLUÇÃO</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.resolutionRate}%</p>
              </div>
          </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">Total de Chamados</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Activity size={20} />
            </div>
        </div>

        {/* Abertos */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">Chamados Abertos</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.open}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center">
                <Clock size={20} />
            </div>
        </div>

        {/* Resolvidos */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">Resolvidos</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.resolved}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                <CheckCircle size={20} />
            </div>
        </div>

        {/* Críticos Ativos */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">Críticos Ativos</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.criticalActive}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                <AlertTriangle size={20} />
            </div>
        </div>
      </div>

      {/* Full Width Chart */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-bold text-gray-900">Evolução Mensal: Abertos vs Resolvidos</h3>
                <div className="flex gap-4">
                    <div className="flex items-center text-xs text-gray-500">
                        <span className="w-3 h-3 rounded-full bg-primary-500 mr-2"></span> Abertos
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                        <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span> Resolvidos
                    </div>
                </div>
            </div>
            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={8}>
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
                        <Bar dataKey="Abertos" fill="#e11d48" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="Resolvidos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
      </div>
    </div>
  );
};
