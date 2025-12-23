
import React, { useState, useMemo } from 'react';
import { Ticket, TicketPriority, TicketStatus } from '../types';
import { AlertCircle, CheckCircle, Clock, Search, Plus, Filter, ArrowUpDown, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

interface TicketListProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  onCreateTicket: () => void;
}

export const TicketList: React.FC<TicketListProps> = ({ tickets, onSelectTicket, onCreateTicket }) => {
  
  // Filtros States
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
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
        case 'CLOSED': return 'Fechado';
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
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap">
                <CheckCircle size={12} className="mr-1" /> Resolvido
            </span>
          );
      case TicketStatus.CLOSED: 
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 whitespace-nowrap">
                <CheckCircle size={12} className="mr-1" /> Fechado
            </span>
          );
      case TicketStatus.IN_PROGRESS: 
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 whitespace-nowrap">
                <Clock size={12} className="mr-1" /> Em Progresso
            </span>
          );
      default: 
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 whitespace-nowrap">
                <AlertCircle size={12} className="mr-1" /> Aberto
            </span>
          );
    }
  };

  const getPriorityBadge = (p: TicketPriority) => {
    let colorClass = '';
    let label = '';
    switch(p) {
        case TicketPriority.LOW: colorClass = 'bg-green-50 text-green-700 border-green-100'; label = 'Baixa'; break;
        case TicketPriority.MEDIUM: colorClass = 'bg-yellow-50 text-yellow-700 border-yellow-100'; label = 'Média'; break;
        case TicketPriority.HIGH: colorClass = 'bg-orange-50 text-orange-700 border-orange-100'; label = 'Alta'; break;
        case TicketPriority.CRITICAL: colorClass = 'bg-red-50 text-red-700 border-red-100'; label = 'Crítica'; break;
        default: colorClass = 'bg-gray-50 text-gray-700'; label = p;
    }
    return <span className={`px-2 py-1 rounded border text-xs font-medium ${colorClass}`}>{label}</span>;
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
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
             <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text" 
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Buscar por ID, assunto ou descrição..." 
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
             </div>
             
             <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                 <button 
                    onClick={handleExportXLSX}
                    className="flex-1 lg:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors shadow-sm text-sm font-medium whitespace-nowrap"
                    title="Exportar dados filtrados para Excel"
                 >
                    <FileSpreadsheet size={18} />
                    <span>Exportar Excel</span>
                 </button>
                 <button 
                    onClick={onCreateTicket}
                    className="flex-1 lg:flex-none flex items-center justify-center space-x-2 px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm text-sm font-medium whitespace-nowrap"
                >
                    <Plus size={18} />
                    <span>Novo Chamado</span>
                 </button>
             </div>
          </div>

          {/* Advanced Filters Row */}
          <div className="flex flex-col xl:flex-row gap-3 items-start xl:items-center">
             <div className="flex items-center gap-2 w-full xl:w-auto mb-2 xl:mb-0">
                <Filter size={16} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filtros:</span>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 w-full flex-1">
                {/* Status Filter */}
                <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 outline-none bg-white focus:border-primary-500"
                >
                    <option value="ALL">Todos os Status</option>
                    <option value="OPEN">Aberto</option>
                    <option value="IN_PROGRESS">Em Progresso</option>
                    <option value="RESOLVED">Resolvido</option>
                    <option value="CLOSED">Fechado</option>
                </select>

                {/* Category Filter */}
                <select 
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 outline-none bg-white focus:border-primary-500"
                >
                    <option value="ALL">Todas Categorias</option>
                    {uniqueCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>

                {/* Requester Filter */}
                <select 
                    value={requesterFilter}
                    onChange={(e) => setRequesterFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 outline-none bg-white focus:border-primary-500"
                >
                    <option value="ALL">Todos Solicitantes</option>
                    {uniqueRequesters.map(req => (
                        <option key={req} value={req}>{req}</option>
                    ))}
                </select>

                {/* Date Filter Group */}
                <div className="flex items-center gap-0 border border-gray-200 rounded-lg overflow-hidden w-full">
                     <select
                        value={dateType}
                        onChange={(e) => setDateType(e.target.value as any)}
                        className="bg-gray-50 text-xs font-medium text-gray-600 outline-none px-2 py-2.5 border-r border-gray-200 w-24"
                     >
                         <option value="created">Abertura</option>
                         <option value="resolved">Resolução</option>
                         <option value="updated">Atualiz.</option>
                     </select>
                     <input 
                        type="date"
                        value={dateValue}
                        onChange={(e) => setDateValue(e.target.value)}
                        className="flex-1 px-2 py-2 text-sm text-gray-600 outline-none bg-white"
                     />
                </div>
             </div>
             
             {(searchText || statusFilter !== 'ALL' || categoryFilter !== 'ALL' || requesterFilter !== 'ALL' || dateValue) && (
                 <button 
                    onClick={clearFilters}
                    className="text-xs text-red-500 font-medium hover:underline whitespace-nowrap px-2"
                 >
                    Limpar Filtros
                 </button>
             )}
          </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-[11px] font-semibold tracking-wider">
                    <tr>
                        <th className="px-6 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('ticketNumber')}>
                            <div className="flex items-center">ID <SortIcon field="ticketNumber" /></div>
                        </th>
                        <th className="px-6 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('title')}>
                            <div className="flex items-center">Assunto <SortIcon field="title" /></div>
                        </th>
                        <th className="px-6 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('requester')}>
                            <div className="flex items-center">Solicitante <SortIcon field="requester" /></div>
                        </th>
                        <th className="px-6 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('category')}>
                            <div className="flex items-center">Categoria <SortIcon field="category" /></div>
                        </th>
                        <th className="px-6 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('priority')}>
                            <div className="flex items-center">Prioridade <SortIcon field="priority" /></div>
                        </th>
                        <th className="px-6 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('createdAt')}>
                            <div className="flex items-center">Data Abertura <SortIcon field="createdAt" /></div>
                        </th>
                        <th className="px-6 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('resolvedAt')}>
                            <div className="flex items-center">Data Resolução <SortIcon field="resolvedAt" /></div>
                        </th>
                        <th className="px-6 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('updatedAt')}>
                            <div className="flex items-center">Última At. <SortIcon field="updatedAt" /></div>
                        </th>
                         <th className="px-6 py-3 cursor-pointer hover:bg-gray-100 text-right" onClick={() => handleSort('status')}>
                            <div className="flex items-center justify-end">Status <SortIcon field="status" /></div>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredTickets.map((ticket) => (
                        <tr 
                            key={ticket.id} 
                            onClick={() => onSelectTicket(ticket)}
                            className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                        >
                            <td className="px-6 py-4 text-sm font-medium text-gray-500">
                                #{ticket.ticketNumber}
                            </td>
                            <td className="px-6 py-4">
                                <div>
                                    <p className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">{ticket.title}</p>
                                    {/* Largura ajustada para mobile (150px) e desktop (300px) */}
                                    <p className="text-xs text-gray-500 truncate max-w-[150px] md:max-w-[300px]">{ticket.description}</p>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                                {ticket.requester}
                            </td>
                             <td className="px-6 py-4">
                                <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600 border border-gray-200">
                                    {ticket.category}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                {getPriorityBadge(ticket.priority)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                                {formatDate(ticket.createdAt)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                                {formatDate(ticket.resolvedAt)}
                            </td>
                             <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                                {formatDate(ticket.updatedAt)}
                            </td>
                            <td className="px-6 py-4 text-right">
                                {getStatusBadge(ticket.status)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            {filteredTickets.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="bg-gray-50 p-4 rounded-full mb-3">
                        <Search size={24} className="text-gray-400" />
                    </div>
                    <p className="text-gray-900 font-medium">Nenhum chamado encontrado.</p>
                    <p className="text-sm text-gray-500 mt-1">Tente ajustar seus filtros ou crie um novo chamado.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
