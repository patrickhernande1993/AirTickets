import React, { useState, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { TicketList } from './components/TicketList';
import { TicketForm } from './components/TicketForm';
import { TicketDetail } from './components/TicketDetail';
import { Login } from './components/Login';
import { UserManagement } from './components/UserManagement';
import { Ticket, ViewState, TicketStatus, TicketPriority, User } from './types';
import { v4 as uuidv4 } from 'uuid';

// Mock initial data
const INITIAL_TICKETS: Ticket[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'VPN Connection Failing',
    description: 'I cannot connect to the corporate VPN from home. Error 800 implies a network reachability issue.',
    requester: 'Regular User',
    requesterId: 'user-1',
    priority: TicketPriority.HIGH,
    status: TicketStatus.OPEN,
    category: 'Network',
    createdAt: new Date('2023-10-26'),
    aiAnalysis: 'Network connectivity issue preventing remote access. High priority due to work blockage.',
    suggestedSolution: '1. Check internet connection.\n2. Verify VPN endpoint address.\n3. Restart router.'
  },
  {
    id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    title: 'Request for new Monitor',
    description: 'My secondary monitor is flickering constantly. I need a replacement.',
    requester: 'Regular User',
    requesterId: 'user-1',
    priority: TicketPriority.LOW,
    status: TicketStatus.IN_PROGRESS,
    category: 'Hardware',
    createdAt: new Date('2023-10-25'),
  },
  {
    id: '7ca7b810-9dad-11d1-80b4-00c04fd430c9',
    title: 'Server Downtime',
    description: 'Production server API-01 is unreachable.',
    requester: 'John Doe',
    requesterId: 'user-2',
    priority: TicketPriority.CRITICAL,
    status: TicketStatus.OPEN,
    category: 'Server',
    createdAt: new Date('2023-10-27'),
  }
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketToEdit, setTicketToEdit] = useState<Ticket | null>(null);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
      setCurrentUser(null);
      setCurrentView('DASHBOARD');
  };

  const handleCreateTicket = (newTicketData: Omit<Ticket, 'id' | 'createdAt'>) => {
    if (ticketToEdit) {
        // Update existing ticket
        const updatedTickets = tickets.map(t => 
            t.id === ticketToEdit.id ? { ...t, ...newTicketData } : t
        );
        setTickets(updatedTickets);
        // If we are editing the currently viewed ticket (deep link scenario), update it
        if(selectedTicket && selectedTicket.id === ticketToEdit.id) {
            setSelectedTicket({ ...selectedTicket, ...newTicketData });
        }
        setTicketToEdit(null);
    } else {
        // Create new ticket
        const newTicket: Ticket = {
          ...newTicketData,
          id: uuidv4(),
          createdAt: new Date(),
          requesterId: currentUser?.id || 'unknown',
          requester: currentUser?.name || 'Unknown'
        };
        setTickets([newTicket, ...tickets]);
    }
    
    if (currentUser?.role === 'USER') {
        setCurrentView('MY_TICKETS');
    } else {
        setCurrentView('DASHBOARD');
    }
  };

  const handleSelectTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setCurrentView('TICKET_DETAIL');
  };

  const handleDeleteTicket = (id: string) => {
      setTickets(tickets.filter(t => t.id !== id));
      if (currentUser?.role === 'USER') {
        setCurrentView('MY_TICKETS');
      } else {
        setCurrentView('DASHBOARD');
      }
  };

  const handleEditTicket = (ticket: Ticket) => {
      setTicketToEdit(ticket);
      setCurrentView('EDIT_TICKET');
  };

  const handleUpdateStatus = (id: string, status: TicketStatus) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    if (selectedTicket && selectedTicket.id === id) {
        setSelectedTicket({ ...selectedTicket, status });
    }
  };

  // Determine which tickets to show based on view and role
  const visibleTickets = useMemo(() => {
      if (!currentUser) return [];
      if (currentView === 'MY_TICKETS' || (currentUser.role === 'USER' && currentView === 'DASHBOARD')) {
          return tickets.filter(t => t.requesterId === currentUser.id);
      }
      // Admin dashboard sees all
      return tickets;
  }, [tickets, currentUser, currentView]);

  const renderContent = () => {
    if (!currentUser) return null;

    switch (currentView) {
      case 'CREATE_TICKET':
      case 'EDIT_TICKET':
        return (
          <TicketForm 
            onSave={handleCreateTicket} 
            onCancel={() => setCurrentView(currentUser.role === 'USER' ? 'MY_TICKETS' : 'DASHBOARD')} 
            initialData={currentView === 'EDIT_TICKET' ? ticketToEdit || undefined : undefined}
          />
        );
      case 'TICKET_DETAIL':
        return selectedTicket ? (
          <TicketDetail 
            ticket={selectedTicket}
            currentUser={currentUser}
            onBack={() => setCurrentView(currentUser.role === 'USER' ? 'MY_TICKETS' : 'DASHBOARD')}
            onUpdateStatus={handleUpdateStatus}
            onDelete={handleDeleteTicket}
            onEdit={handleEditTicket}
          />
        ) : (
           <TicketList tickets={visibleTickets} onSelectTicket={handleSelectTicket} />
        );
      case 'USERS':
        return currentUser.role === 'ADMIN' ? <UserManagement currentUser={currentUser} /> : <div>Access Denied</div>;
      case 'MY_TICKETS':
        return <TicketList tickets={visibleTickets} onSelectTicket={handleSelectTicket} />;
      case 'DASHBOARD':
      default:
        // Dashboard handles both "All Tickets" for Admin and "My Stats" for User via visibleTickets filter
        return <TicketList tickets={visibleTickets} onSelectTicket={handleSelectTicket} />;
    }
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar currentView={currentView} onChangeView={setCurrentView} currentUser={currentUser} />
      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
        <div className="max-w-6xl mx-auto">
          <header className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {currentView === 'DASHBOARD' && (currentUser.role === 'ADMIN' ? 'Admin Dashboard' : 'My Dashboard')}
                {currentView === 'MY_TICKETS' && 'My Tickets'}
                {currentView === 'CREATE_TICKET' && 'New Ticket'}
                {currentView === 'EDIT_TICKET' && 'Edit Ticket'}
                {currentView === 'TICKET_DETAIL' && 'Ticket Details'}
                {currentView === 'USERS' && 'User Management'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {(currentView === 'DASHBOARD' || currentView === 'MY_TICKETS') && `Viewing ${visibleTickets.length} active support requests`}
                {currentView === 'USERS' && 'Manage system access and roles'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
                <button 
                    onClick={handleLogout}
                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                    Log out
                </button>
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md">
                    {currentUser.name.charAt(0)}
                </div>
            </div>
          </header>
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
