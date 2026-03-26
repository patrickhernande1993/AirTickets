
import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDanger = true
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative bg-white rounded-none shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-none border ${isDanger ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                  <AlertTriangle size={24} />
                </div>
                <button
                  onClick={onClose}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-none transition-colors border border-transparent hover:border-slate-200"
                >
                  <X size={20} />
                </button>
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 mb-2 uppercase tracking-tight">{title}</h3>
              <p className="text-sm text-slate-600 mb-6 font-mono leading-relaxed">{message}</p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors border border-slate-200"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`flex-1 px-4 py-2 text-white rounded-none text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all ${
                    isDanger 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-primary-600 hover:bg-primary-700'
                  }`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
