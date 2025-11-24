
import React, { useState, useEffect, useRef } from 'react';
import { Ticket, TicketStatus, User, Comment, AuditLog } from '../types';
import { ArrowLeft, CheckCircle, Clock, User as UserIcon, Calendar, Tag, AlertTriangle, Trash2, Edit, Send, MessageSquare, FileText, Paperclip } from 'lucide-react';
import { supabase } from '../services/supabase';

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
          case 'CLOSED': return 'Fechado';
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
      <button onClick={onBack} className="flex items-center text-gray-500 hover:text-gray-700">
        <ArrowLeft size={18} className="mr-2" />
        Voltar para {isAdmin ? 'Dashboard' : 'Meus Chamados'}
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex justify-between items-start">
            <div>
                <div className="flex items-center space-x-3 mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">#{ticket.ticketNumber}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        ticket.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' : 
                        ticket.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                        ticket.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                    }`}>
                        Prioridade {translatePriority(ticket.priority)}
                    </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{ticket.title}</h1>
            </div>
            
            <div className="flex items-center space-x-3">
                {(isOwner || isAdmin) && (
                     <button 
                        onClick={() => onEdit(ticket)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar Chamado"
                     >
                         <Edit size={20} />
                     </button>
                )}
                {(isOwner || isAdmin) && (
                    <button 
                        onClick={() => {
                            if (window.confirm("Tem certeza que deseja excluir este chamado?")) {
                                onDelete(ticket.id);
                            }
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir Chamado"
                    >
                        <Trash2 size={20} />
                    </button>
                )}
            </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center">
                <UserIcon size={16} className="mr-2 text-gray-400" />
                <span className="font-medium">Solicitante:</span>
                <span className="ml-1">{ticket.requester}</span>
            </div>
            <div className="flex items-center">
                <Calendar size={16} className="mr-2 text-gray-400" />
                <span className="font-medium">Criado em:</span>
                <span className="ml-1">{ticket.createdAt.toLocaleDateString('pt-BR')} às {ticket.createdAt.toLocaleTimeString('pt-BR')}</span>
            </div>
            <div className="flex items-center">
                <Tag size={16} className="mr-2 text-gray-400" />
                <span className="font-medium">Categoria:</span>
                <span className="ml-1 bg-gray-100 px-2 py-0.5 rounded text-xs">{ticket.category}</span>
            </div>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Descrição do Problema</h3>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
        </div>

        {/* Attachments View */}
        {ticket.attachments && ticket.attachments.length > 0 && (
            <div className="mt-4">
                <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center">
                    <Paperclip size={16} className="mr-1 text-gray-500" />
                    Anexos
                </h3>
                <div className="flex flex-wrap gap-2">
                    {ticket.attachments.map((url, index) => (
                        <a 
                            key={index} 
                            href={url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-blue-50 hover:border-blue-200 transition-colors group"
                        >
                            <FileText size={16} className="text-gray-400 group-hover:text-blue-500" />
                            <span className="text-sm text-gray-700 group-hover:text-blue-700">Anexo {index + 1}</span>
                        </a>
                    ))}
                </div>
            </div>
        )}

        {isAdmin && (
            <div className="mt-6 flex items-center justify-end space-x-4 pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-500 font-medium">Atualizar Status:</span>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    {[TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CLOSED].map((status) => (
                        <button
                            key={status}
                            onClick={() => onUpdateStatus(ticket.id, status)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                ticket.status === status 
                                ? 'bg-white text-gray-900 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            {translateStatus(status)}
                        </button>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* AI Analysis & Solution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Comments / Interactions */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 flex items-center">
                        <MessageSquare size={18} className="mr-2 text-gray-500" />
                        Interações
                    </h3>
                    <span className="text-xs text-gray-500">{comments.length} mensagens</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
                    {comments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
                            <MessageSquare size={48} className="mb-2 opacity-20" />
                            <p>Nenhuma interação registrada ainda.</p>
                            <p>Inicie a conversa abaixo.</p>
                        </div>
                    ) : (
                        comments.map((comment) => {
                            const isMe = comment.userId === currentUser.id;
                            const isStaff = comment.userRole === 'ADMIN';
                            return (
                                <div key={comment.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] ${isMe ? 'order-1' : 'order-2'}`}>
                                        <div className={`flex items-center text-xs text-gray-500 mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <span className="font-medium mr-2">{comment.userName}</span>
                                            {isStaff && <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-sm text-[10px] mr-2">STAFF</span>}
                                            <span>{comment.createdAt.toLocaleString('pt-BR')}</span>
                                        </div>
                                        <div className={`p-3 rounded-2xl text-sm ${
                                            isMe 
                                            ? 'bg-primary-600 text-white rounded-tr-none' 
                                            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
                                        }`}>
                                            {comment.content}
                                        </div>
                                    </div>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-5 ${
                                        isMe 
                                        ? 'bg-primary-400 order-2 ml-2' 
                                        : 'bg-gray-400 order-1 mr-2'
                                    }`}>
                                        {comment.userName.charAt(0).toUpperCase()}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={commentsEndRef} />
                </div>

                <div className="p-4 bg-white border-t border-gray-200">
                    <form onSubmit={handleSendComment} className="flex gap-2">
                        <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Escreva uma mensagem..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                        <button 
                            type="submit" 
                            disabled={!newComment.trim()}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            </div>
          </div>

          <div className="space-y-6">
             {/* AI Analysis Card */}
             {ticket.aiAnalysis && (
                 <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center mb-3 text-orange-700">
                        <AlertTriangle size={20} className="mr-2" />
                        <h3 className="font-bold text-sm uppercase tracking-wide">Análise de Risco</h3>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed bg-orange-50 p-3 rounded-lg border border-orange-100">
                        {ticket.aiAnalysis}
                    </p>
                 </div>
             )}

             {/* Real Audit History */}
             <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                 <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide">Histórico do Chamado</h3>
                 <div className="space-y-6">
                    {logs.length === 0 ? (
                         <div className="flex items-center space-x-3 opacity-50">
                             <div className="h-2 w-2 rounded-full bg-gray-400"></div>
                             <div>
                                 <p className="text-sm font-medium text-gray-900">Chamado Criado</p>
                                 <p className="text-xs text-gray-500">{ticket.createdAt.toLocaleString('pt-BR')}</p>
                             </div>
                         </div>
                    ) : (
                        logs.map((log, index) => (
                            <div key={log.id} className="relative flex gap-3">
                                {/* Timeline line connector */}
                                {index !== logs.length - 1 && (
                                    <div className="absolute top-6 left-[5px] h-full w-[2px] bg-gray-100"></div>
                                )}
                                
                                <div className="mt-1 flex-shrink-0">
                                    <div className="bg-white relative z-10">
                                        {getLogIcon(log.action)}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{translateLogAction(log.action)}</p>
                                    <p className="text-xs text-gray-500 mb-1">
                                        por <span className="font-medium text-gray-700">{log.actorName}</span> • {log.createdAt.toLocaleString('pt-BR')}
                                    </p>
                                    {log.details && (
                                        <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 inline-block mt-1">
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