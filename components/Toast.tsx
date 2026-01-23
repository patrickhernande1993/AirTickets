
import React, { useEffect, useState } from 'react';
import { CheckCircle, X, Mail } from 'lucide-react';

interface ToastProps {
  message: string;
  subMessage?: string;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, subMessage, onClose, duration = 4000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Espera a animação de saída
  };

  return (
    <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] transition-all duration-300 ease-out ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0'}`}>
      <div className="bg-white border border-green-100 shadow-2xl rounded-2xl p-4 pr-12 flex items-center gap-4 min-w-[320px] max-w-md">
        <div className="bg-green-100 p-2 rounded-full text-green-600 flex-shrink-0">
          <CheckCircle size={24} />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-gray-900 leading-tight">{message}</h4>
          {subMessage && (
            <div className="flex items-center mt-1 text-xs text-gray-500 font-medium">
              <Mail size={12} className="mr-1" />
              {subMessage}
            </div>
          )}
        </div>
        <button 
          onClick={handleClose}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-300 hover:text-gray-500 transition-colors"
        >
          <X size={18} />
        </button>
        {/* Barra de progresso visual */}
        <div className="absolute bottom-0 left-0 h-1 bg-green-500 rounded-b-2xl transition-all duration-[4000ms] ease-linear w-full" style={{ width: isVisible ? '0%' : '100%', transitionDuration: `${duration}ms` }}></div>
      </div>
    </div>
  );
};
