
import React, { useState, useMemo } from 'react';
import { Ticket, TicketPriority, TicketStatus } from '../types';
import { AlertCircle, CheckCircle, Clock, Search, Plus, Filter, ArrowUpDown, FileSpreadsheet, LayoutList, KanbanSquare } from 'lucide-react';
import * as XLSX from 'xlsx';
import { TicketKanban } from './TicketKanban';
import { ResolutionModal } from './ResolutionModal';

interface TicketListProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  onCreateTicket: () => void;
  onUpdateStatus: (id: string, status: TicketStatus) => void;
  initialStatusFilter?: string;
}

export const TicketList: React.FC<TicketListProps> = ({ 
  tickets, 
  onSelectTicket, 
  onCreateTicket, 
  onUpdateStatus,
  initialStatusFilter = 'ALL'
}) => {
  // Modal State
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);
  const [ticketToResolve, setTicketToResolve] = useState<Ticket | null>(null);
  
  // View Mode
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  // Filtros States
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [requesterFilter, setRequesterFilter] = useState<string>('ALL');
  
  // Date Filters
  const [dateType, setDateType] = useState<'created' | 'resolved' | 'updated'>('created');
  const [dateValue, setDateValue] = useState('');

  // Ordenação
  const [sortField, setSortField] = useState<keyof Ticket>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Lógica de Filtragem
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const searchLower = searchText.toLowerCase();
      
      // 1. Filtro de Texto (ID, Assunto)
      const matchesText = 
        ticket.title.toLowerCase().includes(searchLower) ||
        ticket.ticketNumber.toString().includes(searchLower) ||
        ticket.description.toLowerCase().includes(searchLower);

      // 2. Filtro de Status
      const matchesStatus = statusFilter === 'ALL' || ticket.status === statusFilter;

      // 3. Filtro de Categoria
      const matchesCategory = categoryFilter === 'ALL' || ticket.category === categoryFilter;

      // 4. Filtro de Solicitante (Usuário)
      const matchesRequester = requesterFilter === 'ALL' || ticket.requester === requesterFilter;

      // 5. Filtro de Data (Com correção de Fuso Horário Local)
      let matchesDate = true;
      if (dateValue) {
        let ticketDate: Date | undefined;
        
        if (dateType === 'created') ticketDate = ticket.createdAt;
        else if (dateType === 'resolved') ticketDate = ticket.resolvedAt;
        else if (dateType === 'updated') ticketDate = ticket.updatedAt;

        if (ticketDate) {
            // Converte ambas as datas para string YYYY-MM-DD usando o horário local do navegador
            const tYear = ticketDate.getFullYear();
            const tMonth = String(ticketDate.getMonth() + 1).padStart(2, '0');
            const tDay = String(ticketDate.getDate()).padStart(2, '0');
            const ticketDateStr = `${tYear}-${tMonth}-${tDay}`;
            
            matchesDate = ticketDateStr === dateValue;
        } else {
            // Se está filtrando por data de resolução mas o ticket não tem essa data
            matchesDate = false; 
        }
      }

      return matchesText && matchesStatus && matchesCategory && matchesRequester && matchesDate;
    }).sort((a, b) => {
        // Lógica de Ordenação
        const valA = a[sortField];
        const valB = b[sortField];

        if (valA === undefined) return 1; // Move undefined to bottom
        if (valB === undefined) return -1;

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
  }, [tickets, searchText, statusFilter, categoryFilter, requesterFilter, dateType, dateValue, sortField, sortDirection]);

  const clearFilters = () => {
      setSearchText('');
      setStatusFilter('ALL');
      setCategoryFilter('ALL');
      setRequesterFilter('ALL');
      setDateValue('');
      setDateType('created');
  };

  const handleSort = (field: keyof Ticket) => {
      if (sortField === field) {
          setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
          setSortField(field);
          setSortDirection('desc'); // Padrão desc ao trocar coluna
      }
  };

  const translateStatusText = (s: string) => {
    switch(s) {
        case 'OPEN': return 'Aberto';
        case 'IN_PROGRESS': return 'Em Progresso';
        case 'RESOLVED': return 'Resolvido';
        default: return s;
    }
  };

  const translatePriorityText = (p: string) => {
    switch(p) {
        case 'LOW': return 'Baixa';
        case 'MEDIUM': return 'Média';
        case 'HIGH': return 'Alta';
        case 'CRITICAL': return 'Crítica';
        default: return p;
    }
  };

  const handleExportXLSX = () => {
    if (filteredTickets.length === 0) {
        alert("Não há chamados para exportar com os filtros atuais.");
        return;
    }

    // Prepara os dados formatados
    const dataToExport = filteredTickets.map(ticket => ({
        "ID": ticket.ticketNumber,
        "Assunto": ticket.title,
        "Descrição": ticket.description,
        "Solicitante": ticket.requester,
        "Categoria": ticket.category,
        "Prioridade": translatePriorityText(ticket.priority),
        "Status": translateStatusText(ticket.status),
        "Data Abertura": ticket.createdAt ? ticket.createdAt.toLocaleString('pt-BR') : '',
        "Data Resolução": ticket.resolvedAt ? ticket.resolvedAt.toLocaleString('pt-BR') : '',
        "Última Atualização": ticket.updatedAt ? ticket.updatedAt.toLocaleString('pt-BR') : ''
    }));

    // Cria a planilha (Worksheet)
    const ws = XLSX.utils.json_to_sheet(dataToExport);

    // Configura a largura das colunas
    const wscols = [
        { wch: 10 }, // ID
        { wch: 40 }, // Assunto
        { wch: 60 }, // Descrição
        { wch: 20 }, // Solicitante
        { wch: 15 }, // Categoria
        { wch: 12 }, // Prioridade
        { wch: 15 }, // Status
        { wch: 20 }, // Data Abertura
        { wch: 20 }, // Data Resolução
        { wch: 20 }  // Ultima Atualização
    ];
    ws['!cols'] = wscols;

    // Cria o arquivo (Workbook) e adiciona a planilha
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Chamados");

    // Gera o arquivo e força o download
    XLSX.writeFile(wb, `chamados_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const SortIcon = ({ field }: { field: keyof Ticket }) => {
      if (sortField !== field) return <ArrowUpDown size={12} className="ml-1 opacity-30" />;
      return <ArrowUpDown size={12} className={`ml-1 ${sortDirection === 'asc' ? 'text-primary-600' : 'text-primary-600 transform rotate-180'}`} />;
  };

  const getStatusBadge = (s: TicketStatus) => {
    switch(s) {
      case TicketStatus.RESOLVED: 
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-none text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 uppercase tracking-tight whitespace-nowrap">
                <CheckCircle size={10} className="mr-1" /> Resolvido
            </span>
          );
      case TicketStatus.IN_PROGRESS: 
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-none text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 uppercase tracking-tight whitespace-nowrap">
                <Clock size={10} className="mr-1" /> Em Progresso
            </span>
          );
      default: 
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-none text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-tight whitespace-nowrap">
                <AlertCircle size={10} className="mr-1" /> Aberto
            </span>
          );
    }
  };

  const getPriorityBadge = (p: TicketPriority) => {
    let colorClass = '';
    let label = '';
    switch(p) {
        case TicketPriority.LOW: colorClass = 'bg-slate-50 text-slate-700 border-slate-200'; label = 'Baixa'; break;
        case TicketPriority.MEDIUM: colorClass = 'bg-blue-50 text-blue-700 border-blue-200'; label = 'Média'; break;
        case TicketPriority.HIGH: colorClass = 'bg-orange-50 text-orange-700 border-orange-200'; label = 'Alta'; break;
        case TicketPriority.CRITICAL: colorClass = 'bg-red-50 text-red-700 border-red-200'; label = 'Crítica'; break;
        default: colorClass = 'bg-slate-50 text-slate-700'; label = p;
    }
    return <span className={`px-1.5 py-0.5 rounded-none border text-[10px] font-bold uppercase tracking-tighter ${colorClass}`}>{label}</span>;
  };

  const formatDate = (date?: Date) => {
      if (!date) return '-';
      return date.toLocaleDateString('pt-BR', {
          day: '2-digit', month: '2-digit', year: '2-digit',
          hour: '2-digit', minute: '2-digit'
      });
  };

  // Listas únicas para os dropdowns
  const uniqueCategories = Array.from(new Set(tickets.map(t => t.category))).sort();
  const uniqueRequesters = Array.from(new Set(tickets.map(t => t.requester))).sort();

  return (
    <div className="space-y-6">
      {/* Header Actions & Filters */}
      <div className="bg-white p-4 rounded-none border border-slate-200 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
             <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text" 
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Buscar por ID, assunto ou descrição..." 
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-none text-sm focus:ring-1 focus:ring-primary-500 outline-none"
                />
             </div>
             
             <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                 {/* View Toggle */}
                 <div className="flex bg-slate-100 p-1 rounded-none border border-slate-200">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded-none transition-all ${viewMode === 'list' ? 'bg-white border border-slate-200 shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
                        title="Visualização em Lista"
                    >
                        <LayoutList size={18} />
                    </button>
                    <button
                        onClick={() => setViewMode('kanban')}
                        className={`p-1.5 rounded-none transition-all ${viewMode === 'kanban' ? 'bg-white border border-slate-200 shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
                        title="Visualização em Kanban"
                    >
                        <KanbanSquare size={18} />
                    </button>
                 </div>

                 <button 
                    onClick={handleExportXLSX}
                    className="flex-1 lg:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-none hover:bg-slate-50 transition-colors text-sm font-medium whitespace-nowrap"
                    title="Exportar dados filtrados para Excel"
                 >
                    <FileSpreadsheet size={18} />
                    <span className="hidden sm:inline">Exportar</span>
                 </button>
                 <button 
                    onClick={onCreateTicket}
                    className="flex-1 lg:flex-none flex items-center justify-center space-x-2 px-5 py-2 bg-primary-600 text-white rounded-none hover:bg-primary-700 transition-colors text-sm font-medium whitespace-nowrap"
                >
                    <Plus size={18} />
                    <span>Novo Chamado</span>
                 </button>
             </div>
          </div>

          {/* Advanced Filters Row */}
          <div className="flex flex-col xl:flex-row gap-3 items-start xl:items-center">
             <div className="flex items-center gap-2 w-full xl:w-auto mb-2 xl:mb-0">
                <Filter size={14} className="text-slate-500" />
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Filtros:</span>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 w-full flex-1">
                {/* Status Filter */}
                <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-none text-xs text-slate-600 outline-none bg-white focus:border-primary-500 font-medium"
                >
                    <option value="ALL">TODOS OS STATUS</option>
                    <option value="OPEN">ABERTO</option>
                    <option value="IN_PROGRESS">EM PROGRESSO</option>
                    <option value="RESOLVED">RESOLVIDO</option>
                </select>

                {/* Category Filter */}
                <select 
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-none text-xs text-slate-600 outline-none bg-white focus:border-primary-500 font-medium"
                >
                    <option value="ALL">TODAS CATEGORIAS</option>
                    {uniqueCategories.map(cat => (
                        <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                    ))}
                </select>

                {/* Requester Filter */}
                <select 
                    value={requesterFilter}
                    onChange={(e) => setRequesterFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-none text-xs text-slate-600 outline-none bg-white focus:border-primary-500 font-medium"
                >
                    <option value="ALL">TODOS SOLICITANTES</option>
                    {uniqueRequesters.map(req => (
                        <option key={req} value={req}>{req.toUpperCase()}</option>
                    ))}
                </select>

                {/* Date Filter Group */}
                <div className="flex items-center gap-0 border border-slate-200 rounded-none overflow-hidden w-full">
                     <select
                        value={dateType}
                        onChange={(e) => setDateType(e.target.value as any)}
                        className="bg-slate-50 text-[10px] font-bold text-slate-600 outline-none px-2 py-2.5 border-r border-slate-200 w-24 uppercase tracking-tighter"
                     >
                         <option value="created">ABERTURA</option>
                         <option value="resolved">RESOLUÇÃO</option>
                         <option value="updated">ATUALIZ.</option>
                     </select>
                     <input 
                        type="date"
                        value={dateValue}
                        onChange={(e) => setDateValue(e.target.value)}
                        className="flex-1 px-2 py-2 text-xs text-slate-600 outline-none bg-white font-mono"
                     />
                </div>
             </div>
             
             {(searchText || statusFilter !== 'ALL' || categoryFilter !== 'ALL' || requesterFilter !== 'ALL' || dateValue) && (
                 <button 
                    onClick={clearFilters}
                    className="text-[10px] text-red-500 font-bold hover:underline whitespace-nowrap px-2 uppercase tracking-wider"
                 >
                    Limpar Filtros
                 </button>
             )}
          </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'kanban' ? (
          <TicketKanban 
            tickets={filteredTickets} 
            onSelectTicket={onSelectTicket}
            onUpdateStatus={(id, status) => {
                if (status === TicketStatus.RESOLVED) {
                    const ticket = tickets.find(t => t.id === id);
                    if (ticket) {
                        setTicketToResolve(ticket);
                        setIsResolutionModalOpen(true);
                    }
                } else {
                    onUpdateStatus(id, status);
                }
            }}
          />
      ) : (
        <div className="bg-white rounded-none border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                        <tr>
                            <th className="px-4 py-3 border-r border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('ticketNumber')}>
                                <div className="flex items-center">ID <SortIcon field="ticketNumber" /></div>
                            </th>
                            <th className="px-4 py-3 border-r border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('title')}>
                                <div className="flex items-center">Assunto <SortIcon field="title" /></div>
                            </th>
                            <th className="px-4 py-3 border-r border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('requester')}>
                                <div className="flex items-center">Solicitante <SortIcon field="requester" /></div>
                            </th>
                            <th className="px-4 py-3 border-r border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('category')}>
                                <div className="flex items-center">Categoria <SortIcon field="category" /></div>
                            </th>
                            <th className="px-4 py-3 border-r border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('priority')}>
                                <div className="flex items-center">Prioridade <SortIcon field="priority" /></div>
                            </th>
                            <th className="px-4 py-3 border-r border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('createdAt')}>
                                <div className="flex items-center">Abertura <SortIcon field="createdAt" /></div>
                            </th>
                            <th className="px-4 py-3 border-r border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('resolvedAt')}>
                                <div className="flex items-center">Resolução <SortIcon field="resolvedAt" /></div>
                            </th>
                            <th className="px-4 py-3 border-r border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('updatedAt')}>
                                <div className="flex items-center">Última At. <SortIcon field="updatedAt" /></div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 text-right transition-colors" onClick={() => handleSort('status')}>
                                <div className="flex items-center justify-end">Status <SortIcon field="status" /></div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredTickets.map((ticket) => (
                            <tr 
                                key={ticket.id} 
                                onClick={() => onSelectTicket(ticket)}
                                className="hover:bg-slate-50 transition-colors cursor-pointer group border-b border-slate-50 last:border-0"
                            >
                                <td className="px-4 py-3 text-[10px] font-bold font-mono text-slate-400 border-r border-slate-50">
                                    #{ticket.ticketNumber}
                                </td>
                                <td className="px-4 py-3 border-r border-slate-50">
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 group-hover:text-primary-600 transition-colors uppercase tracking-tight">{ticket.title}</p>
                                        <p className="text-xs text-slate-500 truncate max-w-[150px] md:max-w-[300px] leading-relaxed">{ticket.description}</p>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-[10px] text-slate-600 font-bold uppercase tracking-tight border-r border-slate-50">
                                    {ticket.requester}
                                </td>
                                <td className="px-4 py-3 border-r border-slate-50">
                                    <span className="px-1.5 py-0.5 bg-slate-50 rounded-none text-[10px] font-bold text-slate-500 border border-slate-200 uppercase tracking-tighter">
                                        {ticket.category}
                                    </span>
                                </td>
                                <td className="px-4 py-3 border-r border-slate-50">
                                    {getPriorityBadge(ticket.priority)}
                                </td>
                                <td className="px-4 py-3 text-[10px] font-bold font-mono text-slate-500 whitespace-nowrap border-r border-slate-50">
                                    {formatDate(ticket.createdAt)}
                                </td>
                                <td className="px-4 py-3 text-[10px] font-bold font-mono text-slate-500 whitespace-nowrap border-r border-slate-50">
                                    {formatDate(ticket.resolvedAt)}
                                </td>
                                <td className="px-4 py-3 text-[10px] font-bold font-mono text-slate-500 whitespace-nowrap border-r border-slate-50">
                                    {formatDate(ticket.updatedAt)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {getStatusBadge(ticket.status)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {filteredTickets.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="bg-slate-50 p-4 rounded-none border border-slate-100 mb-4">
                            <Search size={32} className="text-slate-300" />
                        </div>
                        <p className="text-slate-900 font-bold uppercase tracking-wider text-sm">Nenhum chamado encontrado</p>
                        <p className="text-xs text-slate-500 mt-2 font-mono">Tente ajustar seus filtros ou crie um novo chamado.</p>
                    </div>
                )}
            </div>
        </div>
      )}
      {ticketToResolve && (
        <ResolutionModal
            isOpen={isResolutionModalOpen}
            onClose={() => {
                setIsResolutionModalOpen(false);
                setTicketToResolve(null);
            }}
            onConfirm={(resolution) => {
                onUpdateStatus(ticketToResolve.id, TicketStatus.RESOLVED, resolution);
                setIsResolutionModalOpen(false);
                setTicketToResolve(null);
            }}
            ticketNumber={ticketToResolve.ticketNumber}
        />
      )}
    </div>
  );
};
