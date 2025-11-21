import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { Search, Mail, Shield, User as UserIcon, Loader2, Edit, CheckCircle, XCircle, Save, X } from 'lucide-react';
import { supabase } from '../services/supabase';

interface UserManagementProps {
  currentUser: User;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('USER');
  const [editIsActive, setEditIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
      setIsEditModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedUser) return;
      
      // Safety check: don't let admin deactivate themselves or remove admin role if they are the only one (simplified logic)
      if (selectedUser.id === currentUser.id) {
          if (!editIsActive) {
              alert("Você não pode desativar sua própria conta.");
              return;
          }
          if (editRole !== 'ADMIN') {
             if (!window.confirm("Tem certeza que deseja remover seus próprios privilégios de Admin?")) return;
          }
      }

      setIsSaving(true);
      try {
          const { error } = await supabase
            .from('profiles')
            .update({
                name: editName,
                role: editRole,
                is_active: editIsActive
            })
            .eq('id', selectedUser.id);

          if (error) throw error;

          // Update local state
          setUsers(prev => prev.map(u => u.id === selectedUser.id ? {
              ...u,
              name: editName,
              role: editRole,
              isActive: editIsActive
          } : u));

          setIsEditModalOpen(false);
      } catch (error) {
          console.error("Error updating user:", error);
          alert("Erro ao atualizar usuário.");
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
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div>
            <h2 className="text-lg font-bold text-gray-900">Gestão de Usuários</h2>
            <p className="text-sm text-gray-500">Gerencie permissões, nomes e status de acesso.</p>
        </div>
        <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
                type="text" 
                placeholder="Buscar usuários..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none w-full"
            />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
            <div className="p-12 flex justify-center">
                <Loader2 className="animate-spin text-primary-600" size={32} />
            </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                        <tr>
                            <th className="px-6 py-3 font-medium">Usuário</th>
                            <th className="px-6 py-3 font-medium">Função</th>
                            <th className="px-6 py-3 font-medium">Status</th>
                            <th className="px-6 py-3 font-medium text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold mr-3">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{user.name}</p>
                                            <div className="flex items-center text-sm text-gray-500">
                                                <Mail size={12} className="mr-1" />
                                                {user.email}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {user.role === 'ADMIN' ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                            <Shield size={12} className="mr-1" />
                                            Desenvolvedor / Admin
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                            <UserIcon size={12} className="mr-1" />
                                            Usuário Padrão
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {user.isActive !== false ? (
                                        <span className="inline-flex items-center text-green-600 text-sm font-medium">
                                            <CheckCircle size={14} className="mr-1.5" />
                                            Ativo
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center text-red-600 text-sm font-medium">
                                            <XCircle size={14} className="mr-1.5" />
                                            Inativo
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => handleEditClick(user)}
                                        className="text-gray-400 hover:text-primary-600 hover:bg-primary-50 p-2 rounded-lg transition-colors"
                                        title="Editar Usuário"
                                    >
                                        <Edit size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredUsers.length === 0 && (
                    <div className="p-8 text-center text-gray-500">Nenhum usuário encontrado.</div>
                )}
            </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-gray-900">Editar Usuário</h3>
                      <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <form onSubmit={handleSaveUser} className="p-6 space-y-5">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input 
                              type="text" 
                              value={selectedUser.email} 
                              disabled 
                              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm"
                          />
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nome de Exibição</label>
                          <input 
                              type="text" 
                              value={editName} 
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                              placeholder="Nome completo"
                              required
                          />
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Função / Permissão</label>
                          <div className="flex space-x-4">
                              <label className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg border cursor-pointer transition-all ${editRole === 'USER' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                  <input 
                                      type="radio" 
                                      name="role" 
                                      value="USER" 
                                      checked={editRole === 'USER'} 
                                      onChange={() => setEditRole('USER')}
                                      className="hidden"
                                  />
                                  <UserIcon size={16} className="mr-2" />
                                  <span className="text-sm font-medium">Usuário</span>
                              </label>
                              <label className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg border cursor-pointer transition-all ${editRole === 'ADMIN' ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                  <input 
                                      type="radio" 
                                      name="role" 
                                      value="ADMIN" 
                                      checked={editRole === 'ADMIN'} 
                                      onChange={() => setEditRole('ADMIN')}
                                      className="hidden"
                                  />
                                  <Shield size={16} className="mr-2" />
                                  <span className="text-sm font-medium">Admin</span>
                              </label>
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Status da Conta</label>
                          <label className="flex items-center cursor-pointer">
                              <div className="relative">
                                  <input 
                                    type="checkbox" 
                                    className="sr-only" 
                                    checked={editIsActive} 
                                    onChange={(e) => setEditIsActive(e.target.checked)} 
                                  />
                                  <div className={`block w-14 h-8 rounded-full transition-colors ${editIsActive ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                  <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${editIsActive ? 'transform translate-x-6' : ''}`}></div>
                              </div>
                              <span className="ml-3 text-sm font-medium text-gray-700">
                                  {editIsActive ? 'Conta Ativa' : 'Conta Bloqueada'}
                              </span>
                          </label>
                          <p className="text-xs text-gray-500 mt-1 ml-1">
                              {editIsActive 
                                ? 'O usuário pode acessar o sistema normalmente.' 
                                : 'O usuário será impedido de fazer login.'}
                          </p>
                      </div>

                      <div className="pt-4 flex justify-end space-x-3">
                          <button 
                              type="button"
                              onClick={() => setIsEditModalOpen(false)}
                              className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                          >
                              Cancelar
                          </button>
                          <button 
                              type="submit"
                              disabled={isSaving}
                              className="px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg text-sm font-medium shadow-sm flex items-center disabled:opacity-70"
                          >
                              {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />}
                              Salvar Alterações
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};