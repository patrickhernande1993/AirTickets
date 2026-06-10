
import React, { useState, useEffect } from 'react';
import { Ticket, TicketPriority, TicketStatus, User } from '../types';
import { Loader2, ArrowLeft, Paperclip, X, FileText, Check, Sparkles } from 'lucide-react';
import { supabase } from '../services/supabase';
import { SECTORS } from '../services/sectors';
import { v4 as uuidv4 } from 'uuid';

interface AISuggestion {
  priority: TicketPriority;
  category: string;
  summary: string;
}

const analyzeWithGemini = async (description: string): Promise<AISuggestion | null> => {
  try {
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (!apiKey) return null;
    const prompt = `Analise esta descrição de chamado de suporte técnico e retorne um JSON com:
{
  "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "category": string (máximo 30 chars, em português),
  "summary": string (resumo em 1 linha)
}

Critérios de prioridade:
- CRITICAL: sistema parado, produção afetada, perda de dados
- HIGH: funcionalidade importante bloqueada, muitos usuários afetados
- MEDIUM: problema que atrapalha o trabalho mas tem contorno
- LOW: dúvida, solicitação simples, melhoria

Descrição: ${description}

Retorne APENAS o JSON, sem markdown, sem explicações.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return null;
    const parsed = JSON.parse(text);
    return {
      priority: parsed.priority as TicketPriority,
      category: parsed.category,
      summary: parsed.summary,
    };
  } catch {
    return null;
  }
};

interface TicketFormProps {
  onSave: (ticket: Omit<Ticket, 'id' | 'ticketNumber'>) => Promise<void>;
  onCancel: () => void;
  initialData?: Ticket; // Optional for Edit mode
  currentUser: User; // Obrigatório para pegar o nome automaticamente
  showToast: (message: string, type?: 'success' | 'error') => void;
}

const CATEGORIES = [
  'ERP MEGA',
  'Microgestão',
  'Power BI',
  'Acessos',
  'Outro'
];

export const TicketForm: React.FC<TicketFormProps> = ({ onSave, onCancel, initialData, currentUser, showToast }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>(TicketPriority.LOW);
  const [category, setCategory] = useState(CATEGORIES[0]);
  
  // Date states
  const nowStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [createdAtStr, setCreatedAtStr] = useState(nowStr);
  const [resolvedAtStr, setResolvedAtStr] = useState('');
  const [sector, setSector] = useState('');
  
  // Requester State for Admins
  const [users, setUsers] = useState<{id: string, name: string}[]>([]);
  const [selectedRequesterId, setSelectedRequesterId] = useState(currentUser.id);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    if (currentUser.role === 'ADMIN') {
        const fetchUsers = async () => {
            setIsLoadingUsers(true);
            const { data, error } = await supabase.from('profiles').select('id, name').order('name');
            if (!error && data) {
                setUsers(data);
            }
            setIsLoadingUsers(false);
        };
        fetchUsers();
    }
  }, [currentUser.role]);
  
  // Attachments State
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);

  const handleAnalyzeWithAI = async () => {
    if (description.length <= 30 || isAnalyzing) return;
    setIsAnalyzing(true);
    setAiSuggestion(null);
    try {
      const result = await analyzeWithGemini(description);
      if (result) setAiSuggestion(result);
    } catch {
      // silent
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyAISuggestion = () => {
    if (!aiSuggestion) return;
    setPriority(aiSuggestion.priority);
    if (CATEGORIES.includes(aiSuggestion.category)) {
      setCategory(aiSuggestion.category);
    }
    setAiSuggestion(null);
  };

  const PRIORITY_BADGE_COLORS: Record<TicketPriority, string> = {
    [TicketPriority.LOW]: 'bg-green-100 text-green-700 border-green-300',
    [TicketPriority.MEDIUM]: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    [TicketPriority.HIGH]: 'bg-orange-100 text-orange-800 border-orange-300',
    [TicketPriority.CRITICAL]: 'bg-red-100 text-red-800 border-red-300',
  };
  const PRIORITY_LABELS: Record<TicketPriority, string> = {
    [TicketPriority.LOW]: 'Baixa',
    [TicketPriority.MEDIUM]: 'Média',
    [TicketPriority.HIGH]: 'Alta',
    [TicketPriority.CRITICAL]: 'Crítica',
  };

  useEffect(() => {
    if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description);
        setPriority(initialData.priority);
        setCategory(initialData.category);
        setAttachments(initialData.attachments || []);
        setSector(initialData.sector || '');
        setSelectedRequesterId(initialData.requesterId);
        
        const localCreated = new Date(initialData.createdAt.getTime() - initialData.createdAt.getTimezoneOffset() * 60000);
        setCreatedAtStr(localCreated.toISOString().slice(0, 16));
        
        if (initialData.resolvedAt) {
            const localResolved = new Date(initialData.resolvedAt.getTime() - initialData.resolvedAt.getTimezoneOffset() * 60000);
            setResolvedAtStr(localResolved.toISOString().slice(0, 16));
        }
    }
  }, [initialData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      
      setIsUploading(true);
      setUploadProgress(0);

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      // Adiciona timestamp para evitar conflitos de nome
      const fileName = `${Date.now()}_${uuidv4()}.${fileExt}`;
      const filePath = `${currentUser.id}/${fileName}`;

      // Simulação de progresso visual (já que o supabase upload simples não tem callback de progresso nativo exposto facilmente)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
            if (prev >= 90) return prev; // Segura em 90% até terminar
            return prev + 10;
        });
      }, 100);

      try {
          const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          // Upload concluído
          clearInterval(progressInterval);
          setUploadProgress(100);

          const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);
          
          if (data) {
              // Pequeno delay para o usuário ver o 100%
              setTimeout(() => {
                  setAttachments(prev => [...prev, data.publicUrl]);
                  setIsUploading(false);
                  setUploadProgress(0);
              }, 500);
          } else {
              setIsUploading(false);
          }
      } catch (error: any) {
          console.error('Error uploading file:', error);
          showToast(`Erro ao fazer upload: ${error.message || 'Verifique as permissões do Bucket.'}`, 'error');
          setIsUploading(false);
          setUploadProgress(0);
      } finally {
          clearInterval(progressInterval);
          // Reset input para permitir selecionar o mesmo arquivo se der erro
          e.target.value = ''; 
      }
  };

  const removeAttachment = (urlToRemove: string) => {
      setAttachments(prev => prev.filter(url => url !== urlToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const selectedUser = users.find(u => u.id === selectedRequesterId);
    const requesterName = selectedUser ? selectedUser.name : currentUser.name;

    try {
      await onSave({
        title,
        description,
        requester: requesterName,
        requesterId: selectedRequesterId,
        priority,
        category,
        status: initialData ? initialData.status : TicketStatus.OPEN,
        attachments: attachments,
        createdAt: new Date(createdAtStr),
        resolvedAt: resolvedAtStr ? new Date(resolvedAtStr) : undefined,
        sector: sector || undefined
      });
    } catch (error) {
      console.error('Error in TicketForm handleSubmit:', error);
      // Toast handles the error message, we just reset loading state
    } finally {
      setIsSaving(false);
    }
  };

  // Configuração visual dos cartões de prioridade
  const PRIORITY_OPTIONS = [
    { 
        id: TicketPriority.LOW, 
        label: 'Baixa', 
        colorClass: 'hover:border-green-400 hover:bg-green-50', 
        selectedClass: 'border-green-500 bg-green-50 text-green-700 ring-1 ring-green-500',
        desc: 'Dúvidas ou solicitações simples' 
    },
    { 
        id: TicketPriority.MEDIUM, 
        label: 'Média', 
        colorClass: 'hover:border-yellow-400 hover:bg-yellow-50', 
        selectedClass: 'border-yellow-500 bg-yellow-50 text-yellow-800 ring-1 ring-yellow-500',
        desc: 'Problemas que afetam o trabalho' 
    },
    { 
        id: TicketPriority.HIGH, 
        label: 'Alta', 
        colorClass: 'hover:border-orange-400 hover:bg-orange-50', 
        selectedClass: 'border-orange-500 bg-orange-50 text-orange-800 ring-1 ring-orange-500',
        desc: 'Urgente, impede funções críticas' 
    },
    { 
        id: TicketPriority.CRITICAL, 
        label: 'Crítica', 
        colorClass: 'hover:border-red-400 hover:bg-red-50', 
        selectedClass: 'border-red-500 bg-red-50 text-red-800 ring-1 ring-red-500',
        desc: 'Sistema parado ou emergência' 
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={onCancel} className="flex items-center text-slate-500 hover:text-slate-700 mb-6 transition-colors font-bold text-xs uppercase tracking-widest">
        <ArrowLeft size={14} className="mr-2" />
        Voltar para lista
      </button>

      <div className="bg-white rounded-lg border border-slate-100 shadow-card overflow-hidden">
        {/* Cabeçalho Visual */}
        <div className="p-6 border-b border-slate-200 bg-slate-50 text-slate-900">
          <div className="flex justify-between items-center">
             <div>
                <h2 className="text-xl font-bold uppercase tracking-tight">{initialData ? 'Editar Chamado' : 'Abrir Novo Chamado'}</h2>
                <p className="text-slate-500 text-sm mt-1">Preencha os detalhes técnicos para abertura do ticket.</p>
             </div>
             <div className="hidden md:block bg-white p-3 rounded-lg border border-slate-100 shadow-card">
                <FileText size={24} className="text-primary-600" />
             </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          
          {/* Seção 1: Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-4">
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Solicitante</label>
                    {currentUser.role === 'ADMIN' ? (
                       <div className="relative">
                           <select
                               value={selectedRequesterId}
                               onChange={(e) => setSelectedRequesterId(e.target.value)}
                               className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none bg-white appearance-none cursor-pointer hover:border-primary-400 transition-colors text-sm font-medium"
                               disabled={isLoadingUsers}
                           >
                               {isLoadingUsers ? (
                                   <option value={currentUser.id}>Carregando usuários...</option>
                               ) : (
                                   <>
                                     {!users.find(u => u.id === currentUser.id) && (
                                         <option value={currentUser.id}>{currentUser.name}</option>
                                     )}
                                     {users.map(u => (
                                         <option key={u.id} value={u.id}>{u.name}</option>
                                     ))}
                                   </>
                               )}
                           </select>
                           <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                               <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                           </div>
                       </div>
                    ) : (
                        <input
                            type="text"
                            value={currentUser.name}
                            disabled
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed font-mono text-sm"
                        />
                    )}
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Categoria</label>
                    <div className="relative">
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none bg-white appearance-none cursor-pointer hover:border-primary-400 transition-colors text-sm font-medium"
                        >
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Setor (Opcional)</label>
                    <div className="relative">
                    <select
                        value={sector}
                        onChange={(e) => setSector(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none bg-white transition-colors text-sm font-medium appearance-none pr-8"
                    >
                        <option value="">Selecione o setor...</option>
                        {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                    </div>
                </div>
                {currentUser.role === 'ADMIN' && (
                  <>
                    <div>
                         <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Abertura</label>
                         <input
                             type="datetime-local"
                             required
                             value={createdAtStr}
                             onChange={(e) => setCreatedAtStr(e.target.value)}
                             className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none bg-white transition-colors text-sm font-medium"
                         />
                    </div>
                    <div>
                         <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 text-slate-400">Fechamento (Opcional)</label>
                         <input
                             type="datetime-local"
                             value={resolvedAtStr}
                             onChange={(e) => setResolvedAtStr(e.target.value)}
                             className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none bg-white transition-colors text-sm font-medium"
                             placeholder="Apenas se Resolvido"
                         />
                    </div>
                  </>
                )}
             </div>

             <div className="space-y-4">
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Assunto</label>
                    <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all placeholder-slate-400 text-sm font-medium"
                        placeholder="Ex: Erro ao acessar o ERP"
                    />
                </div>
             </div>
          </div>

          <div className="border-t border-slate-100 my-2"></div>

          {/* Seção 2: Detalhes e Prioridade */}
          <div className="space-y-6">
             <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Descrição Detalhada</label>
                <div className="relative">
                    <textarea
                        required
                        rows={6}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-none leading-relaxed text-sm font-medium"
                        placeholder="Descreva o que aconteceu, quais passos você seguiu e se apareceu alguma mensagem de erro..."
                    />
                    <div className="absolute bottom-3 right-3 text-[10px] font-bold text-slate-400 uppercase tracking-tight pointer-events-none">
                        Seja específico e técnico.
                    </div>
                </div>
             </div>

             {/* AI Analyze Button */}
             {description.length > 30 && (
               <div className="flex justify-end">
                 <button
                   type="button"
                   onClick={handleAnalyzeWithAI}
                   disabled={isAnalyzing}
                   className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs uppercase tracking-widest transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                 >
                   {isAnalyzing ? (
                     <Loader2 size={14} className="animate-spin mr-1" />
                   ) : (
                     <Sparkles size={14} className="mr-1" />
                   )}
                   {isAnalyzing ? 'Analisando...' : 'Analisar com IA 🤖'}
                 </button>
               </div>
             )}

             {/* AI Suggestion Card */}
             {aiSuggestion && (
               <div className="border border-indigo-200 bg-indigo-50 rounded-lg p-4 space-y-3">
                 <div className="flex items-center justify-between">
                   <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest flex items-center gap-1">
                     <Sparkles size={12} /> 💡 Sugestão da IA
                   </span>
                   <button
                     type="button"
                     onClick={() => setAiSuggestion(null)}
                     className="text-indigo-400 hover:text-indigo-600 transition-colors"
                   >
                     <X size={14} />
                   </button>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                   <div>
                     <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Prioridade</span>
                     <span className={`inline-block px-2 py-1 border rounded-lg font-bold text-[11px] uppercase tracking-widest ${PRIORITY_BADGE_COLORS[aiSuggestion.priority]}`}>
                       {PRIORITY_LABELS[aiSuggestion.priority]}
                     </span>
                   </div>
                   <div>
                     <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Categoria Sugerida</span>
                     <span className="font-medium text-slate-700">{aiSuggestion.category}</span>
                   </div>
                   <div>
                     <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Resumo</span>
                     <span className="text-slate-600 leading-tight">{aiSuggestion.summary}</span>
                   </div>
                 </div>
                 <div className="flex gap-2 pt-1">
                   <button
                     type="button"
                     onClick={applyAISuggestion}
                     className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest transition-colors"
                   >
                     Aplicar sugestões
                   </button>
                   <button
                     type="button"
                     onClick={() => setAiSuggestion(null)}
                     className="px-4 py-1.5 border border-slate-300 text-slate-600 hover:bg-slate-100 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-colors"
                   >
                     Ignorar
                   </button>
                 </div>
               </div>
             )}

             <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Defina a Prioridade</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {PRIORITY_OPTIONS.map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => setPriority(option.id)}
                            className={`
                                relative flex flex-col items-start p-3 rounded-lg border transition-all duration-200 text-left
                                ${priority === option.id ? option.selectedClass : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'}
                            `}
                        >
                            <div className="flex items-center justify-between w-full mb-1">
                                <span className="font-bold text-xs uppercase tracking-tight">{option.label}</span>
                                {priority === option.id && <Check size={14} className="text-current" />}
                            </div>
                            <span className="text-[10px] opacity-80 leading-tight">{option.desc}</span>
                        </button>
                    ))}
                </div>
             </div>

             {/* Attachments Section Modernized */}
             <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Anexos (Opcional)</label>
                          <p className="text-xs text-slate-500 mt-1">Adicione evidências técnicas (logs, prints).</p>
                      </div>
                      
                      {/* Upload Button or Progress Bar */}
                      <label className={`
                          flex flex-col md:flex-row items-center justify-center space-x-0 md:space-x-2 px-4 py-2 rounded-lg transition-all shadow-sm w-full md:w-auto min-w-[160px] relative overflow-hidden
                          ${isUploading 
                            ? 'bg-slate-50 border border-slate-200 cursor-not-allowed h-12' 
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer h-10'}
                      `}>
                          {isUploading ? (
                              <div className="w-full px-2 flex flex-col justify-center h-full">
                                  <div className="flex justify-between items-center mb-1 w-full">
                                      <span className="text-[10px] font-bold text-primary-700 flex items-center uppercase tracking-widest">
                                          <Loader2 size={10} className="animate-spin mr-1" />
                                          Enviando...
                                      </span>
                                      <span className="text-[10px] font-bold text-primary-700">{uploadProgress}%</span>
                                  </div>
                                  <div className="w-full bg-slate-200 rounded-lg h-1 overflow-hidden">
                                      <div 
                                        className="bg-primary-600 h-1 rounded-lg transition-all duration-300 ease-out" 
                                        style={{ width: `${uploadProgress}%` }}
                                      ></div>
                                  </div>
                              </div>
                          ) : (
                              <>
                                <Paperclip size={16} />
                                <span className="text-xs font-bold uppercase tracking-widest">Selecionar Arquivo</span>
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    onChange={handleFileUpload} 
                                    disabled={isUploading}
                                />
                              </>
                          )}
                      </label>
                  </div>
                  
                  {attachments.length > 0 && (
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {attachments.map((url, index) => (
                              <div key={index} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-card">
                                  <div className="flex items-center space-x-2 overflow-hidden">
                                      <div className="bg-slate-50 p-1.5 rounded-lg text-slate-500 border border-slate-100">
                                        <FileText size={14} />
                                      </div>
                                      <a href={url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-slate-700 hover:text-primary-600 hover:underline truncate max-w-[150px] uppercase tracking-tight">
                                          Anexo {index + 1}
                                      </a>
                                  </div>
                                  <button 
                                    type="button" 
                                    onClick={() => removeAttachment(url)}
                                    className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors"
                                  >
                                      <X size={14} />
                                  </button>
                              </div>
                          ))}
                      </div>
                  )}
             </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-6 flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-bold text-xs uppercase tracking-widest transition-colors w-full md:w-auto text-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isUploading || isSaving}
              className={`px-8 py-2 text-white rounded-lg font-bold text-xs uppercase tracking-widest shadow-sm transition-all w-full md:w-auto text-center flex justify-center items-center
                ${(isUploading || isSaving)
                    ? 'bg-slate-400 cursor-not-allowed' 
                    : 'bg-primary-600 hover:bg-primary-700'}
              `}
            >
              {(isUploading || isSaving) && <Loader2 size={14} className="animate-spin mr-2" />}
              {isSaving ? 'Salvando...' : (initialData ? 'Salvar Alterações' : 'Criar Chamado')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
