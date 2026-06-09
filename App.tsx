import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './src/api';
import { log } from './src/logger'; // ✅ SECURITY [M-8]: Conditional logger
import { DEFAULT_AVAILABILITY } from './constants';
import { Appointment, AccountInfo, Service, AvailabilityConfig, User, UserRole, AppointmentStatus, AccountStatus } from './types';
import { PublicBookingPage } from './components/PublicBookingPage';
import { LoginScreen } from './components/LoginScreen';
import { ClientDashboard } from './components/ClientDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { BlockedScreen } from './components/BlockedScreen';
import { Toast, ToastType } from './components/Toast';
import { ForcePasswordChange } from './components/ForcePasswordChange';
import { OnboardingModal } from './components/OnboardingModal';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { mapWorkingHours } from './utils/availability';
import { Lock } from 'lucide-react';

// ✅ ERROR BOUNDARY para capturar erros fatais
interface ErrorBoundaryProps { children: React.ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error: any; }

class ErrorBoundary extends React.Component<any, any> {
  public state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("❌ CRASH DETECTADO:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-6 text-center">
          <h1 className="text-2xl font-black text-red-600 mb-4">Ops! Algo deu errado.</h1>
          <pre className="bg-white p-4 rounded-xl border border-red-100 text-left text-xs text-red-800 overflow-auto max-w-full">
            {this.state.error?.toString()}
          </pre>
          <button onClick={() => window.location.href = '/'} className="mt-6 bg-red-600 text-white px-6 py-3 rounded-xl font-bold">
            Recarregar Aplicativo
          </button>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

const App: React.FC = () => {
  useEffect(() => {
    log.info('Build Version:', import.meta.env.VITE_APP_VERSION ?? 'dev');
  }, []);

  // ✅ NOVA VERIFICAÇÃO: Se estiver na rota /reset-password, renderiza componente específico
  if (window.location.pathname === '/reset-password') {
    return <ResetPasswordPage />;
  }

  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<UserRole>('client');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string, type: ToastType } | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [currentAccountStatus, setCurrentAccountStatus] = useState<AccountStatus>('active');
  const [blockedReason, setBlockedReason] = useState<string>(''); // NOVO: motivo do bloqueio

  const [view, setView] = useState<'login'>('login'); // Remove if not used
  const [publicUserId, setPublicUserId] = useState<string | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);

  const [profile, setProfile] = useState<AccountInfo | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [publicBusyAppointments, setPublicBusyAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    if (publicBusyAppointments.length > 0) {
      console.log(`📊 Loaded ${publicBusyAppointments.length} busy appointments for public view.`);
    }
  }, [publicBusyAppointments]);
  const [services, setServices] = useState<Service[]>([]);
  const [availability, setAvailability] = useState<AvailabilityConfig>(DEFAULT_AVAILABILITY);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  }, []);

  // Verificar se está em modo público (?p=ID)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const publicUserId = params.get('p');
    if (publicUserId) {
      log.info('🔗 Modo público detectado:', publicUserId);
    }
  }, []);

  const clearAllStates = useCallback(() => {
    setProfile(null);
    setAppointments([]);
    setPublicBusyAppointments([]);
    setServices([]);
    setAvailability(DEFAULT_AVAILABILITY);
    setAllUsers([]);
    setMustChangePassword(false);
    setCurrentAccountStatus('active');
    setBlockedReason(''); // LIMPA O MOTIVO
  }, []);

  const fetchPublicData = async (userId: string) => {
    try {
      const resp = await api.getPublicProfile(userId); // Need to add this to api.ts or use a generic one
      if (!resp.ok) return;
      const { profile: prof, services: svcs, availability: avail, appointments: appts } = resp.data as any;

      const accountInfo: AccountInfo = {
        companyName: prof.name || 'Empresa',
        contactEmail: '',
        contactPhone: prof.contact_phone || '',
        status: prof.status || 'active',
        planType: prof.plan_type || '6m',
        planExpiresAt: (prof.plan_expires_at || new Date().toISOString()).replace(' ', 'T'),
        publicLink: `${window.location.origin}/?p=${userId}`,
        primaryColor: prof.primary_color || '#25aae1',
        secondaryColor: prof.secondary_color || '#1f2937',
        shortDescription: prof.short_description || '',
        servicesTitle: prof.services_title || '',
        servicesSubtitle: prof.services_subtitle || '',
        coverImage: prof.cover_image || '',
        profileImage: prof.profile_image || '',
        viewMode: prof.view_mode || 'card',
        coverOpacity: prof.cover_opacity ?? 100,
        lifetimeAppointments: prof.lifetime_appointments || 0,
        createdAt: (prof.created_at || '').replace(' ', 'T'),
      };

      if (prof.status === 'deleted' || prof.status === 'blocked' || prof.status === 'expired') {
        setBlockedReason(prof.status === 'deleted' ? 'Esta conta foi removida.' : 'Esta página de agendamentos está suspensa.');
        setCurrentAccountStatus('blocked');
        setProfile(accountInfo);
        return;
      }

      setProfile(accountInfo);
      setServices(svcs || []);

      if (avail) {
        if (!avail.workingHours || avail.workingHours.length === 0) {
          avail.workingHours = DEFAULT_AVAILABILITY.workingHours;
        } else {
          avail.workingHours = mapWorkingHours(avail.workingHours);
        }
        setAvailability(avail);
      }

      setPublicBusyAppointments(appts || []);

    } catch (e) {
      log.error("Erro ao buscar dados públicos:", e);
    }
  };

  const fetchAllData = async (userId: string, role: UserRole, userObj?: any, accountObj?: any) => {
    try {
      if (role === 'admin' || role === 'super_admin') {
        log.info('🔍 [App] Fetching admin profiles for role:', role);
        const resp: any = await api.adminListProfiles();
        log.info('📦 [App] Admin profiles response:', resp);
        if (resp.ok) {
          log.info('✅ [App] Setting allUsers with mapped data');
          const mappedUsers = (resp.data || []).map((u: any) => ({
            ...u,
            planExpiresAt:          u.planExpiresAt          ? u.planExpiresAt.replace(' ', 'T')         : '',
            createdAt:              u.createdAt              ? u.createdAt.replace(' ', 'T')              : '',
            lastAccessAt:           u.lastAccessAt           ? u.lastAccessAt.replace(' ', 'T')           : null,
            lastAppointmentAt:      u.lastAppointmentAt      ? u.lastAppointmentAt.replace(' ', 'T')      : null,
            appointmentsLast30Days: u.appointmentsLast30Days ?? 0,
            servicesCount:          u.servicesCount          ?? 0,
            hasTelegram:            !!u.hasTelegram,
            hasProfileImage:        !!u.hasProfileImage,
            hasCoverImage:          !!u.hasCoverImage,
            hasDescription:         !!u.hasDescription,
          }));
          setAllUsers(mappedUsers);
        } else {
          log.error('❌ [App] Failed to fetch profiles:', resp);
        }
      } else if (userObj && accountObj) {
        await fetchClientData(userId, userObj, accountObj);
      }
    } catch (e: any) {
      log.error("Erro ao carregar dados do painel:", e);
    }
  };

  const fetchClientData = async (userId: string, user: any, account: any) => {
    try {
      const accountInfo: AccountInfo = {
        companyName: account.name || 'Empresa',
        contactEmail: user.email || '',
        contactPhone: account.contact_phone || '',
        status: account.status || 'active',
        planType: account.plan_type || '6m',
        planExpiresAt: (account.plan_expires_at || new Date().toISOString()).replace(' ', 'T'),
        publicLink: `${window.location.origin}/?p=${user.id}`,
        primaryColor: account.primary_color || '#25aae1',
        secondaryColor: account.secondary_color || '#1f2937',
        shortDescription: account.short_description || '',
        servicesTitle: account.services_title || '',
        servicesSubtitle: account.services_subtitle || '',
        coverImage: account.cover_image || '',
        profileImage: account.profile_image || '',
        viewMode: account.view_mode || 'card',
        coverOpacity: account.cover_opacity ?? 100,
        telegramBotToken: account.telegram_bot_token || '',
        telegramChatId: account.telegram_chat_id || '',
        lifetimeAppointments: account.lifetime_appointments || 0,
        onboardingSeen: !!account.onboarding_seen,
        createdAt: (account.created_at || '').replace(' ', 'T'),
        invoices: account.invoices || [],
      };
      setProfile(accountInfo);

      const [svcsResp, availResp, apptsResp]: any = await Promise.all([
        api.listServices(),
        api.getAvailability(),
        api.listAppointments({ limit: 1000 })
      ]);

      if (svcsResp.ok) setServices(svcsResp.data);
      if (availResp.ok) {
        const availData = availResp.data;
        if (!availData.workingHours || availData.workingHours.length === 0) {
          availData.workingHours = DEFAULT_AVAILABILITY.workingHours;
        } else {
          availData.workingHours = mapWorkingHours(availData.workingHours);
        }
        setAvailability(availData);
      }
      if (apptsResp.ok && apptsResp.data) {
        const items = apptsResp.data.items || [];
        const mappedAppts = items.map((a: any) => ({
          id: a.id,
          accountId: a.account_id,
          userId: a.user_id,
          clientName: a.client_name,
          clientEmail: a.client_email,
          clientPhone: a.client_phone,
          serviceId: a.service_id,
          serviceName: a.service_name,
          startAt: a.start_at ? a.start_at.replace(' ', 'T') : '', // Fix for Safari
          duration: a.duration,
          status: a.status,
          createdAt: a.created_at,
          updatedAt: a.updated_at
        }));
        setAppointments(mappedAppts);
      }

    } catch (e) {
      console.error('Erro fetchClientData:', e);
    }
  };

  const handleAuthCheck = useCallback(async () => {
    try {
      setLoading(true);
      const resp: any = await api.getMe();
      if (resp.ok && resp.data && resp.data.user) {
        const { user, account } = resp.data;

        setSession({ user }); // Mock session object
        setUserRole(user.role);

        if (user.role === 'client') {
          const isBlocked = account.status !== 'active';
          if (isBlocked) {
            setBlockedReason(account.status === 'blocked' ? 'Conta bloqueada' : 'Plano vencido');
            setCurrentAccountStatus('blocked');
          }
        }

        if (user.must_change_password) setMustChangePassword(true);

        await fetchAllData(user.id, user.role, user, account);
      } else {
        showToast("Erro na validação do perfil: Dados incompletos", "error");
        setSession(null);
      }
    } catch (err: any) {
      console.error("Erro no check de auth:", err);
      showToast("Falha ao carregar perfil: " + (err.message || "Erro desconhecido"), "error");
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pId = params.get('p');

    if (pId) {
      setPublicUserId(pId);
      setIsGuestMode(true);
      fetchPublicData(pId).then(() => setLoading(false));
    } else {
      handleAuthCheck();
    }
  }, [handleAuthCheck]);


  // POLLING para agendamentos
  useEffect(() => {
    if (!session || userRole !== 'client') return;

    const interval = setInterval(() => {
      console.log('📡 Polling appointments...');
      api.listAppointments({ limit: 1000 }).then(resp => {
        if (resp.ok && resp.data) {
          const items = resp.data.items || [];
          const mappedAppts = items.map((a: any) => ({
            id: a.id,
            accountId: a.account_id,
            userId: a.user_id,
            clientName: a.client_name,
            clientEmail: a.client_email,
            clientPhone: a.client_phone,
            serviceId: a.service_id,
            serviceName: a.service_name,
            startAt: a.start_at ? a.start_at.replace(' ', 'T') : '',
            duration: a.duration,
            status: a.status,
            createdAt: a.created_at,
            updatedAt: a.updated_at
          }));
          if (items.length > 0) {
            setAppointments(mappedAppts);
          }
        }
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [session, userRole]);

  const handleBookAppointment = async (data: any) => {
    try {
      const resp: any = await api.createPublicAppointment({
        ...data,
        professional_id: publicUserId
      });

      if (!resp.ok) throw new Error(resp.error || 'Erro ao agendar');

      showToast('Agendamento solicitado! O horário foi reservado para você.');
      return true;
    } catch (error: any) {
      console.error('Erro ao agendar:', error);
      showToast(error.message || 'Falha técnica ao agendar.', 'error');
      return error.message || 'Falha técnica ao agendar.';
    }
  };

  const handleUpdateAdminUser = async (userId: string, data: Partial<User>) => {
    try {
      const resp: any = await api.adminUpdateProfile(userId, data);
      if (!resp.ok) throw new Error(resp.error);
      // Re-fetch from server to guarantee sync with DB
      const refreshResp: any = await api.adminListProfiles();
      if (refreshResp.ok) {
        const mappedUsers = (refreshResp.data || []).map((u: any) => ({
          ...u,
          planExpiresAt: u.planExpiresAt ? u.planExpiresAt.replace(' ', 'T') : '',
          createdAt: u.createdAt ? u.createdAt.replace(' ', 'T') : ''
        }));
        setAllUsers(mappedUsers);
      } else {
        // Fallback: local merge if refresh fails
        setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data } : u));
      }
      return true;
    } catch (e: any) {
      showToast("Erro ao atualizar dados.", "error");
      return false;
    }
  };

  const handleUpdateUserStatus = async (id: string, status: AccountStatus) => {
    try {
      const resp: any = await api.adminUpdateProfile(id, { accountStatus: status });
      if (!resp.ok) throw new Error(resp.error);
      setAllUsers(prev => prev.map(u => u.id === id ? { ...u, accountStatus: status } : u));
      showToast(`Acesso ${status === 'active' ? 'Liberado' : 'Bloqueado'}!`);
    } catch (e: any) {
      showToast("Erro ao mudar status.", "error");
    }
  };

  const handleRenewPlan = async (userId: string, currentExpiry: string | undefined, months: number) => {
    try {
      const resp: any = await api.adminRenewPlan(userId, months);
      if (!resp.ok) throw new Error(resp.error);

      const newExpiryDate = resp.data.newExpiryDate.replace(' ', 'T');
      setAllUsers(prev => prev.map(u => u.id === userId ? {
        ...u,
        planExpiresAt: newExpiryDate,
        accountStatus: 'active'
      } : u));

      return true;
    } catch (e: any) {
      showToast("Erro ao renovar plano.", "error");
      return false;
    }
  };

  const handleAddUser = async (userData: any): Promise<boolean> => {
    try {
      const resp: any = await api.adminCreateUser(userData);
      if (!resp.ok) throw new Error(resp.error);

      showToast("Profissional criado com sucesso!");
      await fetchAllData(session.user.id, 'admin');
      return true;
    } catch (e: any) {
      showToast(e.message || "Erro ao processar cadastro.", "error");
      return false;
    }
  };

  const handleUpdateAccount = async (u: Partial<AccountInfo>) => {
    try {
      if (Object.keys(u).length === 0) {
        showToast("Configurações salvas!");
        return;
      }
      // Need to implement updateProfile in api.ts
      const resp: any = await api.updateProfile(u as any);
      if (resp.ok) {
        setProfile(prev => prev ? { ...prev, ...u } : null);
        showToast("Configurações salvas!");
      } else {
        throw new Error(resp.error);
      }
    } catch (e: any) {
      showToast("Erro ao salvar perfil.", "error");
    }
  };

  const handleUpdateServices = async (s: Service[]) => {
    const previous = services;
    try {
      setServices(s);
      const resp: any = await api.saveServices(s);
      if (!resp.ok) {
        setServices(previous);
        throw new Error(resp.error);
      }
      showToast("Serviços atualizados!");
    } catch (e: any) {
      setServices(previous);
      showToast("Erro ao salvar serviços.", "error");
    }
  };


  const handleUpdateStatus = async (id: number, s: AppointmentStatus) => {
    try {
      const resp: any = await api.updateAppointmentStatus(id, s);
      if (resp.ok) {
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: s } : a));
        showToast("Status atualizado!");
      } else {
        throw new Error(resp.error);
      }
    } catch (e) {
      showToast("Erro ao atualizar status.", "error");
    }
  };

  const handleUpdateAvailability = async (payload: any) => {
    console.log('📤 Enviando disponibilidade:', JSON.stringify(payload, null, 2));
    try {
      const resp: any = await api.saveAvailability(payload);
      if (resp.ok) {
        const normalized = {
          workingHours: mapWorkingHours(payload.workingHours),
          blockedDates: payload.blockedDates,
          intervalMinutes: payload.intervalMinutes,
          availableMonths: payload.availableMonths
        };
        console.log('✅ Disponibilidade salva e normalizada:', JSON.stringify(normalized, null, 2));
        setAvailability(normalized);
        showToast("Agenda atualizada!");
      } else {
        throw new Error(resp.error);
      }
    } catch (e: any) {
      showToast("Erro ao salvar agenda.", "error");
    }
  };

  const handleDeleteAppointment = async (id: number) => {
    try {
      const resp: any = await api.deleteAppointment(id);
      if (!resp.ok) throw new Error(resp.error);
      setAppointments(prev => prev.filter(a => a.id !== id));
      showToast("Agendamento excluído.");
    } catch (e: any) {
      showToast("Erro ao excluir agendamento.", "error");
    }
  };

  const handleBulkDeleteAppointments = async (ids: number[]) => {
    try {
      const resp: any = await api.bulkDeleteAppointments(ids);
      if (!resp.ok) throw new Error(resp.error);
      setAppointments(prev => prev.filter(a => !ids.includes(a.id)));
      showToast(`${ids.length} agendamentos excluídos.`);
    } catch (e: any) {
      showToast(e.message || "Erro ao excluir agendamentos em massa.", "error");
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const resp: any = await api.adminDeleteUser(id);
      if (!resp.ok) throw new Error(resp.error);
      setAllUsers(prev => prev.filter(u => u.id !== id));
      showToast("Profissional removido.");
    } catch (e: any) {
      showToast("Erro ao remover profissional.", "error");
    }
  };

  const handleLogin = async (email: string, pass: string) => {
    try {
      const resp: any = await api.login({ email, password: pass });
      if (resp.ok) {
        if (resp.data.token) {
          localStorage.setItem('cpagenda_token', resp.data.token);
        }
        showToast(`Bem-vindo, ${resp.data.user.name}!`);
        await handleAuthCheck();
      } else {
        throw new Error(resp.error || 'Credenciais inválidas');
      }
    } catch (e: any) {
      showToast(e.message || "Erro ao entrar.", "error");
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('cpagenda_token');
      await api.logout();
      clearAllStates(); // ✅ QUALITY FIX: Clear all local state on logout to prevent data leakage
      setSession(null);
      showToast("Até logo!");
    } catch (e) {
      console.error("Erro logout:", e);
      setSession(null); // Ensure logout on any error
    }
  };


  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-xl"></div>
        <p className="text-gray-900 font-black text-[11px] uppercase tracking-widest">CP Agenda Pro</p>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {isGuestMode ? (
        profile ? (
          (profile.status === 'blocked' || profile.status === 'expired') ? (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
              <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full mx-4">
                <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Lock size={40} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Página Indisponível</h2>
                <p className="text-gray-500 mb-6">Esta página de agendamentos está temporariamente suspensa.</p>
                <a href="/" className="text-primary font-bold hover:underline">Voltar ao início</a>
              </div>
            </div>
          ) : (
            <PublicBookingPage
              {...profile}
              services={services}
              availability={availability}
              appointments={appointments}
              busyAppointments={publicBusyAppointments}
              onBook={handleBookAppointment}
              onBack={() => window.location.href = '/'}
            />
          )
        ) : (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center p-8">
              <h2 className="text-xl font-bold text-gray-800 mb-2">Página não encontrada</h2>
              <p className="text-gray-500 mb-6">O link que você acessou pode estar incorreto ou expirou.</p>
              <a href="/" className="text-primary hover:underline font-bold">Ir para o início</a>
            </div>
          </div>
        )
      ) : !session ? (
        <LoginScreen onLogin={handleLogin} />
      ) : (userRole === 'client' && currentAccountStatus !== 'active') ? (
        <BlockedScreen
          reason={blockedReason || "Sua assinatura expirou ou seu acesso foi suspenso."}
          onLogout={handleLogout}
        />
      ) : mustChangePassword ? (
        <ForcePasswordChange
          onPasswordChanged={async (p) => {
            try {
              const resp: any = await api.changePassword(p);
              if (!resp.ok) throw new Error(resp.error);
              setMustChangePassword(false);
              showToast('Senha alterada!');
            } catch (err: any) {
              showToast(err.message || 'Erro ao alterar senha.', 'error');
            }
          }}
          onLogout={handleLogout}
        />
      ) : (userRole === 'admin' || userRole === 'super_admin') ? (
        <AdminDashboard
          users={allUsers}
          onAddUser={handleAddUser}
          onUpdateUserStatus={handleUpdateUserStatus}
          onUpdateAdminUser={handleUpdateAdminUser}
          onRenewPlan={handleRenewPlan}
          onDeleteUser={handleDeleteUser}
          onLogout={handleLogout}
          showToast={showToast}
        />
      ) : profile ? (
        <>
          <ClientDashboard
            account={profile}
            appointments={appointments}
            services={services}
            availability={availability}
            onLogout={handleLogout}
            onOpenPublic={() => window.open(profile.publicLink, '_blank')}
            onUpdateStatus={handleUpdateStatus}
            onDeleteAppointment={handleDeleteAppointment}
            onBulkDelete={handleBulkDeleteAppointments}
            onUpdateServices={handleUpdateServices}
            onUpdateAvailability={handleUpdateAvailability}
            onUpdateAccount={handleUpdateAccount}
            onUpdateAppointments={setAppointments}
          />
          {/* 🔥 ONBOARDING MODAL moved here to be inside the fragment */}
          {(!mustChangePassword && currentAccountStatus === 'active') && (
            <OnboardingModal
              seen={!!profile.onboardingSeen}
              onMarkSeen={async () => {
                console.log('🎯 Onboarding seen');
                setProfile(prev => prev ? { ...prev, onboardingSeen: true } : null);
                try {
                  const resp: any = await api.updateOnboarding(true);
                  if (!resp.ok) {
                    setProfile(prev => prev ? { ...prev, onboardingSeen: false } : null);
                    showToast("Erro ao salvar configuração.", "error");
                  }
                } catch (e) {
                  console.error('❌ Erro onboarding:', e);
                  showToast("Erro ao salvar configuração.", "error");
                }
              }}
            />
          )}
        </>
      ) : (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-xl"></div>
            <p className="text-gray-900 font-black text-[11px] uppercase tracking-widest text-center">
              Quase lá...<br />
              <span className="text-[9px] text-gray-400 font-medium">Carregando painel de controle</span>
            </p>
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
}

export default App;