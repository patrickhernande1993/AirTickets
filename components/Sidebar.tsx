
import React, { useState } from 'react';
import {
  LayoutDashboard, Users, Ticket as TicketIcon, List, Bell,
  X, LogOut, CalendarDays, BookOpen, Monitor, Repeat,
  AlertTriangle, ChevronLeft, ChevronRight, Menu, Shield, Plus
} from 'lucide-react';
import { ViewState, User } from '../types';
import { Logo } from './Logo';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  currentUser: User;
  onLogout: () => void;
  unreadCount: number;
}

interface NavItem {
  id: ViewState;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  dividerBefore?: boolean;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { id: 'DASHBOARD',      label: 'Dashboard',            icon: LayoutDashboard },
  { id: 'MY_TICKETS',     label: 'Meus Chamados',        icon: List },
  { id: 'ALL_TICKETS',    label: 'Todos os Chamados',    icon: TicketIcon,    adminOnly: true },
  { id: 'AGENDA',         label: 'Agenda',               icon: CalendarDays,  adminOnly: true },
  { id: 'NOTIFICATIONS',  label: 'Notificações',         icon: Bell },
  { id: 'KNOWLEDGE_BASE', label: 'Base de Conhecimento', icon: BookOpen,      adminOnly: true, dividerBefore: true },
  { id: 'RECURRING',      label: 'Recorrentes',          icon: Repeat,        adminOnly: true },
  { id: 'ESCALATION',     label: 'Escalonamento',        icon: AlertTriangle, adminOnly: true },
  { id: 'AUDIT_LOG',      label: 'Auditoria',            icon: Shield,        adminOnly: true },
  { id: 'USERS',          label: 'Usuários',             icon: Users,         adminOnly: true, dividerBefore: true },
  { id: 'KIOSK',          label: 'Modo Quiosque',        icon: Monitor,       adminOnly: true },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentView, onChangeView, currentUser, onLogout, unreadCount
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = ALL_NAV_ITEMS.filter(item => {
    if (item.id === 'MY_TICKETS' && currentUser.role !== 'USER') return false;
    if (item.adminOnly && currentUser.role !== 'ADMIN') return false;
    return true;
  });

  const isActive = (id: ViewState) => {
    if (currentView === id) return true;
    if (['TICKET_DETAIL', 'CREATE_TICKET', 'EDIT_TICKET'].includes(currentView)) {
      if (currentUser.role === 'ADMIN' && id === 'ALL_TICKETS') return true;
      if (currentUser.role === 'USER' && id === 'MY_TICKETS') return true;
    }
    return false;
  };

  const handleClick = (view: ViewState) => {
    onChangeView(view);
    setMobileOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">

      {/* Logo */}
      <div className={`flex items-center border-b border-slate-800 h-16 flex-shrink-0 ${collapsed ? 'justify-center px-3' : 'px-5'}`}>
        <div
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={() => handleClick('DASHBOARD')}
        >
          <Logo className="h-7 w-auto flex-shrink-0" />
          {!collapsed && (
            <span className="text-white font-semibold text-base tracking-tight">AirService</span>
          )}
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden ml-auto text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* New ticket CTA */}
      {!collapsed && (
        <div className="px-4 pt-4 pb-2 flex-shrink-0">
          <button
            onClick={() => handleClick('CREATE_TICKET')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors duration-150"
          >
            <Plus size={15} />
            Novo Chamado
          </button>
        </div>
      )}
      {collapsed && (
        <div className="flex justify-center pt-4 pb-2 flex-shrink-0">
          <button
            onClick={() => handleClick('CREATE_TICKET')}
            className="p-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
            title="Novo Chamado"
          >
            <Plus size={16} />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {navItems.map((item) => {
          const active = isActive(item.id);
          const Icon = item.icon;
          const showBadge = item.id === 'NOTIFICATIONS' && unreadCount > 0;

          return (
            <React.Fragment key={item.id}>
              {item.dividerBefore && (
                <div className={`my-2 border-t border-slate-800 ${collapsed ? 'mx-1' : 'mx-2'}`} />
              )}
              <button
                onClick={() => handleClick(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center rounded-lg transition-all duration-150 group mb-0.5
                  ${collapsed ? 'justify-center p-2.5' : 'px-3 py-2 gap-3'}
                  ${active
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
              >
                <div className="relative flex-shrink-0">
                  <Icon size={17} strokeWidth={active ? 2.5 : 1.8} />
                  {showBadge && collapsed && (
                    <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 bg-red-500 text-white text-[7px] font-bold flex items-center justify-center rounded-full">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <>
                    <span className={`text-sm flex-1 text-left ${active ? 'font-medium text-white' : 'font-normal'}`}>
                      {item.label}
                    </span>
                    {showBadge && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* User + footer */}
      <div className="flex-shrink-0 border-t border-slate-800">
        {/* User info */}
        {!collapsed ? (
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate leading-tight">{currentUser.name}</p>
              <p className="text-[11px] text-slate-500 capitalize leading-tight mt-0.5">
                {currentUser.role === 'ADMIN' ? 'Administrador' : 'Usuário'}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-md transition-colors flex-shrink-0"
              title="Sair"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center py-3 gap-2">
            <div className="h-7 w-7 rounded-full bg-primary-600 text-white flex items-center justify-center font-semibold text-xs">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-md transition-colors"
              title="Sair"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}

        {/* Collapse toggle (desktop) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`hidden md:flex w-full items-center px-4 py-2.5 text-slate-600 hover:text-slate-400 hover:bg-slate-800/50 transition-colors text-xs border-t border-slate-800 ${collapsed ? 'justify-center' : 'gap-2'}`}
          title={collapsed ? 'Expandir' : 'Recolher'}
        >
          {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>Recolher</span></>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 text-slate-300 rounded-lg shadow-lg"
        aria-label="Abrir menu"
      >
        <Menu size={18} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col md:hidden
        transform transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col h-screen sticky top-0 flex-shrink-0 transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}>
        <SidebarContent />
      </aside>
    </>
  );
};
