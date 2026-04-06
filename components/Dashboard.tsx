
import React, { useMemo, useState } from 'react';
import { Ticket, TicketStatus, TicketPriority, User } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, CheckCircle, Clock, Plus, TrendingUp, AlertTriangle, CalendarRange } from 'lucide-react';

interface DashboardProps {
  tickets: Ticket[];
  currentUser: User;
  onCreateTicket: () => void;
}

type TimeRange = 'WEEK' | 'MONTH' | 'YEAR';

export const Dashboard: React.FC<DashboardProps> = ({ tickets, currentUser, onCreateTicket }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('WEEK');
  
  const stats = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    
    if (timeRange === 'WEEK') {
      startDate.setDate(now.getDate() - 7);
    } else if (timeRange === 'MONTH') {
      startDate.setDate(now.getDate() - 30);
    } else {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    // Tickets criados no período
    const createdInPeriod = tickets.filter(t => t.createdAt >= startDate);
    const total = createdInPeriod.length;
    
    // Chamados atualmente abertos (geral, não apenas no período, para manter visibilidade do backlog)
    // Mas se o usuário quiser TUDO filtrado, podemos filtrar aqui também. 
    // No entanto, "Open" costuma ser o estado atual. 
    // Vamos filtrar APENAS para o cálculo da taxa e do total exibido nos cards para ser coerente com o gráfico.
    const openInPeriod = createdInPeriod.filter(t => t.status === TicketStatus.OPEN).length;
    
    // Tickets RESOLVIDOS no período (independente de quando foram criados)
    const resolvedInPeriod = tickets.filter(t => {
      if (t.status !== TicketStatus.RESOLVED) return false;
      const dateReference = t.resolvedAt || t.updatedAt;
      return dateReference && dateReference >= startDate;
    }).length;

    const criticalActiveInPeriod = createdInPeriod.filter(t => 
        t.priority === TicketPriority.CRITICAL && 
        t.status !== TicketStatus.RESOLVED
    ).length;

    // Taxa de Resolução = (Resolvidos no período / Criados no período)
    // Capped at 100% for a cleaner UI, or just let it reflect productivity (>100% means backlog is shrinking)
    let resolutionRate = total > 0 ? Math.round((resolvedInPeriod / total) * 100) : 0;
    
    return {
      total,
      open: openInPeriod,
      resolved: resolvedInPeriod,
      criticalActive: criticalActiveInPeriod,
      resolutionRate: resolutionRate
    };
  }, [tickets, timeRange]);

  const chartData = useMemo(() => {
      // Helpers para chaves de data consistentes (Local Time)
      const getDailyKey = (date: Date) => {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
      };

      const getMonthlyKey = (date: Date) => {
          return `${date.getFullYear()}-${date.getMonth()}`; // Month index 0-11
      };

      // 1. Criar o esqueleto da linha do tempo (Buckets vazios)
      // Usamos Map para acesso rápido O(1)
      const timeline = new Map<string, { name: string; Abertos: number; Resolvidos: number }>();
      const now = new Date();

      if (timeRange === 'YEAR') {
          // Lógica Mensal (Últimos 12 meses)
          const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
          
          for (let i = 11; i >= 0; i--) {
              const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
              const key = getMonthlyKey(d);
              timeline.set(key, {
                  name: `${months[d.getMonth()]}`,
                  Abertos: 0,
                  Resolvidos: 0
              });
          }
      } else {
          // Lógica Diária (7 dias ou 30 dias)
          const daysToLookBack = timeRange === 'WEEK' ? 7 : 30;
          
          for (let i = daysToLookBack - 1; i >= 0; i--) {
              const d = new Date();
              d.setDate(now.getDate() - i);
              const key = getDailyKey(d);
              timeline.set(key, {
                  name: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                  Abertos: 0,
                  Resolvidos: 0
              });
          }
      }

      // 2. Preencher Dados
      tickets.forEach(t => {
          // --- Contagem de ABERTURA (Usa createdAt) ---
          let createdKey = '';
          if (timeRange === 'YEAR') {
              createdKey = getMonthlyKey(t.createdAt);
          } else {
              createdKey = getDailyKey(t.createdAt);
          }

          // Se a data de criação cair dentro do período do gráfico, incrementa Abertos
          if (timeline.has(createdKey)) {
              timeline.get(createdKey)!.Abertos += 1;
          }

          // --- Contagem de RESOLUÇÃO (Usa resolvedAt) ---
          if (t.status === TicketStatus.RESOLVED) {
              // Usa resolvedAt (preferencial) ou updatedAt como fallback para dados antigos
              const dateReference = t.resolvedAt || t.updatedAt;

              if (dateReference) {
                  let resolvedKey = '';
                  if (timeRange === 'YEAR') {
                      resolvedKey = getMonthlyKey(dateReference);
                  } else {
                      resolvedKey = getDailyKey(dateReference);
                  }

                  // Se a data de resolução cair dentro do período do gráfico, incrementa Resolvidos
                  // Independente de quando foi criado
                  if (timeline.has(resolvedKey)) {
                      timeline.get(resolvedKey)!.Resolvidos += 1;
                  }
              }
          }
      });

      return Array.from(timeline.values());
  }, [tickets, timeRange]);

  return (
    <div className="space-y-6">
      
      {/* Welcome Card & Main Actions */}
      <div className="bg-white rounded-none border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  Olá, {currentUser.name.split(' ')[0]}! <span className="text-2xl">👋</span>
              </h1>
              <p className="text-slate-500 mt-1">Visão geral do desempenho do suporte técnico e métricas.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
              {/* Resolution Rate Compact */}
              <div className="bg-slate-50 rounded-none p-3 px-4 flex items-center gap-3 border border-slate-200 min-w-[160px]">
                  <div className="p-1.5 bg-primary-100 rounded-none text-primary-600 border border-primary-200">
                      <TrendingUp size={20} />
                  </div>
                  <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Resolução</p>
                      <p className="text-xl font-mono font-bold text-slate-900">{stats.resolutionRate}%</p>
                  </div>
              </div>

              {/* Action Button Integrated */}
              <button 
                onClick={onCreateTicket}
                className="flex items-center justify-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-sm hover:bg-primary-700 transition-colors font-bold shadow-sm w-full sm:w-auto uppercase tracking-widest text-xs"
              >
                  <Plus size={18} />
                  <span>Novo Chamado</span>
              </button>
          </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="bg-white p-6 rounded-none border border-slate-200 shadow-sm flex items-center justify-between transition-all hover:border-primary-300">
            <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total de Chamados</p>
                <h3 className="text-3xl font-mono font-bold text-slate-900 mt-1">{stats.total}</h3>
            </div>
            <div className="h-10 w-10 rounded-none bg-slate-50 text-slate-600 flex items-center justify-center border border-slate-100">
                <Activity size={20} />
            </div>
        </div>

        {/* Abertos */}
        <div className="bg-white p-6 rounded-none border border-slate-200 shadow-sm flex items-center justify-between transition-all hover:border-amber-300">
            <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Chamados Abertos</p>
                <h3 className="text-3xl font-mono font-bold text-slate-900 mt-1">{stats.open}</h3>
            </div>
            <div className="h-10 w-10 rounded-none bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <Clock size={20} />
            </div>
        </div>

        {/* Resolvidos */}
        <div className="bg-white p-6 rounded-none border border-slate-200 shadow-sm flex items-center justify-between transition-all hover:border-green-300">
            <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Resolvidos</p>
                <h3 className="text-3xl font-mono font-bold text-slate-900 mt-1">{stats.resolved}</h3>
            </div>
            <div className="h-10 w-10 rounded-none bg-green-50 text-green-600 flex items-center justify-center border border-green-100">
                <CheckCircle size={20} />
            </div>
        </div>

        {/* Críticos Ativos */}
        <div className="bg-white p-6 rounded-none border border-slate-200 shadow-sm flex items-center justify-between transition-all hover:border-red-300">
            <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Críticos Ativos</p>
                <h3 className="text-3xl font-mono font-bold text-slate-900 mt-1">{stats.criticalActive}</h3>
            </div>
            <div className="h-10 w-10 rounded-none bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
                <AlertTriangle size={20} />
            </div>
        </div>
      </div>

      {/* Interactive Chart Section */}
      <div className="bg-white p-6 rounded-none border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center uppercase tracking-tight">
                        <CalendarRange className="mr-2 text-primary-600" size={20} />
                        Tendência de Chamados
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Comparativo de abertura (Data Criação) vs Resolução (Data Fechamento).</p>
                </div>
                
                {/* Time Range Selector */}
                <div className="flex bg-slate-100 p-1 rounded-none border border-slate-200">
                    <button
                        onClick={() => setTimeRange('WEEK')}
                        className={`px-4 py-1.5 rounded-none text-xs font-bold uppercase tracking-widest transition-all ${
                            timeRange === 'WEEK' 
                            ? 'bg-white text-primary-600 border border-slate-200 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        7 Dias
                    </button>
                    <button
                        onClick={() => setTimeRange('MONTH')}
                        className={`px-4 py-1.5 rounded-none text-xs font-bold uppercase tracking-widest transition-all ${
                            timeRange === 'MONTH' 
                            ? 'bg-white text-primary-600 border border-slate-200 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        30 Dias
                    </button>
                    <button
                        onClick={() => setTimeRange('YEAR')}
                        className={`px-4 py-1.5 rounded-none text-xs font-bold uppercase tracking-widest transition-all ${
                            timeRange === 'YEAR' 
                            ? 'bg-white text-primary-600 border border-slate-200 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        12 Meses
                    </button>
                </div>
            </div>

            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={4}>
                        <CartesianGrid strokeDasharray="0" vertical={true} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="name" 
                            axisLine={{ stroke: '#e2e8f0' }} 
                            tickLine={false} 
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} 
                            dy={10}
                        />
                        <YAxis 
                            axisLine={{ stroke: '#e2e8f0' }} 
                            tickLine={false} 
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} 
                        />
                        <Tooltip 
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ 
                                borderRadius: '0px', 
                                border: '1px solid #e2e8f0', 
                                boxShadow: 'none',
                                fontSize: '12px'
                            }}
                            labelStyle={{ color: '#0f172a', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                        <Bar 
                            name="Criados" 
                            dataKey="Abertos" 
                            fill="#0ea5e9" 
                            radius={[0, 0, 0, 0]} 
                            maxBarSize={40} 
                        />
                        <Bar 
                            name="Resolvidos" 
                            dataKey="Resolvidos" 
                            fill="#10b981" 
                            radius={[0, 0, 0, 0]} 
                            maxBarSize={40} 
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
      </div>
    </div>
  );
};
