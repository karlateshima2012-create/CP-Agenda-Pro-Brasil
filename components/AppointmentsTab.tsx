import React, { useState, useRef } from 'react';
import { Appointment, AppointmentStatus, AvailabilityConfig } from '../types';
import {
  Calendar,
  Clock,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageCircle,
  Filter,
  Ban,
  Sun,
  ArrowRightCircle,
  LayoutGrid,
  CalendarDays,
  Trash2,
  Mail,
  List as ListIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface Props {
  appointments: Appointment[];
  availability: AvailabilityConfig;
  onUpdateStatus: (id: number, status: AppointmentStatus) => void;
  onDeleteAppointment: (id: number) => void;
  onBulkDelete?: (ids: number[]) => void;
  publicLink?: string;
}

// Funções utilitárias para WhatsApp
function normalizePhoneToE164BR(phoneRaw: string) {
  const digits = (phoneRaw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55')) return digits;
  if (digits.startsWith('0')) return '55' + digits.slice(1);
  if (digits.length === 10 || digits.length === 11) return '55' + digits;
  return digits;
}

function formatWhenJST(startAt: string) {
  return new Date(startAt).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildWhatsAppMessage(appt: any, status: 'confirmed' | 'rejected' | 'canceled') {
  const nome = appt.clientName?.trim() || 'Olá';
  const servico = appt.serviceName?.trim() || 'seu serviço';
  const when = appt.startAt ? formatWhenJST(appt.startAt) : '';

  if (status === 'confirmed') {
    return `${nome}! Seu agendamento foi CONFIRMADO.\n\n Serviço: ${servico}\n Data/Hora: ${when}\n\nQualquer ajuste é só me chamar por aqui.`;
  }
  if (status === 'rejected') {
    return `${nome}! Não consegui confirmar esse horário.\n\n Serviço: ${servico}\n Horário solicitado: ${when}\n\nQuer que eu te envie outros horários disponíveis?`;
  }
  return `${nome}! Seu agendamento foi CANCELADO.\n\n Serviço: ${servico}\n Data/Hora: ${when}\n\nSe quiser reagendar, me chama por aqui.`;
}

function openWhatsApp(phoneRaw: string, message: string) {
  const phone = normalizePhoneToE164BR(phoneRaw);
  if (!phone) {
    alert('Telefone do cliente não encontrado neste agendamento.');
    return;
  }
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function generateWhatsAppLink(appt: any, status: 'pending' | 'confirmed' | 'rejected' | 'canceled') {
  // botão WhatsApp "manual": usa a mensagem conforme status atual
  const st = (status === 'pending' ? 'confirmed' : status) as any; // ou crie msg específica p/ pending
  const msg = buildWhatsAppMessage(appt, st);
  const phone = normalizePhoneToE164BR(appt.clientPhone);
  return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : '#';
}

export const AppointmentsTab: React.FC<Props> = ({ appointments, availability, onUpdateStatus, onDeleteAppointment, onBulkDelete, publicLink }) => {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<'grid' | 'list' | 'calendar'>('grid');
  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'past' | 'manual'>('all');
  const [manualDate, setManualDate] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  const openConfirm = (title: string, message: string, onConfirm: () => void, isDanger = true) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
      isDanger
    });
  };

  const getJSTDate = (dateStr: string | number | Date) => {
    let d: Date;
    if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.includes('+')) {
      // Treat as local wall-clock time (do NOT add Z)
      d = new Date(dateStr.replace(' ', 'T'));
    } else {
      d = new Date(dateStr);
    }
    if (isNaN(d.getTime())) return new Date();
    
    // Obter data e hora formatadas para Tokyo em formato compatível com o Safari (sem vírgulas)
    const yStr = d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }); // "YYYY-MM-DD"
    const tStr = d.toLocaleTimeString('en-GB', { timeZone: 'America/Sao_Paulo' }); // "HH:MM:SS"
    return new Date(`${yStr}T${tStr}`);
  };

  const isSameDayJST = (isoStr: string, targetDate: Date) => {
    const apptJST = getJSTDate(isoStr);
    return apptJST.getDate() === targetDate.getDate() &&
      apptJST.getMonth() === targetDate.getMonth() &&
      apptJST.getFullYear() === targetDate.getFullYear();
  };

  const getTodayJST = () => getJSTDate(new Date());
  const getTomorrowJST = () => {
    const t = getTodayJST();
    t.setDate(t.getDate() + 1);
    return t;
  };

  const todayCount = (appointments || []).filter(a => a && a.startAt && isSameDayJST(a.startAt, getTodayJST()) && a.status !== 'canceled' && a.status !== 'rejected').length;
  const tomorrowCount = (appointments || []).filter(a => a && a.startAt && isSameDayJST(a.startAt, getTomorrowJST()) && a.status !== 'canceled' && a.status !== 'rejected').length;

  const filteredAppointments = (appointments || [])
    .filter(appt => {
      if (!appt || !appt.startAt) return false;
      const apptDate = getJSTDate(appt.startAt);

      if (statusFilter !== 'all' && appt.status !== statusFilter) return false;
      if (dateFilter === 'today') return isSameDayJST(appt.startAt, getTodayJST());
      if (dateFilter === 'tomorrow') return isSameDayJST(appt.startAt, getTomorrowJST());
      if (dateFilter === 'past') {
        const apptDate = getJSTDate(appt.startAt);
        const today = getTodayJST();
        today.setHours(0, 0, 0, 0);
        return apptDate.getTime() < today.getTime();
      }
      if (dateFilter === 'manual' && manualDate) {
        const [y, m, d] = manualDate.split('-').map(Number);
        return apptDate.getFullYear() === y &&
          apptDate.getMonth() === (m - 1) &&
          apptDate.getDate() === d;
      }
      return true;
    })
    .sort((a, b) => {
      const isAPending = a.status === 'pending';
      const isBPending = b.status === 'pending';
      if (isAPending && !isBPending) return -1;
      if (!isAPending && isBPending) return 1;
      return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
    });

  const getStatusConfig = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmed': return { label: 'Confirmado', class: 'bg-green-50 text-green-700 border-green-100', dot: 'bg-green-500' };
      case 'pending': return { label: 'Pendente', class: 'bg-amber-50 text-amber-700 border-amber-100', dot: 'bg-amber-500' };
      case 'canceled': return { label: 'Cancelado', class: 'bg-red-50 text-red-700 border-red-100', dot: 'bg-red-500' };
      case 'rejected': return { label: 'Rejeitado', class: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' };
      default: return { label: status, class: 'bg-gray-50 text-gray-500 border-gray-100', dot: 'bg-gray-300' };
    }
  };

  // Função para atualizar status e abrir WhatsApp
  // Função removida para evitar disparo automático de WhatsApp

  const [currentMonth, setCurrentMonth] = useState(getTodayJST());
  const [selectedDay, setSelectedDay] = useState<Date>(() =>
    new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }))
  );

  const renderCalendar = () => {
    const todayJST = getTodayJST();
    const todayMidnight = new Date(todayJST.getFullYear(), todayJST.getMonth(), todayJST.getDate()).getTime();

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = new Date(year, month, 1).getDay();

    const jsDayToPtDay: Record<number, string> = {
      0: 'domingo', 1: 'segunda', 2: 'terca', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sabado'
    };

    const getApptColor = (status: AppointmentStatus) => {
      if (status === 'confirmed') return { bg: 'bg-primary/10', dot: 'bg-primary', text: 'text-primary' };
      if (status === 'pending') return { bg: 'bg-amber-50', dot: 'bg-amber-400', text: 'text-amber-700' };
      return { bg: 'bg-gray-50', dot: 'bg-gray-400', text: 'text-gray-500' };
    };

    const mobileDays: React.ReactNode[] = [];
    const desktopDays: React.ReactNode[] = [];

    for (let i = 0; i < startDay; i++) {
      mobileDays.push(<div key={`me-${i}`} />);
      desktopDays.push(<div key={`de-${i}`} className="min-h-[8rem] bg-gray-50/10 border border-gray-100/30 rounded-xl" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const currentLoopDate = new Date(year, month, d);
      const loopTime = currentLoopDate.getTime();
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      const jsDayOfWeek = currentLoopDate.getDay();
      const dayString = jsDayToPtDay[jsDayOfWeek];
      const scheduleForDay = (availability?.workingHours || []).find(w => w.day === dayString);
      const isDayEnabled = scheduleForDay?.isWorking === true;

      const isPast = loopTime < todayMidnight;
      const isToday = d === todayJST.getDate() && month === todayJST.getMonth() && year === todayJST.getFullYear();
      const isSelected = d === selectedDay.getDate() && month === selectedDay.getMonth() && year === selectedDay.getFullYear();

      const blocked = availability.blockedDates.find(b => {
        const bDate = b.date?.includes('T') ? b.date.split('T')[0] : b.date;
        return bDate === dateStr && !b.startTime && !b.endTime;
      });

      const dayAppts = appointments
        .filter((a: Appointment) => {
          if (a.status === 'canceled' || a.status === 'rejected') return false;
          const apptStart = getJSTDate(a.startAt);
          return apptStart.getDate() === d && apptStart.getMonth() === month && apptStart.getFullYear() === year;
        })
        .sort((a: Appointment, b: Appointment) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

      // ---- MOBILE cell ----
      const mobileNumBase = isPast || !isDayEnabled ? 'text-gray-300' : 'text-gray-800';
      mobileDays.push(
        <div
          key={`m-${d}`}
          onClick={() => setSelectedDay(currentLoopDate)}
          className="flex flex-col items-center gap-0.5 py-1 cursor-pointer select-none"
        >
          <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-all
            ${isToday ? 'bg-red-500 text-white shadow-sm shadow-red-500/20' : ''}
            ${isSelected && !isToday ? 'bg-primary/15 text-primary font-black' : ''}
            ${!isToday && !isSelected ? mobileNumBase : ''}
          `}>
            {d}
          </div>
          <div className="flex justify-center h-1.5 items-center w-full">
            {dayAppts.length > 0 && (
              <div
                className={`w-1.5 h-1.5 rounded-full ${dayAppts[0].status === 'confirmed' ? 'bg-primary' : 'bg-amber-400'} ${isToday ? 'bg-red-400' : ''} ${isPast ? 'opacity-40' : ''}`}
              />
            )}
          </div>
        </div>
      );

      // ---- DESKTOP cell ----
      let dayClass = 'bg-white border-gray-100 hover:border-primary/20 hover:shadow-sm';
      let dayNumClass = 'text-gray-800';

      if (blocked) {
        dayClass = 'bg-red-50/70 border-red-100';
        dayNumClass = 'text-red-500';
      } else if (!isDayEnabled) {
        dayClass = 'bg-gray-50/50 border-gray-100/80';
        dayNumClass = 'text-gray-300';
      } else if (isPast) {
        dayClass = 'bg-white border-gray-100 opacity-55';
        dayNumClass = 'text-gray-400';
      }

      const visibleAppts = dayAppts.slice(0, 3);
      const overflowCount = dayAppts.length - 3;

      desktopDays.push(
        <div key={`d-${d}`} className={`min-h-[8rem] border p-2 flex flex-col rounded-xl transition-all ${dayClass}`}>
          <div className="flex items-center justify-center mb-1.5">
            {isToday ? (
              <span className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-sm font-black shadow-sm shadow-primary/30">
                {d}
              </span>
            ) : (
              <span className={`text-sm font-bold ${dayNumClass}`}>{d}</span>
            )}
          </div>
          {blocked && (
            <div className="px-1 py-0.5 rounded-md bg-red-100 text-red-600 text-[8px] font-black uppercase tracking-wide text-center mb-0.5">
              Bloqueado
            </div>
          )}
          <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">
            {visibleAppts.map((appt: Appointment) => {
              const apptTime = getJSTDate(appt.startAt);
              const timeStr = `${apptTime.getHours().toString().padStart(2, '0')}:${apptTime.getMinutes().toString().padStart(2, '0')}`;
              const colors = getApptColor(appt.status);
              const firstName = (appt.clientName || '').split(' ')[0];
              return (
                <div key={appt.id} className={`flex items-center gap-1 rounded-md px-1 py-0.5 ${colors.bg} overflow-hidden`}>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                  <span className={`text-[10px] font-semibold ${colors.text} truncate flex-1 leading-none`}>{firstName}</span>
                  <span className={`text-[9px] font-medium ${colors.text} opacity-80 flex-shrink-0 leading-none`}>{timeStr}</span>
                </div>
              );
            })}
            {overflowCount > 0 && (
              <span className="text-[9px] font-semibold text-gray-400 pl-1 leading-none">+{overflowCount} mais</span>
            )}
          </div>
        </div>
      );
    }

    // Appointments for the selected day (mobile panel)
    const selectedDayAppts = appointments
      .filter((a: Appointment) => {
        if (!a?.startAt) return false;
        if (a.status === 'canceled' || a.status === 'rejected') return false;
        const s = getJSTDate(a.startAt);
        return s.getDate() === selectedDay.getDate() &&
          s.getMonth() === selectedDay.getMonth() &&
          s.getFullYear() === selectedDay.getFullYear();
      })
      .sort((a: Appointment, b: Appointment) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

    return (
      <div className="animate-fade-in">
        {/* Calendar Header with Navigation (Desktop Only) */}
        <div className="hidden md:flex items-center justify-between mb-4 px-4 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <button
            onClick={() => { const p = new Date(currentMonth); p.setMonth(p.getMonth() - 1); setCurrentMonth(p); }}
            className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"
          >
            <ArrowRightCircle className="rotate-180" size={20} />
          </button>
          <h3 className="text-sm md:text-base font-black text-gray-900 uppercase tracking-widest">
            {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            onClick={() => { const n = new Date(currentMonth); n.setMonth(n.getMonth() + 1); setCurrentMonth(n); }}
            className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"
          >
            <ArrowRightCircle size={20} />
          </button>
        </div>

        {/* ---- MOBILE LAYOUT ---- */}
        <div className="md:hidden space-y-3">
          {/* iOS-style Calendar Header */}
          <div className="flex flex-col gap-1 px-4 mb-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <button
                onClick={() => { const p = new Date(currentMonth); p.setMonth(p.getMonth() - 1); setCurrentMonth(p); }}
                className="flex items-center gap-0.5 text-primary text-sm font-black active:opacity-60 transition-opacity"
              >
                <ChevronLeft size={16} />
                <span>{currentMonth.getFullYear()}</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { const n = new Date(currentMonth); n.setMonth(n.getMonth() + 1); setCurrentMonth(n); }}
                  className="p-1 hover:bg-gray-50 rounded-lg text-primary active:opacity-60 transition-opacity"
                  title="Próximo Mês"
                >
                  <ChevronRight size={22} />
                </button>
              </div>
            </div>
            <h2 className="text-3xl font-black text-gray-900 capitalize tracking-tight mt-1">
              {currentMonth.toLocaleDateString('pt-BR', { month: 'long' })}
            </h2>
          </div>

          {/* Compact month grid */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-2 pt-2 pb-3">
            <div className="grid grid-cols-7 mb-1.5 border-b border-gray-50 pb-1.5">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((l, i) => (
                <div key={i} className="text-center text-[10px] font-black text-gray-400">{l}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">{mobileDays}</div>
          </div>

          {/* Selected day appointments panel */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <p className="text-xs font-black text-gray-700 capitalize">
                {selectedDay.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              {selectedDayAppts.length > 0 && (
                <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {selectedDayAppts.length} agend.
                </span>
              )}
            </div>

            {selectedDayAppts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-300">
                <CalendarDays size={28} />
                <p className="text-xs font-semibold">Sem agendamentos neste dia</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {selectedDayAppts.map((appt: Appointment) => {
                  const apptTime = getJSTDate(appt.startAt);
                  const timeStr = `${apptTime.getHours().toString().padStart(2, '0')}:${apptTime.getMinutes().toString().padStart(2, '0')}`;
                  const status = getStatusConfig(appt.status);
                  const isPending = appt.status === 'pending';
                  return (
                    <div key={appt.id} className="flex items-center gap-2 px-4 py-2">
                      <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg px-2 py-1 min-w-[46px] border border-gray-100 flex-shrink-0">
                        <span className="text-xs font-black text-gray-700 leading-none">{timeStr}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${status.dot}`} />
                          <span className="text-sm font-bold text-gray-900 truncate capitalize">{appt.clientName}</span>
                        </div>
                        <span className="text-[9px] font-semibold text-primary bg-primary/5 px-1.5 py-0.5 rounded-full">
                          {appt.serviceName || 'Serviço Padrão'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isPending && (
                          <>
                            <button
                              onClick={() => onUpdateStatus(appt.id, 'confirmed')}
                              className="p-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors shadow-sm"
                              title="Confirmar"
                            >
                              <CheckCircle size={14} />
                            </button>
                            <button
                              onClick={() => openConfirm('Rejeitar agendamento', `Rejeitar ${appt.clientName}?`, () => onUpdateStatus(appt.id, 'rejected'))}
                              className="p-2 bg-gray-100 text-gray-500 rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors"
                              title="Rejeitar"
                            >
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                        <a
                          href={generateWhatsAppLink(appt, appt.status)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors"
                          title="WhatsApp"
                        >
                          <MessageCircle size={14} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Legend mobile */}
          <div className="flex flex-wrap gap-3 px-4 py-3 bg-gray-50/50 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-gray-400">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Confirmado
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-gray-400">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Pendente
            </div>
          </div>
        </div>

        {/* ---- DESKTOP LAYOUT ---- */}
        <div className="hidden md:block px-2">
          <div className="grid grid-cols-7 gap-4 mb-3">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(label => (
              <div key={label} className="text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{label}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-4">{desktopDays}</div>

          <div className="mt-6 flex flex-wrap gap-4 px-4 py-4 bg-gray-50/50 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase text-gray-400">
              <div className="w-2 h-2 rounded-full bg-primary" /> Confirmado
            </div>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase text-gray-400">
              <div className="w-2 h-2 rounded-full bg-amber-400" /> Pendente
            </div>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase text-gray-400">
              <div className="w-2 h-2 bg-red-100 border border-red-200 rounded-sm" /> Dia Bloqueado
            </div>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase text-gray-400">
              <div className="w-2 h-2 bg-gray-100 rounded-sm" /> Passado / Inativo
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderListView = () => (
    <div className="flex flex-col gap-3 animate-fade-in px-2">
      {filteredAppointments.length > 0 ? filteredAppointments.map(appt => {
        const startDateJST = getJSTDate(appt.startAt);
        const status = getStatusConfig(appt.status);
        const isPending = appt.status === 'pending';
        const isActive = appt.status !== 'canceled' && appt.status !== 'rejected';
        const isSelected = selectedIds.includes(appt.id);

        return (
          <div key={appt.id} className={`bg-white border ${isSelected ? 'border-primary ring-1 ring-primary/20 shadow-md' : 'border-gray-100'} p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-lg transition-all group`}>
            <div className="flex items-center gap-4 flex-1">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => {
                  setSelectedIds(prev =>
                    prev.includes(appt.id) ? prev.filter(id => id !== appt.id) : [...prev, appt.id]
                  );
                }}
                className="w-5 h-5 rounded-lg border-gray-200 text-primary focus:ring-primary cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center bg-gray-50 rounded-xl px-3 py-2 min-w-[70px] border border-gray-100">
                <span className="text-[9px] font-black text-gray-400 uppercase leading-none mb-1">{startDateJST.toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                <span className="text-lg font-black text-gray-900 leading-none">{startDateJST.getHours().toString().padStart(2, '0')}:{startDateJST.getMinutes().toString().padStart(2, '0')}</span>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <div className={`w-2 h-2 rounded-full ${status.dot}`}></div>
                  <h4 className="font-bold text-gray-900 capitalize">{appt.clientName}</h4>
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-full">{appt.serviceName || 'Serviço Padrão'}</span>
                </div>
                <div className="flex flex-col gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1"><Calendar size={10} /> {startDateJST.toLocaleDateString('pt-BR')}</span>
                    <span className="flex items-center gap-1"><Phone size={10} /> {normalizePhoneToE164BR(appt.clientPhone) || '(Sem telefone)'}</span>
                  </div>
                  {appt.clientEmail && (
                    <div className="flex items-center gap-1">
                      <Mail size={10} className="flex-shrink-0" />
                      <span className="break-all">{appt.clientEmail}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden md:flex flex-col items-end mr-4">
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${status.class}`}>
                  {status.label}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isPending ? (
                  <>
                    <button
                      onClick={() => onUpdateStatus(appt.id, 'confirmed')}
                      className="p-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors shadow-lg shadow-green-500/10"
                      title="Confirmar"
                    >
                      <CheckCircle size={16} />
                    </button>
                    <button
                      onClick={() => onUpdateStatus(appt.id, 'rejected')}
                      className="p-2.5 bg-gray-100 text-gray-500 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"
                      title="Rejeitar"
                    >
                      <XCircle size={16} />
                    </button>
                  </>
                ) : (
                  isActive && (
                    <button
                      onClick={() => onUpdateStatus(appt.id, 'canceled')}
                      className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="Cancelar"
                    >
                      <AlertCircle size={16} />
                    </button>
                  )
                )}
                <a href={generateWhatsAppLink(appt, appt.status as any)} target="_blank" rel="noreferrer" className="p-2.5 bg-green-50 text-green-600 border border-green-100 rounded-xl hover:bg-green-100 transition-all" title="WhatsApp"><MessageCircle size={16} /></a>
                <button
                  onClick={() => openConfirm(
                    'Excluir Agendamento',
                    'Deseja excluir este agendamento permanentemente? Esta ação não pode ser desfeita.',
                    () => onDeleteAppointment(appt.id)
                  )}
                  className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        );
      }) : (
        <div className="py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
          <Ban size={32} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Sem registros para mostrar</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col gap-6 px-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight">Agendamentos</h2>
            <div className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {appointments.length} Total
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-full md:w-auto">
            <button
              onClick={() => setView('grid')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 p-2.5 rounded-xl transition-all ${view === 'grid' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
              title="Visualizar Grade"
            >
              <LayoutGrid size={18} />
              <span className="md:hidden text-[10px] font-bold uppercase">Grade</span>
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 p-2.5 rounded-xl transition-all ${view === 'list' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
              title="Visualizar Lista"
            >
              <ListIcon size={18} />
              <span className="md:hidden text-[10px] font-bold uppercase">Lista</span>
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 p-2.5 rounded-xl transition-all ${view === 'calendar' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
              title="Visualizar Calendário"
            >
              <CalendarDays size={18} />
              <span className="md:hidden text-[10px] font-bold uppercase">Calend.</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex overflow-x-auto no-scrollbar items-center gap-2 pb-2 md:pb-0 -mx-2 px-2">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dateFilter === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
                }`}
            >
              Todos
            </button>

            <div 
              onClick={() => {
                if (dateInputRef.current) {
                  try {
                    dateInputRef.current.showPicker();
                  } catch (err) {
                    dateInputRef.current.click();
                  }
                }
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all cursor-pointer hover:bg-gray-50 ${dateFilter === 'manual' ? 'bg-primary/5 border-primary/30' : 'bg-white border-gray-100'}`}
            >
              <Calendar size={14} className={dateFilter === 'manual' ? 'text-primary' : 'text-gray-400'} />
              <input
                ref={dateInputRef}
                type="date"
                value={manualDate}
                onChange={(e) => {
                  setManualDate(e.target.value);
                  setDateFilter(e.target.value ? 'manual' : 'all');
                }}
                className="bg-transparent text-[10px] font-black uppercase tracking-widest text-gray-600 outline-none cursor-pointer"
              />
              {dateFilter === 'manual' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setManualDate('');
                    setDateFilter('all');
                  }}
                  className="clear-date-btn p-1 hover:bg-gray-200 rounded-md text-gray-400"
                >
                  <XCircle size={14} />
                </button>
              )}
            </div>

            <button
              onClick={() => setDateFilter('today')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dateFilter === 'today'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
                }`}
            >
              <Sun size={14} />
              Hoje <span className="opacity-50 text-[9px]">{todayCount}</span>
            </button>
            <button
              onClick={() => setDateFilter('tomorrow')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dateFilter === 'tomorrow'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
                }`}
            >
              <ArrowRightCircle size={14} />
              Amanhã <span className="opacity-50 text-[9px]">{tomorrowCount}</span>
            </button>
            <button
              onClick={() => { setDateFilter('past'); setSelectedIds([]); }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dateFilter === 'past'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
                }`}
            >
              <Trash2 size={14} />
              Dias Passados
            </button>

            {selectedIds.length > 0 && (
              <button
                onClick={() => openConfirm(
                  'Apagar Selecionados',
                  `Deseja apagar ${selectedIds.length} agendamentos selecionados? Esta ação não pode ser desfeita.`,
                  () => {
                    onBulkDelete?.(selectedIds);
                    setSelectedIds([]);
                  }
                )}
                className="bg-red-500 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all flex items-center gap-2"
              >
                <Trash2 size={14} />
                Apagar Selecionados ({selectedIds.length})
              </button>
            )}

            {dateFilter === 'past' && filteredAppointments.length > 0 && (
              <button
                onClick={() => {
                  if (selectedIds.length === filteredAppointments.length) {
                    setSelectedIds([]);
                  } else {
                    setSelectedIds(filteredAppointments.map(a => a.id));
                  }
                }}
                className="text-primary text-[10px] font-black uppercase tracking-widest hover:underline"
              >
                {selectedIds.length === filteredAppointments.length ? 'Limpar Seleção' : 'Selecionar Todos'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 lg:flex-none">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="pl-10 pr-10 py-2.5 bg-white border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-600 appearance-none cursor-pointer hover:border-primary/30 transition-all outline-none min-w-[180px]"
              >
                <option value="all">Todos os Status</option>
                <option value="pending">Pendentes</option>
                <option value="confirmed">Confirmados</option>
                <option value="canceled">Cancelados</option>
                <option value="rejected">Rejeitados</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        {view === 'calendar' ? renderCalendar() : view === 'list' ? renderListView() : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredAppointments.map(appt => {
              const startDateJST = getJSTDate(appt.startAt);
              const isPending = appt.status === 'pending';
              const isActive = appt.status !== 'canceled' && appt.status !== 'rejected';
              const status = getStatusConfig(appt.status);

              return (
                <div key={appt.id} className="group bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full animate-fade-in relative overflow-hidden">

                  <div className="flex justify-between items-start mb-6">
                    <div className="max-w-[60%]">
                      <h3 className="font-black text-xl text-gray-900 tracking-tight capitalize leading-none mb-2 truncate">{appt.clientName}</h3>
                      <div className="inline-flex items-center gap-2 bg-primary/5 px-2.5 py-1 rounded-full">
                        <span className="text-[9px] text-primary font-black uppercase tracking-[0.1em]">{appt.serviceName || 'Serviço Padrão'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.1em] border whitespace-nowrap ${status.class}`}>
                        {status.label}
                      </span>
                      <button
                        onClick={() => openConfirm(
                          'Excluir Agendamento',
                          'Deseja excluir este agendamento permanentemente? Esta ação não pode ser desfeita.',
                          () => onDeleteAppointment(appt.id)
                        )}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Excluir agendamento"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8 flex-1">
                    <div className="bg-gray-50 p-5 rounded-2xl space-y-4">
                      <div className="flex items-center gap-3 font-bold text-gray-500 text-xs uppercase tracking-wider">
                        <Calendar size={14} className="text-gray-300" />
                        {startDateJST.toLocaleDateString('pt-BR')}
                      </div>
                      <div className="flex items-center gap-3 font-black text-gray-900 text-lg">
                        <Clock size={16} className="text-primary" />
                        {startDateJST.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        <span className="text-[10px] text-gray-400 ml-auto">{appt.duration} MIN</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 px-2 text-xs text-gray-500 font-bold">
                      <div className="flex items-center gap-3">
                        <Phone size={14} />
                        {normalizePhoneToE164BR(appt.clientPhone) || '(Sem telefone)'}
                      </div>
                      {appt.clientEmail && (
                        <div className="flex items-center gap-3">
                          <Mail size={14} className="flex-shrink-0" />
                          <span className="break-all">{appt.clientEmail}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {isPending ? (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => onUpdateStatus(appt.id, 'confirmed')}
                          className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-green-500/10 active:scale-95"
                        >
                          <CheckCircle size={14} /> Confirmar
                        </button>
                        <button
                          onClick={() => onUpdateStatus(appt.id, 'rejected')}
                          className="flex items-center justify-center gap-2 bg-gray-50 hover:bg-red-50 hover:text-red-500 text-gray-500 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-90"
                        >
                          <XCircle size={14} /> Rejeitar
                        </button>
                      </div>
                    ) : (
                      isActive && (
                        <button
                          onClick={() => onUpdateStatus(appt.id, 'canceled')}
                          className="flex items-center justify-center gap-2 text-red-400 hover:bg-red-50 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all w-full"
                        >
                          <AlertCircle size={14} /> Cancelar Horário
                        </button>
                      )
                    )}

                    <div className="w-full">
                      <a
                        href={generateWhatsAppLink(appt, appt.status as any)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 text-green-600 bg-green-50 hover:bg-green-100 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all w-full border border-green-100 active:scale-95"
                      >
                        <MessageCircle size={16} /> WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredAppointments.length === 0 && (
              <div className="col-span-full py-24 flex flex-col items-center justify-center text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100 mx-2">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mb-6 border border-gray-100 shadow-inner">
                  <Ban size={32} />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-1">
                  {dateFilter === 'manual' ? 'Sem agendamentos para essa data' : 'Sem agendamentos'}
                </h3>
                <p className="text-gray-400 font-medium text-xs">
                  {dateFilter === 'manual'
                    ? `Não há registros para o dia ${new Date(manualDate + 'T00:00:00').toLocaleDateString('pt-BR')}.`
                    : 'Nenhum registro encontrado com estes filtros.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        isDanger={confirmModal.isDanger}
      />
    </div>
  );
};