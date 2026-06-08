import React, { useState, useRef, useEffect } from 'react';
import { AccountInfo } from '../types';
import {
  Shield, User, Bell, Save,
  Image as ImageIcon, Layout, Upload,
  Info, Lock, HelpCircle, Copy, ExternalLink, Check, QrCode, X, ChevronDown
} from 'lucide-react';
import { TermsAndPoliciesModal } from './TermsAndPoliciesModal';

interface Props {
  account: AccountInfo;
  onUpdateSettings?: (settings: Partial<AccountInfo>) => void;
  onOpenPublic?: () => void;
}

export const AccountTab: React.FC<Props> = ({ account, onUpdateSettings, onOpenPublic }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showInvoicesModal, setShowInvoicesModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const [telegramToken, setTelegramToken] = useState(account.telegramBotToken || '');
  const [telegramChatId, setTelegramChatId] = useState(account.telegramChatId || '');
  const [coverImage, setCoverImage] = useState(account.coverImage || '');
  const [profileImage, setProfileImage] = useState(account.profileImage || '');
  const [shortDescription, setShortDescription] = useState(account.shortDescription || '');
  const [servicesTitle, setServicesTitle] = useState(account.servicesTitle || '');
  const [servicesSubtitle, setServicesSubtitle] = useState(account.servicesSubtitle || '');
  const [primaryColor, setPrimaryColor] = useState(account.primaryColor || '#25aae1');
  const [secondaryColor, setSecondaryColor] = useState(account.secondaryColor || '#1f2937');
  const [viewMode, setViewMode] = useState<'card'|'list'>(account.viewMode || 'card');
  const [coverOpacity, setCoverOpacity] = useState<number>(account.coverOpacity ?? 100);

  // Sincronizar estado local quando os props mudarem (ex: após salvar ou carregar)
  useEffect(() => {
    setTelegramToken(account.telegramBotToken || '');
    setTelegramChatId(account.telegramChatId || '');
    setCoverImage(account.coverImage || '');
    setProfileImage(account.profileImage || '');
    setShortDescription(account.shortDescription || '');
    setServicesTitle(account.servicesTitle || '');
    setServicesSubtitle(account.servicesSubtitle || '');
    setPrimaryColor(account.primaryColor || '#25aae1');
    setSecondaryColor(account.secondaryColor || '#1f2937');
    setViewMode(account.viewMode || 'card');
    setCoverOpacity(account.coverOpacity ?? 100);
  }, [account]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setCoverImage(reader.result as string);
      };
      reader.onerror = () => {
        alert('Erro ao ler o arquivo. Tente outra imagem.');
      };
      reader.readAsDataURL(file);
    }
  };
  const handleProfileFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setProfileImage(reader.result as string);
      };
      reader.onerror = () => {
        alert('Erro ao ler o arquivo. Tente outra imagem.');
      };
      reader.readAsDataURL(file);
    }
  };


  const OFFICIAL_BOT_TOKEN = '8679011580:AAGYmZRTeLJTkekfHcJzM-4KriplY_g_6Rk';

  const handleCopyLink = async () => {
    const linkToCopy = account.publicLink || window.location.origin;

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(linkToCopy);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = linkToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  const handleSaveSettings = async () => {
    if (onUpdateSettings) {
      setIsSaving(true);

      const payload: Partial<AccountInfo> = {};

      const cleanTelegramChatId = telegramChatId.trim();
      const cleanCoverImage = coverImage.trim();
      const cleanProfileImage = profileImage.trim();
      const cleanShortDescription = shortDescription.trim();
      const cleanServicesTitle = servicesTitle.trim();
      const cleanServicesSubtitle = servicesSubtitle.trim();

      const origTelegramChatId = (account.telegramChatId || '').trim();
      const origCoverImage = (account.coverImage || '').trim();
      const origProfileImage = (account.profileImage || '').trim();
      const origShortDescription = (account.shortDescription || '').trim();
      const origServicesTitle = (account.servicesTitle || '').trim();
      const origServicesSubtitle = (account.servicesSubtitle || '').trim();
      const origPrimaryColor = account.primaryColor || '#25aae1';
      const origSecondaryColor = account.secondaryColor || '#1f2937';

      if (cleanTelegramChatId !== origTelegramChatId) {
        payload.telegramChatId = cleanTelegramChatId;
      }
      if (OFFICIAL_BOT_TOKEN !== account.telegramBotToken) {
        payload.telegramBotToken = OFFICIAL_BOT_TOKEN;
      }
      if (cleanCoverImage !== origCoverImage) {
        payload.coverImage = cleanCoverImage;
      }
      if (cleanProfileImage !== origProfileImage) {
        payload.profileImage = cleanProfileImage;
      }
      if (cleanShortDescription !== origShortDescription) {
        payload.shortDescription = cleanShortDescription;
      }
      if (cleanServicesTitle !== origServicesTitle) {
        payload.servicesTitle = cleanServicesTitle;
      }
      if (cleanServicesSubtitle !== origServicesSubtitle) {
        payload.servicesSubtitle = cleanServicesSubtitle;
      }
      if (primaryColor !== origPrimaryColor) {
        payload.primaryColor = primaryColor;
      }
      if (secondaryColor !== origSecondaryColor) {
        payload.secondaryColor = secondaryColor;
      }
      if (viewMode !== (account.viewMode || 'card')) {
        payload.viewMode = viewMode;
      }
      if (coverOpacity !== (account.coverOpacity ?? 100)) {
        payload.coverOpacity = coverOpacity;
      }

      // Se houver campos alterados, faz o update. Caso contrário, apenas encerra salvamento instantaneamente (sucesso)
      await onUpdateSettings(payload);
      setIsSaving(false);
    }
  };

  const testNotification = async () => {
    const cleanChatId = telegramChatId.trim();
    if (!cleanChatId) {
      alert('Preencha o seu Chat ID para testar.');
      return;
    }
    try {
      const text = "<b>🔔 CP Agenda Pro</b>: Teste de Notificação bem-sucedido!";
      const url = `https://api.telegram.org/bot${OFFICIAL_BOT_TOKEN}/sendMessage?chat_id=${cleanChatId}&parse_mode=HTML&text=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.ok) {
        alert('✅ Sucesso! Verifique seu Telegram.');
      } else {
        alert('❌ Erro: ' + (data.description || 'ID Inválido ou Bot não iniciado'));
      }
    } catch (e) {
      alert('Erro de conexão com a API do Telegram.');
    }
  };

  return (
    <div className="space-y-6 pb-32 animate-fade-in relative">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PERFIL */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
            <User size={20} style={{ color: primaryColor }} /> Perfil Profissional
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Empresa</label>
              <p className="text-lg font-bold text-gray-900 capitalize">{account.companyName}</p>
            </div>
            <div className="grid grid-cols-2 gap-y-4 gap-x-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">WhatsApp</label>
                <p className="text-gray-900 font-bold text-xs">{account.contactPhone || 'Não informado'}</p>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</label>
                <p className="text-gray-600 font-medium text-xs truncate" title={account.contactEmail}>{account.contactEmail}</p>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Início do Plano</label>
                <p className="text-gray-600 font-medium text-xs">
                  {account.createdAt ? new Date(account.createdAt).toLocaleDateString('pt-BR') : '---'}
                </p>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Próximo Vencimento</label>
                <p className="text-red-600 font-bold text-xs">
                  {new Date(account.planExpiresAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            </div>
            
            {/* Botão para abrir o Modal de Faturas */}
            <div className="pt-4 mt-4 border-t border-gray-100">
              <button
                onClick={() => setShowInvoicesModal(true)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                    <ChevronDown size={16} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-gray-900">Próximo faturamento</p>
                  </div>
                </div>
                <div className="text-gray-300 group-hover:text-primary transition-colors">
                  <ExternalLink size={16} />
                </div>
              </button>
            </div>
          </div>

        {/* LINK PÚBLICO */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
            <ExternalLink size={20} style={{ color: primaryColor }} /> Link Público
          </h3>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleCopyLink}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all border ${copied
                ? 'bg-green-50 text-green-600 border-green-100'
                : 'bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200'
                }`}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'Copiado!' : 'Copiar link'}
            </button>

            <button
              onClick={onOpenPublic}
              className="w-full flex items-center justify-center gap-2 text-white px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95"
              style={{ backgroundColor: primaryColor }}
            >
              <ExternalLink size={18} /> Abrir Página
            </button>

            <p className="text-[10px] text-gray-400 font-medium text-center mt-1">
              Envie este link para seus clientes agendarem.
            </p>
          </div>
        </div>

        {/* PERSONALIZAÇÃO DA PÁGINA */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-gray-200 shadow-sm p-8">
          <h3 className="font-bold text-gray-900 mb-8 flex items-center gap-2">
            <Layout size={20} className="text-purple-600" /> Identidade Visual
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <ImageIcon size={16} /> Imagem de Capa (Banner)
                </label>
                <div
                  className="relative w-full aspect-video rounded-3xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 group cursor-pointer hover:border-primary transition-all shadow-inner"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ borderColor: primaryColor + '40' }}
                >
                  {coverImage ? (
                    <>
                      <img src={coverImage} alt="Cover" className="w-full h-full object-cover" style={{ opacity: coverOpacity / 100 }} />
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Upload size={32} className="text-white mb-2" />
                        <span className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Trocar</span>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
                      <Upload size={32} className="mb-2" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Upload Capa</span>
                    </div>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

                <div className="mt-4">
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Opacidade da Capa ({coverOpacity}%)</label>
                  <input 
                    type="range" 
                    min="0" max="100" 
                    value={coverOpacity} 
                    onChange={e => setCoverOpacity(parseInt(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <p className="text-[9px] text-gray-400 mt-1">Ajuste a transparência da imagem de capa para destacar melhor os textos.</p>
                </div>


                <div className="mt-6">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <ImageIcon size={16} /> Logo / Foto de Perfil
                  </label>

                  <div
                    className="relative w-full h-40 rounded-3xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 group cursor-pointer hover:border-primary transition-all shadow-inner flex items-center justify-center"
                    onClick={() => profileInputRef.current?.click()}
                    style={{ borderColor: primaryColor + '40' }}
                  >
                    {profileImage ? (
                      <>
                        <img src={profileImage} alt="Perfil" className="w-32 h-32 object-cover rounded-2xl border border-white/30" />
                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <Upload size={32} className="text-white mb-2" />
                          <span className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Trocar</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-300">
                        <Upload size={32} className="mb-2" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Upload Logo</span>
                      </div>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={profileInputRef}
                    onChange={handleProfileFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>


              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block text-center">Cor Principal</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-full h-10 rounded-xl cursor-pointer bg-transparent border-none" />
                    <div className="w-6 h-6 rounded-full border border-gray-200" style={{ backgroundColor: primaryColor }}></div>
                  </div>
                </div>

              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Título da Seção de Serviços</label>
                <input
                  type="text" value={servicesTitle} onChange={e => setServicesTitle(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Subtítulo</label>
                <input
                  type="text" value={servicesSubtitle} onChange={e => setServicesSubtitle(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Descrição da Empresa</label>
                <textarea
                  rows={3} maxLength={120} value={shortDescription} onChange={e => setShortDescription(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none resize-none"
                />
              </div>
            </div>
          </div>
        </div>



        {/* TELEGRAM */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-gray-200 shadow-sm p-8">
          <h3 className="font-bold text-gray-900 flex items-center gap-3">
            <Bell size={20} className="text-yellow-500" /> Notificações via Telegram
          </h3>
          <p className="text-sm text-gray-500 mt-2 mb-6">Ative Lembretes automáticos com aviso sonoro via Telegram</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="https://t.me/Cpagendaprobot?start=setup"
              target="_blank"
              rel="noreferrer"
              className="bg-primary w-full text-white text-center rounded-2xl font-black text-[10px] uppercase tracking-[0.1em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 h-14"
            >
              <Bell size={18} /> CLIQUE E COPIE O CHAT ID
            </a>
            
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-2">
              <input
                type="text"
                value={telegramChatId}
                onChange={e => setTelegramChatId(e.target.value)}
                placeholder="COLE O CHAT ID AQUI"
                className="block appearance-none m-0 w-full sm:flex-1 px-4 border border-gray-200 rounded-2xl bg-white focus:bg-white outline-none text-xs font-black ring-2 ring-transparent focus:ring-primary/20 transition-all text-center placeholder:text-gray-400 placeholder:font-black shadow-sm h-14 uppercase tracking-widest"
              />
              <button
                onClick={testNotification}
                className="w-full sm:w-auto bg-gray-900 text-white px-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl shadow-black/10 h-14 shrink-0"
              >
                <Bell size={16} /> Testar
              </button>
            </div>
          </div>
        </div>

        {/* QR CODE CARD */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-gray-200 shadow-sm p-8">
          <h3 className="font-bold text-gray-900 mb-8 flex items-center gap-3">
            <QrCode size={20} className="text-primary" /> QR Code de Agendamento
          </h3>

          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 shadow-inner group transition-all hover:bg-white hover:shadow-xl">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(account.publicLink || '')}`}
                alt="QR Code de Agendamento"
                className="w-48 h-48 md:w-56 md:h-56 mix-blend-multiply"
              />
            </div>

            <div className="flex-1 space-y-6 w-full">
              <div>
                <p className="text-base font-black text-gray-900 mb-2">Divulgue sua Agenda</p>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                  Utilize este QR Code em seus materiais impressos. Ao escanear, seu cliente será levado diretamente para sua página de agendamentos.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={async () => {
                    try {
                      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(account.publicLink || '')}`;
                      const response = await fetch(qrUrl);
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `QRCode_Agendamento_${account.companyName.replace(/\s+/g, '_')}.png`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);
                    } catch (error) {
                      console.error('Erro ao baixar QR Code:', error);
                      alert('Erro ao baixar o QR Code. Tente abrir em uma nova aba.');
                    }
                  }}
                  className="w-full flex items-center justify-center gap-3 bg-primary text-white px-6 py-5 rounded-2xl text-sm font-black transition-all shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95"
                >
                  <Upload size={20} className="rotate-180" /> Baixar QR Code (PNG)
                </button>
              </div>

              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
                <Info size={18} className="text-blue-400 mt-0.5" />
                <p className="text-[10px] text-blue-500 font-bold uppercase tracking-tight leading-relaxed">
                  Dica: Para melhores resultados em materiais impressos, baixe a versão em alta resolução clicando no botão acima.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* FOOTER & TERMOS */}
      <div className="flex flex-col items-center justify-center pt-8 pb-12 opacity-60 hover:opacity-100 transition-opacity mt-8">
        <p className="text-[10px] font-black text-gray-500 tracking-widest mb-3">
          © {new Date().getFullYear()} creative print. todos os direitos reservados.
        </p>
        <button 
          onClick={() => setShowTermsModal(true)}
          className="text-xs font-bold text-blue-500 hover:text-blue-700 hover:underline tracking-wide transition-all"
        >
          TERMOS DE USO E POLÍTICA DE PRIVACIDADE
        </button>
        <a 
          href="https://wa.me/819011886491"
          target="_blank"
          rel="noreferrer"
          className="mt-6 px-6 py-2.5 bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-2"
        >
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          FALAR COM SUPORTE
        </a>

        {/* BOTÃO SALVAR AGORA ESTÁTICO NO FINAL - NITIDEZ CORRIGIDA */}
        <div className="mt-12 w-full flex justify-center">
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="w-full md:w-auto text-white px-12 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-lg shadow-black/10 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : <Save size={20} />}
            {isSaving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
          </button>
        </div>
      </div>

      <TermsAndPoliciesModal 
        isOpen={showTermsModal} 
        onClose={() => setShowTermsModal(false)}
      />

      {/* MODAL DE FATURAS (LEITURA) */}
      {showInvoicesModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[999] backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl relative">
            <button 
              onClick={() => setShowInvoicesModal(false)} 
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors p-2"
            >
              <X size={24} />
            </button>
            <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-6">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 shrink-0">
                <Layout size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Suas Faturas</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Histórico financeiro da assinatura</p>
              </div>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar pr-2">
              {(!account.invoices || account.invoices.length === 0) ? (
                <div className="text-center py-10 bg-gray-50 rounded-3xl border border-gray-100">
                  <p className="text-sm font-bold text-gray-400">Nenhuma fatura encontrada.</p>
                </div>
              ) : (
                (() => {
                  const pendingInvoice = account.invoices.find(inv => inv.status === 'pending');
                  const historyInvoices = account.invoices.filter(inv => inv.id !== pendingInvoice?.id);
                  
                  const statusColors: Record<string, string> = {
                    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
                    paid: 'bg-green-50 text-green-700 border-green-200',
                    overdue: 'bg-red-50 text-red-700 border-red-200',
                    canceled: 'bg-gray-100 text-gray-500 border-gray-200'
                  };
                  const statusLabels: Record<string, string> = {
                    pending: 'Pendente',
                    paid: 'Pago',
                    overdue: 'Atrasado',
                    canceled: 'Cancelado'
                  };

                  return (
                    <div className="flex flex-col gap-8">
                      {pendingInvoice && (
                        <div>
                          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Próximo Faturamento</h4>
                          <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-3xl border border-blue-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                              <p className="text-base font-black text-gray-900">{pendingInvoice.planReference || 'Fatura de Assinatura'}</p>
                              <p className="text-xs font-bold text-gray-500 mt-1 flex items-center gap-2">
                                Vencimento: <span className="text-gray-900">{new Date(pendingInvoice.dueDate).toLocaleDateString('pt-BR')}</span>
                              </p>
                            </div>
                            <div className="flex flex-col items-start sm:items-end w-full sm:w-auto">
                              <p className="text-2xl font-black text-primary">¥ {Number(pendingInvoice.amount).toLocaleString('ja-JP')}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {historyInvoices.length > 0 && (
                        <div>
                          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Histórico</h4>
                          <div className="space-y-3">
                            {historyInvoices.map(inv => (
                              <div key={inv.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                  <p className="text-sm font-black text-gray-900">{inv.planReference || 'Fatura de Assinatura'}</p>
                                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1 flex items-center gap-2">
                                    Vencimento: <span className="text-gray-900">{new Date(inv.dueDate).toLocaleDateString('pt-BR')}</span>
                                  </p>
                                </div>
                                <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto">
                                  <p className="text-lg font-black text-gray-900">¥ {Number(inv.amount).toLocaleString('ja-JP')}</p>
                                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusColors[inv.status]}`}>
                                    {statusLabels[inv.status]}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center">
              <button 
                onClick={() => setShowInvoicesModal(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors"
              >
                Fechar Histórico
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
