import React, { useState, useEffect } from 'react';
import { Ticket, TicketPriority, TicketStatus, User } from '../types';
import { analyzeTicketContent } from '../services/geminiService';
import { Sparkles, Loader2, ArrowLeft, Paperclip, X, FileText } from 'lucide-react';
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  
  // Attachments State
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description);
        setPriority(initialData.priority);
        setCategory(initialData.category);
        setAiSummary(initialData.aiAnalysis || null);
        setAttachments(initialData.attachments || []);
    }
  }, [initialData]);

  const handleAIAnalysis = async () => {
    if (!title || !description) return;
    
    setIsAnalyzing(true);
    const result = await analyzeTicketContent(title, description);
    setIsAnalyzing(false);

    if (result) {
      setPriority(result.priority);
      // AI Category might not match our fixed list, so we try to match or keep 'Outro'
      // Alternatively, we can append the AI suggestion to description or keep it as 'Outro'
      // For now, we stick to the dropdown logic, but maybe switch if exact match found
      if (CATEGORIES.includes(result.category)) {
          setCategory(result.category);
      }
      setAiSummary(result.summary);
    }
  };

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
          // Exibe a mensagem real do erro para facilitar o debug (ex: Policy violations)
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
      aiAnalysis: aiSummary || undefined,
      attachments: attachments
    });
  };

  const translatePriority = (p: string) => {
      switch(p) {
          case 'LOW': return 'Baixa';
          case 'MEDIUM': return 'Média';
          case 'HIGH': return 'Alta';
          case 'CRITICAL': return 'Crítica';
          default: return p;
      }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={onCancel} className="flex items-center text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft size={18} className="mr-2" />
        Voltar
      </button>

      <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-primary-600 to-primary-700">
          <h2 className="text-xl font-bold text-white">{initialData ? 'Editar Chamado' : 'Criar Novo Chamado'}</h2>
          <p className="text-primary-100 text-sm mt-1">Preencha os detalhes abaixo.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Solicitante</label>
              <input
                type="text"
                value={currentUser.name}
                disabled
                className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
              >
                  {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assunto do Chamado</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              placeholder="Breve resumo do problema"
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição Detalhada</label>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-none"
              placeholder="Descreva o problema em detalhes..."
            />
            
            <div className="absolute bottom-3 right-3">
                <button
                    type="button"
                    onClick={handleAIAnalysis}
                    disabled={isAnalyzing || !description}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        isAnalyzing || !description 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                    }`}
                >
                    {isAnalyzing ? (
                        <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Analisando...</span>
                        </>
                    ) : (
                        <>
                            <Sparkles size={14} />
                            <span>Auto-Classificar com IA</span>
                        </>
                    )}
                </button>
            </div>
          </div>

          {/* Attachments Section */}
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Anexos</label>
              <div className="flex items-center space-x-4">
                  <label className={`flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
                      <span className="text-sm text-gray-600">{isUploading ? 'Enviando...' : 'Anexar Arquivo'}</span>
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={handleFileUpload} 
                        disabled={isUploading}
                      />
                  </label>
                  <span className="text-xs text-gray-400">Imagens ou documentos para auxiliar o suporte.</span>
              </div>
              
              {attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                      {attachments.map((url, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                              <div className="flex items-center space-x-2 overflow-hidden">
                                  <FileText size={16} className="text-gray-400 flex-shrink-0" />
                                  <a href={url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline truncate block max-w-[200px]">
                                      Anexo {index + 1}
                                  </a>
                              </div>
                              <button 
                                type="button" 
                                onClick={() => removeAttachment(url)}
                                className="text-gray-400 hover:text-red-500 p-1"
                              >
                                  <X size={16} />
                              </button>
                          </div>
                      ))}
                  </div>
              )}
          </div>

          {aiSummary && (
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 flex items-start gap-3">
                <Sparkles className="text-purple-600 mt-0.5 flex-shrink-0" size={18} />
                <div>
                    <h4 className="text-sm font-semibold text-purple-900">Análise da IA</h4>
                    <p className="text-sm text-purple-800 mt-1">{aiSummary}</p>
                    <p className="text-xs text-purple-600 mt-2">
                        Prioridade Sugerida: <span className="font-bold">{translatePriority(priority)}</span>
                    </p>
                </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nível de Prioridade</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              >
                {Object.values(TicketPriority).map((p) => (
                  <option key={p} value={p}>{translatePriority(p)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium shadow-md transition-all transform hover:-translate-y-0.5"
            >
              {initialData ? 'Atualizar Chamado' : 'Criar Chamado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};