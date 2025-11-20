import React from 'react';
import { LayoutDashboard, PlusCircle, Settings, LifeBuoy, Users, Ticket as TicketIcon, List } from 'lucide-react';
import { ViewState, User, UserRole } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  currentUser: User;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, currentUser }) => {
  
  const getNavItems = () => {
    const commonItems = [
      { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
    ];

    if (currentUser.role === 'USER') {
      return [
        ...commonItems,
        { id: 'MY_TICKETS', label: 'My Tickets', icon: List },
        { id: 'CREATE_TICKET', label: 'New Ticket', icon: PlusCircle },
      ];
    }

    // DEV / ADMIN Items
    return [
      ...commonItems,
      { id: 'DASHBOARD', label: 'All Tickets', icon: TicketIcon }, // Admin sees all tickets in dashboard/list context
      { id: 'CREATE_TICKET', label: 'New Ticket', icon: PlusCircle },
      { id: 'USERS', label: 'User Management', icon: Users },
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
                {currentUser.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
                <p className="text-sm font-medium text-gray-900 truncate">{currentUser.name}</p>
                <p className="text-xs text-gray-500 truncate capitalize">{currentUser.role === 'ADMIN' ? 'Developer' : 'User'}</p>
            </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
            const Icon = item.icon;
            // Dashboard is active if showing dashboard or if showing ticket detail (contextually)
            const isActive = currentView === item.id || 
                             (item.id === 'DASHBOARD' && currentView === 'TICKET_DETAIL') ||
                             (item.id === 'MY_TICKETS' && currentView === 'TICKET_DETAIL' && currentUser.role === 'USER');
            
            return (
                <button
                key={item.id}
                onClick={() => onChangeView(item.id as ViewState)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                >
                <Icon size={20} />
                <span>{item.label}</span>
                </button>
            );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100 space-y-1">
        <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
          <Settings size={20} />
          <span>Settings</span>
        </button>
        <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
            <LifeBuoy size={20} />
            <span>Help Center</span>
        </button>
      </div>
    </div>
  );
};
