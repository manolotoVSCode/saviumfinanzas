import { ReactNode, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, TrendingUp, CreditCard, Clock, Receipt, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePendings } from '@/hooks/usePendings';
import { MobileCurrencyProvider, MOBILE_CURRENCIES, useMobileCurrency } from '@/contexts/MobileCurrencyContext';
import { Cargando } from '@/components/movil/ui';
import { cn } from '@/lib/utils';

const TABS = [
  { path: '/dashboard', icon: BarChart3, label: 'Resumen', matches: ['/', '/dashboard'] },
  { path: '/inversiones', icon: TrendingUp, label: 'Inversiones', matches: ['/inversiones'] },
  { path: '/suscripciones', icon: CreditCard, label: 'Suscripciones', matches: ['/suscripciones'] },
  { path: '/pendientes', icon: Clock, label: 'Por cobrar', matches: ['/pendientes'] },
  { path: '/cxp', icon: Receipt, label: 'Por pagar', matches: ['/cxp'] },
];

const CurrencyChips = () => {
  const { currency, setCurrency } = useMobileCurrency();
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Divisa">
      {MOBILE_CURRENCIES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => setCurrency(c)}
          aria-pressed={currency === c}
          className={cn(
            'h-11 min-w-[48px] px-2 rounded-full text-sm font-semibold transition-colors',
            currency === c ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
          )}
        >
          {c}
        </button>
      ))}
    </div>
  );
};

const Shell = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { overdueCount } = usePendings();
  const { ready } = useMobileCurrency();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* CABECERA */}
      {/* min-h (no h fija): en PWA de iPhone el safe-area-inset-top vale 44-59px y una altura fija dejaría los chips fuera de la cabecera */}
      <header className="sticky top-0 z-40 min-h-14 bg-background border-b flex items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
        <button type="button" onClick={() => navigate('/dashboard')} aria-label="Ir a Resumen">
          <img src="/images/logo.png" alt="Savium" className="h-8 w-auto" />
        </button>
        <div className="flex items-center gap-2">
          <CurrencyChips />
          <button
            type="button"
            onClick={signOut}
            aria-label="Cerrar sesión"
            className="h-11 w-11 flex items-center justify-center rounded-full text-muted-foreground"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* CONTENIDO: no se monta ninguna pantalla hasta saber la divisa (evita calcular con el MXN provisional) */}
      <main className="px-4 py-4 pb-[calc(5rem_+_env(safe-area-inset-bottom))]">
        {ready ? <Suspense fallback={<Cargando />}>{children}</Suspense> : <Cargando />}
      </main>

      {/* NAV INFERIOR: 64px + zona segura */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-background border-t h-[calc(4rem_+_env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 h-16">
          {TABS.map(({ path, icon: Icon, label, matches }) => {
            const active = matches.includes(location.pathname);
            const badge = path === '/pendientes' && overdueCount > 0 ? overdueCount : null;
            return (
              <button
                key={path}
                type="button"
                onClick={() => navigate(path)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 h-full',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon className="h-6 w-6" />
                {/* Etiquetas a 12px: cinco etiquetas de 14px no caben en 390px; es la única excepción a ≥14px */}
                <span className={cn('text-[12px] leading-none', active && 'font-semibold')}>{label}</span>
                {badge !== null && (
                  <span className="absolute top-1 right-[calc(50%-24px)] min-w-6 h-6 px-1.5 rounded-full bg-destructive text-destructive-foreground text-sm font-semibold flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

/**
 * Cabecera + contenido + nav inferior de la versión móvil. Se monta desde
 * Responsive (no desde cada página) para que sobreviva al cambio de pestaña:
 * el Suspense interno muestra el loader del contenido sin perder la nav.
 */
const MobileLayout = ({ children }: { children: ReactNode }) => (
  <MobileCurrencyProvider>
    <Shell>{children}</Shell>
  </MobileCurrencyProvider>
);

export default MobileLayout;
