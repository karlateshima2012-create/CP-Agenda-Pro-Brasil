import React, { useState, useEffect } from 'react';
import { api } from '../src/api';
import { Appointment, Service } from '../types';
import {
  TrendingUp, Award, BarChart3, Users, AlertCircle,
  Clock, CheckCircle2, XCircle, Star, Calendar,
  Loader2, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';

interface Props {
  services: Service[];
  appointments: Appointment[];
}

export const GestaoTab: React.FC<Props> = ({ services }) => {
  const [allHistory, setAllHistory] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const resp = await api.listAppointments({ history: true, page: 1, limit: 500, source: 'active' });
        if (resp.ok && resp.data) {
          const items = (resp.data.items || []).map((a: any) => ({
            id: a.id, clientName: a.client_name, clientEmail: a.client_email,
            clientPhone: a.client_phone, serviceId: a.service_id,
            serviceName: a.service_name, startAt: a.start_at,
            endAt: a.end_datetime, duration: a.duration,
            status: a.status, createdAt: a.created_at, deleted_at: a.deleted_at,
          }));
          setAllHistory(items);
        }
      } catch { /* silencioso */ }
      setLoading(false);
    };
    fetch();
  }, []);

  const parseSafe = (s: string) => new Date((s || '').replace(' ', 'T'));
  const now = new Date();
  const nowMs = now.getTime();
  const dayMs = 86400000;

  // Price lookup por nome de serviço (estimativa)
  const priceMap = new Map(services.map(s => [
    (s.name || '').toLowerCase().trim(), s.price || 0
  ]));
  const getPrice = (name: string) =>
    priceMap.get((name || '').toLowerCase().trim()) || 0;
  const hasAnyPrice = services.some(s => (s.price || 0) > 0);

  const confirmed = allHistory.filter(a => a.status === 'confirmed' && !a.deleted_at);
  const notDeleted  = allHistory.filter(a => !a.deleted_at);

  // Períodos
  const monthStart   = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMStart   = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMEnd     = new Date(now.getFullYear(), now.getMonth(), 0);

  const thisMAppts   = confirmed.filter(a => parseSafe(a.startAt) >= monthStart);
  const lastMAppts   = confirmed.filter(a => { const d = parseSafe(a.startAt); return d >= lastMStart && d <= lastMEnd; });

  // Faturamento estimado
  const thisMRevenue = thisMAppts.reduce((s, a) => s + getPrice(a.serviceName), 0);
  const ticket       = thisMAppts.length > 0 ? thisMRevenue / thisMAppts.length : 0;
  const momDelta     = lastMAppts.length > 0
    ? ((thisMAppts.length - lastMAppts.length) / lastMAppts.length) * 100
    : (thisMAppts.length > 0 ? 100 : 0);

  // Ranking de serviços
  const svcMap: Record<string, { count: number; revenue: number }> = {};
  confirmed.forEach(a => {
    const n = a.serviceName || 'Serviço';
    if (!svcMap[n]) svcMap[n] = { count: 0, revenue: 0 };
    svcMap[n].count++;
    svcMap[n].revenue += getPrice(n);
  });
  const svcRanking = Object.entries(svcMap)
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.revenue - a.revenue || b.count - a.count);
  const maxSvcRevenue = Math.max(...svcRanking.map(s => s.revenue), 1);

  // Tendência 6 meses
  const monthly6 = Array.from({ length: 6 }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const end   = new Date(now.getFullYear(), now.getMonth() - 5 + i + 1, 0);
    const appts = confirmed.filter(a => { const d = parseSafe(a.startAt); return d >= start && d <= end; });
    return {
      label: start.toLocaleDateString('pt-BR', { month: 'short' }),
      count: appts.length,
      revenue: appts.reduce((s, a) => s + getPrice(a.serviceName), 0),
      isCurrent: i === 5,
    };
  });
  const maxMonthCount = Math.max(...monthly6.map(m => m.count), 1);

  // Métricas de clientes
  const clientFirst = new Map<string, Date>();
  const clientLast  = new Map<string, Date>();
  const clientInfo  = new Map<string, { name: string; count: number }>();

  confirmed.forEach(a => {
    const key = a.clientPhone || a.clientName || 'anon';
    const d = parseSafe(a.startAt);
    if (!clientFirst.has(key) || clientFirst.get(key)! > d) clientFirst.set(key, d);
    if (!clientLast.has(key)  || clientLast.get(key)!  < d) clientLast.set(key, d);
    const ex = clientInfo.get(key);
    if (ex) ex.count++;
    else clientInfo.set(key, { name: a.clientName || 'Cliente', count: 1 });
  });

  const uniqueClients    = clientInfo.size;
  const newThisMonth     = Array.from(clientFirst.values()).filter(d => d >= monthStart).length;
  const returningThisMonth = thisMAppts.filter(a => {
    const key = a.clientPhone || a.clientName || 'anon';
    const first = clientFirst.get(key);
    return first && first < monthStart;
  }).length;
  const atRisk = Array.from(clientLast.values())
    .filter(d => (nowMs - d.getTime()) / dayMs > 45).length;

  const top5 = Array.from(clientInfo.entries())
    .map(([, d]) => d)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Operacional
  const totalValid     = notDeleted.length;
  const cancelCount    = notDeleted.filter(a => a.status === 'canceled' || a.status === 'rejected').length;
  const confirmRate    = totalValid > 0 ? (confirmed.length / totalValid) * 100 : 0;
  const cancelRate     = totalValid > 0 ? (cancelCount / totalValid) * 100 : 0;

  const dayCounts = [0,0,0,0,0,0,0];
  confirmed.forEach(a => { if (a.startAt) dayCounts[parseSafe(a.startAt).getDay()]++; });
  const busyDayIdx  = dayCounts.indexOf(Math.max(...dayCounts));
  const dayNames    = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const maxDayCount = Math.max(...dayCounts, 1);

  let morning = 0, afternoon = 0, evening = 0;
  confirmed.forEach(a => {
    const h = parseSafe(a.startAt).getHours();
    if (h < 12) morning++; else if (h < 18) afternoon++; else evening++;
  });
  const peakPeriod = morning >= afternoon && morning >= evening ? 'Manhã (8–12h)'
    : afternoon >= evening ? 'Tarde (12–18h)' : 'Noite (18h+)';

  const avgDuration = confirmed.length > 0
    ? Math.round(confirmed.reduce((s, a) => s + (a.duration || 0), 0) / confirmed.length)
    : 0;
  const formatDur = (m: number) => m < 60 ? `${m} min` : `${Math.floor(m/60)}h${m%60 ? ` ${m%60}min` : ''}`;

  // Alertas
  const alerts: { icon: React.ReactNode; text: string; color: string }[] = [];
  if (cancelRate > 20) alerts.push({ icon: <XCircle size={16} />, text: `Taxa de cancelamento alta: ${cancelRate.toFixed(0)}%`, color: 'text-red-600 bg-red-50 border-red-100' });
  if (thisMAppts.length === 0) alerts.push({ icon: <AlertCircle size={16} />, text: 'Nenhum atendimento confirmado este mês ainda', color: 'text-orange-600 bg-orange-50 border-orange-100' });
  if (atRisk > 0) alerts.push({ icon: <AlertCircle size={16} />, text: `${atRisk} cliente${atRisk > 1 ? 's' : ''} sem retorno há mais de 45 dias`, color: 'text-yellow-700 bg-yellow-50 border-yellow-100' });

  const yen = (v: number) => `¥${Math.round(v).toLocaleString('ja-JP')}`;

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
      <Loader2 size={32} className="animate-spin" />
      <p className="text-sm font-bold uppercase tracking-widest">Carregando dados de gestão…</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-fade-in pb-16">

      <div className="px-1">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Gestão</h2>
        <p className="text-gray-500 text-sm font-medium mt-1">Visão completa do seu negócio com base nos agendamentos registrados.</p>
        {hasAnyPrice && (
          <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">
            * Faturamento estimado com base nos preços atuais dos serviços
          </p>
        )}
      </div>

      {/* Alertas acionáveis */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-3 p-4 rounded-2xl border text-sm font-bold ${a.color}`}>
              {a.icon} {a.text}
            </div>
          ))}
        </div>
      )}

      {/* Seção 1 — Visão Geral do Mês */}
      <section>
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Calendar size={14} /> Visão Geral — {now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <CheckCircle2 size={20} className="text-primary" />
              {momDelta !== 0 && (
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 ${momDelta > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {momDelta > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {Math.abs(momDelta).toFixed(0)}%
                </span>
              )}
              {momDelta === 0 && <Minus size={12} className="text-gray-300" />}
            </div>
            <p className="text-3xl font-black text-gray-900">{thisMAppts.length}</p>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Atendimentos este mês</p>
            <p className="text-[9px] text-gray-300 font-bold mt-0.5">{lastMAppts.length} no mês anterior</p>
          </div>

          {hasAnyPrice ? (
            <>
              <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm">
                <TrendingUp size={20} className="text-green-500 mb-3" />
                <p className="text-2xl font-black text-gray-900">{yen(thisMRevenue)}</p>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Faturamento estimado*</p>
              </div>
              <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm">
                <Star size={20} className="text-yellow-500 mb-3" />
                <p className="text-2xl font-black text-gray-900">{ticket > 0 ? yen(ticket) : '—'}</p>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Valor médio por agendamento*</p>
              </div>
            </>
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-[2rem] p-6 col-span-2 flex items-center gap-3">
              <AlertCircle size={18} className="text-gray-300 shrink-0" />
              <p className="text-xs text-gray-400 font-bold">Adicione preços aos serviços para ver estimativas de faturamento.</p>
            </div>
          )}

          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm">
            <Users size={20} className="text-purple-500 mb-3" />
            <p className="text-3xl font-black text-gray-900">{uniqueClients}</p>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Clientes únicos (total)</p>
          </div>
        </div>
      </section>

      {/* Seção 2 — Faturamento / ranking por serviço */}
      {svcRanking.length > 0 && (
        <section>
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <BarChart3 size={14} /> Desempenho por Serviço
          </h3>
          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
            {svcRanking.map((svc, i) => (
              <div key={svc.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {i === 0 && <span className="text-yellow-500 text-xs">★</span>}
                    <span className="text-sm font-black text-gray-800 truncate">{svc.name}</span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-3">
                    <span className="text-[10px] font-bold text-gray-400">{svc.count} agend.</span>
                    {hasAnyPrice && <span className="text-xs font-black text-gray-700">{yen(svc.revenue)}</span>}
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${i === 0 ? 'bg-primary' : 'bg-primary/40'}`}
                    style={{ width: `${Math.max(3, (svc.revenue / maxSvcRevenue) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Seção 3 — Tendência 6 meses */}
      <section>
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <TrendingUp size={14} /> Tendência — últimos 6 meses
        </h3>
        <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm">
          <div className="flex items-end gap-3 h-36">
            {monthly6.map((m) => (
              <div key={m.label} className="flex flex-col items-center gap-2 flex-1">
                <p className="text-[9px] font-black text-gray-500">{m.count}</p>
                <div
                  className={`w-full rounded-t-xl transition-all ${m.isCurrent ? 'bg-primary' : 'bg-primary/25'}`}
                  style={{ height: `${Math.max(4, (m.count / maxMonthCount) * 100)}%` }}
                />
                <p className={`text-[9px] font-bold uppercase ${m.isCurrent ? 'text-primary font-black' : 'text-gray-400'}`}>
                  {m.label}
                </p>
                {hasAnyPrice && m.revenue > 0 && (
                  <p className="text-[8px] text-gray-400 font-bold">{yen(m.revenue)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seção 4 — Clientes */}
      <section>
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Users size={14} /> Clientes
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Novos este mês',    value: newThisMonth,      color: 'text-green-600',  sub: 'primeira visita no mês' },
            { label: 'Recorrentes',       value: returningThisMonth, color: 'text-primary',    sub: 'voltaram este mês' },
            { label: 'Em risco',          value: atRisk,            color: atRisk > 0 ? 'text-red-500' : 'text-gray-400', sub: 'sem retorno há 45+ dias' },
            { label: 'Total histórico',   value: uniqueClients,     color: 'text-purple-600', sub: 'clientes únicos' },
          ].map(c => (
            <div key={c.label} className="bg-white border border-gray-100 rounded-[2rem] p-5 shadow-sm">
              <p className={`text-3xl font-black ${c.color}`}>{c.value}</p>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">{c.label}</p>
              <p className="text-[9px] text-gray-300 font-bold mt-0.5">{c.sub}</p>
            </div>
          ))}
        </div>

        {top5.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Award size={14} className="text-yellow-500" /> Top 5 Clientes Mais Frequentes
            </p>
            <div className="space-y-3">
              {top5.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-black w-5 ${i === 0 ? 'text-yellow-500' : 'text-gray-300'}`}>#{i + 1}</span>
                    <span className="text-sm font-bold text-gray-800 capitalize">{c.name}</span>
                  </div>
                  <span className="text-xs font-black text-gray-500">{c.count} visita{c.count !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Seção 5 — Operacional */}
      <section>
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Clock size={14} /> Operacional
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Taxa de confirmação vs cancelamento</p>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-2xl font-black text-green-600">{confirmRate.toFixed(0)}%</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase">confirmados</p>
              </div>
              <div className="w-px h-10 bg-gray-100" />
              <div>
                <p className={`text-2xl font-black ${cancelRate > 20 ? 'text-red-500' : 'text-gray-600'}`}>{cancelRate.toFixed(0)}%</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase">cancelados</p>
              </div>
              <div className="ml-auto text-xs font-bold text-gray-400">{totalValid} total</div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Outros indicadores</p>
            {[
              { label: 'Duração média', value: avgDuration > 0 ? formatDur(avgDuration) : '—' },
              { label: 'Horário de pico', value: peakPeriod },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500">{item.label}</span>
                <span className="text-xs font-black text-gray-800">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Distribuição semanal */}
        <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Movimento por dia da semana</p>
          <div className="flex items-end gap-2 h-24">
            {dayCounts.map((count, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                <p className="text-[9px] font-black text-gray-400">{count > 0 ? count : ''}</p>
                <div
                  className={`w-full rounded-t-lg transition-all ${i === busyDayIdx && count > 0 ? 'bg-primary' : 'bg-gray-100'}`}
                  style={{ height: `${Math.max(4, (count / maxDayCount) * 100)}%` }}
                />
                <p className={`text-[9px] font-bold uppercase ${i === busyDayIdx && count > 0 ? 'text-primary font-black' : 'text-gray-400'}`}>
                  {dayNames[i]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};
