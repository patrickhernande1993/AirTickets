import React, { useState } from 'react';
import { Ticket, TicketPriority, TicketStatus } from '../types';
import { analyzeTicketContent } from '../services/geminiService';
import { Sparkles, Loader2, ArrowLeft } from 'lucide-react';

interface TicketFormProps {
  onSave: (ticket: Omit<Ticket, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

export const TicketForm: React.FC<TicketFormProps> = ({ onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requester, setRequester] = useState('');
  const [priority, setPriority] = useState<TicketPriority>(TicketPriority.LOW);
  const [category, setCategory] = useState('General');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const handleAIAnalysis = async () => {
    if (!title || !description) return;
    
    setIsAnalyzing(true);
    const result = await analyzeTicketContent(title, description);
    setIsAnalyzing(false);

    if (result) {
      setPriority(result.priority);
      setCategory(result.category);
      setAiSummary(result.summary);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      description,
      requester,
      priority,
      category,
      status: TicketStatus.OPEN,
      aiAnalysis: aiSummary || undefined
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={onCancel} className="flex items-center text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft size={18} className="mr-2" />
        Back to Dashboard
      </button>

      <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-primary-600 to-primary-700">
          <h2 className="text-xl font-bold text-white">Create New Support Ticket</h2>
          <p className="text-primary-100 text-sm mt-1">Describe the issue and let AI assist with classification.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Requester Name</label>
              <input
                type="text"
                required
                value={requester}
                onChange={(e) => setRequester(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                placeholder="e.g. John Doe"
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issue Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-gray-50"
                placeholder="Auto-detected by AI"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ticket Subject</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              placeholder="Brief summary of the issue"
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Description</label>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-none"
              placeholder="Please describe the problem in detail..."
            />
            
            <div className="absolute bottom-3 right-3">
                <button
                    type="button"
                    onClick={handleAIAnalysis}
                    disabled={isAnalyzing || !description}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        isAnalyzing || !description 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                    }`}
                >
                    {isAnalyzing ? (
                        <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Analyzing...</span>
                        </>
                    ) : (
                        <>
                            <Sparkles size={14} />
                            <span>AI Auto-Classify</span>
                        </>
                    )}
                </button>
            </div>
          </div>

          {aiSummary && (
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 flex items-start gap-3">
                <Sparkles className="text-purple-600 mt-0.5 flex-shrink-0" size={18} />
                <div>
                    <h4 className="text-sm font-semibold text-purple-900">AI Analysis</h4>
                    <p className="text-sm text-purple-800 mt-1">{aiSummary}</p>
                    <p className="text-xs text-purple-600 mt-2">
                        Suggested Priority: <span className="font-bold">{priority}</span>
                    </p>
                </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              >
                {Object.values(TicketPriority).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium shadow-md transition-all transform hover:-translate-y-0.5"
            >
              Create Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};