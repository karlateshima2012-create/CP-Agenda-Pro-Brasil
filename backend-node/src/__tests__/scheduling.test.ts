import { describe, it, expect } from 'vitest';
import {
  TZ,
  dateBRT,
  toMinutes,
  minutesToTime,
  getDayConfig,
  getBaseSlots,
  filterPastSlots,
  buildSlotList,
  validateBookingDate,
  hasOverlap,
  WorkingHourConfig,
  AppointmentSlot,
  BlockedTimeSlot,
} from '../lib/scheduling.js';

// ===================================================================
// Helpers usados em vários grupos
// ===================================================================

const WORKING_HOURS: WorkingHourConfig[] = [
  { day: 'segunda',  isWorking: true,  startTime: '09:00', endTime: '18:00' },
  { day: 'terça',    isWorking: true,  startTime: '09:00', endTime: '18:00' }, // acentuado
  { day: 'quarta',   isWorking: true,  startTime: '09:00', endTime: '18:00' },
  { day: 'quinta',   isWorking: true,  startTime: '09:00', endTime: '18:00' },
  { day: 'sexta',    isWorking: true,  startTime: '09:00', endTime: '17:00' },
  { day: 'sabado',   isWorking: false, startTime: '09:00', endTime: '13:00' },
  { day: 'domingo',  isWorking: false, startTime: '09:00', endTime: '13:00' },
];

// Data fixa usada nos testes de disponibilidade (quarta-feira)
const WEDNESDAY = '2026-06-10';

function makeAppointment(
  dateStr: string,
  startHHMM: string,
  durationMin: number,
  bufferMin = 0
): AppointmentSlot {
  const start = new Date(`${dateStr}T${startHHMM}:00-03:00`);
  const totalMin = durationMin + bufferMin;
  return {
    start_at: start,
    duration: durationMin,
    end_datetime: new Date(start.getTime() + totalMin * 60000),
  };
}

function makeBlock(startHHMM: string | null, endHHMM: string | null = null): BlockedTimeSlot {
  return {
    start_time: startHHMM ? new Date(`1970-01-01T${startHHMM}:00Z`) : null,
    end_time:   endHHMM   ? new Date(`1970-01-01T${endHHMM}:00Z`)   : null,
  };
}

// ===================================================================
// toMinutes / minutesToTime
// ===================================================================

describe('toMinutes', () => {
  it('converte 00:00 → 0',    () => expect(toMinutes('00:00')).toBe(0));
  it('converte 09:00 → 540',  () => expect(toMinutes('09:00')).toBe(540));
  it('converte 18:30 → 1110', () => expect(toMinutes('18:30')).toBe(1110));
  it('converte 23:59 → 1439', () => expect(toMinutes('23:59')).toBe(1439));
});

describe('minutesToTime', () => {
  it('converte 0 → 00:00',    () => expect(minutesToTime(0)).toBe('00:00'));
  it('converte 540 → 09:00',  () => expect(minutesToTime(540)).toBe('09:00'));
  it('converte 1110 → 18:30', () => expect(minutesToTime(1110)).toBe('18:30'));
  it('converte 1439 → 23:59', () => expect(minutesToTime(1439)).toBe('23:59'));

  it('é inversa de toMinutes para horários padrão', () => {
    ['09:00', '09:30', '12:00', '17:30', '18:00'].forEach(t =>
      expect(minutesToTime(toMinutes(t))).toBe(t)
    );
  });
});

// ===================================================================
// dateBRT — fuso horário (crítico)
// ===================================================================

describe('dateBRT — fuso America/Sao_Paulo (UTC-3, sem horário de verão desde 2019)', () => {
  it('TZ constante é America/Sao_Paulo', () => {
    expect(TZ).toBe('America/Sao_Paulo');
  });

  it('23:00 UTC = 20:00 BRT → mesmo dia', () => {
    expect(dateBRT(new Date('2026-06-09T23:00:00Z'))).toBe('2026-06-09');
  });

  it('01:00 UTC = 22:00 BRT do dia anterior → retorna dia anterior', () => {
    // 2026-06-10T01:00Z = 22:00 BRT no dia 2026-06-09
    expect(dateBRT(new Date('2026-06-10T01:00:00Z'))).toBe('2026-06-09');
  });

  it('03:00 UTC = 00:00 BRT = meia-noite exata → retorna o dia seguinte', () => {
    // 2026-06-10T03:00Z = 00:00 BRT em 2026-06-10
    expect(dateBRT(new Date('2026-06-10T03:00:00Z'))).toBe('2026-06-10');
  });

  it('03:01 UTC = 00:01 BRT → retorna novo dia', () => {
    expect(dateBRT(new Date('2026-06-10T03:01:00Z'))).toBe('2026-06-10');
  });

  it('02:59 UTC = 23:59 BRT → ainda é o dia anterior', () => {
    expect(dateBRT(new Date('2026-06-10T02:59:00Z'))).toBe('2026-06-09');
  });

  it('funciona em janeiro (verão brasileiro, mas sem DST desde 2019)', () => {
    // Brasil aboliu o horário de verão em 2019 — sempre UTC-3
    expect(dateBRT(new Date('2026-01-15T03:00:00Z'))).toBe('2026-01-15');
  });

  it('funciona em julho (inverno brasileiro)', () => {
    expect(dateBRT(new Date('2026-07-15T03:00:00Z'))).toBe('2026-07-15');
  });
});

// ===================================================================
// getDayConfig — mapeamento dia da semana
// ===================================================================

describe('getDayConfig', () => {
  // 2026-06-08 = segunda-feira
  it('2026-06-08 é segunda-feira → isWorking=true', () => {
    const c = getDayConfig(WORKING_HOURS, '2026-06-08');
    expect(c?.day).toBe('segunda');
    expect(c?.isWorking).toBe(true);
  });

  // 2026-06-09 = terça-feira (nome com acento na lista)
  it('2026-06-09 é terça → encontrado mesmo com diacrítico no config', () => {
    const c = getDayConfig(WORKING_HOURS, '2026-06-09');
    expect(c).not.toBeNull();
    expect(c?.isWorking).toBe(true);
  });

  it('2026-06-10 é quarta-feira', () => {
    expect(getDayConfig(WORKING_HOURS, '2026-06-10')?.day).toBe('quarta');
  });

  it('2026-06-13 é sábado → isWorking=false', () => {
    const c = getDayConfig(WORKING_HOURS, '2026-06-13');
    expect(c?.day).toBe('sabado');
    expect(c?.isWorking).toBe(false);
  });

  it('2026-06-14 é domingo → isWorking=false', () => {
    const c = getDayConfig(WORKING_HOURS, '2026-06-14');
    expect(c?.day).toBe('domingo');
    expect(c?.isWorking).toBe(false);
  });

  it('retorna null quando lista está vazia', () => {
    expect(getDayConfig([], '2026-06-10')).toBeNull();
  });

  it('não confunde sábado com domingo', () => {
    const sat = getDayConfig(WORKING_HOURS, '2026-06-13');
    const sun = getDayConfig(WORKING_HOURS, '2026-06-14');
    expect(sat?.day).not.toBe(sun?.day);
  });
});

// ===================================================================
// getBaseSlots — geração de horários
// ===================================================================

describe('getBaseSlots', () => {
  const weekday: WorkingHourConfig = { day: 'segunda', isWorking: true, startTime: '09:00', endTime: '18:00' };
  const nonWorking: WorkingHourConfig = { day: 'domingo', isWorking: false, startTime: '09:00', endTime: '13:00' };

  it('retorna [] quando isWorking=false', () => {
    expect(getBaseSlots(nonWorking, 30, 30)).toHaveLength(0);
  });

  it('09:00-18:00 / interval=30 / service=30min → 18 slots (09:00..17:30)', () => {
    const slots = getBaseSlots(weekday, 30, 30);
    expect(slots).toHaveLength(18);
    expect(slots[0]).toBe(540);   // 09:00
    expect(slots[17]).toBe(1050); // 17:30
  });

  it('o último slot deve encaixar exatamente antes de endTime', () => {
    // service=60min: último slot é 17:00 (1020 + 60 = 1080 = 18:00 ✓)
    // 17:30 + 60 = 18:30 > 18:00 → não incluído
    const slots = getBaseSlots(weekday, 30, 60);
    expect(slots.at(-1)).toBe(1020); // 17:00
    expect(slots.includes(1050)).toBe(false);
  });

  it('cleaning buffer aumenta totalSlotMin e reduz número de slots', () => {
    const sem = getBaseSlots(weekday, 30, 30);
    const com = getBaseSlots(weekday, 30, 60); // 30 serviço + 30 buffer
    expect(com.length).toBeLessThan(sem.length);
    expect(com.at(-1)).toBe(1020); // 17:00
  });

  it('service=90min → último slot em 16:30', () => {
    const slots = getBaseSlots(weekday, 30, 90);
    expect(slots.at(-1)).toBe(990); // 16:30 (990 + 90 = 1080 = 18:00)
  });

  it('09:00-13:00 / interval=30 / service=30min → 8 slots', () => {
    const half: WorkingHourConfig = { day: 'sabado', isWorking: true, startTime: '09:00', endTime: '13:00' };
    const slots = getBaseSlots(half, 30, 30);
    expect(slots).toHaveLength(8); // 09:00..12:30
    expect(slots.at(-1)).toBe(750); // 12:30
  });

  it('modo fixedTimes retorna exatamente os horários informados', () => {
    const fixed: WorkingHourConfig = {
      day: 'segunda', isWorking: true, timeType: 'fixed',
      fixedTimes: ['09:00', '10:30', '14:00'],
    };
    expect(getBaseSlots(fixed, 30, 30)).toEqual([540, 630, 840]);
  });

  it('interval=60min / service=60min / 09:00-18:00 → 9 slots', () => {
    const slots = getBaseSlots(weekday, 60, 60);
    expect(slots).toHaveLength(9); // 09:00..17:00
    expect(slots[0]).toBe(540);
    expect(slots[8]).toBe(1020);
  });
});

// ===================================================================
// filterPastSlots — filtra passados quando data = hoje (BRT)
// ===================================================================

describe('filterPastSlots', () => {
  const ALL = [540, 570, 600, 630, 660]; // 09:00, 09:30, 10:00, 10:30, 11:00
  const TODAY    = '2026-06-10';
  const TOMORROW = '2026-06-11';

  it('retorna todos os slots quando a data não é hoje', () => {
    expect(filterPastSlots(ALL, TOMORROW, TODAY, 600)).toEqual(ALL);
  });

  it('quando data = hoje e currentMin=600 (10:00), cutoff=615 → só 10:30 e 11:00 passam', () => {
    const result = filterPastSlots(ALL, TODAY, TODAY, 600);
    expect(result).toEqual([630, 660]);
  });

  it('slot exatamente em currentMin+16 (acima do cutoff) é mantido', () => {
    // currentMin=540 → cutoff=555; slot 556 > 555 → mantido
    expect(filterPastSlots([556], TODAY, TODAY, 540)).toEqual([556]);
  });

  it('slot exatamente em currentMin+15 não é mantido (não é estritamente maior)', () => {
    // currentMin=540 → cutoff=555; slot 555: 555 > 555 = false → removido
    expect(filterPastSlots([555], TODAY, TODAY, 540)).toEqual([]);
  });

  it('remove todos os slots quando currentMin está no final do dia', () => {
    expect(filterPastSlots(ALL, TODAY, TODAY, 1050)).toEqual([]);
  });

  it('data futura mantém todos mesmo com currentMin alto', () => {
    expect(filterPastSlots(ALL, TOMORROW, TODAY, 1200)).toEqual(ALL);
  });
});

// ===================================================================
// validateBookingDate — validação com fuso BRT
// ===================================================================

describe('validateBookingDate', () => {
  const TODAY     = '2026-06-09'; // terça-feira
  const TOMORROW  = '2026-06-10';
  const NEXT_WEEK = '2026-06-16';

  it('rejeita data no passado', () => {
    // 2026-06-08T15:00Z = meio-dia BRT em 8/jun = ontem
    const err = validateBookingDate('2026-06-08T15:00:00Z', TODAY);
    expect(err).toBe('Agendamentos devem ser feitos com pelo menos 1 dia de antecedência.');
  });

  it('rejeita hoje ao meio-dia BRT', () => {
    const err = validateBookingDate('2026-06-09T15:00:00Z', TODAY);
    expect(err).toBe('Agendamentos devem ser feitos com pelo menos 1 dia de antecedência.');
  });

  it('rejeita hoje às 23:59 BRT (= 02:59 UTC do dia seguinte)', () => {
    // 2026-06-10T02:59Z = 23:59 BRT em 9/jun = ainda hoje
    const err = validateBookingDate('2026-06-10T02:59:00Z', TODAY);
    expect(err).toBe('Agendamentos devem ser feitos com pelo menos 1 dia de antecedência.');
  });

  it('aceita amanhã', () => {
    expect(validateBookingDate('2026-06-10T15:00:00Z', TODAY)).toBeNull();
  });

  it('aceita semana que vem', () => {
    expect(validateBookingDate('2026-06-16T15:00:00Z', TODAY)).toBeNull();
  });

  // Casos de fronteira do fuso horário
  it('FUSO: 2026-06-10T02:59Z = 23:59 BRT dia 9 → ainda hoje, rejeitado', () => {
    expect(validateBookingDate('2026-06-10T02:59:00Z', TODAY)).not.toBeNull();
  });

  it('FUSO: 2026-06-10T03:00Z = 00:00 BRT dia 10 → amanhã, aceito', () => {
    expect(validateBookingDate('2026-06-10T03:00:00Z', TODAY)).toBeNull();
  });

  it('FUSO: 2026-06-10T03:01Z = 00:01 BRT dia 10 → amanhã, aceito', () => {
    expect(validateBookingDate('2026-06-10T03:01:00Z', TODAY)).toBeNull();
  });

  it('FUSO: 2026-06-09T02:59Z = 23:59 BRT dia 8 → ontem, rejeitado', () => {
    expect(validateBookingDate('2026-06-09T02:59:00Z', TODAY)).not.toBeNull();
  });
});

// ===================================================================
// hasOverlap — detecção genérica de sobreposição
// ===================================================================

describe('hasOverlap', () => {
  it('intervalos adjacentes NÃO se sobrepõem (end == start)', () => {
    expect(hasOverlap(0, 60, 60, 120)).toBe(false);
  });

  it('intervalos com gap NÃO se sobrepõem', () => {
    expect(hasOverlap(0, 60, 61, 120)).toBe(false);
  });

  it('intervalos idênticos se sobrepõem', () => {
    expect(hasOverlap(0, 60, 0, 60)).toBe(true);
  });

  it('intervalo parcialmente sobreposto (início)', () => {
    expect(hasOverlap(0, 60, 30, 90)).toBe(true);
  });

  it('intervalo contido se sobrepõe', () => {
    expect(hasOverlap(0, 120, 30, 60)).toBe(true);
  });

  it('ordem invertida também detecta sobreposição', () => {
    expect(hasOverlap(30, 90, 0, 60)).toBe(true);
  });
});

// ===================================================================
// buildSlotList — motor de disponibilidade (núcleo do sistema)
// ===================================================================

describe('buildSlotList', () => {
  it('sem agendamentos e sem bloqueios → todos disponíveis', () => {
    const slots = [540, 570, 600];
    const result = buildSlotList(slots, WEDNESDAY, 30, [], [], 30);
    expect(result).toEqual([
      { time: '09:00', isAvailable: true },
      { time: '09:30', isAvailable: true },
      { time: '10:00', isAvailable: true },
    ]);
  });

  it('agendamento 09:00-09:30 bloqueia slot 09:00, libera 09:30', () => {
    const appts = [makeAppointment(WEDNESDAY, '09:00', 30)];
    const result = buildSlotList([540, 570], WEDNESDAY, 30, appts, [], 30);
    expect(result.find(s => s.time === '09:00')?.isAvailable).toBe(false);
    expect(result.find(s => s.time === '09:30')?.isAvailable).toBe(true);
  });

  it('slot que começa exatamente no fim do agendamento está disponível (sem sobreposição)', () => {
    // Agendamento 09:00-09:30 → slot 09:30 deve estar livre
    const appts = [makeAppointment(WEDNESDAY, '09:00', 30)];
    const result = buildSlotList([570], WEDNESDAY, 30, appts, [], 30);
    expect(result[0].isAvailable).toBe(true);
  });

  it('slot parcialmente sobreposto ao agendamento está indisponível', () => {
    // Agendamento 09:30-10:00; slot 09:15-09:45 → conflito
    const appts = [makeAppointment(WEDNESDAY, '09:30', 30)];
    const result = buildSlotList([555], WEDNESDAY, 30, appts, [], 30); // 555 = 09:15
    expect(result[0].isAvailable).toBe(false);
  });

  it('cleaning buffer (via end_datetime) estende o bloqueio do agendamento', () => {
    // Serviço 30min + 30min buffer → end_datetime = 11:00
    // Slot 10:30 (30min serviço) → 10:30-11:00 sobrepõe end_datetime=11:00 → bloqueado
    const appts = [makeAppointment(WEDNESDAY, '10:00', 30, 30)]; // end_datetime = 11:00
    const result = buildSlotList([600, 630], WEDNESDAY, 30, appts, [], 30);
    expect(result.find(s => s.time === '10:00')?.isAvailable).toBe(false); // durante serviço
    expect(result.find(s => s.time === '10:30')?.isAvailable).toBe(false); // durante buffer
  });

  it('slot em 11:00 está livre após agendamento com buffer que termina em 11:00', () => {
    const appts = [makeAppointment(WEDNESDAY, '10:00', 30, 30)]; // end_datetime = 11:00
    const result = buildSlotList([660], WEDNESDAY, 30, appts, [], 30); // 660 = 11:00
    expect(result[0].isAvailable).toBe(true);
  });

  it('bloqueio do dia inteiro (start_time=null) torna todos os slots indisponíveis', () => {
    const blocks = [makeBlock(null)];
    const result = buildSlotList([540, 570, 600, 630], WEDNESDAY, 30, [], blocks, 30);
    expect(result.every(s => !s.isAvailable)).toBe(true);
  });

  it('bloqueio parcial 09:30-10:30 afeta só slots sobrepostos', () => {
    const slots = [540, 570, 600, 630]; // 09:00, 09:30, 10:00, 10:30
    const blocks = [makeBlock('09:30', '10:30')];
    const result = buildSlotList(slots, WEDNESDAY, 30, [], blocks, 30);
    expect(result.find(s => s.time === '09:00')?.isAvailable).toBe(true);  // termina em 09:30 = início do bloco
    expect(result.find(s => s.time === '09:30')?.isAvailable).toBe(false);
    expect(result.find(s => s.time === '10:00')?.isAvailable).toBe(false);
    expect(result.find(s => s.time === '10:30')?.isAvailable).toBe(true);  // começa no fim do bloco
  });

  it('múltiplos agendamentos bloqueiam slots independentes', () => {
    const slots = [540, 570, 600, 630, 660]; // 09:00..11:00
    const appts = [
      makeAppointment(WEDNESDAY, '09:00', 30),
      makeAppointment(WEDNESDAY, '10:00', 30),
    ];
    const result = buildSlotList(slots, WEDNESDAY, 30, appts, [], 30);
    expect(result.find(s => s.time === '09:00')?.isAvailable).toBe(false);
    expect(result.find(s => s.time === '09:30')?.isAvailable).toBe(true);
    expect(result.find(s => s.time === '10:00')?.isAvailable).toBe(false);
    expect(result.find(s => s.time === '10:30')?.isAvailable).toBe(true);
    expect(result.find(s => s.time === '11:00')?.isAvailable).toBe(true);
  });

  it('agendamento sem end_datetime usa duration como fallback', () => {
    const appts: AppointmentSlot[] = [{
      start_at: new Date(`${WEDNESDAY}T09:00:00-03:00`),
      duration: 60,
      end_datetime: null, // sem campo → usa duration
    }];
    const result = buildSlotList([540, 570, 600], WEDNESDAY, 30, appts, [], 30);
    expect(result.find(s => s.time === '09:00')?.isAvailable).toBe(false); // dentro do serviço
    expect(result.find(s => s.time === '09:30')?.isAvailable).toBe(false); // ainda dentro
    expect(result.find(s => s.time === '10:00')?.isAvailable).toBe(true);  // após fim (09:00+60=10:00)
  });

  it('bloqueio parcial sem end_time usa intervalMinutes como duração padrão', () => {
    // Block 10:00 sem end_time, interval=30 → bloqueia 10:00-10:30
    const blocks: BlockedTimeSlot[] = [{
      start_time: new Date('1970-01-01T10:00:00Z'),
      end_time: null,
    }];
    const result = buildSlotList([540, 600, 630], WEDNESDAY, 30, [], blocks, 30);
    expect(result.find(s => s.time === '09:00')?.isAvailable).toBe(true);
    expect(result.find(s => s.time === '10:00')?.isAvailable).toBe(false); // bloqueado
    expect(result.find(s => s.time === '10:30')?.isAvailable).toBe(true);  // após o bloqueio
  });
});

// ===================================================================
// Cenário integrado — fluxo completo de um dia de trabalho
// ===================================================================

describe('Cenário integrado — dia de trabalho com conflitos reais', () => {
  it('Segunda: 3 agendamentos, 1 bloqueio parcial → slots corretos', () => {
    const config = getDayConfig(WORKING_HOURS, '2026-06-08'); // segunda
    expect(config?.isWorking).toBe(true);

    const base = getBaseSlots(config!, 30, 30);
    // Sem filtro de passados (não é hoje) — filtra com todos os slots
    const filtered = filterPastSlots(base, '2026-06-08', '2026-06-09', 600);
    expect(filtered).toEqual(base); // 2026-06-08 < '2026-06-09' → passado, mas retorna todos (não é hoje)

    const appts = [
      makeAppointment('2026-06-08', '09:00', 30),  // 09:00-09:30
      makeAppointment('2026-06-08', '10:00', 30),  // 10:00-10:30
      makeAppointment('2026-06-08', '14:00', 60),  // 14:00-15:00
    ];
    const blocks = [makeBlock('12:00', '13:00')];  // almoço

    const result = buildSlotList(filtered, '2026-06-08', 30, appts, blocks, 30);

    // Verificações pontuais
    expect(result.find(s => s.time === '09:00')?.isAvailable).toBe(false); // agendado
    expect(result.find(s => s.time === '09:30')?.isAvailable).toBe(true);
    expect(result.find(s => s.time === '10:00')?.isAvailable).toBe(false); // agendado
    expect(result.find(s => s.time === '10:30')?.isAvailable).toBe(true);
    expect(result.find(s => s.time === '12:00')?.isAvailable).toBe(false); // almoço
    expect(result.find(s => s.time === '12:30')?.isAvailable).toBe(false); // almoço
    expect(result.find(s => s.time === '13:00')?.isAvailable).toBe(true);  // após almoço
    expect(result.find(s => s.time === '14:00')?.isAvailable).toBe(false); // agendado 60min
    expect(result.find(s => s.time === '14:30')?.isAvailable).toBe(false); // dentro do agendamento
    expect(result.find(s => s.time === '15:00')?.isAvailable).toBe(true);  // após o agendamento
  });

  it('Sábado com isWorking=false → lista vazia, sem slots gerados', () => {
    const config = getDayConfig(WORKING_HOURS, '2026-06-13'); // sábado
    expect(config?.isWorking).toBe(false);
    const slots = getBaseSlots(config!, 30, 30);
    expect(slots).toHaveLength(0);
    const result = buildSlotList(slots, '2026-06-13', 30, [], [], 30);
    expect(result).toHaveLength(0);
  });
});
