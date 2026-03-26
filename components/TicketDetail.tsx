
import React, { useState, useEffect, useRef } from 'react';
import { Ticket, TicketStatus, User, Comment, AuditLog } from '../types';
import { ArrowLeft, CheckCircle, Clock, User as UserIcon, Calendar, Tag, Trash2, Edit, Send, MessageSquare, FileText, Paperclip } from 'lucide-react';
import { supabase } from '../services/supabase';
import { ConfirmationModal } from './ConfirmationModal';

interface TicketDetailProps {
  ticket: Ticket;
  currentUser: User;
  onBack: () => void;
  onUpdateStatus: (id: string, status: TicketStatus) => void;
  onDelete: (id: string) => void;
  onEdit: (ticket: Ticket) => void;
}

export const TicketDetail: React.FC<TicketDetailProps> = ({ ticket, currentUser, onBack, onUpdateStatus, onDelete, onEdit }) => {
  // Comment State
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Audit Logs State
  const [logs, setLogs] = useState<AuditLog[]>([]);

  // Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const isAdmin = currentUser.role === 'ADMIN';
  const isOwner = currentUser.id === ticket.requesterId;

  useEffect(() => {
      fetchComments();
      fetchLogs();
      
      // Subscribe to new comments
      const channel = supabase
        .channel(`comments:${ticket.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `ticket_id=eq.${ticket.id}` }, (payload) => {
            fetchComments(); 
        })
        .subscribe();

      // Subscribe to logs
      const logsChannel = supabase
        .channel(`logs:${ticket.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs', filter: `ticket_id=eq.${ticket.id}` }, () => {
            fetchLogs();
        })
        .subscribe();

      return () => {
          supabase.removeChannel(channel);
          supabase.removeChannel(logsChannel);
      }
  }, [ticket.id]);

  useEffect(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const fetchComments = async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*, profiles(name, role)')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true });

      if (error) {
          console.error("Error fetching comments", error);
      } else {
          const formattedComments = data.map((c: any) => ({
              id: c.id,
              ticketId: c.ticket_id,
              userId: c.user_id,
              content: c.content,
              createdAt: new Date(c.created_at),
              userName: c.profiles?.name || 'Desconhecido',
              userRole: c.profiles?.role || 'USER'
          }));
          setComments(formattedComments);
      }
      setLoadingComments(false);
  };

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('audit_logs')
      .select('*, profiles(name)')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: false });
    
    if (data) {
        setLogs(data.map((l: any) => ({
            id: l.id,
            ticketId: l.ticket_id,
            actorId: l.actor_id,
            actorName: l.profiles?.name || 'Sistema',
            action: l.action,
            details: l.details,
            createdAt: new Date(l.created_at)
        })));
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newComment.trim()) return;

      const commentText = newComment;
      
      // Optimistic Update
      const tempId = `temp-${Date.now()}`;
      const optimisticComment: Comment = {
          id: tempId,
          ticketId: ticket.id,
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          content: commentText,
          createdAt: new Date()
      };

      setComments(prev => [...prev, optimisticComment]);
      setNewComment(''); 

      try {
          const { error } = await supabase.from('comments').insert({
              ticket_id: ticket.id,
              user_id: currentUser.id,
              content: commentText
          });

          if (error) throw error;

          // Notifications
          if (isAdmin) {
             if (ticket.requesterId !== currentUser.id) {
                 await supabase.from('notifications').insert({
                     user_id: ticket.requesterId,
                     title: 'Nova interação no chamado',
                     message: `${currentUser.name} comentou: ${commentText.substring(0, 50)}...`,
                     ticket_id: ticket.id
                 });
             }
          } else {
             const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'ADMIN');
             if (admins) {
                 const notifications = admins.map(admin => ({
                     user_id: admin.id,
                     title: `Nova interação de ${currentUser.name}`,
                     message: `No chamado "${ticket.title}": ${commentText.substring(0, 50)}...`,
                     ticket_id: ticket.id
                 }));
                 if (notifications.length > 0) {
                    await supabase.from('notifications').insert(notifications);
                 }
             }
          }

      } catch (error) {
          console.error("Error sending comment:", error);
          alert("Erro ao enviar mensagem");
          setComments(prev => prev.filter(c => c.id !== tempId));
          setNewComment(commentText); 
      }
  };

  const translatePriority = (p: string) => {
    switch(p) {
        case 'LOW': return 'Baixa';
        case 'MEDIUM': return 'Média';
        case 'HIGH': return 'Alta';
        case 'CRITICAL': return 'Crítica';
        default: return p;
    }
  };

  const translateStatus = (s: string) => {
      switch(s) {
          case 'OPEN': return 'Aberto';
          case 'IN_PROGRESS': return 'Em Progresso';
          case 'RESOLVED': return 'Resolvido';
          default: return s;
      }
  };

  const getLogIcon = (action: string) => {
      switch(action) {
          case 'CREATED': return <CheckCircle size={14} className="text-green-600" />;
          case 'STATUS_CHANGE': return <Clock size={14} className="text-blue-600" />;
          case 'EDITED': return <Edit size={14} className="text-orange-600" />;
          default: return <FileText size={14} className="text-gray-600" />;
      }
  };

  const translateLogAction = (action: string) => {
    switch(action) {
        case 'CREATED': return 'Chamado Criado';
        case 'STATUS_CHANGE': return 'Status Alterado';
        case 'EDITED': return 'Chamado Editado';
        default: return action;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-700 font-bold text-xs uppercase tracking-widest transition-colors">
        <ArrowLeft size={14} className="mr-2" />
        Voltar para {isAdmin ? 'Dashboard' : 'Meus Chamados'}
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-none border border-slate-200 shadow-sm p-6">
        <div className="flex justify-between items-start">
            <div>
                <div className="flex items-center space-x-3 mb-2">
                    <span className="text-xs font-mono font-bold text-slate-400">#{ticket.ticketNumber}</span>
                    <span className={`px-2 py-0.5 rounded-none text-[10px] font-bold uppercase tracking-widest border ${
                        ticket.priority === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200' : 
                        ticket.priority === 'HIGH' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        ticket.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                        {translatePriority(ticket.priority)}
                    </span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">{ticket.title}</h1>
            </div>
            
            <div className="flex items-center space-x-3">
                {(isOwner || isAdmin) && (
                     <button 
                        onClick={() => onEdit(ticket)}
                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-slate-50 rounded-none border border-transparent hover:border-slate-200 transition-colors"
                        title="Editar Chamado"
                     >
                         <Edit size={18} />
                     </button>
                )}
                {(isOwner || isAdmin) && (
                    <button 
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-none border border-transparent hover:border-red-100 transition-colors"
                        title="Excluir Chamado"
                    >
                        <Trash2 size={18} />
                    </button>
                )}
            </div>
        </div>

        <ConfirmationModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={() => onDelete(ticket.id)}
            title="Excluir Chamado"
            message={`Tem certeza que deseja excluir o chamado #${ticket.ticketNumber}? Esta ação não pode ser desfeita.`}
            confirmText="Excluir"
            cancelText="Cancelar"
            isDanger={true}
        />

        <div className="mt-6 flex flex-wrap gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <div className="flex items-center">
                <UserIcon size={14} className="mr-2 text-slate-400" />
                <span>Solicitante:</span>
                <span className="ml-1 text-slate-900">{ticket.requester}</span>
            </div>
            <div className="flex items-center">
                <Calendar size={14} className="mr-2 text-slate-400" />
                <span>Criado em:</span>
                <span className="ml-1 text-slate-900 font-mono">{ticket.createdAt.toLocaleDateString('pt-BR')} {ticket.createdAt.toLocaleTimeString('pt-BR')}</span>
            </div>
            <div className="flex items-center">
                <Tag size={14} className="mr-2 text-slate-400" />
                <span>Categoria:</span>
                <span className="ml-1 bg-slate-100 px-2 py-0.5 rounded-none border border-slate-200 text-slate-900">{ticket.category}</span>
            </div>
        </div>

        <div className="mt-6 p-4 bg-slate-50 rounded-none border border-slate-200">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Descrição do Problema</h3>
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-sm font-medium">{ticket.description}</p>
        </div>

        {/* Attachments View */}
        {ticket.attachments && ticket.attachments.length > 0 && (
            <div className="mt-4">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center">
                    <Paperclip size={14} className="mr-1 text-slate-400" />
                    Anexos Técnicos
                </h3>
                <div className="flex flex-wrap gap-2">
                    {ticket.attachments.map((url, index) => (
                        <a 
                            key={index} 
                            href={url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center space-x-2 px-3 py-2 bg-white border border-slate-200 rounded-none shadow-sm hover:bg-slate-50 hover:border-primary-300 transition-colors group"
                        >
                            <FileText size={14} className="text-slate-400 group-hover:text-primary-600" />
                            <span className="text-[10px] font-bold text-slate-700 group-hover:text-primary-700 uppercase tracking-tight">Anexo {index + 1}</span>
                        </a>
                    ))}
                </div>
            </div>
        )}

        {isAdmin && (
            <div className="mt-6 flex items-center justify-end space-x-4 pt-4 border-t border-slate-100">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Atualizar Status:</span>
                <div className="flex bg-slate-100 p-1 rounded-none border border-slate-200">
                    {[TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED].map((status) => (
                        <button
                            key={status}
                            onClick={() => onUpdateStatus(ticket.id, status)}
                            className={`px-3 py-1.5 rounded-none text-[10px] font-bold uppercase tracking-widest transition-all ${
                                ticket.status === status 
                                ? 'bg-white text-primary-600 border border-slate-200 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            {translateStatus(status)}
                        </button>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Comments / Interactions */}
            <div className="bg-white rounded-none border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 flex items-center uppercase tracking-tight text-sm">
                        <MessageSquare size={18} className="mr-2 text-primary-600" />
                        Interações do Sistema
                    </h3>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{comments.length} mensagens</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                    {comments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                            <MessageSquare size={48} className="mb-2 opacity-10" />
                            <p className="font-bold uppercase tracking-widest text-[10px]">Nenhuma interação registrada</p>
                        </div>
                    ) : (
                        comments.map((comment) => {
                            const isMe = comment.userId === currentUser.id;
                            const isStaff = comment.userRole === 'ADMIN';
                            return (
                                <div key={comment.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] ${isMe ? 'order-1' : 'order-2'}`}>
                                        <div className={`flex items-center text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <span className="mr-2">{comment.userName}</span>
                                            {isStaff && <span className="bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-none text-[8px] mr-2 border border-primary-200">STAFF</span>}
                                            <span className="font-mono">{comment.createdAt.toLocaleString('pt-BR')}</span>
                                        </div>
                                        <div className={`p-3 rounded-none text-sm font-medium ${
                                            isMe 
                                            ? 'bg-primary-600 text-white border border-primary-700' 
                                            : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
                                        }`}>
                                            {comment.content}
                                        </div>
                                    </div>
                                    <div className={`w-8 h-8 rounded-none flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-5 border ${
                                        isMe 
                                        ? 'bg-primary-500 border-primary-600 order-2 ml-2' 
                                        : 'bg-slate-500 border-slate-600 order-1 mr-2'
                                    }`}>
                                        {comment.userName.charAt(0).toUpperCase()}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={commentsEndRef} />
                </div>

                <div className="p-4 bg-white border-t border-slate-200">
                    <form onSubmit={handleSendComment} className="flex gap-2">
                        <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Escreva uma mensagem técnica..."
                            className="flex-1 px-4 py-2 border border-slate-300 rounded-none focus:ring-1 focus:ring-primary-500 outline-none text-sm font-medium"
                        />
                        <button 
                            type="submit" 
                            disabled={!newComment.trim()}
                            className="px-4 py-2 bg-primary-600 text-white rounded-none hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            </div>
          </div>

          <div className="space-y-6">
             {/* Real Audit History */}
             <div className="bg-white rounded-none border border-slate-200 shadow-sm p-6">
                 <h3 className="font-bold text-slate-900 mb-4 text-xs uppercase tracking-widest">Log de Auditoria</h3>
                 <div className="space-y-6">
                    {logs.length === 0 ? (
                         <div className="flex items-center space-x-3 opacity-50">
                             <div className="h-2 w-2 rounded-none bg-slate-400"></div>
                             <div>
                                 <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">Chamado Criado</p>
                                 <p className="text-[10px] font-mono text-slate-500">{ticket.createdAt.toLocaleString('pt-BR')}</p>
                             </div>
                         </div>
                    ) : (
                        logs.map((log, index) => (
                            <div key={log.id} className="relative flex gap-3">
                                {/* Timeline line connector */}
                                {index !== logs.length - 1 && (
                                    <div className="absolute top-6 left-[5px] h-full w-[1px] bg-slate-100"></div>
                                )}
                                
                                <div className="mt-1 flex-shrink-0">
                                    <div className="bg-white relative z-10">
                                        {getLogIcon(log.action)}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">{translateLogAction(log.action)}</p>
                                    <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-widest">
                                        por <span className="font-bold text-slate-700">{log.actorName}</span> • <span className="font-mono">{log.createdAt.toLocaleString('pt-BR')}</span>
                                    </p>
                                    {log.details && (
                                        <p className="text-[10px] font-medium text-slate-600 bg-slate-50 p-2 rounded-none border border-slate-100 inline-block mt-1">
                                            {log.details}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                 </div>
             </div>
          </div>
      </div>
    </div>
  );
};
