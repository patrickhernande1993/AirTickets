
import React, { useState, useEffect } from 'react';
import { TicketList } from './components/TicketList';
import { TicketForm } from './components/TicketForm';
import { TicketDetail } from './components/TicketDetail';
import { Login } from './components/Login';
import { TopNav } from './components/TopNav';
import { UserManagement } from './components/UserManagement';
import { Notifications } from './components/Notifications';
import { Dashboard } from './components/Dashboard';
import { Toast, ToastType } from './components/Toast';
import { Ticket, ViewState, TicketStatus, User } from './types';
import { supabase } from './services/supabase';
import { Loader2 } from 'lucide-react';
import { Logo } from './components/Logo';
import { sendTicketOpeningEmail, sendTicketResolvedEmail } from './services/mailService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketToEdit, setTicketToEdit] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  
  // Toast State
  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type, isVisible: true });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  // Mobile Sidebar State (No longer needed, but keeping for logic compatibility if any)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Desktop Sidebar Visibility State (No longer needed)
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

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

  // Notifications Sync
  useEffect(() => {
    if (!currentUser) return;

    fetchUnreadCount();

    const channel = supabase
      .channel('public:notifications_app')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'notifications', 
        filter: `user_id=eq.${currentUser.id}` 
      }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  const fetchUnreadCount = async () => {
    if (!currentUser) return;
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id)
      .eq('is_read', false);
    
    setUnreadNotificationsCount(count || 0);
  };

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
                isActive: data.is_active
            });
          }
      } catch (error) {
          console.error('Error fetching/creating profile:', error);
      } finally {
          setLoading(false);
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

  const handleCreateTicket = async (newTicketData: Omit<Ticket, 'id' | 'ticketNumber'>): Promise<void> => {
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
                    attachments: newTicketData.attachments,
                    created_at: newTicketData.createdAt.toISOString(),
                    resolved_at: newTicketData.resolvedAt ? newTicketData.resolvedAt.toISOString() : null
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
            showToast('Chamado atualizado com sucesso!');

            // EMAIL NOTIFICATION: If status was changed to RESOLVED during edit
            if (newTicketData.status === TicketStatus.RESOLVED) {
                try {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('email, name')
                        .eq('id', newTicketData.requesterId)
                        .single();

                    if (profile && profile.email) {
                        await sendTicketResolvedEmail({
                            to: profile.email,
                            ticketNumber: ticketToEdit.ticketNumber,
                            title: newTicketData.title,
                            requesterName: profile.name || newTicketData.requester
                        });
                    }
                } catch (emailError) {
                    console.error("Falha ao enviar e-mail de resolução na edição:", emailError);
                }
            }
        } else {
            // Create new ticket
            // ticket_number is generated automatically by Postgres
            const { data: newTicket, error } = await supabase
                .from('tickets')
                .insert([{
                    title: newTicketData.title,
                    description: newTicketData.description,
                    requester_name: newTicketData.requester, 
                    requester_id: newTicketData.requesterId,
                    priority: newTicketData.priority,
                    category: newTicketData.category,
                    status: newTicketData.status || 'OPEN',
                    attachments: newTicketData.attachments,
                    created_at: newTicketData.createdAt.toISOString(),
                    resolved_at: newTicketData.resolvedAt ? newTicketData.resolvedAt.toISOString() : null
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
                const { data: admins } = await supabase.from('profiles').select('id, email').eq('role', 'ADMIN');
                if (admins && admins.length > 0) {
                    const notifications = admins.map(admin => ({
                        user_id: admin.id,
                        title: 'Novo Chamado Criado',
                        message: `${currentUser?.name} abriu um novo chamado: ${newTicketData.title}`,
                        ticket_id: newTicket.id
                    }));
                    await supabase.from('notifications').insert(notifications);
                }

                // EMAIL NOTIFICATION LOGIC: Notify the requester + Copy to Admin
                try {
                    // Buscar o e-mail do solicitante
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('email, name')
                        .eq('id', newTicketData.requesterId)
                        .single();

                    if (profile && profile.email) {
                        // Garantir que a cópia (CC) vá especificamente para a TI
                        const ccEmailString = profile.email !== 'ti@grupoairslaid.com.br' ? 'ti@grupoairslaid.com.br' : undefined;

                        console.log("Enviando e-mail de abertura:", {
                            to: profile.email,
                            cc: ccEmailString,
                            ticketNumber: newTicket.ticket_number,
                            adminRole: currentUser.role,
                        });

                        await sendTicketOpeningEmail({
                            to: profile.email,
                            cc: ccEmailString,
                            ticketNumber: newTicket.ticket_number,
                            title: newTicketData.title,
                            requesterName: profile.name || newTicketData.requester
                        });
                    }
                } catch (emailError) {
                    console.error("Falha ao enviar e-mail de notificação:", emailError);
                    // Não travamos o fluxo do app se o e-mail falhar
                }
            }
            showToast('Chamado criado com sucesso!');
        }
        
        await fetchTickets(); // Refresh list
        
        if (currentUser?.role === 'USER') {
            setCurrentView('MY_TICKETS');
        } else {
            setCurrentView('ALL_TICKETS'); // Return to list view after edit/create
        }
    } catch (error: any) {
        console.error("Error saving ticket:", error);
        const errorMessage = error.message || error.details || "Erro desconhecido";
        showToast(`Falha ao salvar chamado: ${errorMessage}`, "error");
        throw error;
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
        showToast("Chamado excluído com sucesso!");
        if (currentUser?.role === 'USER') {
            setCurrentView('MY_TICKETS');
        } else {
            setCurrentView('ALL_TICKETS');
        }
      } catch (error) {
          console.error("Error deleting ticket:", error);
          showToast("Falha ao excluir chamado.", "error");
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
        
        // Logic for Resolved Date
        if (status === TicketStatus.RESOLVED) {
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

        // EMAIL NOTIFICATION LOGIC: Notify if Resolved (Moved outside for all views)
        if (status === TicketStatus.RESOLVED) {
            try {
                // Fetch requester email and ticket details
                const { data: ticketData } = await supabase
                    .from('tickets')
                    .select('title, ticket_number, requester_id, profiles:requester_id(email, name)')
                    .eq('id', id)
                    .single();
                
                if (ticketData && (ticketData as any).profiles?.email) {
                    const prof = (ticketData as any).profiles;
                    await sendTicketResolvedEmail({
                        to: prof.email,
                        ticketNumber: ticketData.ticket_number,
                        title: ticketData.title,
                        requesterName: prof.name || 'Usuário'
                    });
                }
            } catch (emailError) {
                console.error("Falha ao enviar e-mail de resolução:", emailError);
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
            showToast={showToast}
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
           <TicketList 
                tickets={tickets} 
                onSelectTicket={handleSelectTicket} 
                onCreateTicket={() => setCurrentView('CREATE_TICKET')} 
                onUpdateStatus={handleUpdateStatus} 
           />
        );
      case 'USERS':
        return currentUser.role === 'ADMIN' ? <UserManagement currentUser={currentUser} showToast={showToast} /> : <div>Acesso Negado</div>;
      case 'NOTIFICATIONS':
        return <Notifications currentUser={currentUser} onSelectNotification={handleSelectNotificationTicket} onRefreshNotifications={fetchUnreadCount} />;
      case 'MY_TICKETS':
      case 'ALL_TICKETS':
        return (
            <TicketList 
                key={currentView}
                tickets={tickets} 
                onSelectTicket={handleSelectTicket} 
                onCreateTicket={() => setCurrentView('CREATE_TICKET')} 
                onUpdateStatus={handleUpdateStatus} 
                initialStatusFilter={currentView === 'ALL_TICKETS' && currentUser.role === 'ADMIN' ? 'OPEN' : 'ALL'}
            />
        );
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <TopNav 
        currentView={currentView}
        onChangeView={setCurrentView}
        currentUser={currentUser}
        onLogout={handleLogout}
        unreadCount={unreadNotificationsCount}
      />

      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-50">
        <div className="max-w-7xl mx-auto w-full">
          {/* Header for Page Title - Hidden on Dashboard to save space as requested */}
          {currentView !== 'DASHBOARD' && (
            <header className="mb-6 md:mb-8 border-b border-slate-200 pb-4">
               <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                  {currentView === 'MY_TICKETS' && 'Meus Chamados'}
                  {currentView === 'ALL_TICKETS' && 'Todos os Chamados'}
                  {currentView === 'CREATE_TICKET' && 'Novo Chamado'}
                  {currentView === 'EDIT_TICKET' && 'Editar Chamado'}
                  {currentView === 'TICKET_DETAIL' && 'Detalhes do Chamado'}
                  {currentView === 'USERS' && 'Gestão de Usuários'}
                  {currentView === 'NOTIFICATIONS' && 'Central de Notificações'}
                </h1>
            </header>
          )}
          
          {renderContent()}
        </div>
      </main>

      <Toast 
        message={toast.message} 
        type={toast.type} 
        isVisible={toast.isVisible} 
        onClose={hideToast} 
      />
    </div>
  );
};

export default App;
