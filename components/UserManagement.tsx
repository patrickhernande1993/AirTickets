import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { UserPlus, Search, Mail, Shield, User as UserIcon, Loader2, Info } from 'lucide-react';
import { supabase } from '../services/supabase';

interface UserManagementProps {
  currentUser: User;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // For this demo, we just simulate adding users to the list, 
  // as creating Auth users requires server-side admin rights or sign-up flow.
  // We will display an info message.

  useEffect(() => {
      fetchUsers();
  }, []);

  const fetchUsers = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) {
          console.error('Error fetching users:', error);
      } else {
          setUsers(data as User[]);
      }
      setIsLoading(false);
  };

  const toggleRole = async (user: User) => {
      if (user.id === currentUser.id) return; // Prevent changing own role to avoid lockout

      const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
      
      // Optimistic update
      setUsers(users.map(u => u.id === user.id ? { ...u, role: newRole } : u));

      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', user.id);

      if (error) {
          console.error('Error updating role', error);
          fetchUsers(); // Revert on error
      }
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-xl font-bold text-gray-900">User Management</h2>
                <p className="text-sm text-gray-500">Manage access and roles for the organization</p>
            </div>
            <button 
                onClick={() => setShowModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
            >
                <Info size={18} />
                <span>How to Add Users</span>
            </button>
        </div>

        {isLoading ? (
            <div className="flex justify-center p-12">
                <Loader2 className="animate-spin text-gray-400" />
            </div>
        ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-gray-200 flex items-center bg-gray-50">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search users by name or email..." 
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                </div>
            </div>
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                    <tr>
                        <th className="px-6 py-3 font-medium">User</th>
                        <th className="px-6 py-3 font-medium">Role</th>
                        <th className="px-6 py-3 font-medium">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {users.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                                <div className="flex items-center space-x-3">
                                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                                        <UserIcon size={16} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{user.name}</p>
                                        <div className="flex items-center text-gray-500 text-xs">
                                            <Mail size={12} className="mr-1" />
                                            {user.email}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    user.role === 'ADMIN' 
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : 'bg-green-100 text-green-800 border border-green-200'
                                }`}>
                                    <Shield size={12} className="mr-1" />
                                    {user.role === 'ADMIN' ? 'Developer / Admin' : 'Standard User'}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <button 
                                    onClick={() => toggleRole(user)}
                                    disabled={user.id === currentUser.id}
                                    className={`text-xs font-medium px-3 py-1 rounded border transition-colors ${
                                        user.id === currentUser.id 
                                        ? 'opacity-50 cursor-not-allowed bg-gray-50 text-gray-400' 
                                        : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                                    }`}
                                >
                                    {user.role === 'ADMIN' ? 'Demote to User' : 'Promote to Admin'}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        )}

        {/* Info Modal */}
        {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 m-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Adding New Users</h3>
                    <p className="text-gray-600 mb-4">
                        To add a new user to the system, simply ask them to <strong>Sign Up</strong> on the login page.
                    </p>
                    <p className="text-gray-600 mb-4">
                        Once they sign up, they will appear in this list as a "Standard User". You can then promote them to "Admin" using the action buttons in the table.
                    </p>
                    <div className="flex justify-end mt-6">
                        <button 
                            type="button"
                            onClick={() => setShowModal(false)}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};