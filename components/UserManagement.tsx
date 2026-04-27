import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { Search, Mail, Shield, User as UserIcon, Loader2, Edit, CheckCircle, XCircle, Save, X } from 'lucide-react';
import { supabase, supabaseUrl } from '../services/supabase';
import { ConfirmationModal } from './ConfirmationModal';

interface UserManagementProps {
  currentUser: User;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser, showToast }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('USER');
  const [editIsActive, setEditIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Confirmation Modal State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  useEffect(() => {
      fetchUsers();
  }, []);

  const fetchUsers = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.from('profiles').select('*').order('name');
      if (error) {
          console.error('Error fetching users:', error);
      } else {
          setUsers(data.map((u: any) => ({
              id: u.id,
              email: u.email,
              name: u.name,
              role: u.role,
              isActive: u.is_active !== false // Default to true if null
          })));
      }
      setIsLoading(false);
  };

  const handleEditClick = (user: User) => {
      setSelectedUser(user);
      setEditName(user.name);
      setEditRole(user.role);
      setEditIsActive(user.isActive !== false);
      setEditPassword('');
      setIsEditModalOpen(true);
  };

  const handleSaveUser = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!selectedUser) return;
      
      // Safety check: don't let admin deactivate themselves or remove admin role if they are the only one (simplified logic)
      if (selectedUser.id === currentUser.id) {
          if (!editIsActive) {
              showToast("Você não pode desativar sua própria conta.", "error");
              return;
          }
          if (editRole !== 'ADMIN' && !isConfirmModalOpen) {
              setIsConfirmModalOpen(true);
              return;
          }
      }

      setIsSaving(true);
      try {
          if (editPassword) {
              const { data: sessionData } = await supabase.auth.getSession();
              const token = sessionData.session?.access_token;
              
              if (!token) throw new Error("Não foi possível obter o token de sessão.");

              const response = await fetch(`${supabaseUrl}/functions/v1/update-user-password`, {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                      userId: selectedUser.id,
                      newPassword: editPassword
                  })
              });

              if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.error || "Erro ao alterar a senha.");
              }
          }

          const { error } = await supabase
            .from('profiles')
            .update({
                name: editName,
                role: editRole,
                is_active: editIsActive
            })
            .eq('id', selectedUser.id);

          if (error) throw error;

          showToast("Usuário atualizado com sucesso!");
          
          // IMPORTANT: Refetch users from DB to ensure data was actually saved
          // This handles cases where RLS might silently ignore the update
          await fetchUsers();

          setIsEditModalOpen(false);
          setIsConfirmModalOpen(false);
      } catch (error) {
          console.error("Error updating user:", error);
          showToast("Erro ao atualizar usuário. Verifique se você tem permissão para editar este perfil.", "error");
      } finally {
          setIsSaving(false);
      }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-none border border-slate-200 shadow-sm">
        <div>
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Gestão de Usuários</h2>
            <p className="text-xs text-slate-500 font-mono">Gerencie permissões, nomes e status de acesso.</p>
        </div>
        <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input 
                type="text" 
                placeholder="Buscar usuários..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-300 rounded-none focus:ring-1 focus:ring-primary-500 outline-none w-full text-sm font-mono"
            />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-none border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
            <div className="p-12 flex justify-center">
                <Loader2 className="animate-spin text-primary-600" size={32} />
            </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase tracking-wider border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3 font-semibold">Usuário</th>
                            <th className="px-6 py-3 font-semibold">Função</th>
                            <th className="px-6 py-3 font-semibold">Status</th>
                            <th className="px-6 py-3 font-semibold text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {filteredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <div className="h-9 w-9 rounded-none bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold mr-3 text-sm">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900 text-sm">{user.name}</p>
                                            <div className="flex items-center text-xs text-slate-500 font-mono">
                                                <Mail size={12} className="mr-1" />
                                                {user.email}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {user.role === 'ADMIN' ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-none text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                                            <Shield size={10} className="mr-1" />
                                            ADMIN
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-none text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-200">
                                            <UserIcon size={10} className="mr-1" />
                                            USER
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {user.isActive !== false ? (
                                        <span className="inline-flex items-center text-green-600 text-[10px] font-bold uppercase tracking-wider">
                                            <CheckCircle size={12} className="mr-1" />
                                            ATIVO
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center text-red-600 text-[10px] font-bold uppercase tracking-wider">
                                            <XCircle size={12} className="mr-1" />
                                            INATIVO
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => handleEditClick(user)}
                                        className="text-slate-400 hover:text-primary-600 hover:bg-slate-100 p-2 rounded-none transition-colors border border-transparent hover:border-slate-200"
                                        title="Editar Usuário"
                                    >
                                        <Edit size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredUsers.length === 0 && (
                    <div className="p-8 text-center text-slate-500 font-mono text-sm">Nenhum usuário encontrado.</div>
                )}
            </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-none shadow-2xl w-full max-w-md overflow-hidden transform transition-all border border-slate-200">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Editar Usuário</h3>
                      <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={18} />
                      </button>
                  </div>
                  
                  <form onSubmit={handleSaveUser} className="p-6 space-y-5">
                      <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                          <input 
                              type="text" 
                              value={selectedUser.email} 
                              disabled 
                              className="w-full px-3 py-2 border border-slate-200 rounded-none bg-slate-50 text-slate-500 text-xs font-mono"
                          />
                      </div>

                      <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nome de Exibição</label>
                          <input 
                              type="text" 
                              value={editName} 
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-none focus:ring-1 focus:ring-primary-500 outline-none text-sm"
                              placeholder="Nome completo"
                              required
                          />
                      </div>

                      <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nova Senha</label>
                          <input 
                              type="password" 
                              value={editPassword} 
                              onChange={(e) => setEditPassword(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-none focus:ring-1 focus:ring-primary-500 outline-none text-sm"
                              placeholder="Deixe em branco para não alterar"
                          />
                      </div>

                      <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Função / Permissão</label>
                          <div className="flex space-x-2">
                              <label className={`flex-1 flex items-center justify-center px-4 py-2 rounded-none border cursor-pointer transition-all ${editRole === 'USER' ? 'bg-slate-100 border-slate-400 text-slate-900' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                  <input 
                                      type="radio" 
                                      name="role" 
                                      value="USER" 
                                      checked={editRole === 'USER'} 
                                      onChange={() => setEditRole('USER')}
                                      className="hidden"
                                  />
                                  <UserIcon size={14} className="mr-2" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">Usuário</span>
                              </label>
                              <label className={`flex-1 flex items-center justify-center px-4 py-2 rounded-none border cursor-pointer transition-all ${editRole === 'ADMIN' ? 'bg-slate-100 border-slate-400 text-slate-900' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                  <input 
                                      type="radio" 
                                      name="role" 
                                      value="ADMIN" 
                                      checked={editRole === 'ADMIN'} 
                                      onChange={() => setEditRole('ADMIN')}
                                      className="hidden"
                                  />
                                  <Shield size={14} className="mr-2" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">Admin</span>
                              </label>
                          </div>
                      </div>

                      <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status da Conta</label>
                          <label className="flex items-center cursor-pointer">
                              <div className="relative">
                                  <input 
                                    type="checkbox" 
                                    className="sr-only" 
                                    checked={editIsActive} 
                                    onChange={(e) => setEditIsActive(e.target.checked)} 
                                  />
                                  <div className={`block w-12 h-6 rounded-none transition-colors ${editIsActive ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                  <div className={`dot absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-none transition-transform ${editIsActive ? 'transform translate-x-6' : ''}`}></div>
                              </div>
                              <span className="ml-3 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                                  {editIsActive ? 'Conta Ativa' : 'Conta Bloqueada'}
                              </span>
                          </label>
                          <p className="text-[10px] text-slate-400 mt-1 font-mono">
                              {editIsActive 
                                ? 'O usuário pode acessar o sistema normalmente.' 
                                : 'O usuário será impedido de fazer login.'}
                          </p>
                      </div>

                      <div className="pt-4 flex justify-end space-x-2">
                          <button 
                              type="button"
                              onClick={() => setIsEditModalOpen(false)}
                              className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors border border-slate-200"
                          >
                              Cancelar
                          </button>
                          <button 
                              type="submit"
                              disabled={isSaving}
                              className="px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-none text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center disabled:opacity-70 transition-colors"
                          >
                              {isSaving ? <Loader2 className="animate-spin mr-2" size={14} /> : <Save size={14} className="mr-2" />}
                              Salvar Alterações
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      <ConfirmationModal 
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={() => handleSaveUser()}
        title="Remover Privilégios"
        message="Tem certeza que deseja remover seus próprios privilégios de Admin? Você perderá acesso a esta tela."
        confirmText="Sim, remover"
        cancelText="Cancelar"
        isDanger={true}
      />
    </div>
  );
};
