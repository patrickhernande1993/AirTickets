
import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Users, Ticket as TicketIcon, List, Bell, LogOut, Menu, X } from 'lucide-react';
import { ViewState, User } from '../types';
import { supabase } from '../services/supabase';
import { Logo } from './Logo';

interface TopNavProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  currentUser: User;
  onLogout: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

export const TopNav: React.FC<TopNavProps> = ({ currentView, onChangeView, currentUser, onLogout }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchUnreadNotifications();
    
    const channel = supabase
      .channel('public:notifications_top')
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

  const navItems: NavItem[] = [
    { id: 'DASHBOARD', label: currentUser.role === 'USER' ? 'Visão Geral' : 'Dashboard', icon: LayoutDashboard },
  ];

  if (currentUser.role === 'USER') {
    navItems.push({ id: 'MY_TICKETS', label: 'Meus Chamados', icon: List });
  } else {
    navItems.push({ id: 'ALL_TICKETS', label: 'Todos os Chamados', icon: TicketIcon });
    navItems.push({ id: 'USERS', label: 'Gestão de Usuários', icon: Users });
  }

  const handleItemClick = (view: ViewState) => {
    onChangeView(view);
    setIsMobileMenuOpen(false);
  };

  const isActive = (itemId: string) => {
    if (currentView === itemId) return true;
    
    // Sub-view logic
    if (['TICKET_DETAIL', 'CREATE_TICKET', 'EDIT_TICKET'].includes(currentView)) {
        if (currentUser.role === 'ADMIN' && itemId === 'ALL_TICKETS') return true;
        if (currentUser.role === 'USER' && itemId === 'MY_TICKETS') return true;
    }
    return false;
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 w-full shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left: Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center space-x-2 cursor-pointer" onClick={() => handleItemClick('DASHBOARD')}>
              <Logo className="h-9 w-auto" />
              <span className="text-xl font-bold text-slate-800 tracking-tight hidden sm:block">AirService</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:ml-8 md:flex md:space-x-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id as ViewState)}
                  className={`inline-flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200 ${
                    isActive(item.id)
                      ? 'border-primary-600 text-primary-700 bg-primary-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <item.icon size={18} className="mr-2" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right: User Information & Logout */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Notifications Bell Icon */}
            <button
              onClick={() => handleItemClick('NOTIFICATIONS')}
              className={`relative p-2 transition-colors rounded-none ${
                  currentView === 'NOTIFICATIONS' 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
              title="Notificações"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 block h-4 w-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <div className="hidden md:flex items-center space-x-3 pr-4 border-r border-slate-200 ml-2">
               <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900 leading-tight">{currentUser.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-tighter">{currentUser.role === 'ADMIN' ? 'Desenvolvedor/Admin' : 'Usuário'}</p>
               </div>
               <div className="h-9 w-9 border-2 border-primary-600 bg-white flex items-center justify-center text-primary-600 font-bold shadow-sm">
                  {currentUser.name.charAt(0).toUpperCase()}
               </div>
            </div>

            <button 
              onClick={onLogout}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors rounded-none"
              title="Sair"
            >
              <LogOut size={20} />
            </button>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-none text-slate-400 hover:text-slate-500 hover:bg-slate-100 focus:outline-none"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'} border-t border-slate-100 bg-white`}>
        <div className="px-2 pt-2 pb-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id as ViewState)}
              className={`block w-full text-left px-3 py-2 text-base font-medium transition-colors ${
                isActive(item.id)
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center">
                <item.icon size={20} className="mr-3" />
                {item.label}
              </div>
            </button>
          ))}
          {/* Mobile Notifications Link */}
          <button
            onClick={() => handleItemClick('NOTIFICATIONS')}
            className={`block w-full text-left px-3 py-2 text-base font-medium transition-colors ${
              currentView === 'NOTIFICATIONS'
                ? 'bg-primary-50 text-primary-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Bell size={20} className="mr-3" />
                Notificações
              </div>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
          </button>
        </div>
        <div className="pt-4 pb-3 border-t border-slate-100 px-4">
          <div className="flex items-center">
            <div className="h-10 w-10 border-2 border-primary-600 bg-white flex items-center justify-center text-primary-600 font-bold">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3">
              <div className="text-base font-medium text-slate-800">{currentUser.name}</div>
              <div className="text-sm font-medium text-slate-500">{currentUser.email}</div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
