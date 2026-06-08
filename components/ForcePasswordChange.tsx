import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Check, X } from 'lucide-react';
import { TermsAndPoliciesModal } from './TermsAndPoliciesModal';

interface Props {
  onPasswordChanged: (newPass: string) => void;
  onLogout: () => void;
}

export const ForcePasswordChange: React.FC<Props> = ({ onPasswordChanged, onLogout }) => {
  const [pass1, setPass1] = useState('');
  const [pass2, setPass2] = useState('');
  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [error, setError] = useState('');
  
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // ✅ FUNÇÃO DE VALIDAÇÃO DE SENHA FORTE (igual ao ResetPasswordPage)
  const validatePassword = (pwd: string) => {
    const requirements = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /\d/.test(pwd),
    };
    
    return {
      ...requirements,
      allValid: Object.values(requirements).every(v => v === true)
    };
  };

  const passwordRequirements = validatePassword(pass1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ VALIDAÇÃO 1: Requisitos de segurança
    if (!passwordRequirements.allValid) {
      setError('A senha não atende todos os requisitos de segurança.');
      return;
    }

    // ✅ VALIDAÇÃO 2: Senhas coincidem
    if (pass1 !== pass2) {
      setError('As senhas não coincidem.');
      return;
    }

    onPasswordChanged(pass1);
  };

  // ✅ COMPONENTE VISUAL: Requisitos de senha
  const PasswordRequirements = () => (
    <div className="mt-4 space-y-2">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
        Requisitos de Segurança:
      </p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          {passwordRequirements.length ? (
            <Check size={12} className="text-green-500" />
          ) : (
            <X size={12} className="text-gray-300" />
          )}
          <span className={`text-xs ${passwordRequirements.length ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
            Mínimo 8 caracteres
          </span>
        </div>
        <div className="flex items-center gap-2">
          {passwordRequirements.uppercase ? (
            <Check size={12} className="text-green-500" />
          ) : (
            <X size={12} className="text-gray-300" />
          )}
          <span className={`text-xs ${passwordRequirements.uppercase ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
            Pelo menos 1 letra maiúscula (A-Z)
          </span>
        </div>
        <div className="flex items-center gap-2">
          {passwordRequirements.lowercase ? (
            <Check size={12} className="text-green-500" />
          ) : (
            <X size={12} className="text-gray-300" />
          )}
          <span className={`text-xs ${passwordRequirements.lowercase ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
            Pelo menos 1 letra minúscula (a-z)
          </span>
        </div>
        <div className="flex items-center gap-2">
          {passwordRequirements.number ? (
            <Check size={12} className="text-green-500" />
          ) : (
            <X size={12} className="text-gray-300" />
          )}
          <span className={`text-xs ${passwordRequirements.number ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
            Pelo menos 1 número (0-9)
          </span>
        </div>
      </div>
      
      {/* Barra de força da senha */}
      <div className="mt-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Força da senha:
          </span>
          <span className={`text-xs font-bold ${
            passwordRequirements.allValid ? 'text-green-600' :
            pass1.length >= 8 ? 'text-amber-600' :
            pass1.length >= 4 ? 'text-yellow-500' : 'text-red-500'
          }`}>
            {passwordRequirements.allValid ? 'Forte' :
             pass1.length >= 8 ? 'Média' :
             pass1.length >= 4 ? 'Fraca' : 'Muito fraca'}
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${
              passwordRequirements.allValid ? 'bg-green-500 w-full' :
              pass1.length >= 8 ? 'bg-amber-500 w-2/3' :
              pass1.length >= 4 ? 'bg-yellow-400 w-1/3' : 'bg-red-400 w-1/6'
            }`}
          ></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-xl border-t-4 border-yellow-500">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
            <Lock size={32} />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Defina sua Senha</h1>
        <p className="text-gray-500 mb-8 text-center">Este é seu primeiro acesso. Por segurança, defina uma nova senha forte.</p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
            <div className="relative">
              <input 
                type={showPass1 ? "text" : "password"} 
                required 
                value={pass1}
                onChange={e => setPass1(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all pr-12" 
                placeholder="Crie uma senha forte"
              />
              <button 
                type="button"
                onClick={() => setShowPass1(!showPass1)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2 transition-colors"
              >
                {showPass1 ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
            
            {/* ✅ REQUISITOS VISUAIS AQUI! */}
            <PasswordRequirements />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
            <div className="relative">
              <input 
                type={showPass2 ? "text" : "password"} 
                required 
                value={pass2}
                onChange={e => setPass2(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all pr-12" 
                placeholder="Digite novamente"
              />
              <button 
                type="button"
                onClick={() => setShowPass2(!showPass2)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2 transition-colors"
              >
                {showPass2 ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
            
            {/* Indicador de correspondência */}
            {pass1 && pass2 && (
              <div className="flex items-center gap-2 mt-2">
                {pass1 === pass2 ? (
                  <>
                    <Check size={12} className="text-green-500" />
                    <span className="text-xs text-green-600 font-medium">
                      As senhas coincidem
                    </span>
                  </>
                ) : (
                  <>
                    <X size={12} className="text-red-500" />
                    <span className="text-xs text-red-600 font-medium">
                      As senhas não coincidem
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
          {/* Checkbox de Termos */}
          <div className="flex items-start gap-3 p-4 bg-gray-50/80 rounded-2xl border border-gray-100 shadow-sm mt-6 mb-2">
            <button
              type="button"
              onClick={() => setAcceptedTerms(!acceptedTerms)}
              className={`flex-shrink-0 w-6 h-6 mt-0.5 rounded-lg border-2 flex items-center justify-center transition-all shadow-sm ${
                acceptedTerms 
                  ? 'bg-blue-500 border-blue-500 text-white shadow-blue-500/30' 
                  : 'bg-white border-gray-300 text-transparent hover:border-blue-400'
              }`}
            >
              <Check size={14} className="stroke-[3]" />
            </button>
            <p className="text-[11px] text-gray-600 leading-relaxed font-medium">
              Li e concordo com os{' '}
              <button
                type="button"
                className="text-blue-600 font-bold hover:underline transition-all"
                onClick={() => setShowTermsModal(true)}
              >
                Termos de Uso
              </button>{' '}
              e{' '}
              <button
                type="button"
                className="text-blue-600 font-bold hover:underline transition-all"
                onClick={() => setShowTermsModal(true)}
              >
                Política de Privacidade
              </button>
              .
            </p>
          </div>
          
          <button 
            type="submit" 
            disabled={!passwordRequirements.allValid || pass1 !== pass2 || !acceptedTerms}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 active:scale-[0.98]"
          >
            Salvar Senha e Entrar
          </button>
          <button type="button" onClick={onLogout} className="w-full text-gray-500 font-medium py-2 text-sm hover:underline">
            Cancelar e Sair
          </button>
        </form>
      </div>
      
      <TermsAndPoliciesModal 
        isOpen={showTermsModal} 
        onClose={() => setShowTermsModal(false)}
        onAccept={() => {
          setAcceptedTerms(true);
          setShowTermsModal(false);
        }}
      />
    </div>
  );
};