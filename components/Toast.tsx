import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Props {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export const Toast: React.FC<Props> = ({ message, type, onClose }) => {
  useEffect(() => {
    // Erros graves podem ficar mais tempo ou até o usuário fechar, 
    // mas vamos manter o timer um pouco mais longo para erros.
    const duration = type === 'error' ? 5000 : 3000;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, type]);

  const config = {
    success: { icon: CheckCircle, bg: 'bg-green-50/95 backdrop-blur-sm', border: 'border-green-200', text: 'text-green-800', iconColor: 'text-green-500' },
    error: { icon: XCircle, bg: 'bg-white', border: 'border-red-200', text: 'text-gray-800', iconColor: 'text-red-500' },
    info: { icon: Info, bg: 'bg-blue-50/95 backdrop-blur-sm', border: 'border-blue-200', text: 'text-blue-800', iconColor: 'text-blue-500' },
    warning: { icon: AlertTriangle, bg: 'bg-amber-50/95 backdrop-blur-sm', border: 'border-amber-200', text: 'text-amber-800', iconColor: 'text-amber-500' }
  }[type];

  const Icon = config.icon;

  if (type === 'error') {
    return (
      <>
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998] animate-in fade-in duration-300" onClick={onClose} />
        <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] flex flex-col items-center gap-4 p-8 rounded-3xl border ${config.bg} ${config.border} shadow-2xl animate-in fade-in zoom-in-95 duration-300 w-[90%] max-w-sm text-center`}>
          <div className="bg-red-50 p-4 rounded-full">
            <Icon className={config.iconColor} size={40} />
          </div>
          <p className={`text-base font-bold ${config.text}`}>{message}</p>
          <button onClick={onClose} className="mt-2 w-full px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-bold shadow-lg shadow-red-600/20">
            Tentar Novamente
          </button>
        </div>
      </>
    );
  }

  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-6 py-3 rounded-full border ${config.bg} ${config.border} shadow-xl animate-in slide-in-from-top-10 fade-in duration-300 w-max max-w-[90vw]`}>
      <Icon className={config.iconColor} size={20} />
      <p className={`text-sm font-bold ${config.text}`}>{message}</p>
      <button onClick={onClose} className="ml-2 p-1 text-gray-400 hover:text-gray-700 hover:bg-black/5 rounded-full transition-colors">
        <X size={16} />
      </button>
    </div>
  );
};