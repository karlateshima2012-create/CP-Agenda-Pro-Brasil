import React, { useState } from 'react';
import { User, PlanType, AccountStatus } from '../types';
import {
  Users, Lock, Unlock, Trash2, LogOut, CheckCircle,
  X, RefreshCw, Clock, AlertTriangle, Activity, Briefcase, Save, Edit2, User as UserIcon, Calendar, Copy, ExternalLink, Upload,
  AlertCircle, TrendingDown, Shield, MessageSquare, ChevronDown,
  TrendingUp, BarChart2, DollarSign, Zap, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import { Logo } from './Logo';

interface Props {
  users: User[];
  onAddUser: (user: any) => Promise<boolean>;
  onUpdateAdminUser: (userId: string, data: Partial<User>) => Promise<boolean>;
  onUpdateUserStatus: (id: string, status: AccountStatus) => void;
  onRenewPlan: (userId: string, currentExpiry: string | undefined, months: number) => Promise<boolean>;
  onDeleteUser: (id: string) => void;
  onLogout: () => void;
  showToast?: (message: string, type?: any) => void;
}

type HealthStatus = 'critical' | 'risk' | 'healthy';
type HealthFilter = 'all' | 'critical' | 'risk' | 'healthy';

export const AdminDashboard: React.FC<Props> = ({ users, onAddUser, onUpdateAdminUser, onUpdateUserStatus, onRenewPlan, onDeleteUser, onLogout, showToast }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdUser, setCreatedUser] = useState<any | null>(null);
  const [detailsUser, setDetailsUser] = useState<User | null>(null);
  const [renewalPeriod, setRenewalPeriod] = useState<number>(0);
  const [isRenewingInModal, setIsRenewingInModal] = useState(false);
  const [editData, setEditData] = useState<Partial<User>>({});
  const [editInvoices, setEditInvoices] = useState<any[]>([]);
  const [manualExpiryDate, setManualExpiryDate] = useState<string>('');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
  const [activeMainTab, setActiveMainTab] = useState<'clients' | 'billing'>('clients');

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    companyName: '',
    ownerName: '',
    contactPhone: '',
    planType: '6m' as PlanType
  });

  const now = new Date();
  const nowMs = now.getTime();
  const dayInMs = 24 * 60 * 60 * 1000;

  // ── Saúde por cliente ──────────────────────────────────────────────────────
  const daysAgo = (iso?: string | null): number => {
    if (!iso) return 9999;
    return Math.floor((nowMs - new Date(iso).getTime()) / dayInMs);
  };

  const getHealth = (c: User): HealthStatus => {
    const accountAge  = daysAgo(c.createdAt);
    const sinceAccess = daysAgo(c.lastAccessAt);
    const sinceAppt   = daysAgo(c.lastAppointmentAt);
    const planLeft    = c.planExpiresAt
      ? Math.floor((new Date(c.planExpiresAt).getTime() - nowMs) / dayInMs)
      : 0;
    const services = c.servicesCount ?? 0;

    // 🔴 Crítico: sinais reais de abandono
    if (services === 0) return 'critical';                                       // sem serviços ativos = não pode receber agendamentos
    if (c.lastAccessAt && sinceAccess > 45) return 'critical';                   // sem entrar no painel há 45+ dias (só avalia se tiver dado)
    if (accountAge > 30 && sinceAppt > 90) return 'critical';                    // conta madura sem agendamento confirmado há 90d

    // 🟡 Em Risco: atenção necessária (sem penalizar clientes novas ou sem histórico ainda)
    if (c.lastAccessAt && sinceAccess > 20) return 'risk';                       // sem entrar no painel há 20+ dias
    if (accountAge > 14 && sinceAppt > 45) return 'risk';                        // sem agendamento há 45d (após período de onboarding)
    if (planLeft < 15) return 'risk';                                            // plano vence em menos de 15 dias

    return 'healthy';
  };

  const healthDot: Record<HealthStatus, string> = {
    critical: '🔴',
    risk:     '🟡',
    healthy:  '🟢',
  };

  const healthLabel: Record<HealthStatus, string> = {
    critical: 'Crítico',
    risk:     'Em Risco',
    healthy:  'Saudável',
  };

  // ── Ordenação e filtros ────────────────────────────────────────────────────
  const sortedClients = [...(users || []).filter(u => u && u.email !== 'suporte@creativeprintjp.com')].sort((a, b) => {
    const getStatusWeight = (u: User) => {
      const isExp = u.planExpiresAt && new Date(u.planExpiresAt).getTime() < nowMs;
      if (u.accountStatus === 'blocked') return 2;
      if (isExp) return 1;
      return 0;
    };
    const weightDiff = getStatusWeight(a) - getStatusWeight(b);
    if (weightDiff !== 0) return weightDiff;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  const filteredClients = healthFilter === 'all'
    ? sortedClients
    : sortedClients.filter(c => getHealth(c) === healthFilter);

  // ── Métricas de topo ───────────────────────────────────────────────────────
  const expire3d     = sortedClients.filter(c => { if (!c.planExpiresAt) return false; const diff = new Date(c.planExpiresAt).getTime() - nowMs; return diff > 0 && diff <= 3 * dayInMs; }).length;
  const expire7d     = sortedClients.filter(c => { if (!c.planExpiresAt) return false; const diff = new Date(c.planExpiresAt).getTime() - nowMs; return diff > 3 * dayInMs && diff <= 7 * dayInMs; }).length;
  const activeClients = sortedClients.filter(c => c.accountStatus === 'active').length;
  const expiredPlans  = sortedClients.filter(c => { if (!c.planExpiresAt) return false; const exp = new Date(c.planExpiresAt); exp.setHours(0,0,0,0); const t = new Date(); t.setHours(0,0,0,0); return exp.getTime() <= t.getTime(); }).length;
  const criticalCount = sortedClients.filter(c => getHealth(c) === 'critical').length;
  const riskCount     = sortedClients.filter(c => getHealth(c) === 'risk').length;

  // ── Métricas financeiras (Faturamento) ────────────────────────────────────
  const PRICE_MONTHLY    = 1280;
  const PRICE_ANNUAL     = 12800;
  const PRICE_ANNUAL_MRR = PRICE_ANNUAL / 12; // R$1.066,67
  const activeList = sortedClients.filter(c => c.accountStatus === 'active');
  const clientMRR  = (c: User) => c.planType === '12m' ? PRICE_ANNUAL_MRR : PRICE_MONTHLY;

  const mrr  = activeList.reduce((s, c) => s + clientMRR(c), 0);
  const arr  = mrr * 12;
  const arpu = activeList.length > 0 ? mrr / activeList.length : 0;

  // Churn — planos vencidos nos últimos 30 dias
  const thirtyDaysAgo  = new Date(nowMs - 30 * dayInMs);
  const recentlyExpired = sortedClients.filter(c => {
    if (!c.planExpiresAt) return false;
    const exp = new Date(c.planExpiresAt);
    return exp >= thirtyDaysAgo && exp <= now && c.accountStatus !== 'active';
  });
  const churnedMRR = recentlyExpired.reduce((s, c) => s + clientMRR(c), 0);
  const churnBase  = activeList.length + recentlyExpired.length;
  const churnRate  = churnBase > 0 ? recentlyExpired.length / churnBase : 0;

  // LTV — cap 24 meses se churn = 0 (sistema novo)
  const ltv = churnRate > 0 ? arpu / churnRate : arpu * 24;

  // Net New MRR (este mês)
  const monthStart     = new Date(now.getFullYear(), now.getMonth(), 1);
  const newThisMonth   = sortedClients.filter(c => c.createdAt && new Date(c.createdAt) >= monthStart);
  const newMRRThisMonth = newThisMonth.reduce((s, c) => s + clientMRR(c), 0);
  const netNewMRR      = newMRRThisMonth - churnedMRR;

  // Receita em risco por janela de vencimento
  const mrrAtRisk = (minD: number, maxD: number) =>
    activeList.filter(c => {
      if (!c.planExpiresAt) return false;
      const diff = (new Date(c.planExpiresAt).getTime() - nowMs) / dayInMs;
      return diff >= minD && diff < maxD;
    });
  const risk30List = mrrAtRisk(0, 30);
  const risk60List = mrrAtRisk(30, 60);
  const risk90List = mrrAtRisk(60, 90);
  const risk30MRR  = risk30List.reduce((s, c) => s + clientMRR(c), 0);
  const risk60MRR  = risk60List.reduce((s, c) => s + clientMRR(c), 0);
  const risk90MRR  = risk90List.reduce((s, c) => s + clientMRR(c), 0);

  // Distribuição de planos
  const planDistribution = (['1m','3m','6m','12m'] as PlanType[]).map(pt => {
    const list = activeList.filter(c => c.planType === pt);
    return {
      label: pt === '1m' ? 'Mensal' : pt === '3m' ? 'Trimestral' : pt === '6m' ? 'Semestral' : 'Anual',
      pt, count: list.length,
      mrr: list.reduce((s, c) => s + clientMRR(c), 0),
    };
  }).filter(d => d.count > 0);
  const annualPct = activeList.length > 0
    ? Math.round((activeList.filter(c => c.planType === '12m').length / activeList.length) * 100)
    : 0;

  // Projeção 6 meses — usa média real de novos clientes dos últimos 3 meses
  const avgNewPerMonth = (() => {
    const counts = [1, 2, 3].map(n => {
      const s = new Date(now.getFullYear(), now.getMonth() - n, 1);
      const e = new Date(now.getFullYear(), now.getMonth() - n + 1, 0);
      return sortedClients.filter(c => c.createdAt && new Date(c.createdAt) >= s && new Date(c.createdAt) <= e).length;
    });
    return counts.reduce((a, b) => a + b, 0) / 3;
  })();
  const projection = Array.from({ length: 6 }, (_, i) => {
    const projClients = Math.max(0,
      activeList.length * Math.pow(1 - churnRate, i + 1) + avgNewPerMonth * (i + 1)
    );
    return { month: i + 1, mrr: Math.round(projClients * (arpu || PRICE_MONTHLY)) };
  });
  const maxProjMRR = Math.max(...projection.map(p => p.mrr), mrr, 1);

  // MoM growth
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0);
  const newLastMonth   = sortedClients.filter(c =>
    c.createdAt && new Date(c.createdAt) >= lastMonthStart && new Date(c.createdAt) <= lastMonthEnd
  ).length;
  const momGrowth = newLastMonth > 0
    ? ((newThisMonth.length - newLastMonth) / newLastMonth) * 100
    : (newThisMonth.length > 0 ? 100 : 0);

  // Helper moeda
  const brl = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;
  const monthName = (offset: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return d.toLocaleDateString('pt-BR', { month: 'short' });
  };

  // ── Completude de perfil (0-5) ─────────────────────────────────────────────
  const profileScore = (c: User) =>
    (c.hasProfileImage ? 1 : 0) +
    (c.hasCoverImage   ? 1 : 0) +
    (c.hasDescription  ? 1 : 0) +
    (c.hasTelegram     ? 1 : 0) +
    ((c.servicesCount ?? 0) > 0 ? 1 : 0);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatDaysAgo = (iso?: string | null) => {
    if (!iso) return 'Nunca';
    const d = daysAgo(iso);
    if (d === 0) return 'Hoje';
    if (d === 1) return '1 dia atrás';
    return `${d} dias atrás`;
  };

  const getPreviewExpiryDate = () => {
    const baseDateStr = manualExpiryDate || detailsUser?.planExpiresAt;
    if (!baseDateStr) return '---';
    const baseDate = new Date(baseDateStr);
    const dateToRenewFrom = baseDate < now ? now : baseDate;
    const newDate = new Date(dateToRenewFrom);
    newDate.setMonth(newDate.getMonth() + renewalPeriod);
    return newDate.toLocaleDateString('pt-BR');
  };

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let pass = "";
    for (let i = 0; i < 10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setNewUser(prev => ({ ...prev, password: pass }));
  };

  const handleOpenDetails = (user: User) => {
    setDetailsUser(user);
    setRenewalPeriod(0);
    setEditData({ companyName: user.companyName, ownerName: user.ownerName, contactPhone: user.contactPhone, email: user.email, planType: user.planType });
    setEditInvoices(user.invoices || []);
    if (user.planExpiresAt) {
      const date = new Date(user.planExpiresAt);
      setManualExpiryDate(`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`);
    } else {
      setManualExpiryDate('');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const expiresAt = new Date();
    const months = newUser.planType === '12m' ? 12 : newUser.planType === '6m' ? 6 : newUser.planType === '3m' ? 3 : 1;
    expiresAt.setMonth(expiresAt.getMonth() + months);
    const userData = { email: (newUser.email || '').trim().toLowerCase(), password: newUser.password.trim(), companyName: newUser.companyName.trim(), ownerName: newUser.ownerName.trim(), contactPhone: newUser.contactPhone.trim(), planType: newUser.planType, planExpiresAt: expiresAt.toISOString() };
    const success = await onAddUser(userData);
    if (success) { setShowAddForm(false); setCreatedUser(userData); setNewUser({ email: '', password: '', companyName: '', ownerName: '', contactPhone: '', planType: '6m' }); }
    setIsSubmitting(false);
  };

  const openWhatsAppMessage = () => {
    if (!createdUser) return;
    const baseUrl = window.location.origin;
    let phone = createdUser.contactPhone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = phone.substring(1);
    const cleanPhone = phone.startsWith('81') ? phone : '81' + phone;
    const message = `*Sua agenda profissional está pronta*\n\nO acesso ao CP Agenda Pro já foi criado para você.\n\n🌐 *Site Oficial:*\nhttps://saibamaiscpagendapro.creativeprintjp.com/\n(Basta clicar em 'Login' para acessar seu painel)\n\n🔗 *Link Direto do Sistema:*\n${baseUrl}\n\n📧 *E-mail:*\n${createdUser.email}\n\n🔑 *Senha Provisória:*\n${createdUser.password}\n\nNo primeiro acesso, o sistema irá redirecionar automaticamente para a alteração de senha, que é obrigatória para sua segurança.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSaveModalUpdates = async () => {
    if (!detailsUser) return;
    setIsRenewingInModal(true);
    const updateData: Partial<User> = { companyName: editData.companyName, ownerName: editData.ownerName, contactPhone: editData.contactPhone, email: editData.email, planType: editData.planType, invoices: editInvoices };
    if (manualExpiryDate) { const d = new Date(manualExpiryDate); d.setHours(23,59,59,999); updateData.planExpiresAt = d.toISOString(); }
    const updateSuccess = await onUpdateAdminUser(detailsUser.id, updateData);
    let renewalSuccess = true;
    if (renewalPeriod > 0) renewalSuccess = await onRenewPlan(detailsUser.id, manualExpiryDate || detailsUser.planExpiresAt, renewalPeriod);
    setIsRenewingInModal(false);
    if (updateSuccess && renewalSuccess) { if (showToast) showToast("Dados atualizados com sucesso!"); setDetailsUser(null); }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b border-gray-200 p-6 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3"><Logo size="md" /></div>
          <button onClick={onLogout} className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-100 transition-all">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </header>

      {/* ── Navegação de abas ── */}
      <div className="bg-white border-b border-gray-200 sticky top-[73px] z-30">
        <div className="max-w-7xl mx-auto px-6 flex gap-1">
          {([
            { id: 'clients', label: 'Clientes',    Icon: Users },
            { id: 'billing', label: 'Faturamento', Icon: TrendingUp },
          ] as { id: 'clients' | 'billing'; label: string; Icon: any }[]).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveMainTab(id)}
              className={`flex items-center gap-2 px-5 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
                activeMainTab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>

      {activeMainTab === 'clients' && (
      <main className="max-w-7xl mx-auto p-6">

        {/* ── Cards de plano ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <Clock className="text-red-500 mb-3" size={20} />
            <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Vence em 7 dias</h3>
            <p className="text-3xl font-black text-gray-900 mt-1">{expire7d}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <AlertTriangle className="text-orange-600 animate-pulse mb-3" size={20} />
            <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Vence em 3 dias</h3>
            <p className="text-3xl font-black text-gray-900 mt-1">{expire3d}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <AlertTriangle size={20} className="text-red-500 mb-3" />
            <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Plano Vencido</h3>
            <p className="text-3xl font-black text-gray-900 mt-1">{expiredPlans}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <Activity className="text-primary mb-3" size={20} />
            <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Ativos</h3>
            <p className="text-3xl font-black text-primary mt-1">{activeClients}</p>
          </div>
        </div>

        {/* ── Cards de saúde ── */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100 shadow-sm flex items-center gap-5">
            <div className="bg-red-100 p-3 rounded-2xl text-red-500 shrink-0"><AlertCircle size={22} /></div>
            <div>
              <h3 className="text-red-400 text-[10px] font-black uppercase tracking-widest">🔴 Críticas</h3>
              <p className="text-3xl font-black text-red-600 mt-0.5">{criticalCount}</p>
              <p className="text-[9px] text-red-400 font-bold mt-0.5">sem serviços · sem acesso ao painel 45d · sem agendamento 90d (conta &gt; 30d)</p>
            </div>
          </div>
          <div className="bg-yellow-50 p-6 rounded-[2rem] border border-yellow-100 shadow-sm flex items-center gap-5">
            <div className="bg-yellow-100 p-3 rounded-2xl text-yellow-600 shrink-0"><TrendingDown size={22} /></div>
            <div>
              <h3 className="text-yellow-600 text-[10px] font-black uppercase tracking-widest">🟡 Em Risco</h3>
              <p className="text-3xl font-black text-yellow-700 mt-0.5">{riskCount}</p>
              <p className="text-[9px] text-yellow-600 font-bold mt-0.5">sem acesso ao painel 20d · sem agendamento 45d (após 14d de conta) · plano vence &lt;15d</p>
            </div>
          </div>
        </div>

        {/* ── Cabeçalho da lista ── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <Users size={24} className="text-primary" /> Clientes Profissionais ({filteredClients.length}{healthFilter !== 'all' ? ` de ${sortedClients.length}` : ''})
          </h2>
          <button type="button" onClick={() => setShowAddForm(true)} className="bg-primary text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all">
            Novo Profissional
          </button>
        </div>

        {/* ── Tabs de filtro por saúde ── */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {([
            { key: 'all',      label: 'Todas',      active: 'bg-primary text-white',     inactive: 'bg-white text-gray-500 border border-gray-200' },
            { key: 'critical', label: '🔴 Crítico',  active: 'bg-red-600 text-white',     inactive: 'bg-white text-red-500 border border-red-100' },
            { key: 'risk',     label: '🟡 Em Risco', active: 'bg-yellow-500 text-white',  inactive: 'bg-white text-yellow-600 border border-yellow-100' },
            { key: 'healthy',  label: '🟢 Saudável', active: 'bg-green-600 text-white',   inactive: 'bg-white text-green-600 border border-green-100' },
          ] as { key: HealthFilter; label: string; active: string; inactive: string }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setHealthFilter(tab.key)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm ${healthFilter === tab.key ? tab.active : tab.inactive}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tabela de clientes ── */}
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Empresa / Responsável</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status / Vencimento</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Atividade</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredClients.map(client => {
                  const isActive = client.accountStatus === 'active';
                  const health   = getHealth(client);
                  return (
                    <tr key={client.id} className="hover:bg-gray-50/50 transition-colors group">

                      {/* Coluna 1: Empresa + semáforo + último acesso */}
                      <td className="px-8 py-6">
                        <div className="flex items-start gap-3">
                          <span className="text-lg mt-0.5 shrink-0" title={healthLabel[health]}>{healthDot[health]}</span>
                          <div className="flex flex-col min-w-0">
                            <p className="font-black text-gray-900 uppercase text-sm truncate">{client.companyName}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <UserIcon size={10} className="text-primary shrink-0" />
                              <p className="text-[10px] text-gray-500 font-bold truncate">{client.ownerName || 'Não informado'}</p>
                            </div>
                            <p className="text-[9px] text-gray-300 font-bold mt-0.5 truncate">{client.email}</p>
                            <p className="text-[9px] text-gray-400 font-bold mt-1">
                              🕐 {formatDaysAgo(client.lastAccessAt)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Coluna 2: Status / Vencimento */}
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1.5">
                          {(() => {
                            const exp = new Date(client.planExpiresAt || 0);
                            const diff = exp.getTime() - nowMs;
                            const isExpired = exp.getTime() <= nowMs;
                            const isUrgent3d = diff > 0 && diff <= 3 * dayInMs;
                            const isUrgent7d = diff > 3 * dayInMs && diff <= 7 * dayInMs;
                            let bgColor = "bg-gray-50", textColor = "text-gray-500", borderColor = "border-gray-100", label = "VENCIMENTO";
                            if (isExpired)   { bgColor = "bg-red-600";    textColor = "text-white";      borderColor = "border-red-700";    label = "VENCIDO"; }
                            else if (isUrgent3d) { bgColor = "bg-orange-500"; textColor = "text-white";  borderColor = "border-orange-600"; label = "URGENTE: 3 DIAS"; }
                            else if (isUrgent7d) { bgColor = "bg-yellow-400"; textColor = "text-gray-900"; borderColor = "border-yellow-500"; label = "ATENÇÃO: 7 DIAS"; }
                            return (
                              <span className={`${bgColor} ${textColor} px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border ${borderColor} w-fit flex items-center gap-2 shadow-sm`}>
                                📅 {label}: {client.planExpiresAt ? new Date(client.planExpiresAt).toLocaleDateString('pt-BR') : '---'}
                              </span>
                            );
                          })()}
                        </div>
                      </td>

                      {/* Coluna 3: Atividade (agendamentos + serviços) */}
                      <td className="px-8 py-6 text-center">
                        <div className="inline-flex flex-col items-center p-3 bg-gray-50 rounded-2xl border border-gray-100 min-w-[130px] gap-1">
                          <span className="text-xl font-black text-primary">{client.appointmentCount || 0}</span>
                          <span className="text-[8px] text-gray-400 font-black uppercase tracking-widest">total</span>
                          <div className="w-full border-t border-gray-100 pt-1.5 mt-0.5 flex justify-center gap-1 items-baseline">
                            <span className="text-sm font-black text-gray-700">{client.appointmentsLast30Days ?? 0}</span>
                            <span className="text-[8px] text-gray-400 font-bold">últ. 30d</span>
                          </div>
                          <div className={`text-[9px] font-black mt-0.5 ${(client.servicesCount ?? 0) === 0 ? 'text-red-500' : 'text-gray-500'}`}>
                            {client.servicesCount ?? 0} serviço{(client.servicesCount ?? 0) !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </td>

                      {/* Coluna 4: Ações */}
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/?p=${client.id}`); if (showToast) showToast("Link público copiado!"); }} className="p-2.5 text-blue-500 bg-white border border-gray-200 hover:bg-blue-50 rounded-xl transition-all shadow-sm" title="Copiar Link Público">
                            <Copy size={16} />
                          </button>
                          <button onClick={() => handleOpenDetails(client)} className="p-2.5 text-gray-500 bg-white border border-gray-200 hover:text-primary rounded-xl transition-all shadow-sm" title="Editar Profissional">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => onUpdateUserStatus(client.id, isActive ? 'blocked' : 'active')} className={`p-2.5 rounded-xl border transition-all shadow-sm ${isActive ? 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'}`}>
                            {isActive ? <Unlock size={16} /> : <Lock size={16} />}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setUserToDelete(client); }} className="p-2.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shadow-sm" title="Excluir Profissional">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      )} {/* fim aba Clientes */}

      {/* ══════════════════════════════════════════════════════════════
          ABA: FATURAMENTO
      ══════════════════════════════════════════════════════════════ */}
      {activeMainTab === 'billing' && (
      <main className="max-w-7xl mx-auto p-6 space-y-8">

        {/* Bloco 1 — KPIs principais */}
        <div>
          <h2 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2"><TrendingUp size={20} className="text-primary" /> Receita Recorrente</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'MRR', sub: 'Receita Recorrente Mensal', value: brl(mrr), color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/10' },
              { label: 'ARR', sub: 'Receita Recorrente Anual', value: brl(arr), color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
              { label: 'Churn Rate', sub: 'Clientes perdidos / mês', value: `${(churnRate * 100).toFixed(1)}%`, color: churnRate > 0.05 ? 'text-red-600' : churnRate > 0.02 ? 'text-yellow-600' : 'text-green-600', bg: churnRate > 0.05 ? 'bg-red-50' : 'bg-gray-50', border: churnRate > 0.05 ? 'border-red-100' : 'border-gray-100' },
              { label: 'LTV', sub: 'Valor vitalício médio', value: brl(ltv), color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
            ].map(k => (
              <div key={k.label} className={`${k.bg} border ${k.border} p-6 rounded-[2rem]`}>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">{k.label}</p>
                <p className={`text-3xl font-black ${k.color} mt-1`}>{k.value}</p>
                <p className="text-[9px] text-gray-400 font-bold mt-2">{k.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bloco 2 — KPIs secundários */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm">
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">ARPU</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{brl(arpu)}<span className="text-sm text-gray-400 font-bold">/mês</span></p>
            <p className="text-[9px] text-gray-400 font-bold mt-2">Receita média por cliente ativo</p>
          </div>
          <div className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm">
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Net New MRR</p>
            <div className="flex items-center gap-2 mt-1">
              {netNewMRR > 0 ? <ArrowUpRight size={20} className="text-green-500" /> : netNewMRR < 0 ? <ArrowDownRight size={20} className="text-red-500" /> : <Minus size={20} className="text-gray-400" />}
              <p className={`text-2xl font-black ${netNewMRR > 0 ? 'text-green-600' : netNewMRR < 0 ? 'text-red-600' : 'text-gray-500'}`}>{brl(Math.abs(netNewMRR))}</p>
            </div>
            <p className="text-[9px] text-gray-400 font-bold mt-2">Novo MRR − Churn MRR este mês</p>
          </div>
          <div className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm">
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Plano Anual</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{annualPct}%<span className="text-sm text-gray-400 font-bold ml-1">dos ativos</span></p>
            <p className="text-[9px] text-gray-400 font-bold mt-2">% de clientes no plano anual</p>
          </div>
          <div className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm">
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Novos este mês</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-black text-gray-900">+{newThisMonth.length}</p>
              {momGrowth !== 0 && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${momGrowth > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {momGrowth > 0 ? '+' : ''}{momGrowth.toFixed(0)}% MoM
                </span>
              )}
            </div>
            <p className="text-[9px] text-gray-400 font-bold mt-2">Clientes captados em {monthName(0)}</p>
          </div>
        </div>

        {/* Bloco 3 — Receita em risco */}
        <div>
          <h2 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2"><AlertCircle size={20} className="text-orange-500" /> Receita em Risco (planos vencendo)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Próximos 30 dias', list: risk30List, mrrVal: risk30MRR, bg: 'bg-red-50', border: 'border-red-100', color: 'text-red-600', dot: '🔴' },
              { label: '31 a 60 dias',     list: risk60List, mrrVal: risk60MRR, bg: 'bg-yellow-50', border: 'border-yellow-100', color: 'text-yellow-700', dot: '🟡' },
              { label: '61 a 90 dias',     list: risk90List, mrrVal: risk90MRR, bg: 'bg-gray-50', border: 'border-gray-100', color: 'text-gray-600', dot: '⚪' },
            ].map(r => (
              <div key={r.label} className={`${r.bg} border ${r.border} p-6 rounded-[2rem]`}>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{r.dot} {r.label}</p>
                <p className={`text-2xl font-black ${r.color} mt-1`}>{brl(r.mrrVal)}</p>
                <p className="text-[9px] text-gray-400 font-bold mt-2">{r.list.length} cliente{r.list.length !== 1 ? 's' : ''} · MRR em risco</p>
                {r.list.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {r.list.slice(0, 4).map(c => (
                      <span key={c.id} className="text-[8px] font-black bg-white/70 px-2 py-0.5 rounded-full text-gray-600 border border-gray-200 truncate max-w-[100px]">{c.companyName}</span>
                    ))}
                    {r.list.length > 4 && <span className="text-[8px] font-black text-gray-400">+{r.list.length - 4}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bloco 4 — Projeção MRR 6 meses */}
        <div className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-xl font-black text-gray-800 flex items-center gap-2"><BarChart2 size={20} className="text-primary" /> Projeção MRR — 6 meses</h2>
              <p className="text-[10px] text-gray-400 font-bold mt-1">Baseada em média de <b>{avgNewPerMonth.toFixed(1)}</b> novos clientes/mês (últimos 3 meses) e churn de <b>{(churnRate * 100).toFixed(1)}%</b></p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">MRR atual</p>
              <p className="text-xl font-black text-primary">{brl(mrr)}</p>
            </div>
          </div>
          <div className="flex items-end gap-3 h-48">
            {/* Barra atual */}
            <div className="flex flex-col items-center gap-2 flex-1">
              <p className="text-[9px] font-black text-primary">{brl(mrr)}</p>
              <div className="w-full rounded-t-xl bg-primary" style={{ height: `${Math.max(4, (mrr / maxProjMRR) * 100)}%` }} />
              <p className="text-[9px] font-bold text-gray-500 uppercase">Agora</p>
            </div>
            {/* Barras projetadas */}
            {projection.map((p) => (
              <div key={p.month} className="flex flex-col items-center gap-2 flex-1">
                <p className="text-[9px] font-black text-gray-500">{brl(p.mrr)}</p>
                <div className="w-full rounded-t-xl bg-primary/30" style={{ height: `${Math.max(4, (p.mrr / maxProjMRR) * 100)}%` }} />
                <p className="text-[9px] font-bold text-gray-400 uppercase">{monthName(p.month)}</p>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-gray-300 font-bold mt-4 text-center uppercase tracking-widest">* Projeção estimada. Não considera variações de preço ou campanhas.</p>
        </div>

        {/* Bloco 5 — Distribuição de planos */}
        <div className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm">
          <h2 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2"><Zap size={20} className="text-yellow-500" /> Distribuição de Planos</h2>
          {planDistribution.length === 0 ? (
            <p className="text-gray-400 text-sm italic text-center py-8">Nenhum cliente ativo no momento.</p>
          ) : (
            <div className="space-y-4">
              {planDistribution.map(d => {
                const pct = activeList.length > 0 ? Math.round((d.count / activeList.length) * 100) : 0;
                return (
                  <div key={d.pt}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-gray-700 w-24">{d.label}</span>
                        <span className="text-[9px] font-bold text-gray-400">{d.count} cliente{d.count !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-gray-600">{brl(d.mrr)}/mês MRR</span>
                        <span className="text-[9px] font-black text-gray-400 w-8 text-right">{pct}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div className="h-2.5 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total MRR</p>
                <p className="text-xl font-black text-primary">{brl(mrr)}</p>
              </div>
            </div>
          )}
        </div>

      </main>
      )} {/* fim aba Faturamento */}

      {/* ══════════════════════════════════════════════════════════════
          MODAL: FICHA E EDIÇÃO
      ══════════════════════════════════════════════════════════════ */}
      {detailsUser && (() => {
        const health  = getHealth(detailsUser);
        const score   = profileScore(detailsUser);
        const scoreColor = score <= 2 ? 'bg-red-500' : score <= 3 ? 'bg-yellow-400' : 'bg-green-500';
        return (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[999] backdrop-blur-sm animate-fade-in overflow-hidden">
            <div className="bg-white rounded-[3rem] w-full max-w-2xl p-10 shadow-2xl border-t-8 border-primary relative flex flex-col max-h-[95vh] no-scrollbar overflow-y-auto">
              <button onClick={() => setDetailsUser(null)} className="absolute top-8 right-8 text-gray-400 hover:text-gray-900 transition-colors p-2"><X size={28} /></button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Briefcase size={32} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Ficha e Edição</h3>
                <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest mt-1">Status: {detailsUser.accountStatus}</p>
              </div>

              {/* ── Painel de Saúde da Conta ── */}
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 mb-7">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-gray-400" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saúde da Conta</p>
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full text-white ${health === 'critical' ? 'bg-red-500' : health === 'risk' ? 'bg-yellow-500' : 'bg-green-500'}`}>
                    {healthDot[health]} {healthLabel[health]}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Último Acesso (painel)',  value: formatDaysAgo(detailsUser.lastAccessAt),      alert: !!detailsUser.lastAccessAt && daysAgo(detailsUser.lastAccessAt) > 20 },
                    { label: 'Último Agend.',          value: formatDaysAgo(detailsUser.lastAppointmentAt), alert: daysAgo(detailsUser.createdAt) > 14 && daysAgo(detailsUser.lastAppointmentAt) > 45 },
                    { label: 'Agend. 30d',             value: `${detailsUser.appointmentsLast30Days ?? 0} agendamentos`, alert: (detailsUser.appointmentsLast30Days ?? 0) === 0 && daysAgo(detailsUser.createdAt) > 14 },
                    { label: 'Serviços ativos',        value: `${detailsUser.servicesCount ?? 0} cadastrados`, alert: (detailsUser.servicesCount ?? 0) === 0 },
                    { label: 'Telegram',               value: detailsUser.hasTelegram ? 'Configurado ✓' : 'Não configurado', alert: false },
                    { label: 'Total Agend.',           value: `${detailsUser.appointmentCount ?? 0} confirmados`, alert: false },
                  ].map(item => (
                    <div key={item.label} className={`p-3 rounded-xl border ${item.alert ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
                      <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${item.alert ? 'text-red-400' : 'text-gray-400'}`}>{item.label}</p>
                      <p className={`text-xs font-black ${item.alert ? 'text-red-600' : 'text-gray-700'}`}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Barra de completude do perfil */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Completude do Perfil</p>
                    <p className="text-[9px] font-black text-gray-500">{score}/5 pontos</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${scoreColor}`} style={{ width: `${(score / 5) * 100}%` }} />
                  </div>
                  <div className="flex gap-3 mt-2 flex-wrap">
                    {[
                      { label: 'Foto Perfil', ok: detailsUser.hasProfileImage },
                      { label: 'Capa',        ok: detailsUser.hasCoverImage },
                      { label: 'Descrição',   ok: detailsUser.hasDescription },
                      { label: 'Telegram',    ok: detailsUser.hasTelegram },
                      { label: 'Serviços',    ok: (detailsUser.servicesCount ?? 0) > 0 },
                    ].map(item => (
                      <span key={item.label} className={`text-[8px] font-black px-2 py-0.5 rounded-full ${item.ok ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {item.ok ? '✓' : '✗'} {item.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Campos de edição ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Admin - Cadastro</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Empresa</label>
                      <input type="text" value={editData.companyName || ''} onChange={e => setEditData({ ...editData, companyName: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:bg-white" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Responsável (Info Interna)</label>
                      <input type="text" value={editData.ownerName || ''} onChange={e => setEditData({ ...editData, ownerName: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:bg-white" placeholder="Nome do gestor" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">WhatsApp</label>
                      <input type="text" value={editData.contactPhone || ''} onChange={e => setEditData({ ...editData, contactPhone: e.target.value.replace(/\D/g, '') })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:bg-white" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">E-mail</label>
                      <input type="email" value={editData.email || ''} onChange={e => setEditData({ ...editData, email: (e.target.value || '').toLowerCase() })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:bg-white" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Assinatura</h4>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block flex items-center gap-2">
                      <Calendar size={14} className="text-primary" /> Dados da Assinatura
                    </label>
                    <div className="grid grid-cols-1 gap-3 mb-4">
                      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100/50">
                        <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1 block">Início do Plano</label>
                        <p className="text-base font-black text-blue-700">{detailsUser.createdAt ? new Date(detailsUser.createdAt).toLocaleDateString('pt-BR') : '---'}</p>
                      </div>
                      <div className="bg-red-50 p-4 rounded-2xl border border-red-100/50">
                        <label className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1 block">PRÓXIMO VENCIMENTO</label>
                        <p className="text-base font-black text-red-700">{detailsUser.planExpiresAt ? new Date(detailsUser.planExpiresAt).toLocaleDateString('pt-BR') : '---'}</p>
                      </div>
                    </div>
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Alterar Data Manualmente</label>
                    <input type="date" value={manualExpiryDate} onChange={(e) => setManualExpiryDate(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:bg-white transition-all shadow-sm" />
                  </div>
                </div>
              </div>

              {/* ── Renovação ── */}
              <div className="bg-primary/5 rounded-[2.5rem] p-8 border border-primary/10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary"><RefreshCw size={20} /></div>
                  <div>
                    <h4 className="text-lg font-black text-gray-900 tracking-tight">Renovação de Plano</h4>
                    <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest">Estender plano do profissional</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                  {[{p:0,label:'Pausa',sub:'0 meses'},{p:1,label:'Mensal',sub:'+1 Mês'},{p:3,label:'Trimestral',sub:'+3 Meses'},{p:6,label:'Semestral',sub:'+6 Meses'},{p:12,label:'Anual',sub:'+12 Meses'}].map(item => (
                    <button type="button" key={item.p} onClick={() => setRenewalPeriod(item.p)} className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${renewalPeriod === item.p ? (item.p === 0 ? 'bg-gray-900 border-gray-900 text-white shadow-lg' : 'bg-primary border-primary text-white shadow-lg') : 'bg-white border-gray-100 text-gray-400 hover:border-primary/30'}`}>
                      <span className="text-[8px] font-black uppercase mb-1">{item.label}</span>
                      <span className="text-[10px] font-black">{item.sub}</span>
                    </button>
                  ))}
                </div>
                {renewalPeriod > 0 && (
                  <div className="bg-white p-4 rounded-2xl border border-primary/20 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center"><RefreshCw size={18} /></div>
                      <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Nova data prevista</p>
                        <p className="text-base font-black text-primary">{getPreviewExpiryDate()}</p>
                      </div>
                    </div>
                    <div className="text-right"><p className="text-[9px] font-bold text-gray-500">+{renewalPeriod} meses</p></div>
                  </div>
                )}
              </div>

              {/* ── Faturas ── */}
              <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 mt-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-xl shadow-sm flex items-center justify-center text-green-600"><CheckCircle size={20} /></div>
                    <div>
                      <h4 className="text-lg font-black text-gray-900 tracking-tight">Faturas do Cliente</h4>
                      <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest">Histórico de cobranças</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const newInv = {
                        id: 'inv_' + Date.now(),
                        amount: 0,
                        dueDate: manualExpiryDate || detailsUser.planExpiresAt?.split('T')[0] || new Date().toISOString().split('T')[0],
                        status: 'pending',
                        planReference: 'Nova Cobrança'
                      };
                      setEditInvoices([newInv, ...editInvoices]);
                    }}
                    className="bg-primary/10 text-primary hover:bg-primary/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    + Adicionar Fatura
                  </button>
                </div>

                {(() => {
                  const pending = editInvoices.filter(i => i.status === 'pending');
                  const history = editInvoices.filter(i => i.status !== 'pending');
                  return (
                    <>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar pr-2">
                        {pending.length === 0 ? (
                          <p className="text-center text-gray-400 text-xs font-medium py-4">Nenhuma fatura pendente.</p>
                        ) : (
                          pending.map((inv) => {
                            const idx = editInvoices.findIndex(i => i.id === inv.id);
                            return (
                              <div key={inv.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col gap-3">
                                <div className="flex justify-between items-center">
                                  <input 
                                    type="text" 
                                    value={inv.planReference} 
                                    onChange={(e) => {
                                      const arr = [...editInvoices];
                                      arr[idx].planReference = e.target.value;
                                      setEditInvoices(arr);
                                    }}
                                    className="bg-transparent border-b border-gray-300 outline-none text-xs font-black text-gray-800 w-1/2 focus:border-primary px-1"
                                    placeholder="Ex: Renovação Trimestral"
                                  />
                                  <button 
                                    onClick={() => {
                                      const arr = editInvoices.filter(i => i.id !== inv.id);
                                      setEditInvoices(arr);
                                    }}
                                    className="text-red-400 hover:text-red-600"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                  <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Valor (R$)</label>
                                    <input 
                                      type="number" 
                                      value={inv.amount} 
                                      onChange={(e) => {
                                        const arr = [...editInvoices];
                                        arr[idx].amount = Number(e.target.value);
                                        setEditInvoices(arr);
                                      }}
                                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-1 focus:ring-primary"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Vencimento</label>
                                    <input 
                                      type="date" 
                                      value={inv.dueDate} 
                                      onChange={(e) => {
                                        const arr = [...editInvoices];
                                        arr[idx].dueDate = e.target.value;
                                        setEditInvoices(arr);
                                      }}
                                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-1 focus:ring-primary"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Status</label>
                                    <select 
                                      value={inv.status} 
                                      onChange={(e) => {
                                        const arr = [...editInvoices];
                                        arr[idx].status = e.target.value;
                                        if(e.target.value === 'paid') arr[idx].paidAt = new Date().toISOString();
                                        setEditInvoices(arr);
                                      }}
                                      className={`w-full px-3 py-2 border rounded-xl text-xs font-bold outline-none cursor-pointer ${
                                        inv.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 
                                        inv.status === 'overdue' ? 'bg-red-50 text-red-700 border-red-200' : 
                                        'bg-yellow-50 text-yellow-700 border-yellow-200'
                                      }`}
                                    >
                                      <option value="pending">Pendente</option>
                                      <option value="paid">Pago</option>
                                      <option value="overdue">Atrasado</option>
                                      <option value="canceled">Cancelado</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {history.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                          <details className="group">
                            <summary className="flex items-center justify-between cursor-pointer list-none">
                              <h5 className="text-xs font-black text-gray-500 uppercase tracking-widest">Histórico ({history.length})</h5>
                              <ChevronDown size={16} className="text-gray-400 group-open:rotate-180 transition-transform" />
                            </summary>
                            <div className="mt-4 space-y-3 max-h-[200px] overflow-y-auto no-scrollbar pr-2">
                              {history.map((inv) => {
                                const idx = editInvoices.findIndex(i => i.id === inv.id);
                                return (
                                  <div key={inv.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col gap-3 opacity-70 hover:opacity-100 transition-opacity">
                                    <div className="flex justify-between items-center">
                                      <input 
                                        type="text" 
                                        value={inv.planReference} 
                                        onChange={(e) => {
                                          const arr = [...editInvoices];
                                          arr[idx].planReference = e.target.value;
                                          setEditInvoices(arr);
                                        }}
                                        className="bg-transparent border-b border-gray-300 outline-none text-xs font-black text-gray-800 w-1/2 focus:border-primary px-1"
                                      />
                                      <button 
                                        onClick={() => {
                                          const arr = editInvoices.filter(i => i.id !== inv.id);
                                          setEditInvoices(arr);
                                        }}
                                        className="text-red-400 hover:text-red-600"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                      <div>
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Valor</label>
                                        <input 
                                          type="number" 
                                          value={inv.amount} 
                                          onChange={(e) => {
                                            const arr = [...editInvoices];
                                            arr[idx].amount = Number(e.target.value);
                                            setEditInvoices(arr);
                                          }}
                                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Vencimento</label>
                                        <input 
                                          type="date" 
                                          value={inv.dueDate} 
                                          onChange={(e) => {
                                            const arr = [...editInvoices];
                                            arr[idx].dueDate = e.target.value;
                                            setEditInvoices(arr);
                                          }}
                                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Status</label>
                                        <select 
                                          value={inv.status} 
                                          onChange={(e) => {
                                            const arr = [...editInvoices];
                                            arr[idx].status = e.target.value;
                                            if(e.target.value === 'paid') arr[idx].paidAt = new Date().toISOString();
                                            setEditInvoices(arr);
                                          }}
                                          className={`w-full px-3 py-2 border rounded-xl text-xs font-bold outline-none cursor-pointer ${
                                            inv.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 
                                            inv.status === 'overdue' ? 'bg-red-50 text-red-700 border-red-200' : 
                                            'bg-yellow-50 text-yellow-700 border-yellow-200'
                                          }`}
                                        >
                                          <option value="pending">Pendente</option>
                                          <option value="paid">Pago</option>
                                          <option value="overdue">Atrasado</option>
                                          <option value="canceled">Cancelado</option>
                                        </select>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </details>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>


              {/* ── QR Code ── */}
              <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100 mt-6 mb-2">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary"><ExternalLink size={20} /></div>
                  <div>
                    <h4 className="text-lg font-black text-gray-900 tracking-tight">Link de Agendamento (QR Code)</h4>
                    <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest">Acesso rápido para agendamentos</p>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="bg-white p-4 rounded-3xl shadow-xl border border-gray-100 shrink-0">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(window.location.origin + '/?p=' + detailsUser.id)}`} alt="QR Code" className="w-32 h-32 md:w-40 md:h-40" />
                  </div>
                  <div className="flex-1 space-y-4 w-full">
                    <div className="bg-white px-4 py-3 rounded-2xl border border-gray-200 text-xs font-mono text-gray-400 truncate shadow-inner">{window.location.origin}/?p={detailsUser.id}</div>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/?p=${detailsUser.id}`); if (showToast) showToast("Link copiado!"); }} className="flex items-center justify-center gap-2 bg-white text-gray-700 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-200 hover:bg-gray-50 transition-all shadow-sm active:scale-95"><Copy size={16} /> Copiar Link</button>
                      <button onClick={() => { window.open(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(window.location.origin + '/?p=' + detailsUser.id)}`, '_blank'); }} className="flex items-center justify-center gap-2 bg-white text-primary py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/20 hover:bg-primary/5 transition-all shadow-sm active:scale-95"><Upload size={16} className="rotate-180" /> Baixar QR</button>
                    </div>
                  </div>
                </div>
              </div>

              <button onClick={handleSaveModalUpdates} disabled={isRenewingInModal} className="w-full bg-[#0EA5E9] hover:bg-[#0284c7] text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-blue-500/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 mt-8 mb-4 border-b-4 border-black/10">
                {isRenewingInModal ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />} SALVAR ALTERAÇÕES
              </button>
              <button onClick={() => setDetailsUser(null)} className="w-full text-gray-400 font-bold uppercase text-[9px] hover:underline mb-4">Descartar e Fechar</button>
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════
          MODAL: NOVO PROFISSIONAL
      ══════════════════════════════════════════════════════════════ */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[999] backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[3rem] w-full max-w-xl p-10 shadow-2xl border-t-8 border-primary relative overflow-y-auto max-h-[95vh] no-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Ativar Novo Assinante</h3>
              <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-900 transition-colors p-2"><X size={28} /></button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome da Empresa</label>
                  <input required className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl outline-none font-bold transition-all" placeholder="Ex: Studio VIP" value={newUser.companyName} onChange={e => setNewUser({ ...newUser, companyName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Responsável (Admin)</label>
                  <input required className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl outline-none font-bold transition-all" placeholder="Nome do gestor" value={newUser.ownerName} onChange={e => setNewUser({ ...newUser, ownerName: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail</label>
                  <input required type="email" className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl outline-none font-bold transition-all" placeholder="profissional@email.com" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: (e.target.value || '').toLowerCase().trim() })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp</label>
                  <input required className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl outline-none font-bold transition-all" placeholder="090 0000 0000" value={newUser.contactPhone} onChange={e => setNewUser({ ...newUser, contactPhone: e.target.value.replace(/\D/g, '') })} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex justify-between">Senha Temporária <button type="button" onClick={generateRandomPassword} className="text-primary hover:underline lowercase font-bold">gerar nova</button></label>
                <input required className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl outline-none font-mono font-bold transition-all" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
              </div>
              <div className="space-y-3 pt-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Período da Assinatura</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(['1m','3m','6m','12m'] as PlanType[]).map(pt => (
                    <button key={pt} type="button" onClick={() => setNewUser({ ...newUser, planType: pt })} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${newUser.planType === pt ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-primary/30'}`}>
                      {pt === '1m' ? 'Mensal' : pt === '3m' ? '3 Meses' : pt === '6m' ? '6 Meses' : 'Anual'}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-primary text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-primary/30 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 mt-4">
                {isSubmitting ? <RefreshCw className="animate-spin" size={18} /> : 'Finalizar e Ativar Conta'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL: SUCESSO PÓS-CADASTRO
      ══════════════════════════════════════════════════════════════ */}
      {createdUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[9999] backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 text-center shadow-2xl relative">
            <button onClick={() => setCreatedUser(null)} className="absolute top-8 right-8 text-gray-400 hover:text-gray-900 transition-colors"><X size={24} /></button>
            <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle size={48} /></div>
            <h3 className="text-2xl font-black mb-1 text-gray-900">Configuração Concluída!</h3>
            <p className="text-gray-400 text-sm mb-8 font-medium">O acesso para {createdUser.companyName} foi gerado.</p>
            <div className="bg-gray-50/50 rounded-[2rem] p-6 text-left border border-gray-100 mb-8">
              <div className="flex justify-between items-center mb-4"><span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Mensagem de Boas-vindas</span><span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tight">Pronta para Envio</span></div>
              <div className="bg-white rounded-2xl p-6 border border-gray-100 text-xs text-gray-600 font-medium leading-relaxed shadow-sm whitespace-pre-wrap">
                {`Olá *${createdUser.companyName}*! 👋\n\nSeu acesso ao sistema CP Agenda foi configurado com sucesso.\n\n📍 *Dados de Acesso:*\n📧 Login: ${createdUser.email}\n🔑 Senha: ${createdUser.password}\n\n🔗 *Painel de Gestão:*\n${window.location.origin}\n\n⚠️ *OBS:* Por segurança, sua senha deve ser redefinida no primeiro acesso.`}
              </div>
            </div>
            <div className="space-y-3">
              <button onClick={openWhatsAppMessage} className="w-full bg-primary text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-lg shadow-primary/20 text-sm transition-all active:scale-95"><Copy size={18} /> Copiar para WhatsApp</button>
              <button onClick={() => setCreatedUser(null)} className="w-full bg-gray-50 text-gray-400 py-4 rounded-2xl font-black text-sm transition-all hover:bg-gray-100">Fechar e Continuar</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL: CONFIRMAÇÃO DE EXCLUSÃO
      ══════════════════════════════════════════════════════════════ */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[1000] backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border-t-8 border-red-500 text-center">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={40} /></div>
            <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">Excluir Profissional?</h3>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">Você está prestes a remover permanentemente a empresa <br/><strong className="text-gray-900 uppercase tracking-wide">{userToDelete.companyName}</strong>.<br/>Esta ação não pode ser desfeita.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { onDeleteUser(userToDelete.id); setUserToDelete(null); }} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-red-200 hover:bg-red-700 transition-all active:scale-95">Sim, Excluir Agora</button>
              <button onClick={() => setUserToDelete(null)} className="w-full bg-gray-100 text-gray-500 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
