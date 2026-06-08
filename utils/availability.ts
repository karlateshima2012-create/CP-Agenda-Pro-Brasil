import { DEFAULT_AVAILABILITY } from '../constants';

export const recursiveParse = (val: any, fallback: any = []) => {
    let result = val;
    let iterations = 0;
    while (typeof result === 'string' && (result.trim().startsWith('[') || result.trim().startsWith('{')) && iterations < 5) {
        try {
            result = JSON.parse(result);
            iterations++;
        } catch (e) {
            return fallback;
        }
    }
    return result || fallback;
};

export const mapWorkingHours = (raw: any) => {
    const rawArray = recursiveParse(raw, []);

    if (!Array.isArray(rawArray) || rawArray.length === 0) {
        return DEFAULT_AVAILABILITY.workingHours;
    }

    const dayNameMap: Record<string, string> = {
        'segunda': 'Segunda-feira',
        'terca': 'Terça-feira',
        'quarta': 'Quarta-feira',
        'quinta': 'Quinta-feira',
        'sexta': 'Sexta-feira',
        'sabado': 'Sábado',
        'domingo': 'Domingo'
    };

    return rawArray.map((wh: any) => {
        let dayKey = wh.day;
        if (typeof wh.day === 'number' || (typeof wh.day === 'string' && /^\d+$/.test(wh.day))) {
            const dayNum = parseInt(wh.day);
            const dayMap = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
            dayKey = dayMap[dayNum] || wh.day;
        }

        return {
            day: dayKey,
            name: dayNameMap[dayKey] || dayKey,
            isWorking: wh.enabled === true || wh.isWorking === true,
            startTime: wh.start || wh.startTime || '09:00',
            endTime: wh.end || wh.endTime || '18:00',
            enabled: wh.enabled === true || wh.isWorking === true,
            start: wh.start || wh.startTime || '09:00',
            end: wh.end || wh.endTime || '18:00',
            timeType: wh.timeType || 'interval',
            fixedTimes: wh.fixedTimes || []
        };
    });
};
