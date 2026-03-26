
import React, { useState, useEffect } from 'react';
import { Ticket, TicketPriority, TicketStatus, User } from '../types';
import { Loader2, ArrowLeft, Paperclip, X, FileText, Check } from 'lucide-react';
import { supabase } from '../services/supabase';
import { v4 as uuidv4 } from 'uuid';

interface TicketFormProps {
  onSave: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'ticketNumber'>) => Promise<void>;
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
  
  // Attachments State
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description);
        setPriority(initialData.priority);
        setCategory(initialData.category);
        setAttachments(initialData.attachments || []);
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
    try {
      await onSave({
        title,
        description,
        requester: currentUser.name, // Always use logged user name
        requesterId: currentUser.id, // Always use logged user ID
        priority,
        category,
        status: initialData ? initialData.status : TicketStatus.OPEN,
        attachments: attachments
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

      <div className="bg-white rounded-none border border-slate-200 shadow-sm overflow-hidden">
        {/* Cabeçalho Visual */}
        <div className="p-6 border-b border-slate-200 bg-slate-50 text-slate-900">
          <div className="flex justify-between items-center">
             <div>
                <h2 className="text-xl font-bold uppercase tracking-tight">{initialData ? 'Editar Chamado' : 'Abrir Novo Chamado'}</h2>
                <p className="text-slate-500 text-sm mt-1">Preencha os detalhes técnicos para abertura do ticket.</p>
             </div>
             <div className="hidden md:block bg-white p-3 rounded-none border border-slate-200 shadow-sm">
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
                    <input
                        type="text"
                        value={currentUser.name}
                        disabled
                        className="w-full px-4 py-2 border border-slate-200 rounded-none bg-slate-50 text-slate-500 cursor-not-allowed font-mono text-sm"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Categoria</label>
                    <div className="relative">
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-none focus:ring-1 focus:ring-primary-500 outline-none bg-white appearance-none cursor-pointer hover:border-primary-400 transition-colors text-sm font-medium"
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
             </div>

             <div className="space-y-4">
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Assunto</label>
                    <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all placeholder-slate-400 text-sm font-medium"
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
                        className="w-full px-4 py-3 border border-slate-300 rounded-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-none leading-relaxed text-sm font-medium"
                        placeholder="Descreva o que aconteceu, quais passos você seguiu e se apareceu alguma mensagem de erro..."
                    />
                    <div className="absolute bottom-3 right-3 text-[10px] font-bold text-slate-400 uppercase tracking-tight pointer-events-none">
                        Seja específico e técnico.
                    </div>
                </div>
             </div>

             <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Defina a Prioridade</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {PRIORITY_OPTIONS.map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => setPriority(option.id)}
                            className={`
                                relative flex flex-col items-start p-3 rounded-none border transition-all duration-200 text-left
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
             <div className="bg-slate-50 rounded-none p-4 border border-slate-200">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Anexos (Opcional)</label>
                          <p className="text-xs text-slate-500 mt-1">Adicione evidências técnicas (logs, prints).</p>
                      </div>
                      
                      {/* Upload Button or Progress Bar */}
                      <label className={`
                          flex flex-col md:flex-row items-center justify-center space-x-0 md:space-x-2 px-4 py-2 rounded-none transition-all shadow-sm w-full md:w-auto min-w-[160px] relative overflow-hidden
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
                                  <div className="w-full bg-slate-200 rounded-none h-1 overflow-hidden">
                                      <div 
                                        className="bg-primary-600 h-1 rounded-none transition-all duration-300 ease-out" 
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
                              <div key={index} className="flex items-center justify-between bg-white px-3 py-2 rounded-none border border-slate-200 shadow-sm">
                                  <div className="flex items-center space-x-2 overflow-hidden">
                                      <div className="bg-slate-50 p-1.5 rounded-none text-slate-500 border border-slate-100">
                                        <FileText size={14} />
                                      </div>
                                      <a href={url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-slate-700 hover:text-primary-600 hover:underline truncate max-w-[150px] uppercase tracking-tight">
                                          Anexo {index + 1}
                                      </a>
                                  </div>
                                  <button 
                                    type="button" 
                                    onClick={() => removeAttachment(url)}
                                    className="text-slate-400 hover:text-red-500 p-1 rounded-none hover:bg-red-50 transition-colors"
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
              className="px-6 py-2 border border-slate-300 rounded-none text-slate-700 hover:bg-slate-50 font-bold text-xs uppercase tracking-widest transition-colors w-full md:w-auto text-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isUploading || isSaving}
              className={`px-8 py-2 text-white rounded-none font-bold text-xs uppercase tracking-widest shadow-sm transition-all w-full md:w-auto text-center flex justify-center items-center
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
