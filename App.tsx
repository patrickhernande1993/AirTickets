import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TicketList } from './components/TicketList';
import { TicketForm } from './components/TicketForm';
import { TicketDetail } from './components/TicketDetail';
import { Ticket, ViewState, TicketStatus, TicketPriority } from './types';
import { v4 as uuidv4 } from 'uuid';

// Mock initial data
const INITIAL_TICKETS: Ticket[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'VPN Connection Failing',
    description: 'I cannot connect to the corporate VPN from home. Error 800 implies a network reachability issue.',
    requester: 'Sarah Jenkins',
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
    requester: 'Mike Ross',
    priority: TicketPriority.LOW,
    status: TicketStatus.IN_PROGRESS,
    category: 'Hardware',
    createdAt: new Date('2023-10-25'),
  }
];

const App: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const handleCreateTicket = (newTicketData: Omit<Ticket, 'id' | 'createdAt'>) => {
    const newTicket: Ticket = {
      ...newTicketData,
      id: uuidv4(),
      createdAt: new Date(),
    };
    setTickets([newTicket, ...tickets]);
    setCurrentView('DASHBOARD');
  };

  const handleSelectTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setCurrentView('TICKET_DETAIL');
  };

  const handleUpdateStatus = (id: string, status: TicketStatus) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    if (selectedTicket && selectedTicket.id === id) {
        setSelectedTicket({ ...selectedTicket, status });
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'CREATE_TICKET':
        return (
          <TicketForm 
            onSave={handleCreateTicket} 
            onCancel={() => setCurrentView('DASHBOARD')} 
          />
        );
      case 'TICKET_DETAIL':
        return selectedTicket ? (
          <TicketDetail 
            ticket={selectedTicket} 
            onBack={() => setCurrentView('DASHBOARD')}
            onUpdateStatus={handleUpdateStatus}
          />
        ) : (
           // Fallback if state gets messy
           <TicketList tickets={tickets} onSelectTicket={handleSelectTicket} />
        );
      case 'DASHBOARD':
      default:
        return <TicketList tickets={tickets} onSelectTicket={handleSelectTicket} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar currentView={currentView} onChangeView={setCurrentView} />
      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
        <div className="max-w-6xl mx-auto">
          <header className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {currentView === 'DASHBOARD' && 'IT Support Dashboard'}
                {currentView === 'CREATE_TICKET' && 'New Ticket'}
                {currentView === 'TICKET_DETAIL' && 'Ticket Details'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {currentView === 'DASHBOARD' && `Managing ${tickets.length} active support requests`}
                {currentView === 'CREATE_TICKET' && 'Submit a new request for the IT department'}
              </p>
            </div>
          </header>
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;