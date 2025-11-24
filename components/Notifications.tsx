
import React, { useEffect, useState } from 'react';
import { Notification, User } from '../types';
import { supabase } from '../services/supabase';
import { Bell, Check, Trash2, Loader2, CheckCheck } from 'lucide-react';

interface NotificationsProps {
  currentUser: User;
  onSelectNotification: (ticketId: string) => void;
}

export const Notifications: React.FC<NotificationsProps> = ({ currentUser, onSelectNotification }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [currentUser.id]);

  const fetchNotifications = async () => {
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
  };

  const handleMarkAsRead = async (id: string) => {
    // 1. Optimistic Update (Update UI first)
    const originalNotifications = [...notifications];
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));

    // 2. DB Update
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);

    // 3. Rollback if error
    if (error) {
        console.error("Error marking as read:", error);
        setNotifications(originalNotifications);
        alert("Erro ao atualizar notificação. Verifique sua conexão.");
    }
  };

  const handleDelete = async (id: string) => {
    // 1. Optimistic Update
    const originalNotifications = [...notifications];
    setNotifications(prev => prev.filter(n => n.id !== id));

    // 2. DB Update
    const { error } = await supabase.from('notifications').delete().eq('id', id);

    // 3. Rollback if error
    if (error) {
        console.error("Error deleting notification:", error);
        setNotifications(originalNotifications);
        alert("Erro ao excluir notificação. Tente novamente.");
    }
  };

  const handleMarkAllAsRead = async () => {
      const originalNotifications = [...notifications];
      
      // Optimistic
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', currentUser.id);
      
      if (error) {
          console.error("Error marking all as read:", error);
          setNotifications(originalNotifications);
      }
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
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <Bell className="mr-2 text-primary-600" size={24} />
          Suas Notificações
        </h2>
        {notifications.length > 0 && notifications.some(n => !n.isRead) && (
            <button 
                onClick={handleMarkAllAsRead}
                className="text-sm font-medium text-primary-600 hover:text-primary-800 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors flex items-center"
            >
                <CheckCheck size={16} className="mr-1" />
                Marcar todas como lidas
            </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="bg-gray-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                <Bell size={24} className="text-gray-400" />
            </div>
            <p>Você não tem notificações.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <li 
                key={notification.id} 
                className={`p-4 hover:bg-gray-50 transition-colors ${!notification.isRead ? 'bg-blue-50/40' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div 
                    className="flex-1 cursor-pointer" 
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-center mb-1 flex-wrap gap-2">
                        {!notification.isRead && (
                            <span className="h-2 w-2 bg-blue-600 rounded-full flex-shrink-0" title="Não lida"></span>
                        )}
                        <h4 className={`text-sm font-medium ${!notification.isRead ? 'text-blue-900' : 'text-gray-900'}`}>
                        {notification.title}
                        </h4>
                        <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
                        {notification.createdAt.toLocaleString('pt-BR')}
                        </span>
                    </div>
                    <p className={`text-sm mt-1 ${!notification.isRead ? 'text-blue-800' : 'text-gray-600'}`}>
                        {notification.message}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    {!notification.isRead && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notification.id); }}
                            className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-white transition-colors"
                            title="Marcar como lida"
                        >
                            <Check size={16} />
                        </button>
                    )}
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(notification.id); }}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-white transition-colors"
                        title="Excluir notificação"
                    >
                        <Trash2 size={16} />
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
