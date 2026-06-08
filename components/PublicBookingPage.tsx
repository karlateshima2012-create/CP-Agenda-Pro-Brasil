import React, { useState } from 'react';
import { Service, AvailabilityConfig, Appointment } from '../types';
import { mapWorkingHours } from '../utils/availability';
import {
  Calendar as CalendarIcon,
  Calendar,
  ChevronLeft,
  CheckCircle,
  Clock,
  User,
  Phone,
  ArrowRight,
  ChevronRight,
  Briefcase,
  AlertCircle,
  Ban,
  Check,
  Mail
} from 'lucide-react';

interface Props {
  companyName: string;
  coverImage?: string;
  profileImage?: string;
  shortDescription?: string;
  servicesTitle?: string;
  servicesSubtitle?: string;
  primaryColor?: string;
  secondaryColor?: string;
  viewMode?: 'card' | 'list';
  coverOpacity?: number;
  services: Service[];
  availability: AvailabilityConfig;
  appointments: Appointment[];
  busyAppointments: Appointment[]; // NOVA PROP AQUI
  onBook: (data: any) => Promise<boolean>;
  onBack: () => void;
}

export const PublicBookingPage: React.FC<Props> = ({
  companyName,
  coverImage,
  profileImage,
  shortDescription,
  servicesTitle,
  servicesSubtitle,
  primaryColor = '#25aae1',
  secondaryColor = '#1f2937',
  viewMode = 'card',
  coverOpacity = 100,
  services,
  availability,
  appointments,
  busyAppointments, // RECEBE A NOVA PROP
  onBook,
  onBack
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [clientData, setClientData] = useState<{ name: string; phone: string; email?: string }>({ name: '', phone: '', email: '' });

  // Japanese phone format: 0XX XXXX XXXX (11 digits total)
  const formatJapanesePhone = (raw: string): string => {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3)  return digits;
    if (digits.length <= 7)  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
  };

  const handlePhoneChange = (value: string) => {
    setClientData({ ...clientData, phone: formatJapanesePhone(value) });
  };

  const rawPhoneDigits = (clientData.phone || '').replace(/\D/g, '');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dateSubStep, setDateSubStep] = useState<'calendar' | 'time'>('calendar');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const toggleService = (service: Service) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === service.id);
      if (exists) return prev.filter(s => s.id !== service.id);
      return [...prev, service];
    });
  };

  const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration, 0);
  const totalBuffer = selectedServices.reduce((acc, s) => acc + (s.cleaning_buffer || 0), 0);
  const totalPrice = selectedServices.reduce((acc, s) => acc + (s.price || 0), 0);
  const combinedServiceNames = selectedServices.map(s => s.name).join(' + ');

  const normalizedHours = React.useMemo(() => {
    return mapWorkingHours(availability.workingHours);
  }, [availability.workingHours]);

  // ✅ SECURITY [M-8]: Debug logs removed — availability data must not be exposed in production console


  const getNowJST = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const formatLiteralDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const toTitleCase = (str: any) => {
    if (!str || typeof str !== 'string') return '';
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatDurationFriendly = (minutes: number) => {
    if (minutes === 1440) return '24 horas (Diária)';
    if (minutes >= 60) {
      const hours = minutes / 60;
      return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    }
    return `${minutes} minutos`;
  };

  const renderProgressBar = () => {
    if (step === 5) return null;

    const steps = [
      { id: 1, label: 'Serviço', icon: Briefcase },
      { id: 2, label: 'Data', icon: CalendarIcon },
      { id: 3, label: 'Dados', icon: User },
      { id: 4, label: 'Revisão', icon: CheckCircle },
    ];

    return (
      <div className="w-full max-w-2xl mx-auto mb-12 px-4">
        <div className="flex items-center justify-between relative">
          {/* Linha de fundo */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-gray-100 -z-10"></div>

          {/* Linha de progresso ativa */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 transition-all duration-500 -z-10"
            style={{
              width: `${((step - 1) / (steps.length - 1)) * 100}%`,
              backgroundColor: primaryColor
            }}
          ></div>

          {steps.map((s) => {
            const isCompleted = step > s.id;
            const isActive = step === s.id;
            const Icon = s.icon;

            return (
              <div key={s.id} className="flex flex-col items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-white ${isCompleted || isActive ? 'shadow-lg' : 'border-gray-100'
                    }`}
                  style={{
                    borderColor: isCompleted || isActive ? primaryColor : '#f3f4f6',
                    backgroundColor: isCompleted ? primaryColor : 'white',
                    color: isCompleted ? 'white' : (isActive ? primaryColor : '#d1d5db')
                  }}
                >
                  {isCompleted ? <Check size={18} /> : <Icon size={18} />}
                </div>
                <span
                  className={`text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${isActive ? 'text-gray-900' : 'text-gray-300'
                    }`}
                  style={isActive ? { color: primaryColor } : {}}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const toTimestamp = (dateStr: string) => {
    if (!dateStr) return 0;
    // Remove 'Z' if it exists to treat everything as naive/local wall-clock time
    const cleanDateStr = dateStr.endsWith('Z') ? dateStr.substring(0, dateStr.length - 1) : dateStr;
    const parts = cleanDateStr.split(/[-T :]/);
    if (parts.length < 3) return 0;
    const y = parseInt(parts[0]);
    const m = parseInt(parts[1]) - 1;
    const d = parseInt(parts[2]);
    const h = parts.length > 3 ? parseInt(parts[3]) : 0;
    const min = parts.length > 4 ? parseInt(parts[4]) : 0;
    // We use UTC just to get a stable comparable integer based on the wall-clock numbers
    return Date.UTC(y, m, d, h, min);
  };

  const getSlotsForDate = (date: string) => {
    if (selectedServices.length === 0) return [];
    const nowJST = getNowJST();
    const todayStr = formatLiteralDate(nowJST);
    const isToday = date === todayStr;
    const currentMinutes = nowJST.getHours() * 60 + nowJST.getMinutes();
    const jsDayOfWeek = new Date(date + 'T12:00:00').getDay();
    const jsDayToPtDay: Record<number, string> = {
      1: 'segunda', 2: 'terca', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sabado', 0: 'domingo'
    };
    const dayName = jsDayToPtDay[jsDayOfWeek];
    const config = normalizedHours.find(h => {
      const hDay = String(h.day).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return hDay === dayName || hDay === String(jsDayOfWeek);
    });
    
    if (!config || !config.isWorking) return [];
    let startTime = config.startTime || '09:00';
    let endTime = config.endTime || '18:00';

    if (totalDuration >= 1440) {
      endTime = startTime;
    }

    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const totalSlotDuration = totalDuration + totalBuffer;
    const interval = availability.intervalMinutes || 30;
    const times: { time: string, isAvailable: boolean }[] = [];
    
    const baseIntervalTimes: number[] = [];
    if (config.timeType === 'fixed' && config.fixedTimes && config.fixedTimes.length > 0) {
      config.fixedTimes.forEach((tStr: string) => baseIntervalTimes.push(toMin(tStr)));
    } else {
      let curr = toMin(startTime);
      const end = (totalDuration >= 1440) ? curr : toMin(endTime);
      while (curr <= end) {
        baseIntervalTimes.push(curr);
        if (totalDuration >= 1440) break;
        curr += interval;
      }
    }

    for (const curr of baseIntervalTimes) {
      // Regra do Último Horário para modo intervalo
      if (config.timeType !== 'fixed' && totalDuration < 1440 && (curr + totalSlotDuration) > toMin(endTime)) {
        break; 
      }

      if (isToday && curr <= currentMinutes + 15) {
        continue;
      }
      const timeStr = `${String(Math.floor(curr / 60)).padStart(2, '0')}:${String(curr % 60).padStart(2, '0')}`;
      const slotStartTimestamp = toTimestamp(`${date} ${timeStr}`);
      const slotEndTimestamp = slotStartTimestamp + (totalSlotDuration * 60000);

      const isBusy = (busyAppointments || []).some(a => {
        if (a.status === 'canceled' || a.status === 'rejected') return false;
        const apptStartTimestamp = toTimestamp(a.startAt);
        const apptEndTimestamp = a.endAt ? toTimestamp(a.endAt) : apptStartTimestamp + (a.duration * 60000);
        return (slotStartTimestamp < apptEndTimestamp && slotEndTimestamp > apptStartTimestamp);
      });

      const isBlockedInSlot = (availability.blockedDates || []).some(b => {
        const bDate = b.date?.includes('T') ? b.date.split('T')[0] : b.date;
        if (bDate !== date) return false;
        if (!b.startTime) return true;
        const bStart = toMin(b.startTime);
        const bEnd = b.endTime ? toMin(b.endTime) : bStart + (availability.intervalMinutes || 30);
        const slotStart = toMin(timeStr);
        const slotEnd = slotStart + totalDuration;
        return (slotStart < bEnd && slotEnd > bStart);
      });

      times.push({ time: timeStr, isAvailable: !isBusy && !isBlockedInSlot });
    }
    return times;
  };

  const renderCalendar = () => {
    const nowJST = getNowJST();
    const todayStr = formatLiteralDate(nowJST);
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = new Date(year, month, 1).getDay();
    const days = [];
    const jsDayToPtDay: Record<number, string> = {
      1: 'segunda', 2: 'terca', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sabado', 0: 'domingo'
    };
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-12 w-full"></div>);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const jsDayOfWeek = new Date(year, month, d).getDay();
      const dayString = jsDayToPtDay[jsDayOfWeek];
      const isPastOrToday = dateStr <= todayStr;
      const isSelected = selectedDate === dateStr;
      const scheduleForDay = normalizedHours.find(h => {
        const hDay = String(h.day).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return hDay === dayString || hDay === String(jsDayOfWeek);
      });
      const isDayOff = !scheduleForDay || !scheduleForDay.isWorking;
      const isFullDayBlocked = (availability.blockedDates || []).some(b => (b.date?.split('T')[0] === dateStr) && !b.startTime);
      const daySlots = selectedServices.length > 0 ? getSlotsForDate(dateStr) : [];
      const hasNoSlots = selectedServices.length > 0 && scheduleForDay && (scheduleForDay as any).timeType === 'fixed' && (!( scheduleForDay as any).fixedTimes || (scheduleForDay as any).fixedTimes.length === 0);
      const isDayFull = hasNoSlots || (selectedServices.length > 0 ? daySlots.length > 0 && daySlots.every(s => !s.isAvailable) : false);
      const isMonthAvailable = (availability.availableMonths || [1,2,3,4,5,6,7,8,9,10,11,12]).includes(month + 1);
      const isUnavailable = isPastOrToday || isDayOff || isFullDayBlocked || isDayFull || !isMonthAvailable;

      // Cores para os finais de semana
      let weekendStyle = {};
      if (jsDayOfWeek === 0) weekendStyle = { backgroundColor: '#f9fafb' }; // Domingo (Cinza muito claro)
      if (jsDayOfWeek === 6) weekendStyle = { backgroundColor: '#f3f4f6' }; // Sábado (Cinza claro)

      days.push(
        <button
          key={d}
          disabled={isUnavailable}
          onClick={() => { setSelectedDate(dateStr); setSelectedTime(''); setDateSubStep('time'); }}
          className={`h-11 w-11 mx-auto flex items-center justify-center rounded-2xl text-sm font-black transition-all ${isUnavailable
            ? 'text-gray-200 cursor-not-allowed line-through'
            : isSelected
              ? 'text-white shadow-lg scale-110'
              : 'text-gray-700 hover:bg-gray-100 hover:text-primary hover:scale-105'
            }`}
          style={{
            ...weekendStyle,
            ...(!isUnavailable && isSelected ? { backgroundColor: primaryColor, boxShadow: `0 8px 15px -4px ${primaryColor}66` } : {})
          }}
        >
          {d}
        </button>
      );
    }
    return days;
  };

  const slots = selectedDate ? getSlotsForDate(selectedDate) : [];

  const handleFinalConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg('');
    if (!clientData.name.trim() || !clientData.phone.trim()) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios (Nome e Telefone).');
      setIsSubmitting(false);
      return;
    }
    // Japanese phone validation: must have exactly 11 digits
    if (rawPhoneDigits.length !== 11) {
      setErrorMsg('O telefone deve ter 11 dígitos no formato 0XX-XXXX-XXXX.');
      setIsSubmitting(false);
      return;
    }
    const normalizedName = toTitleCase(clientData.name);
    const result = await onBook({
      serviceId: 0, // Using 0 for combined services to avoid extra buffers in backend
      serviceName: combinedServiceNames,
      // Usamos string pura (naive) para evitar deslocamento de timezone (toISOString causava bugs)
      startAt: `${selectedDate} ${selectedTime}:00`,
      duration: totalDuration + totalBuffer, // Send total occupied time
      clientName: normalizedName,
      clientPhone: clientData.phone,
      clientEmail: clientData.email || ''
    });
    if (result === true) {
      setStep(5);
    } else {
      setErrorMsg(typeof result === 'string' ? result : 'Não foi possível salvar seu agendamento. Tente novamente.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      <style>{`
        .focus-border-dynamic:focus {
          border-color: ${primaryColor} !important;
        }
        .focus-within-text-dynamic:focus-within {
          color: ${primaryColor} !important;
        }
      `}</style>
      <div className="w-full max-w-4xl bg-white md:my-10 md:rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-screen md:min-h-0 border border-gray-100">

        <header className="relative h-auto min-h-[280px] md:h-80 bg-gray-100 overflow-hidden">
          {/* Imagem de capa - preenche TODO o header */}
          <div className="absolute inset-0 bg-black">
            {coverImage ? (
              <img src={coverImage} className="w-full h-full object-cover" style={{ opacity: coverOpacity / 100 }} alt="Banner" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary to-indigo-900 opacity-90"></div>
            )}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"></div>
          </div>

          {/* Desktop - Imagem absolute na posição original */}
          {profileImage && (
            <div
              className="
                hidden
                md:block
                absolute
                right-12
                top-1/2
                -translate-y-1/2
                z-20
                w-[200px] h-[200px]
                rounded-xl
                overflow-hidden
                border border-white/30
                bg-white/10
                backdrop-blur-xl
                shadow-2xl
              "
            >
              <img
                src={profileImage}
                alt="Logo ou Perfil"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {(step > 1 && step < 5) && (
            <button
              onClick={() => {
                if (step === 2 && dateSubStep === 'time') {
                  setSelectedDate('');
                  setSelectedTime('');
                  setDateSubStep('calendar');
                } else {
                  setStep((step - 1) as any);
                }
              }}
              className="absolute top-8 left-8 bg-white/10 hover:bg-white/20 backdrop-blur-xl p-3 rounded-2xl text-white border border-white/20 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 z-30"
            >
              <ChevronLeft size={16} /> Voltar
            </button>
          )}

          {/* Mobile - Imagem NO FLUXO NORMAL (não absolute) */}
          {profileImage && (
            <div className="
              md:hidden
              flex justify-center
              pt-20
              mb-8
              relative
              z-20
            ">
              <div
                className="
                  w-[150px] h-[150px]
                  rounded-xl
                  overflow-hidden
                  border border-white/30
                  bg-white/10
                  backdrop-blur-xl
                  shadow-2xl
                "
              >
                <img
                  src={profileImage}
                  alt="Logo ou Perfil"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Conteúdo do header - NO FLUXO NORMAL para mobile, ABSOLUTE para desktop */}
          <div className="relative md:absolute px-6 pb-8 md:bottom-12 md:left-10 md:right-10 md:z-10 animate-fade-in md:pt-0">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
              <span className="text-white text-[10px] font-black uppercase tracking-[0.3em] bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/40 shadow-lg">Agendamento Online</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight mb-2 text-center md:text-left drop-shadow-lg">{companyName}</h1>
            {shortDescription && step === 1 && (
              <p className="text-white text-sm md:text-base font-bold max-w-lg line-clamp-2 text-center md:text-left mx-auto md:mx-0 drop-shadow-md">{shortDescription}</p>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 md:p-12">
          {renderProgressBar()}

          {step === 1 && (
            <div className="animate-fade-in space-y-12">
              <div className="text-center space-y-3">
                <h2 className="text-3xl md:text-4xl font-black tracking-tight" style={{ color: primaryColor }}>
                  {servicesTitle || 'Serviços Disponíveis'}
                </h2>
                <p className="text-gray-400 text-sm font-medium" style={{ color: primaryColor + '99' }}>
                  {servicesSubtitle || 'Selecione o procedimento desejado abaixo para ver horários'}
                </p>
              </div>

              <div className={viewMode === 'list' ? "flex flex-col gap-4" : "grid grid-cols-1 md:grid-cols-2 gap-6"}>
                {(services || []).length > 0 ? (services || []).map(s => {
                  const isSelected = selectedServices.some(curr => curr.id === s.id);
                  
                  if (viewMode === 'list') {
                      return (
                        <button
                          key={s.id}
                          onClick={() => toggleService(s)}
                          className={`w-full bg-white border-2 rounded-2xl p-3 transition-all flex flex-row items-center gap-3 relative overflow-hidden group shadow-sm hover:shadow-md text-left`}
                          style={isSelected
                            ? { borderColor: primaryColor, backgroundColor: primaryColor + '08' }
                            : { borderColor: '#f3f4f6' }
                          }
                        >
                          {/* Left: Image (if any) */}
                          {s.imageUrl && (
                            <div className="w-14 h-14 shrink-0 rounded-xl overflow-hidden shadow-sm relative border border-gray-100 bg-gray-50">
                              <img 
                                src={s.imageUrl} 
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                                style={{ opacity: (s.imageOpacity ?? 100) / 100 }}
                                alt={s.name}
                              />
                              <div className="absolute inset-0 bg-black/5 pointer-events-none" />
                            </div>
                          )}
                          
                          {/* Middle: Content */}
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <h3 className="font-black text-sm sm:text-base tracking-tight capitalize truncate" style={{ color: s.nameColor || primaryColor }}>{s.name}</h3>
                            
                            <div className="mt-1 flex items-center gap-1.5 font-black text-[10px] uppercase tracking-widest" style={{ color: s.descriptionColor || '#9ca3af' }}>
                              <Clock size={12} style={{ color: primaryColor }} /> {formatDurationFriendly(s.duration)}
                            </div>
                          </div>

                          {/* Right: Price & Button */}
                          <div className="shrink-0 flex flex-col items-end justify-center border-l border-gray-100 pl-3 ml-1 gap-1.5">
                            {s.price > 0 && <span className="font-black text-xs text-gray-900 leading-none">¥ {s.price.toLocaleString()}</span>}
                            <span 
                              className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg text-white shadow-sm"
                              style={{ backgroundColor: primaryColor }}
                            >
                              {isSelected ? '✓' : 'Selecionar'}
                            </span>
                          </div>
                        </button>
                      );
                  }

                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleService(s)}
                      className={`p-8 bg-white border-2 rounded-xl text-left transition-all group relative overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 flex flex-col h-full`}
                      style={isSelected
                        ? { borderColor: primaryColor, boxShadow: `0 0 0 4px ${primaryColor}22` }
                        : { borderColor: '#f3f4f6' }
                      }
                    >
                      {s.imageUrl && (
                        <div 
                          className="absolute inset-0 w-full h-full pointer-events-none transition-transform duration-300 group-hover:scale-[1.03]"
                          style={{ 
                            backgroundImage: `url(${s.imageUrl})`, 
                            backgroundSize: 'cover', 
                            backgroundPosition: 'center', 
                            opacity: (s.imageOpacity ?? 100) / 100 
                          }} 
                        />
                      )}

                      {s.imageUrl && (
                        <div className="absolute inset-0 bg-white/60 pointer-events-none z-0" />
                      )}

                      <div className="relative z-10 flex flex-col h-full justify-between w-full">
                        <div className="flex-1 flex flex-col">
                          <div className="mb-4">
                            <h3 className="font-black text-2xl capitalize tracking-tight" style={{ color: s.nameColor || primaryColor }}>{s.name}</h3>
                          </div>
                          <p className="text-sm font-medium mb-4 leading-relaxed line-clamp-3" style={{ color: s.descriptionColor || '#9ca3af' }}>{s.description}</p>
                          <div className="mt-auto mb-3 flex items-center gap-1.5 font-black text-[11px] uppercase tracking-widest" style={{ color: s.descriptionColor || '#9ca3af' }}>
                            <Clock size={16} style={{ color: primaryColor }} /> {formatDurationFriendly(s.duration)}
                          </div>
                        </div>
                        <div className="flex justify-between items-center border-t border-gray-100/50 pt-4">
                          <div>
                            {s.price > 0 && <span className="font-black text-base text-gray-900 leading-none tracking-wide">¥ {s.price.toLocaleString()}</span>}
                          </div>
                          <span 
                            className="text-xs font-black uppercase tracking-widest px-6 py-2.5 rounded-xl text-white text-center shadow-sm"
                            style={{ backgroundColor: primaryColor }}
                          >
                            {isSelected ? 'Selecionado ✓' : 'Selecionar'}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                }) : (
                  <div className="col-span-full py-24 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                    <Briefcase size={40} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-400 font-black uppercase tracking-widest text-sm">Nenhum serviço disponível</p>
                  </div>
                )}
              </div>

              {selectedServices.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 z-[100] animate-slide-up">
                  <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                    <div className="flex -space-x-3">
                      {selectedServices.slice(0, 3).map((s) => (
                        <div
                          key={s.id}
                          className="w-12 h-12 rounded-xl border-4 border-white flex items-center justify-center shadow-lg"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <Briefcase size={20} color="white" />
                        </div>
                      ))}
                      {selectedServices.length > 3 && (
                        <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-400 border-4 border-white flex items-center justify-center font-black">
                          +{selectedServices.length - 3}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-black text-gray-900 text-xl tracking-tight">{selectedServices.length} {selectedServices.length === 1 ? 'serviço selecionado' : 'serviços selecionados'}</p>
                      <p className="text-gray-400 text-sm font-medium">Duração: <b>{formatDurationFriendly(totalDuration)}</b> • <b>¥ {totalPrice.toLocaleString()}</b></p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setStep(2)}
                    className="w-full md:w-auto px-12 py-5 bg-primary text-white font-black rounded-3xl shadow-2xl shadow-primary/30 uppercase tracking-[0.2em] text-[11px] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Agendar um horário <ArrowRight size={20} />
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 2 && dateSubStep === 'calendar' && (
            <div className="animate-fade-in space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-3xl md:text-4xl font-black tracking-tight" style={{ color: primaryColor }}>
                  Escolha uma data
                </h2>
                <p className="text-gray-400 text-sm font-medium">
                  {combinedServiceNames} · {formatDurationFriendly(totalDuration)}
                </p>
              </div>

              <div className="max-w-sm mx-auto bg-white rounded-2xl border border-gray-100 shadow-xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-gray-900 text-sm capitalize">
                    {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="flex gap-1">
                    <button onClick={() => { const d = new Date(currentMonth); d.setMonth(d.getMonth() - 1); setCurrentMonth(d); }} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"><ChevronLeft size={18} /></button>
                    <button onClick={() => { const d = new Date(currentMonth); d.setMonth(d.getMonth() + 1); setCurrentMonth(d); }} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"><ChevronRight size={18} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-gray-300 mb-4 uppercase tracking-widest">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <div key={`${d}-${i}`}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-y-2">{renderCalendar()}</div>
              </div>
            </div>
          )}

          {step === 2 && dateSubStep === 'time' && (
            <div className="animate-fade-in space-y-8">
              <div className="text-center space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight" style={{ color: primaryColor }}>
                  Escolha um horário
                </h2>
                <p className="text-gray-400 text-sm font-medium">{combinedServiceNames}</p>
              </div>

              <div className="max-w-sm mx-auto space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Horários disponíveis</span>
                  {slots.filter(s => s.isAvailable).length > 0 && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: primaryColor + '18', color: primaryColor }}>
                      {slots.filter(s => s.isAvailable).length} disponíveis
                    </span>
                  )}
                </div>

                {slots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {slots.map(s => (
                      <button
                        key={s.time}
                        disabled={!s.isAvailable}
                        onClick={() => setSelectedTime(s.time)}
                        className={`py-4 rounded-xl text-sm font-black border-2 transition-all ${
                          selectedTime === s.time
                            ? 'text-white scale-105 shadow-xl'
                            : !s.isAvailable
                              ? 'bg-gray-50 text-gray-200 border-gray-100 line-through cursor-not-allowed'
                              : 'bg-white text-gray-700 border-gray-100 hover:scale-[1.02]'
                        }`}
                        style={selectedTime === s.time ? { backgroundColor: primaryColor, borderColor: primaryColor, boxShadow: `0 8px 20px -5px ${primaryColor}66` } : {}}
                      >
                        {s.time}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 bg-red-50 rounded-2xl border border-red-100 gap-3">
                    <Ban size={24} className="text-red-400" />
                    <p className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center">Tudo lotado para este dia</p>
                  </div>
                )}

                {selectedTime && (
                  <button
                    onClick={() => setStep(3)}
                    className="w-full py-5 text-white font-black rounded-2xl uppercase tracking-[0.2em] text-[11px] transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
                    style={{ backgroundColor: primaryColor, boxShadow: `0 8px 25px -8px ${primaryColor}88` }}
                  >
                    Continuar <ArrowRight size={18} />
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="max-w-md mx-auto animate-fade-in">
              <div className="text-center mb-12">
                <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: primaryColor + '20', color: primaryColor }}>
                  <User size={32} />
                </div>
                <h2 className="text-3xl font-black tracking-tight" style={{ color: primaryColor }}>Seus Dados</h2>
                <p className="text-gray-400 text-sm font-medium mt-2">Preencha seus dados para o Agendamento:</p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); setStep(4); }} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Nome Completo *</label>
                  <div className="relative group focus-within-text-dynamic">
                    <User className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-current transition-colors" size={20} />
                    <input required className="w-full pl-16 pr-6 py-5 rounded-3xl bg-gray-50 border-2 border-gray-300 shadow-sm focus-border-dynamic focus:bg-white focus:ring-0 text-gray-900 outline-none transition-all font-bold text-lg placeholder:text-gray-400 placeholder:font-medium" value={clientData.name} onChange={e => setClientData({ ...clientData, name: toTitleCase(e.target.value) })} placeholder="Maria Bonita" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">WhatsApp / Telefone *</label>
                  <div className="relative group focus-within-text-dynamic">
                    <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-current transition-colors" size={20} />
                    <input
                      required
                      type="tel"
                      inputMode="numeric"
                      maxLength={13}
                      className="w-full pl-16 pr-6 py-5 rounded-3xl bg-gray-50 border-2 border-gray-300 shadow-sm focus-border-dynamic focus:bg-white focus:ring-0 text-gray-900 outline-none transition-all font-mono font-bold text-lg placeholder:text-gray-400"
                      value={clientData.phone}
                      onChange={e => handlePhoneChange(e.target.value)}
                      placeholder="090 0000 0000"
                    />
                  </div>
                  {/* Digit counter */}
                  <div className="flex justify-end px-2 mt-1">
                    <span className={`text-[10px] font-bold tabular-nums transition-colors ${
                      rawPhoneDigits.length === 11 ? 'text-green-500' :
                      rawPhoneDigits.length > 0    ? 'text-amber-500' : 'text-gray-300'
                    }`}>
                      {rawPhoneDigits.length}/11 dígitos
                      {rawPhoneDigits.length === 11 && ' ✓'}
                    </span>
                  </div>
                </div>


                <button type="submit" className="w-full py-5 text-white font-black rounded-3xl shadow-2xl shadow-primary/30 uppercase tracking-[0.2em] text-[11px] mt-10 transition-all hover:scale-[1.03] active:scale-95 flex items-center justify-center gap-3" style={{ backgroundColor: primaryColor }}>
                  Revisar Agendamento <ArrowRight size={18} />
                </button>
              </form>
            </div>
          )}

          {step === 4 && (
            <div className="max-w-md mx-auto animate-fade-in">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Confirme o seu agendamento:</h2>
                <p className="text-gray-400 text-sm font-medium mt-2">Confira se tudo está correto antes de confirmar.</p>
              </div>

              <div className="bg-gray-50 rounded-3xl p-10 space-y-8 text-left border border-gray-100 mb-8 shadow-inner relative overflow-hidden">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <p className="font-black text-2xl tracking-tight capitalize leading-tight" style={{ color: primaryColor }}>{combinedServiceNames}</p>
                    {totalPrice > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-lg font-black text-gray-900">
                          {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(totalPrice)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</label>
                    <p className="font-bold text-gray-800 text-lg leading-tight">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hora</label>
                    <div className="flex items-center gap-2">
                      <Clock size={18} style={{ color: primaryColor }} />
                      <p className="font-black text-gray-800 text-2xl leading-none">{selectedTime}</p>
                    </div>
                  </div>
                </div>
                <div className="pt-8 border-t border-gray-200 flex flex-col gap-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-gray-100" style={{ color: primaryColor }}><Clock size={18} /></div>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Duração Total</p>
                      <p className="font-bold text-gray-900">{formatDurationFriendly(totalDuration)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-gray-100" style={{ color: primaryColor }}><User size={18} /></div>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Cliente</p>
                      <p className="font-bold text-gray-900">{clientData.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-gray-100" style={{ color: primaryColor }}><Phone size={18} /></div>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">WhatsApp</p>
                      <p className="font-bold text-gray-900">{clientData.phone}</p>
                    </div>
                  </div>

                </div>
              </div>

              {errorMsg && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center gap-3 text-xs font-bold animate-pulse">
                  <AlertCircle size={18} />
                  {errorMsg}
                </div>
              )}

              <button onClick={handleFinalConfirm} disabled={isSubmitting} className="w-full py-6 text-white font-black rounded-3xl shadow-2xl shadow-primary/30 uppercase tracking-[0.2em] text-[12px] transition-all hover:scale-[1.03] active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50" style={{ backgroundColor: primaryColor }}>
                {isSubmitting ? (
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <><CheckCircle size={20} /> Confirmar Agendamento</>
                )}
              </button>
              <button onClick={() => setStep(3)} disabled={isSubmitting} className="w-full mt-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">
                Corrigir meus dados
              </button>
            </div>
          )}

          {step === 5 && (
            <div className="text-center py-16 animate-fade-in flex flex-col items-center">
              <div className="w-24 h-24 bg-green-50 text-green-500 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner animate-bounce">
                <CheckCircle size={48} />
              </div>
              <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-3">Agendamento Confirmado!</h2>
              <p className="text-gray-400 mb-10 max-w-sm mx-auto font-medium text-base leading-relaxed">
                Olá, <b>{clientData.name}</b>! Seu agendamento foi realizado com sucesso.
              </p>
              <div className="bg-gray-50 p-10 rounded-2xl border border-gray-100 mb-10 w-full max-w-md text-left shadow-sm">
                <p className="text-[11px] font-black text-gray-300 uppercase tracking-[0.2em] mb-4">DETALHES DO AGENDAMENTO</p>
                <p className="font-black text-gray-900 text-2xl mb-2 capitalize leading-tight" style={{ color: primaryColor }}>{combinedServiceNames}</p>
                <div className="flex items-center gap-2 text-gray-600 font-bold text-lg">
                  <Calendar size={20} className="text-gray-300" />
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} às {selectedTime}
                </div>
              </div>
              <button onClick={() => window.location.reload()} className="px-16 py-6 text-white font-black rounded-3xl shadow-2xl uppercase tracking-[0.2em] text-[11px] transition-all hover:scale-105 active:scale-95" style={{ backgroundColor: primaryColor }}>
                Voltar ao Início
              </button>
            </div>
          )}
        </main>
      </div>

      <footer className="mt-12 mb-16 flex flex-col items-center opacity-30">
        <p className="text-[8px] font-bold text-gray-400 tracking-[0.2em] text-center">
          © {new Date().getFullYear()} creative print. todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
};