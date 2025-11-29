
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
  
  // Mobile Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
          // 1. Get Auth Metadata to ensure we have the real name entered during sign up
          const { data: authUser } = await supabase.auth.getUser();
          const metaName = authUser.user?.user_metadata?.full_name;
          
          // Fallback name logic: Metadata > Email
          const displayName = metaName || email.split('@')[0];

          // 2. Attempt to fetch profile from DB
          let { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
          
          // 3. SELF-HEALING: If profile is missing but Auth exists, create it now.
          if (!data) {
            console.log("Profile missing for authenticated user. Creating default 'USER' profile...");
            
            const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert([{ 
                    id: userId, 
                    email: email, 
                    name: displayName, // Uses the real name from registration if available
                    role: 'USER', // Enforced default role
                    is_active: true
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

          // 4. Check for INACTIVE status
          if (data.is_active === false) {
              alert("Sua conta foi desativada pelo administrador. Entre em contato com o suporte.");
              await supabase.auth.signOut();
              setCurrentUser(null);
              setLoading(false);
              return;
          }

          // 5. SPECIAL ADMIN OVERRIDE (Bootstrap)
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
                name: data.name, // Use DB name (which we ensured matches metadata on creation)
                email: data.email || email,
                role: data.role,
                isActive: data.is_active,
                avatar: data.avatar // Campo avatar adicionado
            });
          }
      } catch (error) {
          console.error('Error fetching/creating profile:', error);
      } finally {
          setLoading(false);
      }
  };
  
  const refreshProfile = () => {
      if (currentUser) {
          fetchProfile(currentUser.id, currentUser.email);
      }
  };

  const fetchTickets = async () => {
      try {
          // Alterado para fazer JOIN com a tabela profiles e pegar o nome atualizado
          const { data, error } = await supabase
            .from('tickets')
            .select('*, profiles:requester_id(name)')
            .order('created_at', { ascending: false });

          if (error) throw error;

          const formattedTickets: Ticket[] = data.map((t: any) => ({
              id: t.id,
              ticketNumber: t.ticket_number || 0,
              title: t.title,
              description: t.description,
              // Usa o nome do perfil (atualizado) se existir, senão usa o nome gravado no ticket (backup)
              requester: t.profiles?.name || t.requester_name,
              requesterId: t.requester_id,
              priority: t.priority,
              status: t.status,
              category: t.category,
              createdAt: new Date(t.created_at),
              updatedAt: t.updated_at ? new Date(t.updated_at) : new Date(t.created_at),
              resolvedAt: t.resolved_at ? new Date(t.resolved_at) : undefined,
              attachments: t.attachments || []
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

  const handleCreateTicket = async (newTicketData: Omit<Ticket, 'id' | 'createdAt' | 'ticketNumber'>) => {
    if (!currentUser) return;

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
                    attachments: newTicketData.attachments
                })
                .eq('id', ticketToEdit.id);

            if (error) throw error;

            // Audit Log for Edit
            await supabase.from('audit_logs').insert({
                ticket_id: ticketToEdit.id,
                actor_id: currentUser.id,
                action: 'EDITED',
                details: 'Detalhes do chamado editados'
            });
            
            setTicketToEdit(null);
        } else {
            // Create new ticket
            // ticket_number is generated automatically by Postgres
            const { data: newTicket, error } = await supabase
                .from('tickets')
                .insert([{
                    title: newTicketData.title,
                    description: newTicketData.description,
                    requester_name: currentUser?.name, 
                    requester_id: currentUser?.id,
                    priority: newTicketData.priority,
                    category: newTicketData.category,
                    status: 'OPEN',
                    attachments: newTicketData.attachments
                }])
                .select()
                .single();

            if (error) throw error;

            if (newTicket) {
                // Audit Log for Creation
                await supabase.from('audit_logs').insert({
                    ticket_id: newTicket.id,
                    actor_id: currentUser.id,
                    action: 'CREATED',
                    details: `Chamado criado com prioridade ${newTicketData.priority}`
                });

                // NOTIFICATION LOGIC: Notify all Admins
                const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'ADMIN');
                if (admins && admins.length > 0) {
                    const notifications = admins.map(admin => ({
                        user_id: admin.id,
                        title: 'Novo Chamado Criado',
                        message: `${currentUser?.name} abriu um novo chamado: ${newTicketData.title}`,
                        ticket_id: newTicket.id
                    }));
                    await supabase.from('notifications').insert(notifications);
                }
            }
        }
        
        await fetchTickets(); // Refresh list
        
        if (currentUser?.role === 'USER') {
            setCurrentView('MY_TICKETS');
        } else {
            setCurrentView('ALL_TICKETS'); // Return to list view after edit/create
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
  
  const handleSelectNotificationTicket = async (ticketId: string) => {
      // Find the ticket in the current list or fetch it
      const existing = tickets.find(t => t.id === ticketId);
      if (existing) {
          setSelectedTicket(existing);
          setCurrentView('TICKET_DETAIL');
      } else {
          // Fallback fetch if not loaded
          const { data } = await supabase.from('tickets').select('*, profiles:requester_id(name)').eq('id', ticketId).single();
          if (data) {
             const formatted: Ticket = {
                id: data.id,
                ticketNumber: data.ticket_number,
                title: data.title,
                description: data.description,
                requester: data.profiles?.name || data.requester_name,
                requesterId: data.requester_id,
                priority: data.priority,
                status: data.status,
                category: data.category,
                createdAt: new Date(data.created_at),
                updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(data.created_at),
                resolvedAt: data.resolved_at ? new Date(data.resolved_at) : undefined,
                attachments: data.attachments || []
             };
             setSelectedTicket(formatted);
             setCurrentView('TICKET_DETAIL');
          }
      }
  };

  const handleDeleteTicket = async (id: string) => {
      try {
        const { error } = await supabase.from('tickets').delete().eq('id', id);
        if (error) throw error;
        
        setTickets(tickets.filter(t => t.id !== id));
        if (currentUser?.role === 'USER') {
            setCurrentView('MY_TICKETS');
        } else {
            setCurrentView('ALL_TICKETS');
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
    if (!currentUser) return;

    try {
        // Prepare update data
        const updates: any = { status };
        
        // Logic for Resolved/Closed Date
        if (status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED) {
            updates.resolved_at = new Date().toISOString();
        } else {
            // If reopening, maybe clear resolved_at? 
            // updates.resolved_at = null; // Optional: Uncomment if reopening should clear the date
        }

        const { error } = await supabase
            .from('tickets')
            .update(updates)
            .eq('id', id);

        if (error) throw error;

        // Audit Log for Status Change
        await supabase.from('audit_logs').insert({
            ticket_id: id,
            actor_id: currentUser.id,
            action: 'STATUS_CHANGE',
            details: `Status alterado para ${status}`
        });

        // Update local state immediately (Optimistic or Fetch)
        setTickets(prev => prev.map(t => {
            if (t.id === id) {
                return {
                    ...t,
                    status,
                    resolvedAt: updates.resolved_at ? new Date(updates.resolved_at) : t.resolvedAt,
                    updatedAt: new Date() // Optimistic update for Last Update
                };
            }
            return t;
        }));

        if (selectedTicket && selectedTicket.id === id) {
            const updatedTicket = { 
                ...selectedTicket, 
                status,
                resolvedAt: updates.resolved_at ? new Date(updates.resolved_at) : selectedTicket.resolvedAt,
                updatedAt: new Date()
            };
            setSelectedTicket(updatedTicket);
            
            // NOTIFICATION LOGIC: Notify the requester if status changes
            // If I am an admin changing a user's ticket
            if (currentUser.role === 'ADMIN') {
                const { data: profile } = await supabase.from('profiles').select('name').eq('id', currentUser.id).single();
                const adminName = profile?.name || 'Admin';
                
                // Don't notify if I am the requester too
                if (selectedTicket.requesterId !== currentUser.id) {
                    await supabase.from('notifications').insert({
                        user_id: selectedTicket.requesterId,
                        title: 'Status Atualizado',
                        message: `Seu chamado "${selectedTicket.title}" mudou para ${status} por ${adminName}.`,
                        ticket_id: id
                    });
                }
            }
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
            onCancel={() => setCurrentView(currentUser.role === 'USER' ? 'MY_TICKETS' : 'ALL_TICKETS')} 
            initialData={currentView === 'EDIT_TICKET' ? ticketToEdit || undefined : undefined}
            currentUser={currentUser}
          />
        );
      case 'TICKET_DETAIL':
        return selectedTicket ? (
          <TicketDetail 
            ticket={selectedTicket}
            currentUser={currentUser}
            onBack={() => setCurrentView(currentUser.role === 'USER' ? 'MY_TICKETS' : 'ALL_TICKETS')}
            onUpdateStatus={handleUpdateStatus}
            onDelete={handleDeleteTicket}
            onEdit={handleEditTicket}
          />
        ) : (
           <TicketList tickets={tickets} onSelectTicket={handleSelectTicket} onCreateTicket={() => setCurrentView('CREATE_TICKET')} />
        );
      case 'USERS':
        return currentUser.role === 'ADMIN' ? <UserManagement currentUser={currentUser} /> : <div>Acesso Negado</div>;
      case 'NOTIFICATIONS':
        return <Notifications currentUser={currentUser} onSelectNotification={handleSelectNotificationTicket} />;
      case 'MY_TICKETS':
      case 'ALL_TICKETS':
        return <TicketList tickets={tickets} onSelectTicket={handleSelectTicket} onCreateTicket={() => setCurrentView('CREATE_TICKET')} />;
      case 'DASHBOARD':
      default:
        return <Dashboard tickets={tickets} currentUser={currentUser} onCreateTicket={() => setCurrentView('CREATE_TICKET')} />;
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
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        currentUser={currentUser} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onProfileUpdate={refreshProfile}
      />
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-white z-30 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
              <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-1 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                  <Menu size={24} />
              </button>
              <div className="flex items-center space-x-2">
                 <Logo className="h-8 w-auto" />
                 <span className="text-lg font-bold text-gray-800">AirService</span>
              </div>
          </div>
          {/* Avatar no Mobile */}
          {currentUser.avatar ? (
             <img 
               src={currentUser.avatar} 
               alt="Avatar" 
               className="h-8 w-8 rounded-full object-cover border border-gray-200"
             />
          ) : (
             <div className="h-8 w-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold">
                {currentUser.name.charAt(0).toUpperCase()}
             </div>
          )}
      </div>

      <main className={`flex-1 p-4 md:p-8 overflow-y-auto h-screen transition-all duration-300 ${isSidebarOpen ? '' : 'ml-0'} md:ml-64 pt-20 md:pt-8`}>
        {/* Changed from max-w-6xl mx-auto to w-[95%] mx-auto to stretch the grid */}
        <div className="w-full md:w-[95%] mx-auto">
          <header className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                {currentView === 'DASHBOARD' && (currentUser.role === 'ADMIN' ? 'Visão Geral' : 'Dashboard')}
                {currentView === 'MY_TICKETS' && 'Meus Chamados'}
                {currentView === 'ALL_TICKETS' && 'Todos os Chamados'}
                {currentView === 'CREATE_TICKET' && 'Novo Chamado'}
                {currentView === 'EDIT_TICKET' && 'Editar Chamado'}
                {currentView === 'TICKET_DETAIL' && 'Detalhes do Chamado'}
                {currentView === 'USERS' && 'Gestão de Usuários'}
                {currentView === 'NOTIFICATIONS' && 'Central de Notificações'}
              </h1>
            </div>
            <div className="hidden md:flex items-center space-x-4">
                <button 
                    onClick={handleLogout}
                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                    Sair
                </button>
                {/* Avatar no Header Desktop */}
                {currentUser.avatar ? (
                    <img 
                        src={currentUser.avatar} 
                        alt="Avatar" 
                        className="h-10 w-10 rounded-full object-cover border border-gray-200 shadow-sm"
                    />
                ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-primary-500 to-orange-600 flex items-center justify-center text-white font-bold shadow-md">
                        {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>
            {/* Mobile Logout (shown below header on mobile) */}
            <div className="md:hidden w-full flex justify-end">
                <button 
                    onClick={handleLogout}
                    className="text-sm text-gray-500 border border-gray-200 px-3 py-1 rounded-lg"
                >
                    Sair
                </button>
            </div>
          </header>
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
