
import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Users, Ticket as TicketIcon, List, Bell } from 'lucide-react';
import { ViewState, User } from '../types';
import { supabase } from '../services/supabase';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  currentUser: User;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, currentUser }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadNotifications();
    
    // Realtime subscription for notifications
    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { 
        event: '*', 
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

  const getNavItems = (): NavItem[] => {
    // Common items for everyone (Notifications)
    // Dashboard label changes based on role
    const commonItems: NavItem[] = [
      { id: 'NOTIFICATIONS', label: 'Notificações', icon: Bell, badge: unreadCount },
    ];

    if (currentUser.role === 'USER') {
      return [
        { id: 'DASHBOARD', label: 'Visão Geral', icon: LayoutDashboard }, // User Dashboard
        ...commonItems,
        { id: 'MY_TICKETS', label: 'Meus Chamados', icon: List },
      ];
    }

    // DEV / ADMIN Items
    return [
      { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard }, // Admin Dashboard (Graphs)
      ...commonItems,
      { id: 'ALL_TICKETS', label: 'Todos os Chamados', icon: TicketIcon }, // Admin Ticket List
      { id: 'USERS', label: 'Gestão de Usuários', icon: Users },
    ];
  };

  const navItems = getNavItems();

  return (
    <div className="w-64 bg-white h-screen border-r border-gray-200 flex flex-col fixed left-0 top-0 z-10">
      <div className="p-6 flex items-center justify-center border-b border-gray-100 h-20">
          {/* LOGO REPLACEMENT */}
          <img 
            src="/logo.png" 
            alt="NovaDesk" 
            className="h-12 w-auto object-contain max-w-full"
            onError={(e) => {
                // Fallback if image not found
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="hidden flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">
                N
            </div>
            <span className="text-xl font-bold text-gray-800">NovaDesk</span>
          </div>
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
            const Icon = item.icon;
            
            // Determine if this item is active
            let isActive = currentView === item.id;

            // Handle logic for Detail/Create/Edit views which are sub-views of the main lists
            if (['TICKET_DETAIL', 'CREATE_TICKET', 'EDIT_TICKET'].includes(currentView)) {
                 // For Admins, ticket details usually fall under "Todos os Chamados" context
                 if (currentUser.role === 'ADMIN' && item.id === 'ALL_TICKETS') {
                     isActive = true;
                 }
                 // For Users, ticket details fall under "Meus Chamados" context
                 if (currentUser.role === 'USER' && item.id === 'MY_TICKETS') {
                     isActive = true;
                 }
            }
            
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
    </div>
  );
};
