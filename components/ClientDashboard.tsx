import React, { useState } from 'react';
import {
  CalendarDays,
  Clock,
  Briefcase,
  Settings,
  LogOut,
  History,
  Contact2,
  MoreHorizontal,
  BarChart2
} from 'lucide-react';
import { AccountInfo, Appointment, AvailabilityConfig, Service, AppointmentStatus } from '../types';
import { DashboardHeader } from './DashboardHeader';
import { AppointmentsTab } from './AppointmentsTab';
import { AvailabilityTab } from './AvailabilityTab';
import { ServicesTab } from './ServicesTab';
import { AccountTab } from './AccountTab';
import { OnboardingModal } from './OnboardingModal';
import { Logo } from './Logo';
import { ClientsTab } from './ClientsTab';
import { HistoryTab } from './HistoryTab';
import { GestaoTab } from './GestaoTab';

interface Props {
  account: AccountInfo;
  appointments: Appointment[];
  services: Service[];
  availability: AvailabilityConfig;
  onLogout: () => void;
  onOpenPublic: () => void;
  onUpdateAppointments: (appointments: Appointment[]) => void;
  onUpdateStatus: (id: number, status: AppointmentStatus) => void;
  onDeleteAppointment: (id: number) => void;
  onBulkDelete?: (ids: number[]) => void;
  onUpdateServices: (services: Service[]) => void;
  onUpdateAvailability: (availability: AvailabilityConfig) => void;
  onUpdateAccount: (settings: Partial<AccountInfo>) => void;
}



export const ClientDashboard: React.FC<Props> = ({
  account,
  appointments,
  services,
  availability,
  onLogout,
  onOpenPublic,
  onUpdateStatus,
  onDeleteAppointment,
  onBulkDelete,
  onUpdateServices,
  onUpdateAvailability,
  onUpdateAccount
}) => {
  const [activeTab, setActiveTab] = useState<'appointments' | 'availability' | 'services' | 'clients' | 'history' | 'account' | 'gestao'>('appointments');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const NavItem = ({ id, label, icon: Icon }: { id: typeof activeTab; label: string; icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === id
        ? 'bg-primary text-white shadow-lg shadow-primary/30'
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
        }`}
    >
      <Icon size={20} />
      {label}
    </button>
  );

  return (
    <>
      <OnboardingModal
        seen={!!account.onboardingSeen}
        onMarkSeen={async () => onUpdateAccount({ onboardingSeen: true })}
      />

      <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
        {/* SIDEBAR DESKTOP */}
        <aside className="hidden md:flex w-72 bg-white border-r border-gray-200 flex-shrink-0 flex-col h-screen sticky top-0 z-10">
          <div className="p-6 border-b border-gray-100 hidden md:flex justify-center">
            <Logo size="sm" />
          </div>

          <nav className="p-4 flex flex-col gap-2">
            <NavItem id="appointments" label="Agenda" icon={CalendarDays} />
            <NavItem id="availability" label="Disponibilidade" icon={Clock} />
            <NavItem id="services" label="Serviços" icon={Briefcase} />
            <NavItem id="clients" label="Clientes" icon={Contact2} />
            <NavItem id="history" label="Histórico" icon={History} />
            <NavItem id="gestao" label="Gestão" icon={BarChart2} />
            <NavItem id="account" label="Configurações" icon={Settings} />
          </nav>

          <div className="mt-auto p-4 hidden md:block">
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-3 rounded-xl text-sm font-bold transition-all border border-red-100 shadow-sm"
            >
              <LogOut size={18} /> SAIR
            </button>
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen pb-24 md:pb-8">
          <div className="max-w-5xl mx-auto min-h-full flex flex-col">
            <DashboardHeader account={account} onLogout={onLogout} onOpenPublic={onOpenPublic} />

            <div className="animate-fade-in flex-1">
              <div className={activeTab === 'appointments' ? 'block' : 'hidden'}>
                <AppointmentsTab
                  appointments={appointments}
                  availability={availability}
                  onUpdateStatus={onUpdateStatus}
                  onDeleteAppointment={onDeleteAppointment}
                  onBulkDelete={onBulkDelete}
                  publicLink={account.publicLink}
                />
              </div>

              <div className={activeTab === 'availability' ? 'block' : 'hidden'}>
                <AvailabilityTab
                  key={JSON.stringify(availability)}
                  config={availability}
                  onSave={onUpdateAvailability}
                />
              </div>

              <div className={activeTab === 'services' ? 'block' : 'hidden'}>
                <ServicesTab
                  key={JSON.stringify(services)}
                  account={account}
                  onUpdateAccount={onUpdateAccount}
                  services={services}
                  onUpdateServices={onUpdateServices}
                />
              </div>

              <div className={activeTab === 'clients' ? 'block' : 'hidden'}>
                <ClientsTab />
              </div>

              <div className={activeTab === 'history' ? 'block' : 'hidden'}>
                <HistoryTab />
              </div>

              <div className={activeTab === 'gestao' ? 'block' : 'hidden'}>
                <GestaoTab services={services} appointments={appointments} />
              </div>

              <div className={activeTab === 'account' ? 'block' : 'hidden'}>
                <AccountTab
                  key={JSON.stringify(account)}
                  account={account}
                  onUpdateSettings={onUpdateAccount}
                  onOpenPublic={onOpenPublic}
                />
              </div>
            </div>

            {/* MOBILE NAVIGATION BAR */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-2 flex items-center justify-around z-[60] shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.05)] pb-safe-offset-3">
              <button
                onClick={() => { setActiveTab('appointments'); setShowMobileMenu(false); }}
                className={`flex flex-col items-center gap-1 min-w-[60px] transition-all ${activeTab === 'appointments' ? 'text-[#25aae1]' : 'text-gray-400'}`}
              >
                <div className={`p-2.5 rounded-full transition-all ${activeTab === 'appointments' ? 'bg-[#25aae1]/10' : ''}`}>
                  <CalendarDays size={20} />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-tight">Agenda</span>
              </button>

              <button
                onClick={() => { setActiveTab('availability'); setShowMobileMenu(false); }}
                className={`flex flex-col items-center gap-1 min-w-[60px] transition-all ${activeTab === 'availability' ? 'text-[#25aae1]' : 'text-gray-400'}`}
              >
                <div className={`p-2.5 rounded-full transition-all ${activeTab === 'availability' ? 'bg-[#25aae1]/10' : ''}`}>
                  <Clock size={20} />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-tight">Horários</span>
              </button>

              <button
                onClick={() => { setActiveTab('services'); setShowMobileMenu(false); }}
                className={`flex flex-col items-center gap-1 min-w-[60px] transition-all ${activeTab === 'services' ? 'text-[#25aae1]' : 'text-gray-400'}`}
              >
                <div className={`p-2.5 rounded-full transition-all ${activeTab === 'services' ? 'bg-[#25aae1]/10' : ''}`}>
                  <Briefcase size={20} />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-tight">Serviços</span>
              </button>

              <button
                onClick={() => { setActiveTab('account'); setShowMobileMenu(false); }}
                className={`flex flex-col items-center gap-1 min-w-[60px] transition-all ${activeTab === 'account' ? 'text-[#25aae1]' : 'text-gray-400'}`}
              >
                <div className={`p-2.5 rounded-full transition-all ${activeTab === 'account' ? 'bg-[#25aae1]/10' : ''}`}>
                  <Settings size={20} />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-tight">Perfil</span>
              </button>

              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className={`flex flex-col items-center gap-1 min-w-[60px] transition-all ${showMobileMenu ? 'text-[#25aae1]' : 'text-gray-400'}`}
              >
                <div className={`p-2.5 rounded-full transition-all ${showMobileMenu ? 'bg-[#25aae1]/10' : ''}`}>
                  <MoreHorizontal size={20} />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-tight">Mais</span>
              </button>
            </div>

            {/* MOBILE OVERFLOW MENU */}
            {showMobileMenu && (
              <div className="md:hidden fixed inset-0 z-[55] flex flex-col justify-end bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowMobileMenu(false)}>
                <div 
                  className="bg-white rounded-t-[2.5rem] p-8 shadow-2xl animate-slide-up"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />
                  <div className="grid grid-cols-1 gap-4">
                    <button
                      onClick={() => { setActiveTab('history'); setShowMobileMenu(false); }}
                      className={`flex items-center gap-4 p-5 rounded-2xl transition-all ${activeTab === 'history' ? 'bg-[#25aae1] text-white shadow-lg' : 'bg-[#f8fafc] text-gray-700 border border-gray-100'}`}
                    >
                      <History size={22} />
                      <span className="font-bold text-[15px]">Histórico de Agendamentos</span>
                    </button>
                    
                    <button
                      onClick={() => { setActiveTab('clients'); setShowMobileMenu(false); }}
                      className={`flex items-center gap-4 p-5 rounded-2xl transition-all ${activeTab === 'clients' ? 'bg-[#25aae1] text-white shadow-lg' : 'bg-[#f8fafc] text-gray-700 border border-gray-100'}`}
                    >
                      <Contact2 size={22} />
                      <span className="font-bold text-[15px]">Clientes</span>
                    </button>

                    <button
                      onClick={() => { setActiveTab('gestao'); setShowMobileMenu(false); }}
                      className={`flex items-center gap-4 p-5 rounded-2xl transition-all ${activeTab === 'gestao' ? 'bg-[#25aae1] text-white shadow-lg' : 'bg-[#f8fafc] text-gray-700 border border-gray-100'}`}
                    >
                      <BarChart2 size={22} />
                      <span className="font-bold text-[15px]">Gestão</span>
                    </button>

                    <button
                      onClick={onLogout}
                      className="flex items-center gap-4 p-5 rounded-2xl bg-red-50/50 text-red-600 transition-all border border-red-100 mt-2"
                    >
                      <LogOut size={22} />
                      <span className="font-bold text-[15px]">Sair do Sistema</span>
                    </button>
                  </div>
                  <button 
                    onClick={() => setShowMobileMenu(false)}
                    className="w-full mt-8 py-2 text-gray-400 font-bold text-xs uppercase tracking-widest"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  );
};
