import React, { useState } from 'react';
import { Eye, EyeOff, ArrowLeft, Mail, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../src/api';
import { Logo } from './Logo';

interface Props {
  onLogin: (email: string, pass: string) => void;
}



export const LoginScreen: React.FC<Props> = ({ onLogin }) => {
  const [view, setView] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Preencha seu e-mail e senha para acessar.');
      return;
    }
    onLogin(email, password);
  };

  const goToForgot = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError('Por favor, digite um e-mail válido no campo acima primeiro.');
      return;
    }

    // ✅ Limpa mensagens anteriores
    setError('');
    setSuccessMsg('');

    // ✅ Vai para tela de recuperação
    setView('forgot');
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      console.log('📤 Enviando email de recuperação para:', email);
      const resp: any = await api.requestPasswordReset(email.trim());

      // ✅ MENSAGEM GENÉRICA POR SEGURANÇA (NÃO revela se email existe)
      setSuccessMsg('Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha em instantes. Verifique sua caixa de entrada e spam.');

      // Limpar campo após envio
      setTimeout(() => {
        setEmail('');
      }, 1000);

    } catch (err: any) {
      console.error('💥 Erro ao enviar email:', err);
      // ✅ MESMO EM CASO DE ERRO, MOSTRA MENSAGEM GENÉRICA
      setSuccessMsg('Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha em instantes. Verifique sua caixa de entrada e spam.');
    } finally {
      setLoading(false);
    }
  };

  if (view === 'forgot') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-t-4 border-primary">
            <button
              onClick={() => { setView('login'); setError(''); setSuccessMsg(''); }}
              className="flex items-center gap-2 text-gray-400 hover:text-primary transition-colors text-xs font-black uppercase tracking-widest mb-6"
            >
              <ArrowLeft size={16} /> Voltar ao Login
            </button>

            <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Recuperar Senha</h2>
            <p className="text-gray-500 text-sm mb-8 font-medium">Enviaremos as instruções para o e-mail abaixo:</p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 text-xs font-bold rounded-2xl border border-red-100 flex items-center gap-3">
                <AlertCircle size={18} className="flex-shrink-0" />
                {error}
              </div>
            )}

            {successMsg ? (
              <div className="text-center py-6 space-y-6">
                <div className="w-20 h-20 bg-green-50 text-green-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle size={40} />
                </div>
                <p className="text-green-800 font-bold text-sm leading-relaxed">{successMsg}</p>
                <button
                  onClick={() => setView('login')}
                  className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-lg uppercase tracking-widest text-xs"
                >
                  Ok, voltar ao login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail Confirmado</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                    <input
                      type="email"
                      readOnly
                      value={email}
                      className="w-full pl-12 pr-6 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50 text-gray-400 font-bold outline-none cursor-not-allowed"
                    />
                  </div>
                  <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
                    <p className="text-[9px] text-blue-600 font-black uppercase tracking-widest leading-relaxed">
                      Por segurança, este campo não pode ser alterado. Caso o e-mail esteja incorreto, volte e corrija no login.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary-hover text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/30 transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 text-xs uppercase tracking-widest"
                >
                  {loading ? <RefreshCw className="animate-spin" size={18} /> : 'Enviar Instruções'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border-t-4 border-primary">
          <div className="mb-10">
            <div className="flex justify-center">
              <Logo variant="dark" size="lg" />
            </div>
          </div>
          <p className="text-gray-500 text-sm mb-10 font-medium text-center">Faça login para gerenciar seu negócio</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 text-xs font-bold rounded-2xl border border-red-100 flex items-center gap-3">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-primary transition-colors" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail((e.target.value || '').toLowerCase().trim())}
                  className="w-full pl-12 pr-6 py-4 rounded-2xl border-2 border-transparent bg-gray-50 focus:border-primary focus:bg-white text-gray-900 font-bold outline-none transition-all placeholder:font-medium"
                  placeholder="seu@email.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl border-2 border-transparent bg-gray-50 focus:border-primary focus:bg-white text-gray-900 font-mono font-bold outline-none transition-all pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 p-2 transition-colors"
                >
                  {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
              </div>
            </div>

            <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/30 transition-all transform active:scale-95 text-xs uppercase tracking-widest">
              Acessar Painel
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={goToForgot}
                className="text-primary text-[11px] font-black uppercase tracking-widest hover:underline decoration-primary"
              >
                Esqueci minha senha
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};