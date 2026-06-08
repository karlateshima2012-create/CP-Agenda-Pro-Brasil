import React from 'react';
import { Lock, MessageCircle } from 'lucide-react';

interface Props {
  reason: string;
  onLogout: () => void;
}

export const BlockedScreen: React.FC<Props> = ({ reason, onLogout }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-xl text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto mb-6">
        <Lock size={32} />
      </div>
      
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Bloqueado</h2>
      
      <p className="text-gray-500 mb-2">{reason}</p>
      
      <p className="text-gray-400 text-sm mb-6">Entre em contato com o suporte.</p>
      
      <div className="space-y-4">
        <a 
          href="https://wa.me/819011886491" 
          target="_blank" 
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white w-full py-3 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg"
        >
          <MessageCircle size={18} /> 
          Falar com Suporte no WhatsApp
        </a>
        
        <button 
          onClick={onLogout} 
          className="text-gray-600 hover:text-gray-900 font-medium hover:underline text-sm"
        >
          Voltar para Login
        </button>
      </div>
    </div>
  </div>
);