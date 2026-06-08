import React, { useState, useEffect } from 'react';
import { api } from '../src/api';
import { Appointment } from '../types';
import {
  Search,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Loader2,
  Archive,
  History as HistoryIcon,
  ChevronDown
} from 'lucide-react';

export const HistoryTab: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [source, setSource] = useState<'active' | 'archive'>('active');

  const fetchHistory = async (isNewSearch = true) => {
    try {
      if (isNewSearch) {
        setLoading(true);
        setPage(1);
      } else {
        setLoadingMore(true);
      }

      const currentPage = isNewSearch ? 1 : page + 1;
      const filters: any = { 
        history: true, 
        page: currentPage, 
        limit: 20,
        source: source 
      };
      
      if (dateFrom) filters.from = `${dateFrom} 00:00:00`;
      if (dateTo) filters.to = `${dateTo} 23:59:59`;
      
      const resp = await api.listAppointments(filters);
      if (resp.ok && resp.data) {
        const rawItems = resp.data.items || [];
        const mappedItems: Appointment[] = rawItems.map((a: any) => ({
          id: a.id,
          clientName: a.client_name,
          clientEmail: a.client_email,
          clientPhone: a.client_phone,
          serviceId: a.service_id,
          serviceName: a.service_name,
          startAt: a.start_at,
          endAt: a.end_datetime,
          duration: a.duration,
          status: a.status,
          createdAt: a.created_at,
          deleted_at: a.deleted_at
        }));

        if (isNewSearch) {
          setAppointments(mappedItems);
        } else {
          setAppointments(prev => [...prev, ...mappedItems]);
          setPage(currentPage);
        }
        setHasMore(resp.data.pagination.hasMore);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchHistory(true);
  }, [dateFrom, dateTo, source]);

  // Helper to parse dates safely (fixes Invalid Date on Safari)
  const parseSafeDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    return new Date(dateStr.replace(' ', 'T'));
  };

  const filteredAppointments = appointments.filter(app => {
    const searchLower = (search || '').toLowerCase();
    const clientName = (app.clientName || '').toLowerCase();
    const serviceName = (app.serviceName || '').toLowerCase();
    const clientPhone = (app.clientPhone || '');
    
    return (
      clientName.includes(searchLower) ||
      clientPhone.includes(searchLower) ||
      serviceName.includes(searchLower)
    );
  });


  const getStatusBadge = (appointment: Appointment) => {
    if (appointment.deleted_at) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-gray-100 text-gray-500 border border-gray-200 uppercase tracking-widest">
          <Trash2 size={10} /> Excluído
        </span>
      );
    }

    switch (appointment.status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-green-100 text-green-700 border border-green-200 uppercase tracking-widest">
            <CheckCircle2 size={10} /> Confirmado
          </span>
        );
      case 'canceled':
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-red-100 text-red-700 border border-red-200 uppercase tracking-widest">
            <XCircle size={10} /> Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 border border-amber-200 uppercase tracking-widest">
            <Clock size={10} /> Pendente
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Histórico</h2>
          <p className="text-gray-500 text-sm font-medium">Insights e registros detalhados da sua agenda.</p>
        </div>
        
        {/* Source Selector (Archive vs Active) */}
        <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200 shadow-sm self-stretch md:self-auto">
          <button
            onClick={() => setSource('active')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
              source === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <HistoryIcon size={16} /> RECENTE
          </button>
          <button
            onClick={() => setSource('archive')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
              source === 'archive' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Archive size={16} /> ARQUIVADO
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 items-end mx-2">
        <div className="flex-1 w-full space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Pesquisar Registro</label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
            <input
              type="text"
              placeholder="Nome, telefone ou serviço..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl text-sm font-bold outline-none transition-all"
            />
          </div>
        </div>
        <div className="w-full md:w-48 space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Início</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-4 py-4 bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl text-sm font-bold outline-none transition-all"
          />
        </div>
        <div className="w-full md:w-48 space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Fim</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-4 py-4 bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl text-sm font-bold outline-none transition-all"
          />
        </div>
        <button
          onClick={() => fetchHistory(true)}
          className="bg-gray-900 hover:bg-black text-white p-4 rounded-2xl transition-all shadow-lg active:scale-95"
          title="Recarregar"
        >
          <Clock size={20} />
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden mx-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="text-gray-400 text-xs font-black uppercase tracking-widest">Sincronizando dados...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mb-6 border border-gray-100">
              <Calendar size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-1">Nenhum registro</h3>
            <p className="text-gray-400 text-xs font-medium max-w-xs">
              {source === 'archive' ? 'O baú de histórico antigo está vazio.' : 'Ajuste o período ou a busca para visualizar os agendamentos.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Data & Horário</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Serviço Solicitado</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredAppointments.map((app) => {
                  const startDate = parseSafeDate(app.startAt);
                  return (
                    <tr key={app.id} className={`hover:bg-gray-50/30 transition-colors ${app.deleted_at ? 'opacity-50' : ''}`}>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="bg-gray-50 p-3 rounded-xl text-gray-400 border border-gray-100">
                            <Calendar size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900">
                              {startDate.toLocaleDateString('pt-BR')}
                            </p>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-tight">
                              {startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <p className="text-sm font-black text-gray-900 capitalize">{app.clientName}</p>
                          <p className="text-[10px] text-gray-400 font-bold font-mono tracking-tighter">{app.clientPhone}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="inline-flex items-center px-3 py-1 bg-primary/5 rounded-full text-[10px] font-black text-primary uppercase tracking-widest">
                          {app.serviceName || 'Serviço Padrão'}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        {getStatusBadge(app)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {/* Load More Button */}
            {hasMore && (
              <div className="p-8 flex justify-center bg-gray-50/30">
                <button
                  onClick={() => fetchHistory(false)}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-8 py-4 bg-white border border-gray-200 text-gray-900 text-xs font-black uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      CARREGANDO...
                    </>
                  ) : (
                    <>
                      VER MAIS REGISTROS
                      <ChevronDown size={16} />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
