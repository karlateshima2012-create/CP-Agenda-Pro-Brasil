import React, { useState } from 'react';
import { Service, AccountInfo } from '../types';
import { Plus, Edit2, Trash2, Clock, Upload, Image as ImageIcon, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';

interface Props {
  account: AccountInfo;
  onUpdateAccount: (settings: Partial<AccountInfo>) => void;
  services: Service[];
  onUpdateServices: (services: Service[]) => void;
}

export const ServicesTab: React.FC<Props> = ({ account, onUpdateAccount, services, onUpdateServices }) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  // Form state
  const [formState, setFormState] = useState<Partial<Service>>({});

  const startEdit = (svc: Service) => {
    setEditingId(svc.id);
    setFormState(svc);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormState({});
  };

  const moveService = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === services.length - 1) return;
    
    const newServices = [...services];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    [newServices[index], newServices[targetIndex]] = [newServices[targetIndex], newServices[index]];
    onUpdateServices(newServices);
  };

  const handleSave = () => {
    if (!formState.name) return; // Price is optional now

    if (editingId === 0) {
      // New Service
      const newService: Service = {
        id: Date.now(),
        name: formState.name,
        description: formState.description || '',
        duration: formState.duration || 30,
        cleaning_buffer: formState.cleaning_buffer || 0,
        price: formState.price || 0,
        imageUrl: formState.imageUrl || '',
        imageOpacity: formState.imageOpacity ?? 100,
        nameColor: formState.nameColor || '#ffffff',
        descriptionColor: formState.descriptionColor || '#9ca3af'
      };
      onUpdateServices([...services, newService]);
    } else {
      // Update existing
      onUpdateServices(services.map(s => s.id === editingId ? { ...s, ...formState } as Service : s));
    }
    cancelEdit();
  };

  const handleDeleteRequest = (svc: Service) => {
    setServiceToDelete(svc);
  };

  const confirmDelete = () => {
    if (serviceToDelete) {
      onUpdateServices(services.filter(s => s.id !== serviceToDelete.id));
      setServiceToDelete(null);
    }
  };

  const startNew = () => {
    setEditingId(0);
    setFormState({ duration: 30, cleaning_buffer: 0, price: 0, description: '', imageUrl: '', imageOpacity: 40, nameColor: '#000000', descriptionColor: '#9ca3af' });
  };

  // Optimize & Compress Image to keep system lightweight and scalable
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create an HTML canvas to perform downscaling and compression
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio correct scaling
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Export as JPEG with 75% quality for a perfect balance of quality and microscopic file size
          const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.75);
          setFormState(prev => ({
            ...prev,
            imageUrl: optimizedBase64,
            imageOpacity: prev.imageOpacity ?? 40 // Default to a clean 40% backdrop opacity
          }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      alert('Erro ao ler o arquivo. Tente outra imagem.');
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setFormState(prev => ({
      ...prev,
      imageUrl: '',
      imageOpacity: 100
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Meus Serviços</h2>
          <p className="text-gray-500 text-sm">Gerencie os serviços que seus clientes podem agendar.</p>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex bg-gray-100 p-1 rounded-xl items-center shadow-inner flex-1 sm:flex-none">
            <button
              onClick={() => onUpdateAccount({ viewMode: 'card' })}
              className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all flex justify-center items-center gap-1.5 ${(!account.viewMode || account.viewMode === 'card') ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Cards
            </button>
            <button
              onClick={() => onUpdateAccount({ viewMode: 'list' })}
              className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all flex justify-center items-center gap-1.5 ${account.viewMode === 'list' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Lista
            </button>
          </div>
          <button
            onClick={startNew}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl font-bold shadow-md flex items-center gap-2 flex-shrink-0"
          >
            <Plus size={20} /> Novo
          </button>
        </div>
      </div>

      {editingId !== null && (
        <div className="bg-white p-6 rounded-2xl border border-primary/30 shadow-lg mb-6 ring-4 ring-primary/5">
          {/* Honey-pot inputs to prevent browser from suggesting "Save Password" */}
          <input type="text" name="prevent_autofill_user" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
          <input type="password" name="prevent_autofill_pwd" style={{ display: 'none' }} tabIndex={-1} autoComplete="new-password" />

          <h3 className="font-bold text-lg mb-4 text-primary">{editingId === 0 ? 'Novo Serviço' : 'Editar Serviço'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <div className="flex items-center gap-1.5 cursor-pointer" title="Cor do Nome">
                  <span className="text-[10px] text-gray-400 uppercase font-black">Cor</span>
                  <div className="relative w-5 h-5 rounded-full overflow-hidden border border-gray-300 shadow-sm" style={{ backgroundColor: formState.nameColor || '#111827' }}>
                    <input
                      type="color"
                      value={formState.nameColor || '#111827'}
                      onChange={e => setFormState({ ...formState, nameColor: e.target.value })}
                      className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer opacity-0"
                    />
                  </div>
                </div>
              </div>
              <input
                type="text"
                name="service_name_field"
                id="service_name_field"
                autoComplete="off"
                value={formState.name || ''}
                onChange={e => setFormState({ ...formState, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-primary outline-none capitalize"
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço (¥) <span className="text-gray-400 font-normal">(Opcional)</span></label>
              <input
                type="number"
                placeholder="sem vírgula e sem ponto"
                value={formState.price || ''}
                onChange={e => setFormState({ ...formState, price: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Descrição</label>
                <div className="flex items-center gap-1.5 cursor-pointer" title="Cor da Descrição">
                  <span className="text-[10px] text-gray-400 uppercase font-black">Cor</span>
                  <div className="relative w-5 h-5 rounded-full overflow-hidden border border-gray-300 shadow-sm" style={{ backgroundColor: formState.descriptionColor || '#6b7280' }}>
                    <input
                      type="color"
                      value={formState.descriptionColor || '#6b7280'}
                      onChange={e => setFormState({ ...formState, descriptionColor: e.target.value })}
                      className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer opacity-0"
                    />
                  </div>
                </div>
              </div>
              <textarea
                rows={2}
                name="service_description_field"
                id="service_description_field"
                autoComplete="off"
                value={formState.description || ''}
                onChange={e => setFormState({ ...formState, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-primary outline-none capitalize"
              />
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Duração do Serviço</label>
              <select
                value={formState.duration || 30}
                onChange={e => setFormState({ ...formState, duration: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-primary outline-none"
              >
                {Array.from({ length: 16 }, (_, i) => (i + 1) * 30).concat([1440]).map(m => {
                  const h = Math.floor(m / 60);
                  const min = m % 60;
                  const label = m === 1440 ? '24h (Diária)' : m < 60 ? `${m} min` : min === 0 ? `${h}h` : `${h}h ${min}min`;
                  return <option key={m} value={m}>{label}</option>;
                })}
              </select>
            </div>

            {/* Service Image Section */}
            <div className="col-span-2 border-t border-gray-100 pt-4 mt-2">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                <ImageIcon size={18} className="text-primary" /> Imagem de Fundo do Card de Serviço
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div 
                  className="w-full sm:w-48 aspect-video rounded-xl bg-gray-50 border border-gray-200 relative overflow-hidden flex items-center justify-center cursor-pointer group hover:border-primary transition-all shadow-inner"
                  onClick={() => document.getElementById('service-image-input')?.click()}
                >
                  {formState.imageUrl ? (
                    <>
                      <img 
                        src={formState.imageUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover" 
                        style={{ opacity: (formState.imageOpacity ?? 100) / 100 }} 
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload size={20} className="text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <span className="text-gray-400 text-xs font-bold block mb-1">Sem Imagem</span>
                      <span className="text-primary text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1 justify-center">
                        <Upload size={12} /> Upload
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 w-full space-y-3">
                  <div className="flex items-center gap-2">
                    <input 
                      type="file" 
                      id="service-image-input" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      className="hidden" 
                    />
                    <button 
                      type="button"
                      onClick={() => document.getElementById('service-image-input')?.click()}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors"
                    >
                      Escolher Imagem
                    </button>
                    {formState.imageUrl && (
                      <button 
                        type="button"
                        onClick={clearImage}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                      >
                        Excluir Imagem
                      </button>
                    )}
                  </div>
                  
                  {formState.imageUrl && (
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                        <span>Opacidade / Transparência</span>
                        <span className="text-primary">{formState.imageOpacity ?? 100}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="5" 
                        max="100" 
                        value={formState.imageOpacity ?? 100} 
                        onChange={e => setFormState(prev => ({ ...prev, imageOpacity: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary" 
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button onClick={cancelEdit} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancelar</button>
            <button onClick={handleSave} className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover shadow-md">Salvar</button>
          </div>
        </div>
      )}

      <div className={account.viewMode === 'list' ? "flex flex-col gap-4" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
        {(services || []).map((svc, index) => {
          if (account.viewMode === 'list') {
            return (
              <div 
                key={svc.id} 
                className="relative overflow-hidden bg-white p-3 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all group flex flex-row items-center gap-3"
              >
                {/* Left: Image (if any) */}
                {svc.imageUrl && (
                  <div className="w-14 h-14 shrink-0 rounded-xl overflow-hidden shadow-sm relative border border-gray-100 bg-gray-50">
                    <img src={svc.imageUrl} alt={svc.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black/5 pointer-events-none" />
                  </div>
                )}
                
                {/* Middle: Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h3 className="font-black text-sm sm:text-base tracking-tight capitalize truncate" style={{ color: svc.nameColor || account.primaryColor || '#111827' }}>{svc.name}</h3>
                  
                  <div className="mt-1 flex items-center gap-1.5 font-black text-[10px] uppercase tracking-widest" style={{ color: svc.descriptionColor || '#9ca3af' }}>
                    <Clock size={12} style={{ color: account.primaryColor || '#111827' }} /> 
                    {svc.duration < 60 ? `${svc.duration} min` : (svc.duration === 1440 ? '24h (Diária)' : `${svc.duration / 60}h`)}
                    {svc.cleaning_buffer > 0 && ` (+${svc.cleaning_buffer < 60 ? `${svc.cleaning_buffer}m` : `${svc.cleaning_buffer / 60}h`} Limpeza)`}
                  </div>
                </div>

                {/* Right: Actions & Price */}
                <div className="shrink-0 flex flex-col items-end justify-center border-l border-gray-100 pl-3 ml-1 gap-1.5">
                  <div className="flex gap-1 bg-black/5 p-1 rounded-lg">
                    <button 
                      onClick={() => moveService(index, 'up')} 
                      disabled={index === 0}
                      className="p-1 text-gray-500 hover:text-black hover:bg-white rounded transition-all disabled:opacity-30 shadow-sm"
                      title="Mover para cima"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button 
                      onClick={() => moveService(index, 'down')} 
                      disabled={index === services.length - 1}
                      className="p-1 text-gray-500 hover:text-black hover:bg-white rounded transition-all disabled:opacity-30 shadow-sm"
                      title="Mover para baixo"
                    >
                      <ArrowDown size={12} />
                    </button>
                    <button 
                      onClick={() => startEdit(svc)} 
                      className="p-1 text-gray-500 hover:text-blue-500 hover:bg-white rounded transition-all shadow-sm"
                      title="Editar serviço"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button 
                      onClick={() => handleDeleteRequest(svc)} 
                      className="p-1 text-gray-500 hover:text-red-500 hover:bg-white rounded transition-all shadow-sm"
                      title="Excluir serviço"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {svc.price > 0 && <span className="font-black text-xs text-gray-900 leading-none">¥ {svc.price.toLocaleString()}</span>}
                </div>
              </div>
            );
          }

          // Card View
          return (
          <div 
            key={svc.id} 
            className="relative overflow-hidden bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between min-h-[140px]"
          >
            {svc.imageUrl && (
              <div 
                className="absolute inset-0 w-full h-full pointer-events-none transition-transform duration-300 group-hover:scale-[1.03]"
                style={{ 
                  backgroundImage: `url(${svc.imageUrl})`, 
                  backgroundSize: 'cover', 
                  backgroundPosition: 'center', 
                  opacity: (svc.imageOpacity ?? 100) / 100 
                }} 
              />
            )}
            
            {/* White overlay backplate to ensure full text readability if opacity is high */}
            {svc.imageUrl && (
              <div className="absolute inset-0 bg-white/60 pointer-events-none z-0" />
            )}

            <div className="relative z-10 flex justify-between items-start flex-1">
              <div className="flex-1 min-w-0 pr-4 flex flex-col">
                <h3 className="font-bold text-lg capitalize tracking-tight truncate break-words" style={{ color: svc.nameColor || account.primaryColor || '#111827' }}>{svc.name}</h3>
                <p className="text-sm mt-1 mb-4 line-clamp-2 capitalize leading-relaxed break-words" style={{ color: svc.descriptionColor || '#6b7280' }}>{svc.description}</p>
                <div className="mt-auto mb-3 flex items-center gap-1.5 font-black text-[11px] uppercase tracking-widest" style={{ color: svc.descriptionColor || '#9ca3af' }}>
                  <Clock size={16} style={{ color: account.primaryColor || '#111827' }} /> 
                  {svc.duration < 60 ? `${svc.duration} min` : (svc.duration === 1440 ? '24h (Diária)' : `${svc.duration / 60}h`)}
                  {svc.cleaning_buffer > 0 && ` (+${svc.cleaning_buffer < 60 ? `${svc.cleaning_buffer}m` : `${svc.cleaning_buffer / 60}h`} Limpeza)`}
                </div>
              </div>
              <div className="flex gap-1 bg-black/80 p-1.5 rounded-xl backdrop-blur-sm shadow-sm border border-white/10 shrink-0">
                <button 
                  onClick={() => moveService(index, 'up')} 
                  disabled={index === 0}
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-all disabled:opacity-30"
                  title="Mover para cima"
                >
                  <ArrowUp size={16} />
                </button>
                <button 
                  onClick={() => moveService(index, 'down')} 
                  disabled={index === services.length - 1}
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-all disabled:opacity-30"
                  title="Mover para baixo"
                >
                  <ArrowDown size={16} />
                </button>
                <button 
                  onClick={() => startEdit(svc)} 
                  className="p-1.5 text-white/70 hover:text-blue-400 hover:bg-white/20 rounded-lg transition-all"
                  title="Editar serviço"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteRequest(svc)} 
                  className="p-1.5 text-white/70 hover:text-red-400 hover:bg-white/20 rounded-lg transition-all"
                  title="Excluir serviço"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="relative z-10 flex justify-between items-center border-t border-gray-100/50 pt-4">
              <div>
                {svc.price > 0 && <span className="font-black text-base text-gray-900 leading-none tracking-wide">¥ {svc.price.toLocaleString()}</span>}
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {serviceToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setServiceToDelete(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200 border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4 mx-auto">
              <AlertTriangle className="text-red-500" size={24} />
            </div>
            <h3 className="text-lg font-black text-center text-gray-900 mb-2">Excluir Serviço?</h3>
            <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">
              Tem certeza que deseja excluir o serviço <span className="font-bold text-gray-900">"{serviceToDelete.name}"</span>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setServiceToDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-sm shadow-red-500/20"
              >
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
