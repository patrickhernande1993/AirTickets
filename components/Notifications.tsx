import React, { useEffect, useState } from 'react';
import { Notification, User } from '../types';
import { supabase } from '../services/supabase';
import { Bell, Check, Trash2, Loader2 } from 'lucide-react';

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
    // Optimistic
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const handleDelete = async (id: string) => {
    // Optimistic
    setNotifications(prev => prev.filter(n => n.id !== id));
    await supabase.from('notifications').delete().eq('id', id);
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
        {notifications.length > 0 && (
            <button 
                onClick={async () => {
                    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                    await supabase.from('notifications').update({ is_read: true }).eq('user_id', currentUser.id);
                }}
                className="text-sm text-primary-600 hover:underline"
            >
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
                className={`p-4 hover:bg-gray-50 transition-colors ${!notification.isRead ? 'bg-blue-50/50' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div 
                    className="flex-1 cursor-pointer" 
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-center mb-1">
                        {!notification.isRead && (
                            <span className="h-2 w-2 bg-blue-600 rounded-full mr-2"></span>
                        )}
                        <h4 className={`text-sm font-medium ${!notification.isRead ? 'text-blue-900' : 'text-gray-900'}`}>
                        {notification.title}
                        </h4>
                        <span className="ml-auto text-xs text-gray-400">
                        {notification.createdAt.toLocaleString('pt-BR')}
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  </div>
                  
                  <div className="ml-4 flex items-center space-x-2">
                    {!notification.isRead && (
                        <button 
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-100"
                            title="Marcar como lida"
                        >
                            <Check size={16} />
                        </button>
                    )}
                    <button 
                        onClick={() => handleDelete(notification.id)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-100"
                        title="Excluir"
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