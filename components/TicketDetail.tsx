import React, { useState, useEffect } from 'react';
import { Ticket, TicketStatus, User } from '../types';
import { generateSolutionSuggestion } from '../services/geminiService';
import { ArrowLeft, Bot, CheckCircle, Clock, User as UserIcon, Calendar, Tag, AlertTriangle, Trash2, Edit } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../services/supabase';

interface TicketDetailProps {
  ticket: Ticket;
  currentUser: User;
  onBack: () => void;
  onUpdateStatus: (id: string, status: TicketStatus) => void;
  onDelete: (id: string) => void;
  onEdit: (ticket: Ticket) => void;
}

export const TicketDetail: React.FC<TicketDetailProps> = ({ ticket, currentUser, onBack, onUpdateStatus, onDelete, onEdit }) => {
  const [solution, setSolution] = useState<string | null>(ticket.suggestedSolution || null);
  const [loadingSolution, setLoadingSolution] = useState(false);

  const isAdmin = currentUser.role === 'ADMIN';
  const isOwner = currentUser.id === ticket.requesterId;

  useEffect(() => {
    // Generate solution if missing and user is admin/owner
    if (!solution && ticket.status !== TicketStatus.CLOSED) {
      setLoadingSolution(true);
      generateSolutionSuggestion(ticket.title, ticket.description, ticket.category)
        .then(async (sol) => {
            setSolution(sol);
            // Persist the solution to the DB so we don't regen every time
            await supabase
                .from('tickets')
                .update({ suggested_solution: sol })
                .eq('id', ticket.id);
        })
        .finally(() => setLoadingSolution(false));
    }
  }, [ticket.id]); 

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={onBack} className="flex items-center text-gray-500 hover:text-gray-700">
        <ArrowLeft size={18} className="mr-2" />
        Back to {isAdmin ? 'Dashboard' : 'My Tickets'}
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex justify-between items-start">
            <div>
                <div className="flex items-center space-x-3 mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">#{ticket.id.slice(0, 8)}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        ticket.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' : 
                        ticket.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                        ticket.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                    }`}>
                        {ticket.priority} Priority
                    </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{ticket.title}</h1>
            </div>
            
            <div className="flex items-center space-x-3">
                {(isOwner || isAdmin) && (
                     <button 
                        onClick={() => onEdit(ticket)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Ticket"
                     >
                         <Edit size={20} />
                     </button>
                )}
                
                {(isOwner || isAdmin) && (
                     <button 
                        onClick={() => {
                            if(window.confirm('Are you sure you want to delete this ticket?')) {
                                onDelete(ticket.id);
                            }
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Ticket"
                     >
                         <Trash2 size={20} />
                     </button>
                )}

                {isAdmin ? (
                    <select 
                        value={ticket.status}
                        onChange={(e) => onUpdateStatus(ticket.id, e.target.value as TicketStatus)}
                        className="border border-gray-300 rounded-md text-sm py-1 px-3 focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                        {Object.values(TicketStatus).map(s => (
                            <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                    </select>
                ) : (
                    <div className={`px-3 py-1 rounded-full text-sm font-medium border ${
                        ticket.status === TicketStatus.RESOLVED ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'
                    }`}>
                        {ticket.status.replace('_', ' ')}
                    </div>
                )}
            </div>
        </div>
        
        <div className="mt-6 flex items-center space-x-6 text-sm text-gray-500 border-t border-gray-100 pt-4">
            <div className="flex items-center">
                <UserIcon size={16} className="mr-2" />
                {ticket.requester}
            </div>
            <div className="flex items-center">
                <Tag size={16} className="mr-2" />
                {ticket.category}
            </div>
            <div className="flex items-center">
                <Calendar size={16} className="mr-2" />
                {ticket.createdAt.toLocaleDateString()}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Description */}
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Description</h3>
                <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                    {ticket.description}
                </p>
            </div>

            {/* AI Solution Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 border-b border-indigo-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Bot className="text-indigo-600" size={20} />
                        <h3 className="font-semibold text-indigo-900">Gemini AI Suggested Solution</h3>
                    </div>
                    {loadingSolution && <span className="text-xs text-indigo-500 animate-pulse">Generating...</span>}
                </div>
                <div className="p-6 bg-white">
                    {loadingSolution ? (
                        <div className="space-y-3">
                            <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse"></div>
                            <div className="h-4 bg-gray-100 rounded w-full animate-pulse"></div>
                            <div className="h-4 bg-gray-100 rounded w-5/6 animate-pulse"></div>
                        </div>
                    ) : (
                        <div className="prose prose-indigo prose-sm max-w-none">
                             <ReactMarkdown>{solution || "No solution available yet. Check back shortly."}</ReactMarkdown>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Right: Sidebar Info */}
        <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                    {isAdmin && (
                        <button 
                            onClick={() => onUpdateStatus(ticket.id, TicketStatus.RESOLVED)}
                            className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                            <CheckCircle size={16} className="mr-2" />
                            Mark as Resolved
                        </button>
                    )}
                    
                    <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                        <Clock size={16} className="mr-2" />
                        Add Reminder
                    </button>
                    
                    {isAdmin && (
                        <button className="w-full flex items-center justify-center px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium">
                            <AlertTriangle size={16} className="mr-2" />
                            Escalate
                        </button>
                    )}
                </div>
            </div>
            
             {ticket.aiAnalysis && (
                <div className="bg-purple-50 rounded-xl border border-purple-100 p-6">
                    <h3 className="font-semibold text-purple-900 mb-2 text-sm">AI Insight</h3>
                    <p className="text-sm text-purple-800 italic">
                        "{ticket.aiAnalysis}"
                    </p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};