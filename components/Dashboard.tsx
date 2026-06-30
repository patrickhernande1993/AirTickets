
import React, { useMemo, useState } from 'react';
import { Ticket, TicketStatus, TicketPriority, User } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, CheckCircle, Clock, Plus, TrendingUp, AlertTriangle, CalendarRange, BarChart2, Download } from 'lucide-react';
import { HeatMap } from './HeatMap';
import * as XLSX from 'xlsx';

interface DashboardProps {
  tickets: Ticket[];
  currentUser: User;
  onCreateTicket: () => void;
}

type TimeRange = 'WEEK' | 'MONTH' | 'YEAR';

export const Dashboard: React.FC<DashboardProps> = ({ tickets, currentUser, onCreateTicket }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('WEEK');
  const [showExportModal, setShowExportModal] = useState(false);

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Aba Resumo
      const totalAll = tickets.length;
      const openAll = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
      const resolvedAll = tickets.filter(t => t.status === 'RESOLVED').length;
      const rate = totalAll > 0 ? Math.round((resolvedAll / totalAll) * 100) : 0;
      const summaryData = [
        ['Métrica', 'Valor'],
        ['Total de Chamados', totalAll],
        ['Chamados Abertos/Em Progresso', openAll],
        ['Chamados Resolvidos', resolvedAll],
        ['Taxa de Resolução (%)', rate],
        ['Data do Relatório', new Date().toLocaleDateString('pt-BR')],
      ];
      const wsResumo = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

      // Aba Chamados
      const ticketRows = [
        ['Número', 'Título', 'Solicitante', 'Categoria', 'Prioridade', 'Status', 'Criado em', 'Resolvido em'],
        ...tickets.map(t => [
          t.ticketNumber,
          t.title,
          t.requester,
          t.category,
          t.priority,
          t.status,
          t.createdAt.toLocaleDateString('pt-BR'),
          t.resolvedAt ? t.resolvedAt.toLocaleDateString('pt-BR') : '',
        ])
      ];
      const wsChamados = XLSX.utils.aoa_to_sheet(ticketRows);
      XLSX.utils.book_append_sheet(wb, wsChamados, 'Chamados');

      // Aba Por Categoria
      const catCounts: Record<string, number> = {};
      tickets.forEach(t => { catCounts[t.category] = (catCounts[t.category] || 0) + 1; });
      const catRows = [['Categoria', 'Total'], ...Object.entries(catCounts).sort((a, b) => b[1] - a[1])];
      const wsCat = XLSX.utils.aoa_to_sheet(catRows);
      XLSX.utils.book_append_sheet(wb, wsCat, 'Por Categoria');

      // Aba Por Prioridade
      const priCounts: Record<string, number> = {};
      tickets.forEach(t => { priCounts[t.priority] = (priCounts[t.priority] || 0) + 1; });
      const priRows = [['Prioridade', 'Total'], ...Object.entries(priCounts).sort((a, b) => b[1] - a[1])];
      const wsPri = XLSX.utils.aoa_to_sheet(priRows);
      XLSX.utils.book_append_sheet(wb, wsPri, 'Por Prioridade');

      XLSX.writeFile(wb, `AirService_Relatorio_${new Date().toISOString().slice(0,10)}.xlsx`);
      setShowExportModal(false);
    } catch (e) {
      console.error('Erro ao exportar Excel:', e);
    }
  };

  const handlePrint = () => {
    setShowExportModal(false);
    setTimeout(() => window.print(), 200);
  };
  
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

      {/* Print CSS */}
      <style>{`
        @media print {
          nav, button, .no-print { display: none !important; }
          body { background: white; }
          .print-header { display: block !important; }
        }
      `}</style>

      {/* Print Header (hidden on screen) */}
      <div className="print-header hidden border-b border-slate-200 pb-4 mb-4">
        <h1 className="text-2xl font-bold text-slate-900">AirService — Relatório de Chamados</h1>
        <p className="text-sm text-slate-500">Gerado em: {new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' })}</p>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Exportar Relatório</h3>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="space-y-3">
              <button
                onClick={handlePrint}
                className="w-full flex items-center gap-3 p-4 border border-slate-200 hover:bg-slate-50 transition-colors rounded-lg text-left"
              >
                <div className="h-8 w-8 bg-red-50 flex items-center justify-center border border-red-100 text-red-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 uppercase tracking-widest">PDF (Imprimir)</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Abre o diálogo de impressão do navegador</p>
                </div>
              </button>
              <button
                onClick={handleExportExcel}
                className="w-full flex items-center gap-3 p-4 border border-slate-200 hover:bg-slate-50 transition-colors rounded-lg text-left"
              >
                <div className="h-8 w-8 bg-green-50 flex items-center justify-center border border-green-100 text-green-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 uppercase tracking-widest">Excel (.xlsx)</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Resumo, chamados, categorias e prioridades</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Bar — compacto */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Olá, {currentUser.name.split(' ')[0]}! 👋
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Visão geral do suporte técnico</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-xs font-medium"
          >
            <Download size={13} />
            Exportar
          </button>
          <button
            onClick={onCreateTicket}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-xs font-medium shadow-sm"
          >
            <Plus size={13} />
            Novo Chamado
          </button>
        </div>
      </div>

      {/* KPI Cards Row — compacto */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total */}
        <div className="bg-white px-4 py-3 rounded-lg border border-slate-100 shadow-sm flex items-center justify-between hover:border-slate-300 transition-colors">
            <div>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Total</p>
                <h3 className="text-2xl font-mono font-bold text-slate-900 mt-0.5">{stats.total}</h3>
            </div>
            <div className="h-8 w-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center">
                <Activity size={16} />
            </div>
        </div>

        {/* Abertos */}
        <div className="bg-white px-4 py-3 rounded-lg border border-slate-100 shadow-sm flex items-center justify-between hover:border-amber-200 transition-colors">
            <div>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Abertos</p>
                <h3 className="text-2xl font-mono font-bold text-slate-900 mt-0.5">{stats.open}</h3>
            </div>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
                <Clock size={16} />
            </div>
        </div>

        {/* Resolvidos */}
        <div className="bg-white px-4 py-3 rounded-lg border border-slate-100 shadow-sm flex items-center justify-between hover:border-green-200 transition-colors">
            <div>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Resolvidos</p>
                <h3 className="text-2xl font-mono font-bold text-slate-900 mt-0.5">{stats.resolved}</h3>
            </div>
            <div className="h-8 w-8 rounded-lg bg-green-50 text-green-500 flex items-center justify-center">
                <CheckCircle size={16} />
            </div>
        </div>

        {/* Críticos Ativos */}
        <div className="bg-white px-4 py-3 rounded-lg border border-slate-100 shadow-sm flex items-center justify-between hover:border-red-200 transition-colors">
            <div>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Críticos</p>
                <h3 className="text-2xl font-mono font-bold text-slate-900 mt-0.5">{stats.criticalActive}</h3>
            </div>
            <div className="h-8 w-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
                <AlertTriangle size={16} />
            </div>
        </div>

        {/* Resolução */}
        <div className="bg-white px-4 py-3 rounded-lg border border-slate-100 shadow-sm flex items-center justify-between hover:border-primary-200 transition-colors">
            <div>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Resolução</p>
                <h3 className="text-2xl font-mono font-bold text-slate-900 mt-0.5">{stats.resolutionRate}%</h3>
            </div>
            <div className="h-8 w-8 rounded-lg bg-primary-50 text-primary-500 flex items-center justify-center">
                <TrendingUp size={16} />
            </div>
        </div>
      </div>

      {/* CSAT Card */}
      {(() => {
        const rated = tickets.filter(t => t.csatRating != null);
        if (rated.length === 0) return null;
        const great = rated.filter(t => t.csatRating === 3).length;
        const pct = Math.round((great / rated.length) * 100);
        return (
          <div className="bg-white p-5 rounded-lg border border-slate-100 shadow-card flex items-center justify-between hover:border-green-300 transition-all">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Satisfação dos Clientes (CSAT)</p>
              <div className="flex items-end gap-3">
                <h3 className="text-3xl font-mono font-bold text-slate-900">{pct}%</h3>
                <span className="text-sm text-slate-500 font-medium mb-0.5">ótimo • {rated.length} avaliações</span>
              </div>
              <div className="mt-2 flex gap-3 text-[10px] font-bold uppercase tracking-widest">
                <span className="text-green-600">😊 Ótimo: {rated.filter(t => t.csatRating === 3).length}</span>
                <span className="text-amber-600">😐 Regular: {rated.filter(t => t.csatRating === 2).length}</span>
                <span className="text-red-600">😞 Ruim: {rated.filter(t => t.csatRating === 1).length}</span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-lg bg-green-50 text-green-600 flex items-center justify-center border border-green-100 text-2xl">
              😊
            </div>
          </div>
        );
      })()}

      {/* Interactive Chart Section */}
      <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-card">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center uppercase tracking-tight">
                        <CalendarRange className="mr-2 text-primary-600" size={20} />
                        Tendência de Chamados
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Comparativo de abertura (Data Criação) vs Resolução (Data Fechamento).</p>
                </div>
                
                {/* Time Range Selector */}
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button
                        onClick={() => setTimeRange('WEEK')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                            timeRange === 'WEEK' 
                            ? 'bg-white text-primary-600 border border-slate-100 shadow-card' 
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        7 Dias
                    </button>
                    <button
                        onClick={() => setTimeRange('MONTH')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                            timeRange === 'MONTH' 
                            ? 'bg-white text-primary-600 border border-slate-100 shadow-card' 
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        30 Dias
                    </button>
                    <button
                        onClick={() => setTimeRange('YEAR')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                            timeRange === 'YEAR' 
                            ? 'bg-white text-primary-600 border border-slate-100 shadow-card' 
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

      {/* Analysis Patterns Section */}
      {currentUser.role === 'ADMIN' && (
      <div className="bg-white rounded-lg border border-slate-100 shadow-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart2 size={20} className="text-primary-600" />
          <div>
            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">📊 Análise de Padrões</h3>
            <p className="text-sm text-slate-500 mt-0.5">Mapa de calor, categorias e solicitantes</p>
          </div>
        </div>
        <HeatMap tickets={tickets} />
      </div>
      )}
    </div>
  );
};
