// Motor de agendamento — funções puras sem I/O (testáveis sem banco de dados)
// Suporta todos os fusos horários brasileiros (sem DST desde Decreto 9.772/2019).

// ---------------------------------------------------------------------------
// Fusos horários brasileiros disponíveis para seleção
// ---------------------------------------------------------------------------

export const BRAZIL_TIMEZONES = [
  { value: 'America/Noronha',     label: 'Fernando de Noronha (UTC-2)' },
  { value: 'America/Sao_Paulo',   label: 'Brasília (UTC-3) — SP, RJ, MG, ES, Sul, Nordeste, GO, DF, TO, PA, AP' },
  { value: 'America/Manaus',      label: 'Amazonas (UTC-4) — AM, RR' },
  { value: 'America/Cuiaba',      label: 'Centro-Oeste (UTC-4) — MT, MS' },
  { value: 'America/Porto_Velho', label: 'Rondônia (UTC-4) — RO' },
  { value: 'America/Rio_Branco',  label: 'Acre (UTC-5) — AC' },
] as const;

export type BrazilTimezone = typeof BRAZIL_TIMEZONES[number]['value'];

export const VALID_BRAZIL_TIMEZONES = new Set<string>(BRAZIL_TIMEZONES.map(t => t.value));

/** Fuso padrão (retrocompatibilidade) */
export const TZ = 'America/Sao_Paulo';

// ---------------------------------------------------------------------------
// Funções de tempo por timezone
// ---------------------------------------------------------------------------

/** Hora atual com valores de parede (wall-clock) no timezone informado */
export function nowInTZ(tz: string): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
}

/** Converte qualquer Date para string YYYY-MM-DD no timezone informado */
export function dateInTZ(d: Date, tz: string): string {
  return d.toLocaleDateString('en-CA', { timeZone: tz });
}

/** Data de hoje como YYYY-MM-DD no timezone informado */
export function todayInTZ(tz: string): string {
  return dateInTZ(new Date(), tz);
}

// Aliases retrocompatíveis (Brasília)
export const nowBRT    = ()        => nowInTZ(TZ);
export const dateBRT   = (d: Date) => dateInTZ(d, TZ);
export const todayBRT  = ()        => todayInTZ(TZ);

// ---------------------------------------------------------------------------
// Conversão hora local → UTC
// ---------------------------------------------------------------------------

/**
 * Converte um horário local (wall-clock) em um timezone específico para timestamp UTC (ms).
 * Funciona para todos os fusos brasileiros (fixos, sem DST desde 2019).
 *
 * Exemplo:
 *   localToUTCMs('2026-06-10', '09:00', 'America/Sao_Paulo') → 12:00 UTC
 *   localToUTCMs('2026-06-10', '09:00', 'America/Manaus')    → 13:00 UTC
 */
export function localToUTCMs(dateStr: string, timeHHMM: string, tz: string): number {
  // Cria uma Date "ingênua" tratando o horário como UTC
  const naive = new Date(`${dateStr}T${timeHHMM}:00Z`);
  // Descobre o offset do timezone nessa data (em ms, negativo para fusos a oeste)
  const utcWall   = new Date(naive.toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
  const localWall = new Date(naive.toLocaleString('en-US', { timeZone: tz })).getTime();
  const offsetMs  = localWall - utcWall;
  // Ajusta para obter o UTC real correspondente ao horário local
  return naive.getTime() - offsetMs;
}

// ---------------------------------------------------------------------------
// Tipos compartilhados
// ---------------------------------------------------------------------------

export interface WorkingHourConfig {
  day: string;
  isWorking: boolean;
  startTime?: string;
  endTime?: string;
  timeType?: 'fixed' | 'interval';
  fixedTimes?: string[];
  [key: string]: unknown;
}

export interface AppointmentSlot {
  start_at: Date;
  duration: number;
  end_datetime?: Date | null;
}

export interface BlockedTimeSlot {
  start_time: Date | null;
  end_time: Date | null;
}

// ---------------------------------------------------------------------------
// Funções auxiliares de tempo
// ---------------------------------------------------------------------------

/** Converte HH:MM para minutos desde meia-noite */
export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Converte minutos desde meia-noite para HH:MM */
export function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Motor de geração de slots
// ---------------------------------------------------------------------------

const JS_DAY_TO_PT: Record<number, string> = {
  0: 'domingo', 1: 'segunda', 2: 'terca', 3: 'quarta',
  4: 'quinta',  5: 'sexta',   6: 'sabado',
};

function normalizeDay(day: string): string {
  return String(day).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Localiza a configuração de horário para o dia da semana da data informada.
 * Usa T12:00:00Z para evitar problemas de fuso na determinação do dia.
 */
export function getDayConfig(
  workingHours: WorkingHourConfig[],
  dateStr: string
): WorkingHourConfig | null {
  const jsDay  = new Date(dateStr + 'T12:00:00Z').getDay();
  const target = JS_DAY_TO_PT[jsDay];
  return workingHours.find(h => normalizeDay(h.day) === target) ?? null;
}

/**
 * Gera os horários base (em minutos desde meia-noite) para um dia útil.
 * totalSlotMin = duration + cleaning_buffer_min
 */
export function getBaseSlots(
  config: WorkingHourConfig,
  intervalMinutes: number,
  totalSlotMin: number
): number[] {
  if (!config.isWorking) return [];

  if (config.timeType === 'fixed' && Array.isArray(config.fixedTimes)) {
    return (config.fixedTimes as string[]).map(toMinutes);
  }

  const startMin = toMinutes(config.startTime ?? '09:00');
  const endMin   = toMinutes(config.endTime   ?? '18:00');
  const slots: number[] = [];
  for (let cur = startMin; cur + totalSlotMin <= endMin; cur += intervalMinutes) {
    slots.push(cur);
  }
  return slots;
}

/**
 * Remove horários já passados quando a data consultada é hoje no fuso do profissional.
 * Parâmetros explícitos para facilitar testes unitários.
 *
 * @param slots          Slots em minutos desde meia-noite
 * @param dateStr        Data consultada YYYY-MM-DD
 * @param todayInTZStr   Hoje no timezone do profissional (YYYY-MM-DD)
 * @param currentMinInTZ Minutos desde meia-noite no timezone do profissional
 */
export function filterPastSlots(
  slots: number[],
  dateStr: string,
  todayInTZStr: string,
  currentMinInTZ: number
): number[] {
  if (dateStr !== todayInTZStr) return slots;
  return slots.filter(s => s > currentMinInTZ + 15);
}

/**
 * Determina a disponibilidade de cada slot.
 * Usa end_datetime do agendamento quando disponível (inclui cleaning_buffer_min).
 *
 * @param tz Timezone do profissional — usado para converter horário local → UTC.
 *           Default: 'America/Sao_Paulo' para retrocompatibilidade.
 */
export function buildSlotList(
  slots: number[],
  dateStr: string,
  totalSlotMin: number,
  appointments: AppointmentSlot[],
  blockedTimes: BlockedTimeSlot[],
  intervalMinutes: number,
  tz: string = TZ
): Array<{ time: string; isAvailable: boolean }> {
  const hasFullDayBlock = blockedTimes.some(b => !b.start_time);

  return slots.map(cur => {
    const timeStr  = minutesToTime(cur);
    const slotStart = localToUTCMs(dateStr, timeStr, tz);
    const slotEnd   = slotStart + totalSlotMin * 60000;

    if (hasFullDayBlock) return { time: timeStr, isAvailable: false };

    const busy = appointments.some(a => {
      const aStart = a.start_at.getTime();
      const aEnd   = a.end_datetime?.getTime() ?? (aStart + a.duration * 60000);
      return slotStart < aEnd && slotEnd > aStart;
    });

    const blocked = blockedTimes.some(b => {
      if (!b.start_time) return true;
      const bStart = toMinutes(b.start_time.toISOString().substring(11, 16));
      const bEnd   = b.end_time
        ? toMinutes(b.end_time.toISOString().substring(11, 16))
        : bStart + intervalMinutes;
      return cur < bEnd && cur + totalSlotMin > bStart;
    });

    return { time: timeStr, isAvailable: !busy && !blocked };
  });
}

/**
 * Valida que a data do agendamento é pelo menos 1 dia no futuro no fuso do profissional.
 *
 * @param startAtIso    ISO 8601 timestamp do início do agendamento
 * @param todayInTZStr  Hoje no timezone do profissional (YYYY-MM-DD) — explícito para testabilidade
 * @param tz            Timezone do profissional
 * @returns Mensagem de erro, ou null se válido
 */
export function validateBookingDate(
  startAtIso: string,
  todayInTZStr: string,
  tz: string = TZ
): string | null {
  const startDateStr = new Date(startAtIso).toLocaleDateString('en-CA', { timeZone: tz });
  if (startDateStr <= todayInTZStr) {
    return 'Agendamentos devem ser feitos com pelo menos 1 dia de antecedência.';
  }
  return null;
}

/** Verifica se dois intervalos [aStart, aEnd) e [bStart, bEnd) se sobrepõem */
export function hasOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}
