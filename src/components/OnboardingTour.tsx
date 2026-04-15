import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface TourStep {
  target: string; // data-tour attribute value
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    target: 'nav-dashboard',
    title: '📊 Dashboard',
    content: 'Tu centro de control financiero. Aquí verás KPIs, gráficos de tendencia, y el desglose de activos y pasivos.',
    placement: 'right',
  },
  {
    target: 'nav-transacciones',
    title: '💳 Transacciones',
    content: 'Registra ingresos y gastos manualmente o importa estados de cuenta bancarios en CSV/Excel.',
    placement: 'right',
  },
  {
    target: 'nav-inversiones',
    title: '📈 Inversiones',
    content: 'Gestiona tu portafolio: cuentas de inversión, criptomonedas y su rendimiento.',
    placement: 'right',
  },
  {
    target: 'nav-informes',
    title: '📑 Informes',
    content: 'Genera reportes: P&L, Balance General, Flujo de Efectivo, análisis por categoría y más.',
    placement: 'right',
  },
  {
    target: 'nav-cuentas',
    title: '🏦 Cuentas',
    content: 'Configura tus cuentas bancarias, tarjetas, inversiones y bienes raíces.',
    placement: 'right',
  },
  {
    target: 'nav-categorias',
    title: '🏷️ Categorías',
    content: 'Organiza tus transacciones con categorías y subcategorías personalizadas.',
    placement: 'right',
  },
  {
    target: 'nav-configuracion',
    title: '⚙️ Configuración',
    content: 'Ajusta tu perfil, divisa preferida y gestiona tus datos.',
    placement: 'right',
  },
];

const MOBILE_STEPS: TourStep[] = [
  {
    target: 'mobile-nav-dashboard',
    title: '📊 Dashboard',
    content: 'Tu centro de control con KPIs, medias de ingreso/gasto y activos.',
    placement: 'top',
  },
  {
    target: 'mobile-nav-transacciones',
    title: '💳 Transacciones',
    content: 'Registra o importa tus movimientos financieros.',
    placement: 'top',
  },
  {
    target: 'mobile-nav-inversiones',
    title: '📈 Inversiones',
    content: 'Portafolio de inversiones y criptomonedas.',
    placement: 'top',
  },
  {
    target: 'mobile-nav-informes',
    title: '📑 Informes',
    content: 'Reportes financieros detallados.',
    placement: 'top',
  },
  {
    target: 'mobile-nav-configuracion',
    title: '⚙️ Configuración',
    content: 'Perfil, cuentas, categorías y ajustes.',
    placement: 'top',
  },
];

const STORAGE_KEY = 'savium-onboarding-completed';

export const useOnboardingTour = () => {
  const [isCompleted, setIsCompleted] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  const markCompleted = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsCompleted(true);
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setIsCompleted(false);
  }, []);

  return { isCompleted, markCompleted, reset };
};

interface OnboardingTourProps {
  active: boolean;
  onComplete: () => void;
}

export const OnboardingTour = ({ active, onComplete }: OnboardingTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const steps = isMobile ? MOBILE_STEPS : TOUR_STEPS;
  const step = steps[currentStep];

  // Find and measure target element
  const measureTarget = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    }
  }, [step]);

  useEffect(() => {
    if (!active) return;
    measureTarget();
    const handleResize = () => measureTarget();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [active, currentStep, measureTarget]);

  // Position tooltip
  useEffect(() => {
    if (!targetRect || !tooltipRef.current || !step) return;
    const tooltip = tooltipRef.current;
    const pad = 12;
    const placement = step.placement || 'right';

    let top = 0;
    let left = 0;

    if (placement === 'right') {
      top = targetRect.top + targetRect.height / 2 - tooltip.offsetHeight / 2;
      left = targetRect.right + pad;
    } else if (placement === 'left') {
      top = targetRect.top + targetRect.height / 2 - tooltip.offsetHeight / 2;
      left = targetRect.left - tooltip.offsetWidth - pad;
    } else if (placement === 'top') {
      top = targetRect.top - tooltip.offsetHeight - pad;
      left = targetRect.left + targetRect.width / 2 - tooltip.offsetWidth / 2;
    } else if (placement === 'bottom') {
      top = targetRect.bottom + pad;
      left = targetRect.left + targetRect.width / 2 - tooltip.offsetWidth / 2;
    }

    // Clamp to viewport
    top = Math.max(8, Math.min(top, window.innerHeight - tooltip.offsetHeight - 8));
    left = Math.max(8, Math.min(left, window.innerWidth - tooltip.offsetWidth - 8));

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }, [targetRect, step, currentStep]);

  if (!active || !step) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  // Build clip-path to create spotlight hole
  const spotlightPad = 6;
  const clipPath = targetRect
    ? `polygon(
        0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
        ${targetRect.left - spotlightPad}px ${targetRect.top - spotlightPad}px,
        ${targetRect.left - spotlightPad}px ${targetRect.bottom + spotlightPad}px,
        ${targetRect.right + spotlightPad}px ${targetRect.bottom + spotlightPad}px,
        ${targetRect.right + spotlightPad}px ${targetRect.top - spotlightPad}px,
        ${targetRect.left - spotlightPad}px ${targetRect.top - spotlightPad}px
      )`
    : undefined;

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* Overlay with spotlight cutout */}
      <div
        className="absolute inset-0 bg-black/60 transition-all duration-300"
        style={{ clipPath }}
        onClick={handleSkip}
      />

      {/* Spotlight ring */}
      {targetRect && (
        <div
          className="absolute rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-transparent pointer-events-none transition-all duration-300"
          style={{
            top: targetRect.top - spotlightPad,
            left: targetRect.left - spotlightPad,
            width: targetRect.width + spotlightPad * 2,
            height: targetRect.height + spotlightPad * 2,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute z-[10000] w-72 bg-card border border-border rounded-xl shadow-2xl p-4 animate-fade-in"
      >
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-base font-bold text-foreground">{step.title}</h3>
          <button
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground transition-colors -mt-1 -mr-1 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{step.content}</p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === currentStep
                    ? 'w-5 bg-primary'
                    : i < currentStep
                      ? 'w-2 bg-primary/40'
                      : 'w-2 bg-muted'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-1.5">
            {currentStep > 0 && (
              <Button variant="ghost" size="sm" onClick={handlePrev} className="h-7 px-2 text-xs">
                <ChevronLeft className="h-3 w-3" />
              </Button>
            )}
            <Button size="sm" onClick={handleNext} className="h-7 px-3 text-xs">
              {currentStep === steps.length - 1 ? '¡Listo!' : 'Siguiente'}
              {currentStep < steps.length - 1 && <ChevronRight className="h-3 w-3 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

/** Button to restart the tour from settings */
export const StartTourButton = ({ onClick }: { onClick: () => void }) => (
  <Button variant="outline" size="sm" onClick={onClick} className="gap-2">
    <Sparkles className="h-4 w-4" />
    Repetir tour guiado
  </Button>
);
