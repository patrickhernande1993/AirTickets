
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { Ticket } from '../types';
import { Loader2, Download, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  ticketId: string;
  ticketNumber?: number;
  actorId: string;
  actorName?: string;
  actorEmail?: string;
  action: string;
  details?: string;
  createdAt: Date;
}

interface AuditLogViewProps {
  onSelectTicket: (ticket: Ticket) => void;
}

const ACTION_COLORS: Record<string, string> = {
  CREATED: 'bg-green-100 text-green-700 border-green-300',
  STATUS_CHANGE: 'bg-blue-100 text-blue-700 border-blue-300',
  EDITED: 'bg-orange-100 text-orange-700 border-orange-300',
};

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'Criado',
  STATUS_CHANGE: 'Status',
  EDITED: 'Editado',
};

const PAGE_SIZE = 50;

export const AuditLogView: React.FC<AuditLogViewProps> = ({ onSelectTicket }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [userFilter, setUserFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        // Query simples sem join — joins falham silenciosamente se RLS bloquear
        const { data: logData, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);

        if (error) {
          console.error('Erro RLS em audit_logs:', error.message);
          throw error;
        }

        // Busca nomes dos atores separadamente
        const actorIds = [...new Set((logData || []).map((l: any) => l.actor_id).filter(Boolean))];
        let profilesMap: Record<string, { name: string; email: string }> = {};
        if (actorIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, name, email')
            .in('id', actorIds);
          (profilesData || []).forEach((p: any) => { profilesMap[p.id] = { name: p.name, email: p.email }; });
        }

        // Busca ticket_numbers separadamente
        const ticketIds = [...new Set((logData || []).map((l: any) => l.ticket_id).filter(Boolean))];
        let ticketsMap: Record<string, number> = {};
        if (ticketIds.length > 0) {
          const { data: ticketsData } = await supabase
            .from('tickets')
            .select('id, ticket_number')
            .in('id', ticketIds);
          (ticketsData || []).forEach((t: any) => { ticketsMap[t.id] = t.ticket_number; });
        }

        const formatted: AuditLogEntry[] = (logData || []).map((l: any) => ({
          id: l.id,
          ticketId: l.ticket_id,
          ticketNumber: ticketsMap[l.ticket_id],
          actorId: l.actor_id,
          actorName: profilesMap[l.actor_id]?.name,
          actorEmail: profilesMap[l.actor_id]?.email,
          action: l.action,
          details: l.details,
          createdAt: new Date(l.created_at),
        }));

        setLogs(formatted);
      } catch (e) {
        console.error('Erro ao buscar audit logs:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  // Lista de usuários únicos para o dropdown
  const uniqueUsers = useMemo(() => {
    const map = new Map<string, string>();
    logs.forEach(l => {
      if (l.actorId && l.actorName) map.set(l.actorId, l.actorName);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (actionFilter !== 'ALL' && l.action !== actionFilter) return false;
      if (userFilter !== 'ALL' && l.actorId !== userFilter) return false;
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (l.createdAt < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (l.createdAt > to) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const inActor = (l.actorName || '').toLowerCase().includes(q) || (l.actorEmail || '').toLowerCase().includes(q);
        const inDetails = (l.details || '').toLowerCase().includes(q);
        if (!inActor && !inDetails) return false;
      }
      return true;
    });
  }, [logs, actionFilter, dateFrom, dateTo, search]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const pagedLogs = filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExportCSV = () => {
    const header = ['Data/Hora', 'Ator', 'Email', 'Ação', 'Detalhes', 'Chamado #'];
    const rows = filteredLogs.map(l => [
      l.createdAt.toLocaleString('pt-BR'),
      l.actorName || l.actorId,
      l.actorEmail || '',
      l.action,
      l.details || '',
      l.ticketNumber ? `#${l.ticketNumber}` : l.ticketId,
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AirService_AuditLog_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTicketClick = async (ticketId: string) => {
    try {
      const { data } = await supabase
        .from('tickets')
        .select('*, profiles:requester_id(name)')
        .eq('id', ticketId)
        .single();
      if (data) {
        onSelectTicket({
          id: data.id,
          ticketNumber: data.ticket_number,
          title: data.title,
          description: data.description,
          requester: data.profiles?.name || data.requester_name,
          requesterId: data.requester_id,
          priority: data.priority,
          status: data.status,
          category: data.category,
          createdAt: new Date(data.created_at),
          updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(data.created_at),
          resolvedAt: data.resolved_at ? new Date(data.resolved_at) : undefined,
          attachments: data.attachments || [],
        });
      }
    } catch (e) {
      console.error('Erro ao abrir chamado:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-none border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Action filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Ação</label>
            <div className="relative">
              <select
                value={actionFilter}
                onChange={e => { setActionFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-slate-300 rounded-none text-sm font-medium bg-white appearance-none pr-8 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="ALL">Todas</option>
                <option value="CREATED">Criado</option>
                <option value="STATUS_CHANGE">Status</option>
                <option value="EDITED">Editado</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          {/* User filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Usuário</label>
            <div className="relative">
              <select
                value={userFilter}
                onChange={e => { setUserFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium bg-white appearance-none pr-8 focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-[160px]"
              >
                <option value="ALL">Todos os usuários</option>
                {uniqueUsers.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          {/* Date from */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">De</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-slate-300 rounded-none text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Date to */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Até</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-slate-300 rounded-none text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Buscar</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Ator ou detalhe..."
                className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-none text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Limpar filtros */}
          {(actionFilter !== 'ALL' || userFilter !== 'ALL' || dateFrom || dateTo || search) && (
            <button
              onClick={() => { setActionFilter('ALL'); setUserFilter('ALL'); setDateFrom(''); setDateTo(''); setSearch(''); setPage(1); }}
              className="flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs font-medium transition-colors"
            >
              <X size={13} /> Limpar
            </button>
          )}

          {/* Export */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-medium text-xs transition-colors ml-auto"
          >
            <Download size={14} />
            Exportar CSV
          </button>
        </div>

        <div className="mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          {filteredLogs.length} registro{filteredLogs.length !== 1 ? 's' : ''} encontrado{filteredLogs.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-none border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-primary-600" />
          </div>
        ) : pagedLogs.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="font-bold uppercase tracking-widest text-sm">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Data/Hora', 'Ator', 'Ação', 'Detalhes', 'Chamado'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-600 font-mono whitespace-nowrap">
                      {log.createdAt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-medium text-slate-900">{log.actorName || '—'}</div>
                      <div className="text-[10px] text-slate-400">{log.actorEmail || log.actorId}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 border rounded-none text-[10px] font-bold uppercase tracking-widest ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-600 border-slate-300'}`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-[260px] truncate">
                      {log.details || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {log.ticketId ? (
                        <button
                          onClick={() => handleTicketClick(log.ticketId)}
                          className="text-xs font-bold text-primary-600 hover:text-primary-800 hover:underline transition-colors"
                        >
                          #{log.ticketNumber || '?'}
                        </button>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Página {page} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 border border-slate-200 rounded-none text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 border border-slate-200 rounded-none text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
