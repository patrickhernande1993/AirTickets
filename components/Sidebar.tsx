
import React, { useEffect, useState, useMemo } from 'react';
import { LayoutDashboard, Users, Ticket as TicketIcon, List, Bell, X } from 'lucide-react';
import { ViewState, User, Ticket, TicketStatus } from '../types';
import { supabase } from '../services/supabase';
import { Logo } from './Logo';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  currentUser: User;
  tickets: Ticket[]; // Added missing prop
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, currentUser, tickets, isOpen, onClose }) => {
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

  // Calculate Stats based on User Role
  const stats = useMemo(() => {
    // If Admin, count all relevant status tickets. If User, only theirs.
    const userTickets = currentUser.role === 'ADMIN' 
        ? tickets 
        : tickets.filter(t => t.requesterId === currentUser.id);

    return {
      open: userTickets.filter(t => t.status === TicketStatus.OPEN).length,
      inProgress: userTickets.filter(t => t.status === TicketStatus.IN_PROGRESS).length
    };
  }, [tickets, currentUser]);

  const getNavItems = (): NavItem[] => {
    const commonItems: NavItem[] = [
      { id: 'NOTIFICATIONS', label: 'Notificações', icon: Bell, badge: unreadCount },
    ];

    if (currentUser.role === 'USER') {
      return [
        { id: 'DASHBOARD', label: 'Visão Geral', icon: LayoutDashboard },
        ...commonItems,
        { id: 'MY_TICKETS', label: 'Meus Chamados', icon: List },
      ];
    }

    return [
      { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
      ...commonItems,
      { id: 'ALL_TICKETS', label: 'Todos os Chamados', icon: TicketIcon },
      { id: 'USERS', label: 'Gestão de Usuários', icon: Users },
    ];
  };

  const navItems = getNavItems();

  const handleItemClick = (view: ViewState) => {
      onChangeView(view);
      onClose();
  };

  return (
    <>
        <div className={`
            fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col h-screen
            transform transition-transform duration-300 ease-in-out
            ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
            md:translate-x-0
        `}>
        <div className="p-6 flex items-center justify-between border-b border-gray-100 h-20">
            <div className="flex items-center space-x-2">
                <Logo className="h-10 w-auto" />
                <span className="text-xl font-bold text-gray-800 tracking-tight">AirService</span>
            </div>
            <button onClick={onClose} className="md:hidden text-gray-500 hover:text-gray-700">
                <X size={24} />
            </button>
        </div>

        <div className="px-6 py-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-3 mb-3">
                    <div className="h-9 w-9 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm ring-2 ring-white">
                        {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-gray-900 truncate">{currentUser.name}</p>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 truncate">
                            {currentUser.role === 'ADMIN' ? 'Desenvolvedor/Admin' : 'Usuário'}
                        </p>
                    </div>
                </div>
                
                {/* Status Summary */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="bg-white p-2 rounded-lg border border-yellow-100 flex flex-col items-center">
                        <span className="text-sm font-bold text-yellow-700">{stats.open}</span>
                        <span className="text-[9px] text-gray-400 uppercase font-bold">Abertos</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-blue-100 flex flex-col items-center">
                        <span className="text-sm font-bold text-blue-700">{stats.inProgress}</span>
                        <span className="text-[9px] text-gray-400 uppercase font-bold">Em And.</span>
                    </div>
                </div>
            </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
                const Icon = item.icon;
                let isActive = currentView === item.id;

                if (['TICKET_DETAIL', 'CREATE_TICKET', 'EDIT_TICKET'].includes(currentView)) {
                    if (currentUser.role === 'ADMIN' && item.id === 'ALL_TICKETS') isActive = true;
                    if (currentUser.role === 'USER' && item.id === 'MY_TICKETS') isActive = true;
                }
                
                return (
                    <button
                    key={item.id + item.label}
                    onClick={() => handleItemClick(item.id as ViewState)}
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
        
        {isOpen && (
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                onClick={onClose}
            ></div>
        )}
    </>
  );
};
