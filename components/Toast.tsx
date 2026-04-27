
import React, { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type ToastType = 'success' | 'error';

interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
          className="fixed bottom-6 right-6 z-50 flex items-center p-4 rounded-none shadow-2xl min-w-[300px] border border-white/20 backdrop-blur-md"
          style={{
            backgroundColor: type === 'success' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)',
            color: 'white'
          }}
        >
          <div className="mr-3">
            {type === 'success' ? (
              <CheckCircle size={24} className="text-white" />
            ) : (
              <XCircle size={24} className="text-white" />
            )}
          </div>
          <div className="flex-1 mr-4">
            <p className="font-medium text-sm">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-none transition-colors"
          >
            <X size={18} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
