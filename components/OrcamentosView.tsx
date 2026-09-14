
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { User, OrcamentoRequest } from '../types';
import {
  Plus, X, Upload, Paperclip, ExternalLink, Loader2,
  CheckCircle2, Clock, AlertCircle, XCircle, ChevronDown,
  Search, Filter, RefreshCw
} from 'lucide-react';

interface OrcamentosViewProps {
  currentUser: User;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

type StatusOrcamento = OrcamentoRequest['status'];

const STATUS_LABELS: Record<StatusOrcamento, string> = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

const STATUS_COLORS: Record<StatusOrcamento, string> = {
  PENDENTE:    'bg-yellow-100 text-yellow-800',
  EM_ANDAMENTO:'bg-blue-100 text-blue-800',
  CONCLUIDO:   'bg-green-100 text-green-800',
  CANCELADO:   'bg-red-100 text-red-800',
};

const STATUS_ICONS: Record<StatusOrcamento, React.ElementType> = {
  PENDENTE:    Clock,
  EM_ANDAMENTO:AlertCircle,
  CONCLUIDO:   CheckCircle2,
  CANCELADO:   XCircle,
};

const PRIORIDADE_COLORS: Record<string, string> = {
  'Crítico': 'bg-red-100 text-red-700 border border-red-200',
  'Normal':  'bg-slate-100 text-slate-600',
};

const emptyForm = {
  cliente: '',
  tipo_solicitacao: 'Orçamento' as OrcamentoRequest['tipo_solicitacao'],
  prioridade: 'Normal' as OrcamentoRequest['prioridade'],
  observacao: '',
  status_produto: 'NOVO' as OrcamentoRequest['status_produto'],
};

export const OrcamentosView: React.FC<OrcamentosViewProps> = ({ currentUser, showToast }) => {
  const isAdmin = currentUser.role === 'ADMIN';

  const [items, setItems] = useState<OrcamentoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusOrcamento | 'ALL'>('ALL');
  const [filterOv, setFilterOv] = useState('');
  const [detailItem, setDetailItem] = useState<OrcamentoRequest | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('orcamentos')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.eq('requester_id', currentUser.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setItems(data || []);
    } catch (e: any) {
      showToast('Erro ao carregar solicitações: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPendingFiles(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const removeFile = (idx: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (pendingFiles.length === 0) return [];
    setUploadingFiles(true);
    const urls: string[] = [];
    for (const file of pendingFiles) {
      const path = `orcamentos/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('attachments').upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from('attachments').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    setUploadingFiles(false);
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cliente.trim()) { showToast('Informe o cliente.', 'error'); return; }
    setSubmitting(true);
    try {
      const arquivos = await uploadFiles();
      const { error } = await supabase.from('orcamentos').insert({
        cliente: form.cliente.trim(),
        tipo_solicitacao: form.tipo_solicitacao,
        prioridade: form.prioridade,
        observacao: form.observacao.trim() || null,
        status_produto: form.status_produto,
        arquivos,
        status: 'PENDENTE',
        finalizado: false,
        requester_id: currentUser.id,
        requester_name: currentUser.name,
      });
      if (error) throw error;
      showToast('Solicitação enviada com sucesso!');
      setForm({ ...emptyForm });
      setPendingFiles([]);
      setShowForm(false);
      fetchItems();
    } catch (e: any) {
      showToast('Erro ao enviar solicitação: ' + e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const [editingOv, setEditingOv] = useState<string | null>(null);
  const [ovInput, setOvInput] = useState('');

  const handleStatusChange = async (item: OrcamentoRequest, newStatus: StatusOrcamento) => {
    setUpdatingStatus(true);
    try {
      const updates: Partial<OrcamentoRequest> = { status: newStatus };
      if (newStatus === 'CONCLUIDO') updates.finalizado = true;
      const { error } = await supabase.from('orcamentos').update(updates).eq('id', item.id);
      if (error) throw error;
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...updates } : i));
      if (detailItem?.id === item.id) setDetailItem(prev => prev ? { ...prev, ...updates } : null);
      showToast('Status atualizado!');
    } catch (e: any) {
      showToast('Erro ao atualizar status: ' + e.message, 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveOv = async (item: OrcamentoRequest) => {
    try {
      const { error } = await supabase.from('orcamentos').update({ numero_ov: ovInput.trim() || null }).eq('id', item.id);
      if (error) throw error;
      const updated = { ...item, numero_ov: ovInput.trim() || undefined };
      setItems(prev => prev.map(i => i.id === item.id ? updated : i));
      setDetailItem(updated);
      setEditingOv(null);
      showToast('Nº OV/PD salvo!');
    } catch (e: any) {
      showToast('Erro ao salvar: ' + e.message, 'error');
    }
  };

  const filtered = items.filter(item => {
    const matchSearch = !search ||
      item.cliente.toLowerCase().includes(search.toLowerCase()) ||
      item.requester_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || item.status === filterStatus;
    const matchOv = !filterOv ||
      (item.numero_ov || '').toLowerCase().includes(filterOv.toLowerCase());
    return matchSearch && matchStatus && matchOv;
  });

  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Solicitação de Orçamentos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isAdmin ? 'Gerencie todas as solicitações dos representantes' : 'Envie e acompanhe suas solicitações de orçamento'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchItems} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Atualizar">
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={16} />
            Nova Solicitação
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente ou solicitante..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={filterOv}
            onChange={e => setFilterOv(e.target.value)}
            placeholder="Nº OV ou PD..."
            className="pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-36"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={14} className="text-gray-400" />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-700"
          >
            <option value="ALL">Todos os status</option>
            {(Object.keys(STATUS_LABELS) as StatusOrcamento[]).map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        {(filterOv || search || filterStatus !== 'ALL') && (
          <button
            onClick={() => { setSearch(''); setFilterOv(''); setFilterStatus('ALL'); }}
            className="text-xs text-red-500 hover:underline font-medium whitespace-nowrap"
          >
            Limpar filtros
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} solicitação(ões)</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin text-primary-600" size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <ClipboardListIcon size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-500">Nenhuma solicitação encontrada</p>
            <p className="text-sm mt-1">Clique em "Nova Solicitação" para começar</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nº OV/PD</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Prioridade</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Produto</th>
                  {isAdmin && <th className="text-left px-4 py-3 font-medium text-gray-600">Solicitante</th>}
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(item => {
                  const StatusIcon = STATUS_ICONS[item.status];
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-sm font-bold text-primary-700">
                        {item.numero_ov || <span className="text-gray-300 font-normal">—</span>}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{item.cliente}</td>
                      <td className="px-4 py-3 text-gray-600">{item.tipo_solicitacao}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORIDADE_COLORS[item.prioridade]}`}>
                          {item.prioridade}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {item.status_produto}
                        </span>
                      </td>
                      {isAdmin && <td className="px-4 py-3 text-gray-500">{item.requester_name}</td>}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.status]}`}>
                          <StatusIcon size={11} />
                          {STATUS_LABELS[item.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{fmtDate(item.created_at)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDetailItem(item)}
                          className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">Nova Solicitação de Orçamento</h2>
              <button onClick={() => { setShowForm(false); setForm({ ...emptyForm }); setPendingFiles([]); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente <span className="text-red-500">*</span></label>
                <input
                  value={form.cliente}
                  onChange={e => setForm(p => ({ ...p, cliente: e.target.value }))}
                  placeholder="Nome do cliente"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Solicitação</label>
                  <select
                    value={form.tipo_solicitacao}
                    onChange={e => setForm(p => ({ ...p, tipo_solicitacao: e.target.value as any }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option>Orçamento</option>
                    <option>Amostra</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
                  <select
                    value={form.prioridade}
                    onChange={e => setForm(p => ({ ...p, prioridade: e.target.value as any }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option>Normal</option>
                    <option>Crítico</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status do Produto</label>
                <select
                  value={form.status_produto}
                  onChange={e => setForm(p => ({ ...p, status_produto: e.target.value as any }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="NOVO">NOVO</option>
                  <option value="RECORRENTE">RECORRENTE</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
                <textarea
                  value={form.observacao}
                  onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))}
                  placeholder="Detalhes adicionais sobre o orçamento..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Arquivos anexados</label>
                <div
                  className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-primary-400 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload size={20} className="mx-auto text-gray-400 mb-1" />
                  <p className="text-sm text-gray-500">Clique para selecionar arquivos</p>
                  <p className="text-xs text-gray-400 mt-0.5">Imagens, PDFs, documentos</p>
                </div>
                <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
                {pendingFiles.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {pendingFiles.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                        <Paperclip size={12} className="flex-shrink-0 text-gray-400" />
                        <span className="flex-1 truncate">{f.name}</span>
                        <button type="button" onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500">
                          <X size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </form>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm({ ...emptyForm }); setPendingFiles([]); }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || uploadingFiles}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-lg transition-colors disabled:opacity-60"
              >
                {(submitting || uploadingFiles) && <Loader2 size={14} className="animate-spin" />}
                {uploadingFiles ? 'Enviando arquivos...' : submitting ? 'Salvando...' : 'Enviar Solicitação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail / Admin Modal */}
      {detailItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{detailItem.cliente}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{fmtDate(detailItem.created_at)} · {detailItem.requester_name}</p>
              </div>
              <button onClick={() => setDetailItem(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              {/* Nº OV/PD */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Nº OV / PD</p>
                {isAdmin && editingOv === detailItem.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={ovInput}
                      onChange={e => setOvInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveOv(detailItem); if (e.key === 'Escape') setEditingOv(null); }}
                      placeholder="Ex: OV12345 ou PD6789"
                      className="flex-1 border border-primary-400 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                    />
                    <button onClick={() => handleSaveOv(detailItem)} className="px-3 py-1.5 bg-primary-600 text-white text-xs rounded-lg hover:bg-primary-500 font-medium">Salvar</button>
                    <button onClick={() => setEditingOv(null)} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200">Cancelar</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-mono font-bold ${detailItem.numero_ov ? 'text-primary-700' : 'text-gray-300'}`}>
                      {detailItem.numero_ov || '—'}
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => { setEditingOv(detailItem.id); setOvInput(detailItem.numero_ov || ''); }}
                        className="text-xs text-gray-400 hover:text-primary-600 underline"
                      >
                        {detailItem.numero_ov ? 'Editar' : 'Informar'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Tipo de Solicitação" value={detailItem.tipo_solicitacao} />
                <Field label="Prioridade">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORIDADE_COLORS[detailItem.prioridade]}`}>
                    {detailItem.prioridade}
                  </span>
                </Field>
                <Field label="Status do Produto">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{detailItem.status_produto}</span>
                </Field>
                <Field label="Finalizado" value={detailItem.finalizado ? 'Sim' : 'Não'} />
              </div>

              {detailItem.observacao && (
                <Field label="Observação" value={detailItem.observacao} />
              )}

              {detailItem.arquivos && detailItem.arquivos.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Arquivos</p>
                  <ul className="space-y-1">
                    {detailItem.arquivos.map((url, i) => (
                      <li key={i}>
                        <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-primary-600 hover:underline">
                          <ExternalLink size={12} />
                          {url.split('/').pop()}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {isAdmin && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Alterar Status</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(STATUS_LABELS) as StatusOrcamento[]).map(s => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(detailItem, s)}
                        disabled={updatingStatus || detailItem.status === s}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                          detailItem.status === s
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-default'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-primary-400 hover:text-primary-700'
                        }`}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0 flex justify-end">
              <button onClick={() => setDetailItem(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; value?: string; children?: React.ReactNode }> = ({ label, value, children }) => (
  <div>
    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
    {children ?? <p className="text-sm text-gray-800">{value || '—'}</p>}
  </div>
);

const ClipboardListIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" />
  </svg>
);
