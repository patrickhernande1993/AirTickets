import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Settings, LifeBuoy, Users, Ticket as TicketIcon, List, Bell } from 'lucide-react';
import { ViewState, User } from '../types';
import { supabase } from '../services/supabase';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  currentUser: User;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, currentUser }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadNotifications();
    
    // Realtime subscription for notifications
    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications', 
        filter: `user_id=eq.${currentUser.id}` 
      }, () => {
        fetchUnreadNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    }
  }, [currentUser.id]);

  const fetchUnreadNotifications = async () => {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id)
      .eq('is_read', false);
    
    setUnreadCount(count || 0);
  };

  const getNavItems = () => {
    const commonItems = [
      { id: 'DASHBOARD', label: currentUser.role === 'ADMIN' ? 'Dashboard' : 'Visão Geral', icon: LayoutDashboard },
      { id: 'NOTIFICATIONS', label: 'Notificações', icon: Bell, badge: unreadCount },
    ];

    if (currentUser.role === 'USER') {
      return [
        ...commonItems,
        { id: 'MY_TICKETS', label: 'Meus Chamados', icon: List },
      ];
    }

    // DEV / ADMIN Items
    return [
      ...commonItems,
      { id: 'DASHBOARD', label: 'Todos os Chamados', icon: TicketIcon },
      { id: 'USERS', label: 'Gestão de Usuários', icon: Users },
    ];
  };

  const navItems = getNavItems();

  return (
    <div className="w-64 bg-white h-screen border-r border-gray-200 flex flex-col fixed left-0 top-0 z-10">
      <div className="p-6 flex items-center space-x-2 border-b border-gray-100">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">
          N
        </div>
        <span className="text-xl font-bold text-gray-800">NovaDesk</span>
      </div>

      <div className="px-6 py-4">
        <div className="bg-gray-50 rounded-lg p-3 flex items-center space-x-3 border border-gray-100">
            <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-xs">
                {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
                <p className="text-sm font-medium text-gray-900 truncate">{currentUser.name}</p>
                <p className="text-xs text-gray-500 truncate capitalize">{currentUser.role === 'ADMIN' ? 'Desenvolvedor/Admin' : 'Usuário'}</p>
            </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
            // Remove duplicates if logic adds DASHBOARD twice (handled in getNavItems logic, but extra safety)
            // Logic in getNavItems handles uniqueness based on role
            
            const Icon = item.icon;
            const isActive = currentView === item.id || 
                             (item.id === 'DASHBOARD' && currentView === 'TICKET_DETAIL') ||
                             (item.id === 'MY_TICKETS' && currentView === 'TICKET_DETAIL' && currentUser.role === 'USER');
            
            // Deduplicate visual check
            if (item.id === 'DASHBOARD' && currentUser.role === 'ADMIN' && item.label === 'Dashboard') return null; 

            return (
                <button
                key={item.id + item.label}
                onClick={() => onChangeView(item.id as ViewState)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge ? (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
            );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100 space-y-1">
        <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
          <Settings size={20} />
          <span>Configurações</span>
        </button>
        <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
            <LifeBuoy size={20} />
            <span>Ajuda</span>
        </button>
      </div>
    </div>
  );
};