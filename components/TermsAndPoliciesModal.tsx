import React, { useEffect } from 'react';
import { X, Shield } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void; // Se fornecido, é a tela de aceite. Se não, é apenas leitura.
}

export const TermsAndPoliciesModal: React.FC<Props> = ({ isOpen, onClose, onAccept }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAccept = () => {
    if (onAccept) {
      onAccept();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-3xl flex flex-col shadow-2xl max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">TERMOS E POLÍTICAS</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                SUA SEGURANÇA E PRIVACIDADE EM PRIMEIRO LUGAR
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/50">
          {/* Política de Privacidade */}
          <section>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span> 
              Política de Privacidade
            </h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              A Creative Print valoriza a privacidade de seus usuários. Esta Política descreve como coletamos e utilizamos seus dados no sistema <strong>CP Agenda</strong>.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">1. COLETA DE DADOS</span>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Coletamos apenas informações essenciais para a prestação de nossos serviços de gestão e agendamento, como nome, contato da empresa, logotipos e preferências de serviço configuradas pelo administrador.
                </p>
              </div>
              
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">2. USO DAS INFORMAÇÕES</span>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Seus dados são utilizados exclusivamente para gerenciar seus clientes, processar agendamentos automatizados, gerar relatórios estratégicos e enviar notificações via bot oficial do Telegram.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">3. SEGURANÇA E ISOLAMENTO</span>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Utilizamos arquitetura Multi-Tenant, garantindo isolamento total dos dados de cada negócio. Adotamos criptografia em trânsito (SSL) e medidas técnicas contra acessos não autorizados.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">4. ARMAZENAMENTO</span>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Os dados são processados e armazenados em servidores seguros, mantendo logs de auditoria para garantir a integridade das transações e agendamentos de cada cliente final.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Termos de Uso */}
          <section>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span> 
              Termos de Uso
            </h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Ao utilizar a plataforma <strong>CP Agenda</strong>, você concorda integralmente com os seguintes termos:
            </p>

            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex gap-4">
                  <span className="text-xl font-bold text-blue-500">1.</span>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">Licença de Uso</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Concedemos uma licença limitada e intransferível para o uso de nossa plataforma conforme o plano contratado. O uso indevido para spam ou práticas ilegais resultará em suspensão imediata.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex gap-4">
                  <span className="text-xl font-bold text-blue-500">2.</span>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">Responsabilidade pelos Dados</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      O usuário administrador é o único responsável legal pelos dados de seus clientes inseridos na plataforma, garantindo conformidade com leis locais de proteção de dados.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex gap-4">
                  <span className="text-xl font-bold text-blue-500">3.</span>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">Manutenção de Assinatura</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      O acesso ao sistema está condicionado à manutenção do plano de assinatura ativo. A falta de renovação poderá limitar funcionalidades críticas como o registro de novos agendamentos e horários.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex gap-4">
                  <span className="text-xl font-bold text-blue-500">4.</span>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">Cancelamento e Reembolso</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      O cancelamento pode ser feito a qualquer momento. Conforme padrão SaaS, não haverá reembolso de ciclos já pagos, permanecendo o acesso ativo até o término do período vigente.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex gap-4">
                  <span className="text-xl font-bold text-blue-500">5.</span>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">Conformidade de API & Terceiros</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      O uso de bots e serviços integrados está sujeito à disponibilidade e políticas das plataformas de terceiros, como o Telegram.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex gap-4">
                  <span className="text-xl font-bold text-blue-500">6.</span>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">Cookies Estratégicos</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Utilizamos cookies essenciais para autenticação de sessão e tokens de segurança. Cookies não essenciais podem ser desativados sem comprometer a lógica principal do sistema.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-center">
              <span className="text-[10px] font-black text-blue-400 bg-blue-50 px-4 py-2 rounded-full uppercase tracking-widest">
                Última atualização: Março de {new Date().getFullYear()}
              </span>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-white sticky bottom-0 z-10">
          <button 
            onClick={handleAccept}
            className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-2xl shadow-xl shadow-gray-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-sm"
          >
            {onAccept ? "Li e Aceito os Termos" : "Compreendi e Concordo"}
          </button>
        </div>
      </div>
    </div>
  );
};
