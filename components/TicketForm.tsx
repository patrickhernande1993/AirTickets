
import React, { useState, useEffect } from 'react';
import { Ticket, TicketPriority, TicketStatus, User } from '../types';
import { Loader2, ArrowLeft, Paperclip, X, FileText, Check, User as UserIcon } from 'lucide-react';
import { supabase } from '../services/supabase';
import { v4 as uuidv4 } from 'uuid';

interface TicketFormProps {
  onSave: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'ticketNumber'>) => void;
  onCancel: () => void;
  initialData?: Ticket;
  currentUser: User;
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
  
  // Requester Selection State
  const [requesterId, setRequesterId] = useState(currentUser.id);
  const [requesterName, setRequesterName] = useState(currentUser.name);
  const [availableUsers, setAvailableUsers] = useState<{id: string, name: string}[]>([]);

  // Attachments State
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (currentUser.role === 'ADMIN') {
        fetchUsers();
    }
  }, [currentUser.role]);

  useEffect(() => {
    if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description);
        setPriority(initialData.priority);
        setCategory(initialData.category);
        setAttachments(initialData.attachments || []);
        setRequesterId(initialData.requesterId);
        setRequesterName(initialData.requester);
    }
  }, [initialData]);

  const fetchUsers = async () => {
      const { data } = await supabase.from('profiles').select('id, name').eq('is_active', true).order('name');
      if (data) {
          setAvailableUsers(data);
      }
  };

  const handleRequesterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedId = e.target.value;
      setRequesterId(selectedId);
      const selectedUser = availableUsers.find(u => u.id === selectedId);
      if (selectedUser) {
          setRequesterName(selectedUser.name);
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      setIsUploading(true);
      setUploadProgress(10);

      const file = e.target.files[0];
      const fileName = `${Date.now()}_${uuidv4()}.${file.name.split('.').pop()}`;
      const filePath = `${currentUser.id}/${fileName}`;

      try {
          const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, file);
          if (uploadError) throw uploadError;
          setUploadProgress(100);

          const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);
          if (data) {
              setAttachments(prev => [...prev, data.publicUrl]);
          }
      } catch (error: any) {
          alert(`Erro no upload: ${error.message}`);
      } finally {
          setIsUploading(false);
          setUploadProgress(0);
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
      requester: requesterName, 
      requesterId: requesterId, 
      priority,
      category,
      status: initialData ? initialData.status : TicketStatus.OPEN,
      attachments: attachments
    });
  };

  const PRIORITY_OPTIONS = [
    { id: TicketPriority.LOW, label: 'Baixa', colorClass: 'hover:border-green-400', selectedClass: 'border-green-500 bg-green-50 text-green-700', desc: 'Dúvidas simples' },
    { id: TicketPriority.MEDIUM, label: 'Média', colorClass: 'hover:border-yellow-400', selectedClass: 'border-yellow-500 bg-yellow-50 text-yellow-800', desc: 'Afeta o trabalho' },
    { id: TicketPriority.HIGH, label: 'Alta', colorClass: 'hover:border-orange-400', selectedClass: 'border-orange-500 bg-orange-50 text-orange-800', desc: 'Urgente' },
    { id: TicketPriority.CRITICAL, label: 'Crítica', colorClass: 'hover:border-red-400', selectedClass: 'border-red-500 bg-red-50 text-red-800', desc: 'Parada crítica' }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={onCancel} className="flex items-center text-gray-500 hover:text-gray-700 mb-6 transition-colors">
        <ArrowLeft size={18} className="mr-2" />
        Voltar para lista
      </button>

      <div className="bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-primary-600 to-primary-800 text-white">
          <h2 className="text-xl font-bold">{initialData ? 'Editar Chamado' : 'Abrir Novo Chamado'}</h2>
          <p className="text-primary-100 text-sm mt-1 opacity-90">Preencha os detalhes para suporte.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Solicitante</label>
                    {currentUser.role === 'ADMIN' ? (
                        <div className="relative">
                            <select
                                value={requesterId}
                                onChange={handleRequesterChange}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white appearance-none cursor-pointer"
                            >
                                {availableUsers.map(user => (
                                    <option key={user.id} value={user.id}>{user.name}</option>
                                ))}
                            </select>
                            <UserIcon size={16} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                        </div>
                    ) : (
                        <input type="text" value={currentUser.name} disabled className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed" />
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                        {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assunto</label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Ex: Erro no acesso ao ERP" />
             </div>
          </div>

          <div className="space-y-6">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                <textarea required rows={5} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none" />
             </div>

             <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Prioridade</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {PRIORITY_OPTIONS.map((opt) => (
                        <button key={opt.id} type="button" onClick={() => setPriority(opt.id)} className={`flex flex-col p-3 rounded-xl border text-left transition-all ${priority === opt.id ? opt.selectedClass : 'bg-white text-gray-600 border-gray-200 ' + opt.colorClass}`}>
                            <span className="font-bold text-sm">{opt.label}</span>
                            <span className="text-[10px] opacity-80">{opt.desc}</span>
                        </button>
                    ))}
                </div>
             </div>
          </div>

          <div className="pt-6 flex justify-end gap-3 border-t border-gray-100">
            <button type="button" onClick={onCancel} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={isUploading} className="px-8 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-md flex items-center">
              {isUploading && <Loader2 size={18} className="animate-spin mr-2" />}
              {initialData ? 'Salvar' : 'Criar Chamado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
