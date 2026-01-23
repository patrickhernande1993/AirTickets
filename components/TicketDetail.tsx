
import React, { useState, useEffect, useRef } from 'react';
import { Ticket, TicketStatus, User, Comment, AuditLog } from '../types';
import { 
  ArrowLeft, CheckCircle, Clock, User as UserIcon, Calendar, 
  Tag, Trash2, Edit, Send, MessageSquare, FileText, 
  Paperclip, Mail, Info, ExternalLink, MailCheck 
} from 'lucide-react';
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
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [isSimulatingEmail, setIsSimulatingEmail] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const isAdmin = currentUser.role === 'ADMIN';
  const isOwner = currentUser.id === ticket.requesterId;

  // Endereço de e-mail fictício baseado na configuração de SMTP (Resend)
  const supportEmail = "ti@grupoairslaid.com.br";
  const replyEmail = `chamado+${ticket.ticketNumber}@grupoairslaid.com.br`;

  useEffect(() => {
      fetchComments();
      fetchLogs();
      
      const channel = supabase
        .channel(`comments:${ticket.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `ticket_id=eq.${ticket.id}` }, () => {
            fetchComments(); 
        })
        .subscribe();

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
          setComments(data.map((c: any) => ({
              id: c.id,
              ticketId: c.ticket_id,
              userId: c.user_id,
              content: c.content,
              createdAt: new Date(c.created_at),
              userName: c.profiles?.name || 'Sistema Externo',
              userRole: c.profiles?.role || 'USER',
              source: c.source || 'WEB'
          })));
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
      setNewComment(''); 

      try {
          const { error } = await supabase.from('comments').insert({
              ticket_id: ticket.id,
              user_id: currentUser.id,
              content: commentText,
              source: 'WEB'
          });

          if (error) throw error;
      } catch (error) {
          console.error("Error sending comment:", error);
          alert("Erro ao enviar mensagem");
          setNewComment(commentText); 
      }
  };

  // Função simuladora para demonstrar a recepção de e-mail (Webhook do Resend Inbound)
  const simulateEmailResponse = async () => {
    setIsSimulatingEmail(true);
    try {
        const { error } = await supabase.from('comments').insert({
            ticket_id: ticket.id,
            user_id: ticket.requesterId, // Simula o solicitante respondendo
            content: "Olá equipe, recebi a notificação por e-mail e estou respondendo diretamente por aqui para testar a integração. O problema parece ter sido resolvido.",
            source: 'EMAIL'
        });
        if (error) throw error;
        
        // Notifica o admin da resposta
        const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'ADMIN');
        if (admins) {
            await supabase.from('notifications').insert(
                admins.map(a => ({
                    user_id: a.id,
                    title: `Resposta via E-mail - #${ticket.ticketNumber}`,
                    message: `O solicitante respondeu via e-mail no chamado "${ticket.title}"`,
                    ticket_id: ticket.id
                }))
            );
        }
    } catch (err) {
        console.error("Simulation failed", err);
    } finally {
        setTimeout(() => setIsSimulatingEmail(false), 800);
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

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <button onClick={onBack} className="flex items-center text-gray-500 hover:text-gray-700 font-medium transition-colors">
            <ArrowLeft size={18} className="mr-2" />
            Voltar para lista
          </button>

          {isAdmin && (
              <button 
                onClick={simulateEmailResponse}
                disabled={isSimulatingEmail}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-all text-sm font-semibold disabled:opacity-50"
              >
                  {isSimulatingEmail ? <Clock size={16} className="animate-spin" /> : <MailCheck size={16} />}
                  <span>Simular Entrada via E-mail</span>
              </button>
          )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            {/* Ticket Information */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center space-x-3 mb-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">#{ticket.ticketNumber}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                ticket.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' : 
                                ticket.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                                'bg-blue-100 text-blue-700'
                            }`}>
                                {translatePriority(ticket.priority)}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 leading-tight">{ticket.title}</h1>
                    </div>
                    <div className="flex space-x-2">
                        {(isAdmin || isOwner) && <button onClick={() => onEdit(ticket)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={20} /></button>}
                        {(isAdmin || isOwner) && <button onClick={() => window.confirm("Excluir chamado?") && onDelete(ticket.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={20} /></button>}
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 py-4 border-y border-gray-50">
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Solicitante</p>
                        <p className="text-sm font-semibold text-gray-700 truncate">{ticket.requester}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Data</p>
                        <p className="text-sm font-semibold text-gray-700">{ticket.createdAt.toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Categoria</p>
                        <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{ticket.category}</span>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Status</p>
                        <span className="text-sm font-bold text-primary-600">{translateStatus(ticket.status)}</span>
                    </div>
                </div>

                <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
                </div>

                {ticket.attachments && ticket.attachments.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center"><Paperclip size={14} className="mr-1" /> Anexos</p>
                        <div className="flex flex-wrap gap-2">
                            {ticket.attachments.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center space-x-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors">
                                    <FileText size={14} className="text-gray-400" />
                                    <span className="text-xs font-medium text-gray-600">Arquivo {i + 1}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Interactions / Chat */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[550px]">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 flex items-center text-sm uppercase tracking-wider">
                        <MessageSquare size={16} className="mr-2 text-primary-600" />
                        Mensagens e Histórico
                    </h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
                    {comments.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <MessageSquare size={48} className="opacity-10 mb-2" />
                            <p className="text-sm">Ainda não há interações neste chamado.</p>
                        </div>
                    ) : (
                        comments.map((comment) => {
                            const isMe = comment.userId === currentUser.id;
                            const fromEmail = comment.source === 'EMAIL';
                            return (
                                <div key={comment.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className={`flex items-center space-x-2 mb-1 ${isMe ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                                        <span className="text-[11px] font-bold text-gray-500 uppercase">{comment.userName}</span>
                                        {fromEmail && (
                                            <span className="flex items-center px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[9px] font-bold uppercase border border-indigo-100">
                                                <Mail size={10} className="mr-1" /> e-mail
                                            </span>
                                        )}
                                        <span className="text-[10px] text-gray-400">{comment.createdAt.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <div className={`p-4 rounded-2xl max-w-[85%] text-sm leading-relaxed shadow-sm ${
                                        isMe 
                                        ? 'bg-primary-600 text-white rounded-tr-none' 
                                        : fromEmail 
                                            ? 'bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-tl-none'
                                            : 'bg-gray-100 text-gray-800 rounded-tl-none'
                                    }`}>
                                        {comment.content}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={commentsEndRef} />
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-200">
                    <form onSubmit={handleSendComment} className="flex gap-3">
                        <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Digite sua resposta..."
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm transition-all shadow-inner"
                        />
                        <button 
                            type="submit" 
                            disabled={!newComment.trim()}
                            className="bg-primary-600 text-white p-3 rounded-xl hover:bg-primary-700 disabled:opacity-50 shadow-lg shadow-primary-200 transition-all active:scale-95"
                        >
                            <Send size={20} />
                        </button>
                    </form>
                </div>
            </div>
        </div>

        <div className="space-y-6">
            {/* Email Integration Panel */}
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl p-6 text-white shadow-xl shadow-indigo-100">
                <div className="flex items-center space-x-2 mb-4">
                    <Mail size={20} className="text-indigo-200" />
                    <h3 className="font-bold text-sm uppercase tracking-widest">Responder via E-mail</h3>
                </div>
                <p className="text-xs text-indigo-100 mb-4 leading-relaxed">
                    Você pode responder a este chamado diretamente do seu e-mail corporativo sem precisar abrir a plataforma.
                </p>
                <div className="bg-white/10 p-3 rounded-lg border border-white/20 mb-4 flex items-center justify-between group">
                    <code className="text-[11px] font-mono select-all truncate opacity-90">{replyEmail}</code>
                    <button onClick={() => navigator.clipboard.writeText(replyEmail)} className="text-indigo-200 hover:text-white transition-colors flex-shrink-0 ml-2" title="Copiar endereço">
                        <ExternalLink size={14} />
                    </button>
                </div>
                <div className="flex items-start space-x-2 text-[10px] text-indigo-200 italic opacity-80">
                    <Info size={12} className="flex-shrink-0 mt-0.5" />
                    <span>Todas as mensagens enviadas para este endereço serão automaticamente anexadas ao ticket #{ticket.ticketNumber}.</span>
                </div>
            </div>

            {/* Status & Actions Control (Admin Only) */}
            {isAdmin && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <h3 className="font-bold text-gray-900 mb-4 text-xs uppercase tracking-widest">Controle de Fluxo</h3>
                    <div className="space-y-2">
                        {[TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED].map((status) => (
                            <button
                                key={status}
                                onClick={() => onUpdateStatus(ticket.id, status)}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-semibold transition-all ${
                                    ticket.status === status 
                                    ? 'bg-primary-50 text-primary-700 border border-primary-200' 
                                    : 'text-gray-500 hover:bg-gray-50 border border-transparent'
                                }`}
                            >
                                {translateStatus(status)}
                                {ticket.status === status && <CheckCircle size={14} />}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Audit Logs Timeline */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 overflow-hidden">
                <h3 className="font-bold text-gray-900 mb-6 text-xs uppercase tracking-widest flex items-center">
                    <Calendar size={14} className="mr-2 text-gray-400" /> Histórico de Eventos
                </h3>
                <div className="space-y-6">
                    {logs.map((log, i) => (
                        <div key={log.id} className="relative flex gap-4">
                            {i !== logs.length - 1 && <div className="absolute top-5 left-[7px] w-0.5 h-full bg-gray-100" />}
                            <div className="relative z-10 w-3.5 h-3.5 mt-1 rounded-full border-2 border-white bg-gray-200 shadow-sm" />
                            <div className="flex-1">
                                <p className="text-[11px] font-bold text-gray-800 leading-none mb-1">
                                    {log.action === 'CREATED' ? 'Chamado Iniciado' : 
                                     log.action === 'STATUS_CHANGE' ? 'Mudança de Status' : 'Edição'}
                                </p>
                                <p className="text-[10px] text-gray-400 mb-1">{log.actorName} • {log.createdAt.toLocaleDateString('pt-BR')}</p>
                                {log.details && <p className="text-[10px] text-gray-500 italic leading-relaxed">"{log.details}"</p>}
                            </div>
                        </div>
                    ))}
                    {logs.length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-4">Nenhum evento registrado.</p>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
