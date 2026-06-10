import React, { useState, useEffect } from 'react';
import { X, Smartphone } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Don't show if user already dismissed
    if (localStorage.getItem('pwa_install_dismissed') === 'true') return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa_install_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
      <div className="bg-slate-900 text-white rounded-none shadow-2xl border border-slate-700 p-4 flex items-center gap-3">
        <Smartphone size={20} className="text-blue-400 flex-shrink-0" />
        <p className="text-sm font-medium flex-1">Instale o AirService no seu celular!</p>
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-widest rounded-none transition-colors whitespace-nowrap"
        >
          Instalar
        </button>
        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white transition-colors p-1"
          title="Fechar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
