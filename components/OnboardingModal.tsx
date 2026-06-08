import React, { useCallback, useEffect, useState } from 'react';
import { X, ChevronRight, ChevronLeft, CheckCircle, Calendar, Briefcase, Layout, PartyPopper } from 'lucide-react';

type Props = {
  seen: boolean;
  onMarkSeen: () => Promise<void> | void;
};

export const OnboardingModal: React.FC<Props> = ({ seen, onMarkSeen }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // ABRE quando seen = false (primeiro acesso)
  useEffect(() => {
    if (!seen) {
      console.log('🎯 Onboarding: seen = false, abrindo modal');
      setIsVisible(true);
    }
  }, [seen]);

  // FECHA automaticamente quando seen muda para true
  useEffect(() => {
    if (seen && isVisible) {
      console.log('🎯 Onboarding: seen mudou para true, fechando modal');
      setIsVisible(false);
    }
  }, [seen, isVisible]); // ← ADICIONE ESTE useEffect

  const handleClose = useCallback(async () => {
    try {
      console.log('🎯 Onboarding: handleClose chamado');
      await onMarkSeen();
    } finally {
      setIsVisible(false);
    }
  }, [onMarkSeen]);

  // ... resto do código permanece igual

  const handleNext = () => {
    if (currentStep < 4) setCurrentStep((prev) => prev + 1);
    else handleClose();
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isVisible, handleClose]);

  if (!isVisible) return null;

  const steps = [
    {
      icon: <PartyPopper size={28} />,
      type: 'welcome',
      title: 'Bem-vindo ao CP Agenda Pro',
      main: 'Seu sistema de agendamentos já está ativo. Em poucos passos você vai entender como configurar e começar a usar.',
    },
    {
      icon: <Layout size={28} />,
      type: 'info',
      title: 'Sua página pública já está pronta',
      main: 'Você já possui uma página pública de agendamento ativa.',
      content: (
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-left">
          <p className="text-[12px] font-semibold text-gray-600 mb-1">Na aba Minha Conta, você pode personalizar:</p>
          <ul className="text-[12px] text-gray-500 space-y-0.5">
            <li>• a imagem da página</li>
            <li>• os textos exibidos para o cliente final</li>
          </ul>
          <p className="text-[11px] text-gray-400 mt-2">
            Essas informações aparecem apenas na página pública de agendamento.
          </p>
        </div>
      ),
    },
    {
      icon: <Briefcase size={28} />,
      type: 'info',
      title: 'Cadastre seus serviços',
      main: 'Para que seus clientes possam agendar, é necessário cadastrar pelo menos um serviço.',
      content: (
        <>
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-left">
            <p className="text-[12px] text-amber-900">
              A duração do serviço define o bloqueio correto dos horários.
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-left mt-2">
            <ul className="text-[12px] text-gray-500 space-y-0.5">
              <li>• Nome do serviço</li>
              <li>• Duração (30, 60, 90 min…)</li>
              <li>• Valor (opcional)</li>
            </ul>
          </div>
        </>
      ),
    },
    {
      icon: <Calendar size={28} />,
      type: 'info',
      title: 'Defina sua disponibilidade',
      main: 'Informe em quais dias e horários você atende. O sistema só permitirá agendamentos dentro desses períodos.',
      aux: 'Você pode ajustar sua disponibilidade sempre que precisar.',
    },
    {
      icon: <CheckCircle size={28} />,
      type: 'success',
      title: 'Tudo pronto',
      main: 'Seu sistema está pronto para receber agendamentos. Agora é só compartilhar seu link público com seus clientes.',
      aux: 'No menu do sistema você verá um card com o link da sua página pronto para copiar e compartilhar.',
    },
  ] as const;

  const step = steps[currentStep] as any;

  const iconBg =
    step.type === 'welcome'
      ? 'bg-primary/light text-primary'
      : step.type === 'success'
      ? 'bg-green-50 text-green-600'
      : 'bg-sky-50 text-sky-600';

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-900/70 backdrop-blur-sm p-4 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* HEADER */}
        <div className="px-5 pt-4 pb-2 flex items-center gap-3">
          <div className="flex-1 flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-[3px] flex-1 rounded-full ${i <= currentStep ? 'bg-primary' : 'bg-gray-200'}`}
              />
            ))}
          </div>
          <button onClick={handleClose} aria-label="Fechar" className="text-gray-400 hover:text-gray-600 p-1">
            <X size={16} />
          </button>
        </div>

        {/* BODY */}
        <div className="px-6 py-6 flex flex-col justify-center text-center min-h-[360px]">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${iconBg}`}>
            {step.icon}
          </div>

          <h2 className="text-[18px] font-extrabold text-gray-900 mb-2">{step.title}</h2>
          <p className="text-[13px] text-gray-500 leading-relaxed mb-3">{step.main}</p>

          <div className="mt-1">
            {step.content}
            {step.aux && <p className="text-[12px] text-gray-500 leading-relaxed mt-2">{step.aux}</p>}
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 pb-6 flex flex-col gap-3">
          <div className="flex gap-2">
            {currentStep > 0 ? (
              <button
                onClick={handleBack}
                className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg py-2 text-[13px] font-bold flex items-center justify-center gap-1"
              >
                <ChevronLeft size={14} /> Voltar
              </button>
            ) : (
              <div className="flex-1" />
            )}

            <button
              onClick={handleNext}
              className="flex-[1.5] bg-primary hover:bg-primary/hover text-white rounded-lg py-2 text-[13px] font-extrabold flex items-center justify-center gap-1 shadow-lg shadow-primary/20"
            >
              {currentStep === 4 ? 'Acessar o sistema' : 'PRÓXIMO'}
              {currentStep !== 4 && <ChevronRight size={14} />}
            </button>
          </div>

          {currentStep < 4 && (
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-[12px] font-semibold">
              Pular e acessar o sistema
            </button>
          )}
        </div>
      </div>
    </div>
  );
};