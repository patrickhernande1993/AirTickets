
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TicketList } from './components/TicketList';
import { TicketForm } from './components/TicketForm';
import { TicketDetail } from './components/TicketDetail';
import { Login } from './components/Login';
import { UserManagement } from './components/UserManagement';
import { Notifications } from './components/Notifications';
import { Dashboard } from './components/Dashboard';
import { Ticket, ViewState, TicketStatus, User } from './types';
import { supabase } from './services/supabase';
import { Loader2, Menu } from 'lucide-react';
import { Logo } from './components/Logo';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketToEdit, setTicketToEdit] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) fetchProfile(session.user.id, session.user.email!);
        else { setCurrentUser(null); setTickets([]); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
      if (currentUser) fetchTickets();
  }, [currentUser, currentView]);

  const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await fetchProfile(session.user.id, session.user.email!);
      else setLoading(false);
  };

  const fetchProfile = async (userId: string, email: string) => {
      try {
          const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
          if (data && data.is_active !== false) {
            setCurrentUser({ id: data.id, name: data.name, email: data.email || email, role: data.role, isActive: data.is_active });
          } else if (data && data.is_active === false) {
            alert("Conta desativada."); await supabase.auth.signOut();
          }
      } catch (error) { console.error('Error profile:', error); } finally { setLoading(false); }
  };

  const fetchTickets = async () => {
      try {
          const { data, error } = await supabase.from('tickets').select('*, profiles:requester_id(name)').order('created_at', { ascending: false });
          if (error) throw error;
          setTickets(data.map((t: any) => ({
              id: t.id, ticketNumber: t.ticket_number || 0, title: t.title, description: t.description,
              requester: t.profiles?.name || t.requester_name, requesterId: t.requester_id,
              priority: t.priority, status: t.status, category: t.category,
              createdAt: new Date(t.created_at), updatedAt: t.updated_at ? new Date(t.updated_at) : new Date(t.created_at),
              resolvedAt: t.resolved_at ? new Date(t.resolved_at) : undefined, attachments: t.attachments || []
          })));
      } catch (error) { console.error('Error tickets:', error); }
  };

  const handleCreateTicket = async (newTicketData: Omit<Ticket, 'id' | 'createdAt' | 'ticketNumber'>) => {
    if (!currentUser) return;
    try {
        const { data, error } = await supabase.from('tickets').insert([{
            title: newTicketData.title, description: newTicketData.description,
            requester_name: newTicketData.requester, requester_id: newTicketData.requesterId,
            priority: newTicketData.priority, category: newTicketData.category,
            status: 'OPEN', attachments: newTicketData.attachments
        }]).select().single();
        if (error) throw error;
        await fetchTickets();
        setCurrentView(currentUser.role === 'USER' ? 'MY_TICKETS' : 'ALL_TICKETS');
    } catch (error) { console.error("Error saving:", error); }
  };

  const handleUpdateStatus = async (id: string, status: TicketStatus) => {
    try {
        const { error } = await supabase.from('tickets').update({ status, resolved_at: status === TicketStatus.RESOLVED ? new Date().toISOString() : null }).eq('id', id);
        if (error) throw error;
        await fetchTickets();
    } catch (error) { console.error("Error status:", error); }
  };

  const renderContent = () => {
    if (!currentUser) return null;
    switch (currentView) {
      case 'CREATE_TICKET':
      case 'EDIT_TICKET':
        return <TicketForm onSave={handleCreateTicket} onCancel={() => setCurrentView(currentUser.role === 'USER' ? 'MY_TICKETS' : 'ALL_TICKETS')} initialData={currentView === 'EDIT_TICKET' ? ticketToEdit || undefined : undefined} currentUser={currentUser} />;
      case 'TICKET_DETAIL':
        return selectedTicket ? <TicketDetail ticket={selectedTicket} currentUser={currentUser} onBack={() => setCurrentView(currentUser.role === 'USER' ? 'MY_TICKETS' : 'ALL_TICKETS')} onUpdateStatus={handleUpdateStatus} onDelete={() => {}} onEdit={() => {}} /> : null;
      case 'USERS':
        return <UserManagement currentUser={currentUser} />;
      case 'NOTIFICATIONS':
        return <Notifications currentUser={currentUser} onSelectNotification={() => {}} />;
      case 'MY_TICKETS':
      case 'ALL_TICKETS':
        return <TicketList tickets={tickets} onSelectTicket={(t) => { setSelectedTicket(t); setCurrentView('TICKET_DETAIL'); }} onCreateTicket={() => setCurrentView('CREATE_TICKET')} onUpdateStatus={handleUpdateStatus} />;
      default:
        return <Dashboard tickets={tickets} currentUser={currentUser} onCreateTicket={() => setCurrentView('CREATE_TICKET')} />;
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary-600" size={48} /></div>;
  if (!currentUser) return <Login onLoginSuccess={() => checkUser()} />;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar currentView={currentView} onChangeView={setCurrentView} currentUser={currentUser} tickets={tickets} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="flex-1 transition-all duration-300 md:ml-64 p-4 md:p-8">
          <header className="mb-8 flex justify-between items-center">
              <div className="md:hidden flex items-center gap-2">
                <button onClick={() => setIsSidebarOpen(true)} className="p-2"><Menu /></button>
                <Logo className="h-8" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">AirService</h1>
              <button onClick={() => supabase.auth.signOut()} className="text-sm text-gray-500 hover:text-primary-600">Sair</button>
          </header>
          {renderContent()}
      </main>
    </div>
  );
};

export default App;
