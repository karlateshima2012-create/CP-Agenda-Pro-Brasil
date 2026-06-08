import React, { useState, useEffect } from 'react';
import { api } from '../src/api';
import { CheckCircle, AlertCircle, ArrowLeft, Lock, Check, X, RefreshCw, Mail } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [pkceError, setPkceError] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    console.log('🔄 ResetPasswordPage carregado');
    console.log('📍 Pathname:', window.location.pathname);
    console.log('🔗 Hash:', window.location.hash);
    console.log('🔍 Search:', window.location.search);

    const search = window.location.search.substring(1);

    // Formato: Query parameter com code
    if (search.includes('code=')) {
      const params = new URLSearchParams(search);
      const code = params.get('code');

      console.log('📌 Code no query parameter');
      console.log('🎯 Code:', code ? 'SIM' : 'NÃO');

      if (code) {
        console.log('✅ Code encontrado:', code.substring(0, 10) + '...');
        setRecoveryCode(code);

        // Tentar extrair email do localStorage (se disponível)
        const storedEmail = localStorage.getItem('password_reset_email');
        if (storedEmail) {
          setUserEmail(storedEmail);
          console.log('📧 Email recuperado do storage:', storedEmail);
        }

        // Limpar URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } else {
      console.log('❌ Nenhum code encontrado');
    }
  }, []);

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

  const passwordRequirements = validatePassword(password);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!passwordRequirements.allValid) {
      setError('A senha não atende todos os requisitos de segurança.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 Iniciando redefinição de senha...');

      if (!recoveryCode) {
        throw new Error('Código de recuperação não encontrado.');
      }

      const resp: any = await api.confirmPasswordReset(recoveryCode, password);

      if (!resp.ok) {
        throw new Error(resp.error || 'Erro ao redefinir senha');
      }

      console.log('✅ Senha redefinida com sucesso!');
      setSuccess(true);

      // Limpar storage
      localStorage.removeItem('password_reset_email');

      // Redirecionar após 3 segundos
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);

    } catch (err: any) {
      console.error('💥 Erro final:', err);
      setError(err.message || 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNewLink = () => {
    // Redirecionar para página onde pode solicitar novo link
    window.location.href = '/';
  };

  // Se tiver erro PKCE (fluxo interrompido)
  if (pkceError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-blue-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-yellow-50 text-yellow-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={40} />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-4">Fluxo Interrompido</h2>
            <p className="text-gray-500 mb-6">
              O fluxo de segurança foi interrompido porque você clicou no link em um aplicativo diferente.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-8">
            <h3 className="font-bold text-yellow-800 mb-3 flex items-center gap-2">
              <Mail size={18} /> Instruções para redefinir senha:
            </h3>
            <ol className="text-sm text-yellow-700 space-y-2 pl-5 list-decimal">
              <li><strong>Use o mesmo navegador</strong> onde solicitou a recuperação</li>
              <li><strong>Abra o email no navegador</strong> (não no app)</li>
              <li><strong>Copie o link completo</strong> do email</li>
              <li><strong>Cole no mesmo navegador</strong> onde fez a solicitação</li>
              <li><strong>Ou solicite um novo link</strong> e complete no mesmo navegador</li>
            </ol>

            <div className="mt-4 p-3 bg-white rounded-lg border border-yellow-300">
              <p className="text-xs text-yellow-600 font-bold">
                ⚠️ IMPORTANTE: O fluxo deve iniciar e terminar no MESMO navegador.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleRequestNewLink}
              className="w-full py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary-hover transition-colors flex items-center justify-center gap-3"
            >
              <RefreshCw size={20} /> Solicitar Novo Link
            </button>

            <button
              onClick={() => window.location.href = '/'}
              className="w-full py-3 text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} /> Voltar para o Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Se não tem code, mostrar erro
  if (!recoveryCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-blue-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl border border-gray-100 text-center">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4">Link Inválido</h2>
          <p className="text-gray-500 mb-8">
            Não foi possível detectar um código válido na URL.
          </p>

          <button
            onClick={handleRequestNewLink}
            className="w-full py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary-hover transition-colors flex items-center justify-center gap-3 mb-4"
          >
            <RefreshCw size={20} /> Solicitar Novo Link
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-blue-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl border border-gray-100 text-center">
          <div className="w-20 h-20 bg-green-50 text-green-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4">Senha Redefinida!</h2>
          <p className="text-gray-500 mb-8">
            Sua senha foi redefinida com sucesso.
            <br />
            <span className="text-sm text-gray-400">
              Você será redirecionado para o login em instantes.
            </span>
          </p>
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  // PÁGINA PRINCIPAL: Formulário de redefinição
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-blue-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl border border-gray-100">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Lock size={40} />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-2">Nova Senha</h2>
          <p className="text-gray-500 mb-4">
            Código de recuperação detectado!
          </p>

          {userEmail && (
            <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200 mb-4">
              <p className="text-sm text-blue-600 font-medium">
                Redefinindo senha para: <span className="font-bold">{userEmail}</span>
              </p>
            </div>
          )}

          <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-200">
            <p className="text-xs text-green-600 font-medium flex items-center justify-center gap-2">
              <CheckCircle size={14} />
              Link válido detectado
            </p>
          </div>

          {/* Aviso importante */}
          <div className="mt-4 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
            <p className="text-xs text-yellow-700 font-bold mb-1">
              ⚠️ COMPLETE RAPIDAMENTE
            </p>
            <p className="text-[10px] text-yellow-600">
              Este link expira em poucos minutos. Digite as senhas e clique em "Redefinir" agora.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle size={20} />
              <span className="text-sm font-medium">Erro</span>
            </div>
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
              Nova Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-primary rounded-2xl outline-none transition-all font-medium placeholder:text-gray-300"
              placeholder="Crie uma senha forte"
              required
              autoFocus
            />
            <div className="mt-3 space-y-1">
              <div className="flex items-center gap-2">
                {passwordRequirements.length ? <Check size={12} className="text-green-500" /> : <X size={12} className="text-gray-300" />}
                <span className={`text-xs ${passwordRequirements.length ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                  Mínimo 8 caracteres
                </span>
              </div>
              <div className="flex items-center gap-2">
                {passwordRequirements.uppercase ? <Check size={12} className="text-green-500" /> : <X size={12} className="text-gray-300" />}
                <span className={`text-xs ${passwordRequirements.uppercase ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                  Pelo menos 1 letra maiúscula (A-Z)
                </span>
              </div>
              <div className="flex items-center gap-2">
                {passwordRequirements.lowercase ? <Check size={12} className="text-green-500" /> : <X size={12} className="text-gray-300" />}
                <span className={`text-xs ${passwordRequirements.lowercase ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                  Pelo menos 1 letra minúscula (a-z)
                </span>
              </div>
              <div className="flex items-center gap-2">
                {passwordRequirements.number ? <Check size={12} className="text-green-500" /> : <X size={12} className="text-gray-300" />}
                <span className={`text-xs ${passwordRequirements.number ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                  Pelo menos 1 número (0-9)
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
              Confirmar Nova Senha
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-primary rounded-2xl outline-none transition-all font-medium placeholder:text-gray-300"
              placeholder="Digite novamente"
              required
            />
            {password && confirmPassword && password !== confirmPassword && (
              <div className="flex items-center gap-2 mt-2">
                <X size={12} className="text-red-500" />
                <span className="text-xs text-red-600 font-medium">As senhas não coincidem</span>
              </div>
            )}
            {password && confirmPassword && password === confirmPassword && (
              <div className="flex items-center gap-2 mt-2">
                <Check size={12} className="text-green-500" />
                <span className="text-xs text-green-600 font-medium">As senhas coincidem</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !passwordRequirements.allValid || password !== confirmPassword}
            className="w-full py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processando...
              </>
            ) : (
              <>
                <Lock size={20} />
                Redefinir Senha Agora
              </>
            )}
          </button>

          <div className="text-center pt-4">
            <p className="text-xs text-gray-400 mb-2">
              Problemas? Tente:
            </p>
            <button
              type="button"
              onClick={handleRequestNewLink}
              className="text-primary text-sm font-medium hover:underline flex items-center justify-center gap-2 mx-auto"
            >
              <RefreshCw size={14} /> Solicitar novo link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};