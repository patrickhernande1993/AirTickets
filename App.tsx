import React, { useState, useMemo, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TicketList } from './components/TicketList';
import { TicketForm } from './components/TicketForm';
import { TicketDetail } from './components/TicketDetail';
import { Login } from './components/Login';
import { UserManagement } from './components/UserManagement';
import { Ticket, ViewState, TicketStatus, User } from './types';
import { supabase } from './services/supabase';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketToEdit, setTicketToEdit] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  // Check auth session on load
  useEffect(() => {
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
            fetchProfile(session.user.id, session.user.email!);
        } else {
            setCurrentUser(null);
            setTickets([]);
            setLoading(false);
        }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch tickets whenever user changes or view updates
  useEffect(() => {
      if (currentUser) {
          fetchTickets();
      }
  }, [currentUser, currentView]);

  const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
          await fetchProfile(session.user.id, session.user.email!);
      } else {
          setLoading(false);
      }
  };

  const fetchProfile = async (userId: string, email: string) => {
      try {
          // Attempt to fetch profile
          // .maybeSingle() returns null instead of error if not found
          let { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
          
          // SELF-HEALING: If profile is missing but Auth exists, create it now.
          // STRICT RULE: When creating a fallback profile, it is ALWAYS 'USER' role.
          if (!data) {
            console.log("Profile missing for authenticated user. Creating default 'USER' profile...");
            const name = email.split('@')[0];
            const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert([{ 
                    id: userId, 
                    email: email, 
                    name: name, 
                    role: 'USER' // Enforced default role
                }])
                .select()
                .single();
            
            if (createError) {
                console.error("Failed to auto-create profile:", createError);
                throw createError;
            }
            data = newProfile;
          } else if (error) {
            throw error;
          }

          // SPECIAL ADMIN OVERRIDE
          // Automatically promote specific emails to ADMIN to bootstrap the system
          const superAdmins = ['ti@grupoairslaid.com.br'];
          if (superAdmins.includes(email) || email.startsWith('admin') || email.startsWith('dev')) {
             if (data && data.role !== 'ADMIN') {
                 console.log(`Promoting super user ${email} to ADMIN...`);
                 await supabase.from('profiles').update({ role: 'ADMIN' }).eq('id', userId);
                 data.role = 'ADMIN';
             }
          }

          if (data) {
            setCurrentUser({
                id: data.id,
                name: data.name || email.split('@')[0],
                email: data.email || email,
                role: data.role
            });
          }
      } catch (error) {
          console.error('Error fetching/creating profile:', error);
          // Force logout if we can't get a profile to prevent loop
          if (currentUser === null) {
            // Optional: await supabase.auth.signOut(); 
          }
      } finally {
          setLoading(false);
      }
  };

  const fetchTickets = async () => {
      try {
          // RLS policies handle security, so we can just select *
          // But for performance/UI logic, we can add ordering
          const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) throw error;

          const formattedTickets: Ticket[] = data.map((t: any) => ({
              id: t.id,
              title: t.title,
              description: t.description,
              requester: t.requester_name,
              requesterId: t.requester_id,
              priority: t.priority,
              status: t.status,
              category: t.category,
              createdAt: new Date(t.created_at),
              aiAnalysis: t.ai_analysis,
              suggestedSolution: t.suggested_solution
          }));

          setTickets(formattedTickets);
      } catch (error) {
          console.error('Error fetching tickets:', error);
      }
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      setCurrentView('DASHBOARD');
  };

  const handleCreateTicket = async (newTicketData: Omit<Ticket, 'id' | 'createdAt'>) => {
    try {
        if (ticketToEdit) {
            // Update existing ticket
            const { error } = await supabase
                .from('tickets')
                .update({
                    title: newTicketData.title,
                    description: newTicketData.description,
                    priority: newTicketData.priority,
                    category: newTicketData.category,
                    status: newTicketData.status,
                    ai_analysis: newTicketData.aiAnalysis
                })
                .eq('id', ticketToEdit.id);

            if (error) throw error;
            
            // Optimistic update
            const updatedTickets = tickets.map(t => 
                t.id === ticketToEdit.id ? { ...t, ...newTicketData } : t
            );
            setTickets(updatedTickets);
            if(selectedTicket && selectedTicket.id === ticketToEdit.id) {
                setSelectedTicket({ ...selectedTicket, ...newTicketData });
            }
            setTicketToEdit(null);
        } else {
            // Create new ticket
            const { data, error } = await supabase
                .from('tickets')
                .insert([{
                    title: newTicketData.title,
                    description: newTicketData.description,
                    requester_name: currentUser?.name, // We store name for display simplicity
                    requester_id: currentUser?.id,
                    priority: newTicketData.priority,
                    category: newTicketData.category,
                    status: 'OPEN',
                    ai_analysis: newTicketData.aiAnalysis
                }])
                .select()
                .single();

            if (error) throw error;
            
            // Refresh list
            await fetchTickets();
        }
        
        if (currentUser?.role === 'USER') {
            setCurrentView('MY_TICKETS');
        } else {
            setCurrentView('DASHBOARD');
        }
    } catch (error) {
        console.error("Error saving ticket:", error);
        alert("Falha ao salvar chamado. Por favor, tente novamente.");
    }
  };

  const handleSelectTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setCurrentView('TICKET_DETAIL');
  };

  const handleDeleteTicket = async (id: string) => {
      try {
        const { error } = await supabase.from('tickets').delete().eq('id', id);
        if (error) throw error;
        
        setTickets(tickets.filter(t => t.id !== id));
        if (currentUser?.role === 'USER') {
            setCurrentView('MY_TICKETS');
        } else {
            setCurrentView('DASHBOARD');
        }
      } catch (error) {
          console.error("Error deleting ticket:", error);
          alert("Falha ao excluir chamado.");
      }
  };

  const handleEditTicket = (ticket: Ticket) => {
      setTicketToEdit(ticket);
      setCurrentView('EDIT_TICKET');
  };

  const handleUpdateStatus = async (id: string, status: TicketStatus) => {
    try {
        const { error } = await supabase
            .from('tickets')
            .update({ status })
            .eq('id', id);

        if (error) throw error;

        setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
        if (selectedTicket && selectedTicket.id === id) {
            setSelectedTicket({ ...selectedTicket, status });
        }
    } catch (error) {
        console.error("Error updating status:", error);
    }
  };

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
           <TicketList tickets={tickets} onSelectTicket={handleSelectTicket} />
        );
      case 'USERS':
        return currentUser.role === 'ADMIN' ? <UserManagement currentUser={currentUser} /> : <div>Acesso Negado</div>;
      case 'MY_TICKETS':
        return <TicketList tickets={tickets} onSelectTicket={handleSelectTicket} />;
      case 'DASHBOARD':
      default:
        return <TicketList tickets={tickets} onSelectTicket={handleSelectTicket} />;
    }
  };

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <Loader2 className="animate-spin text-primary-600" size={48} />
          </div>
      );
  }

  if (!currentUser) {
    return <Login onLoginSuccess={() => checkUser()} />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar currentView={currentView} onChangeView={setCurrentView} currentUser={currentUser} />
      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
        <div className="max-w-6xl mx-auto">
          <header className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {currentView === 'DASHBOARD' && (currentUser.role === 'ADMIN' ? 'Dashboard Admin' : 'Meu Dashboard')}
                {currentView === 'MY_TICKETS' && 'Meus Chamados'}
                {currentView === 'CREATE_TICKET' && 'Novo Chamado'}
                {currentView === 'EDIT_TICKET' && 'Editar Chamado'}
                {currentView === 'TICKET_DETAIL' && 'Detalhes do Chamado'}
                {currentView === 'USERS' && 'Gestão de Usuários'}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
                <button 
                    onClick={handleLogout}
                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                    Sair
                </button>
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md">
                    {currentUser.name.charAt(0).toUpperCase()}
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