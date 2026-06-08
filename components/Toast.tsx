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
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
    success: { icon: CheckCircle, bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-800', iconColor: 'text-green-500' },
    error: { icon: XCircle, bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-800', iconColor: 'text-red-500' },
    info: { icon: Info, bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-800', iconColor: 'text-blue-500' },
    warning: { icon: AlertTriangle, bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-800', iconColor: 'text-amber-500' }
  }[type];

  const Icon = config.icon;

  return (
    <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl border ${config.bg} ${config.border} shadow-2xl animate-in slide-in-from-right-full duration-300 max-w-sm`}>
      <Icon className={config.iconColor} size={24} />
      <p className={`text-sm font-bold ${config.text}`}>{message}</p>
      <button onClick={onClose} className="ml-4 text-gray-400 hover:text-gray-600 transition-colors">
        <X size={18} />
      </button>
    </div>
  );
};