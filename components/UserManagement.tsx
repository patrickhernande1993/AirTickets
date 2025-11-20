import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { UserPlus, Search, Mail, Shield, Trash2, User as UserIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface UserManagementProps {
  currentUser: User; // To ensure current user doesn't delete themselves
}

// Mock Initial Users
const INITIAL_USERS: User[] = [
    { id: 'admin-1', name: 'Dev Admin', email: 'dev@novadesk.com', role: 'ADMIN' },
    { id: 'user-1', name: 'Regular User', email: 'user@novadesk.com', role: 'USER' },
    { id: 'user-2', name: 'John Doe', email: 'john@company.com', role: 'USER' }
];

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [showModal, setShowModal] = useState(false);
  
  // New User Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('USER');

  const handleAddUser = (e: React.FormEvent) => {
      e.preventDefault();
      const newUser: User = {
          id: uuidv4(),
          name: newName,
          email: newEmail,
          role: newRole
      };
      setUsers([...users, newUser]);
      setShowModal(false);
      setNewName('');
      setNewEmail('');
  };

  const handleDeleteUser = (id: string) => {
      if(id === currentUser.id) {
          alert("You cannot delete yourself!");
          return;
      }
      setUsers(users.filter(u => u.id !== id));
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
                <UserPlus size={18} />
                <span>Add User</span>
            </button>
        </div>

        {/* User List */}
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
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                    title="Delete User"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Add User Modal */}
        {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 m-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Add New User</h3>
                    <form onSubmit={handleAddUser} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input 
                                required
                                type="text" 
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input 
                                required
                                type="email" 
                                value={newEmail}
                                onChange={e => setNewEmail(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                             <select
                                value={newRole}
                                onChange={e => setNewRole(e.target.value as UserRole)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                             >
                                 <option value="USER">User</option>
                                 <option value="ADMIN">Developer / Admin</option>
                             </select>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button 
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                            >
                                Create User
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};
