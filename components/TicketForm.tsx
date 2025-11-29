
import React, { useState, useEffect } from 'react';
import { Ticket, TicketPriority, TicketStatus, User } from '../types';
import { Loader2, ArrowLeft, Paperclip, X, FileText, Check } from 'lucide-react';
import { supabase } from '../services/supabase';
import { v4 as uuidv4 } from 'uuid';

interface TicketFormProps {
  onSave: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'ticketNumber'>) => void;
  onCancel: () => void;
  initialData?: Ticket; // Optional for Edit mode
  currentUser: User; // Obrigatório para pegar o nome automaticamente
}

const CATEGORIES = [
  'ERP MEGA',
  'Microgestão',
  'Power BI',
  'Acessos',
  'Outro'
];

export const TicketForm: React.FC<TicketFormProps> = ({ onSave, onCancel, initialData, currentUser }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>(TicketPriority.LOW);
  const [category, setCategory] = useState(CATEGORIES[0]);
  
  // Attachments State
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

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
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      // Adiciona timestamp para evitar conflitos de nome
      const fileName = `${Date.now()}_${uuidv4()}.${fileExt}`;
      const filePath = `${currentUser.id}/${fileName}`;

      try {
          const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);
          
          if (data) {
              setAttachments(prev => [...prev, data.publicUrl]);
          }
      } catch (error: any) {
          console.error('Error uploading file:', error);
          alert(`Erro ao fazer upload: ${error.message || 'Verifique as permissões do Bucket.'}`);
      } finally {
          setIsUploading(false);
          // Reset input
          e.target.value = ''; 
      }
  };

  const removeAttachment = (urlToRemove: string) => {
      setAttachments(prev => prev.filter(url => url !== urlToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      description,
      requester: currentUser.name, // Always use logged user name
      requesterId: currentUser.id, // Always use logged user ID
      priority,
      category,
      status: initialData ? initialData.status : TicketStatus.OPEN,
      attachments: attachments
    });
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
      <button onClick={onCancel} className="flex items-center text-gray-500 hover:text-gray-700 mb-6 transition-colors">
        <ArrowLeft size={18} className="mr-2" />
        Voltar para lista
      </button>

      <div className="bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
        {/* Cabeçalho Visual */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-primary-600 to-primary-800 text-white">
          <div className="flex justify-between items-center">
             <div>
                <h2 className="text-xl font-bold">{initialData ? 'Editar Chamado' : 'Abrir Novo Chamado'}</h2>
                <p className="text-primary-100 text-sm mt-1 opacity-90">Descreva o problema para que possamos ajudar rapidamente.</p>
             </div>
             <div className="hidden md:block bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                <FileText size={24} className="text-white" />
             </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          
          {/* Seção 1: Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Solicitante</label>
                    <input
                        type="text"
                        value={currentUser.name}
                        disabled
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed font-medium"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                    <div className="relative">
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white appearance-none cursor-pointer hover:border-primary-400 transition-colors"
                        >
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>
             </div>

             <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assunto</label>
                    <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all placeholder-gray-400"
                        placeholder="Ex: Erro ao acessar o ERP"
                    />
                </div>
             </div>
          </div>

          <div className="border-t border-gray-100 my-2"></div>

          {/* Seção 2: Detalhes e Prioridade */}
          <div className="space-y-6">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição Detalhada</label>
                <div className="relative">
                    <textarea
                        required
                        rows={6}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-none leading-relaxed"
                        placeholder="Descreva o que aconteceu, quais passos você seguiu e se apareceu alguma mensagem de erro..."
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-gray-400 pointer-events-none">
                        Quanto mais detalhes, mais rápido resolvemos.
                    </div>
                </div>
             </div>

             <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Defina a Prioridade</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {PRIORITY_OPTIONS.map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => setPriority(option.id)}
                            className={`
                                relative flex flex-col items-start p-3 rounded-xl border transition-all duration-200 text-left
                                ${priority === option.id ? option.selectedClass : 'border-gray-200 bg-white text-gray-600 ' + option.colorClass}
                            `}
                        >
                            <div className="flex items-center justify-between w-full mb-1">
                                <span className="font-bold text-sm">{option.label}</span>
                                {priority === option.id && <Check size={16} className="text-current" />}
                            </div>
                            <span className="text-xs opacity-80">{option.desc}</span>
                        </button>
                    ))}
                </div>
             </div>

             {/* Attachments Section Modernized */}
             <div className="bg-gray-50 rounded-lg p-4 border border-dashed border-gray-300">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Anexos (Opcional)</label>
                          <p className="text-xs text-gray-500 mt-1">Adicione prints ou documentos para ajudar.</p>
                      </div>
                      <label className={`
                          flex items-center space-x-2 px-4 py-2 rounded-lg cursor-pointer transition-colors shadow-sm
                          ${isUploading ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'}
                      `}>
                          {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
                          <span className="text-sm font-medium">{isUploading ? 'Enviando...' : 'Selecionar Arquivo'}</span>
                          <input 
                            type="file" 
                            className="hidden" 
                            onChange={handleFileUpload} 
                            disabled={isUploading}
                          />
                      </label>
                  </div>
                  
                  {attachments.length > 0 && (
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {attachments.map((url, index) => (
                              <div key={index} className="flex items-center justify-between bg-white px-3 py-2 rounded border border-gray-200 shadow-sm">
                                  <div className="flex items-center space-x-2 overflow-hidden">
                                      <div className="bg-blue-50 p-1.5 rounded text-blue-500">
                                        <FileText size={14} />
                                      </div>
                                      <a href={url} target="_blank" rel="noreferrer" className="text-xs font-medium text-gray-700 hover:text-blue-600 hover:underline truncate max-w-[150px]">
                                          Anexo {index + 1}
                                      </a>
                                  </div>
                                  <button 
                                    type="button" 
                                    onClick={() => removeAttachment(url)}
                                    className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
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
          <div className="pt-6 flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors w-full md:w-auto text-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-8 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 w-full md:w-auto text-center"
            >
              {initialData ? 'Salvar Alterações' : 'Criar Chamado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
