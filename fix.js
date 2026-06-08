const fs = require('fs');
let code = fs.readFileSync('components/ServicesTab.tsx', 'utf8');

code = code.replace(
  "import { Plus, Edit2, Trash2, Clock, Upload, Image as ImageIcon, ArrowUp, ArrowDown } from 'lucide-react';",
  "import { Plus, Edit2, Trash2, Clock, Upload, Image as ImageIcon, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';"
);

code = code.replace(
  "  const [editingId, setEditingId] = useState<number | null>(null);\n  // Form state",
  "  const [editingId, setEditingId] = useState<number | null>(null);\n  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);\n  // Form state"
);

code = code.replace(
  "  const handleDelete = (id: number) => {\n    if (confirm('Tem certeza que deseja excluir este serviço?')) {\n      onUpdateServices(services.filter(s => s.id !== id));\n    }\n  };",
  "  const handleDeleteRequest = (svc: Service) => {\n    setServiceToDelete(svc);\n  };\n\n  const confirmDelete = () => {\n    if (serviceToDelete) {\n      onUpdateServices(services.filter(s => s.id !== serviceToDelete.id));\n      setServiceToDelete(null);\n    }\n  };"
);

code = code.replace(
  "onClick={() => handleDelete(svc.id)}",
  "onClick={() => handleDeleteRequest(svc)}"
);

const modalCode = `
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
}`;

code = code.replace(
  "    </div>\n  );\n}",
  modalCode
);

fs.writeFileSync('components/ServicesTab.tsx', code);
