
import React, { useState } from 'react';
import { X, CheckCircle, Send } from 'lucide-react';

interface ResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (resolution: string) => void;
  ticketNumber: number;
}

export const ResolutionModal: React.FC<ResolutionModalProps> = ({ isOpen, onClose, onConfirm, ticketNumber }) => {
  const [resolution, setResolution] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (resolution.trim()) {
      onConfirm(resolution);
      setResolution('');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-none shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-green-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <CheckCircle size={20} />
            <h3 className="font-bold uppercase tracking-widest text-sm">Resolver Chamado #{ticketNumber}</h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-sm font-medium text-slate-600 mb-4">
            Descreva detalhadamente como o problema foi resolvido. Esta informação será enviada por e-mail ao solicitante e ficará registrada no chamado.
          </p>
          
          <textarea
            autoFocus
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            className="w-full h-40 p-4 border border-slate-300 rounded-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none text-sm font-medium resize-none"
            placeholder="Ex: Problema resolvido através da atualização de firmware e reinicialização do serviço..."
            required
          />

          {/* Footer */}
          <div className="mt-6 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-slate-300 text-slate-600 font-bold uppercase tracking-widest text-xs hover:bg-slate-50 transition-colors rounded-none"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!resolution.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white font-bold uppercase tracking-widest text-xs hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-green-200 rounded-none"
            >
              <Send size={16} />
              Confirmar Resolução
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
