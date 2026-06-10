
import React, { useEffect, useState, useCallback } from 'react';
import { Notification, User } from '../types';
import { supabase } from '../services/supabase';
import { Bell, Check, Trash2, Loader2, CheckCheck } from 'lucide-react';

interface NotificationsProps {
  currentUser: User;
  onSelectNotification: (ticketId: string) => void;
  onRefreshNotifications: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export const Notifications: React.FC<NotificationsProps> = ({
  currentUser,
  onSelectNotification,
  onUnreadCountChange
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Sempre que a lista local muda, propaga o count imediatamente para o badge
  useEffect(() => {
    const unread = notifications.filter(n => !n.isRead).length;
    onUnreadCountChange?.(unread);
  }, [notifications]);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotifications(data.map((n: any) => ({
        id: n.id,
        userId: n.user_id,
        title: n.title,
        message: n.message,
        isRead: n.is_read,
        ticketId: n.ticket_id,
        createdAt: new Date(n.created_at)
      })));
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  // Busca inicial + realtime para novos INSERT (novos chamados)
  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel(`notifications-view-${currentUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${currentUser.id}`
      }, (payload) => {
        const n = payload.new as any;
        setNotifications(prev => [{
          id: n.id,
          userId: n.user_id,
          title: n.title,
          message: n.message,
          isRead: n.is_read,
          ticketId: n.ticket_id,
          createdAt: new Date(n.created_at)
        }, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser.id]);

  const handleMarkAsRead = async (id: string) => {
    // Optimistic update imediato
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    // Persiste no banco (sem bloquear a UI)
    supabase.from('notifications').update({ is_read: true }).eq('id', id).then(({ error }) => {
      if (error) {
        console.error('Erro ao marcar como lida:', error);
        // Rollback apenas se DB falhou
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: false } : n));
      }
    });
  };

  const handleDelete = async (id: string) => {
    // Optimistic: remove imediatamente da lista
    setNotifications(prev => prev.filter(n => n.id !== id));
    // Persiste no banco
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) {
      console.error('Erro ao excluir notificação (verifique políticas RLS):', error.message);
      // Rollback: rebusca do banco se falhou
      fetchNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    // Optimistic update imediato
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    supabase.from('notifications').update({ is_read: true }).eq('user_id', currentUser.id).then(({ error }) => {
      if (error) {
        console.error('Erro ao marcar todas como lidas:', error);
        fetchNotifications(); // Rollback via refetch
      }
    });
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id);
    }
    if (notification.ticketId) {
      onSelectNotification(notification.ticketId);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Bell className="text-primary-600" size={20} />
          Suas Notificações
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </h2>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-sm font-medium text-primary-600 hover:text-primary-800 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <CheckCheck size={15} />
            Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <div className="bg-slate-100 rounded-xl h-16 w-16 flex items-center justify-center mx-auto mb-3">
              <Bell size={24} className="text-slate-300" />
            </div>
            <p className="text-sm">Você não tem notificações.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={`p-4 transition-colors ${!notification.isRead ? 'bg-primary-50/40 hover:bg-primary-50/60' : 'hover:bg-slate-50'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {!notification.isRead && (
                        <span className="h-2 w-2 bg-primary-600 rounded-full flex-shrink-0" />
                      )}
                      <h4 className={`text-sm font-semibold ${!notification.isRead ? 'text-primary-900' : 'text-slate-700'}`}>
                        {notification.title}
                      </h4>
                      <span className="text-xs text-slate-400 ml-auto whitespace-nowrap">
                        {notification.createdAt.toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className={`text-sm ${!notification.isRead ? 'text-primary-800' : 'text-slate-500'}`}>
                      {notification.message}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!notification.isRead && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notification.id); }}
                        className="p-1.5 text-slate-400 hover:text-primary-600 rounded-lg hover:bg-white transition-colors"
                        title="Marcar como lida"
                      >
                        <Check size={15} />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(notification.id); }}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-white transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
