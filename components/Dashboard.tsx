
import React, { useMemo, useState } from 'react'; // useState still used for showExportModal
import { Ticket, TicketStatus, TicketPriority, User } from '../types';
import { Activity, CheckCircle, Clock, Plus, TrendingUp, AlertTriangle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface DashboardProps {
  tickets: Ticket[];
  currentUser: User;
  onCreateTicket: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ tickets, currentUser, onCreateTicket }) => {
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
    const total = tickets.length;
    const open = tickets.filter(t => t.status === TicketStatus.OPEN || t.status === TicketStatus.IN_PROGRESS).length;
    const resolved = tickets.filter(t => t.status === TicketStatus.RESOLVED).length;
    const criticalActive = tickets.filter(t =>
      t.priority === TicketPriority.CRITICAL && t.status !== TicketStatus.RESOLVED
    ).length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    return { total, open, resolved, criticalActive, resolutionRate };
  }, [tickets]);


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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total */}
        <div className="bg-white px-6 py-6 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-4 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total</p>
                <div className="h-10 w-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">
                    <Activity size={20} />
                </div>
            </div>
            <h3 className="text-5xl font-mono font-bold text-slate-900">{stats.total}</h3>
            <p className="text-xs text-slate-400">todos os chamados</p>
        </div>

        {/* Abertos */}
        <div className="bg-white px-6 py-6 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-4 hover:border-amber-200 transition-colors">
            <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Abertos</p>
                <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                    <Clock size={20} />
                </div>
            </div>
            <h3 className="text-5xl font-mono font-bold text-amber-500">{stats.open}</h3>
            <p className="text-xs text-slate-400">em aberto / em progresso</p>
        </div>

        {/* Resolvidos */}
        <div className="bg-white px-6 py-6 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-4 hover:border-green-200 transition-colors">
            <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Resolvidos</p>
                <div className="h-10 w-10 rounded-xl bg-green-50 text-green-500 flex items-center justify-center">
                    <CheckCircle size={20} />
                </div>
            </div>
            <h3 className="text-5xl font-mono font-bold text-green-600">{stats.resolved}</h3>
            <p className="text-xs text-slate-400">chamados encerrados</p>
        </div>

        {/* Críticos Ativos */}
        <div className="bg-white px-6 py-6 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-4 hover:border-red-200 transition-colors">
            <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Críticos</p>
                <div className="h-10 w-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                    <AlertTriangle size={20} />
                </div>
            </div>
            <h3 className="text-5xl font-mono font-bold text-red-500">{stats.criticalActive}</h3>
            <p className="text-xs text-slate-400">prioridade crítica ativos</p>
        </div>

        {/* Resolução */}
        <div className="bg-white px-6 py-6 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-4 hover:border-primary-200 transition-colors">
            <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Resolução</p>
                <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary-500 flex items-center justify-center">
                    <TrendingUp size={20} />
                </div>
            </div>
            <h3 className="text-5xl font-mono font-bold text-primary-600">{stats.resolutionRate}%</h3>
            <p className="text-xs text-slate-400">taxa de encerramento</p>
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

    </div>
  );
};
