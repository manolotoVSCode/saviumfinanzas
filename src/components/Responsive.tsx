import { ComponentType, lazy } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

// Lazy para que el escritorio no descargue el cascarón móvil (layout, contexto de divisa).
// Se define a nivel de módulo: un lazy() dentro del componente se recrearía en cada render.
const MobileLayout = lazy(() => import('@/components/movil/MobileLayout'));

interface ResponsiveProps {
  /** Página de escritorio (lazy). Monta su propio Layout. */
  desktop: ComponentType;
  /** Página móvil (lazy). Se renderiza dentro de MobileLayout. */
  mobile: ComponentType;
}

/**
 * Elige la versión según el ancho. Va dentro de ProtectedRoute, así que las
 * páginas móviles nunca se montan sin usuario. El Suspense global de App.tsx
 * cubre la primera carga de MobileLayout; después, MobileLayout sigue montado
 * entre pestañas y su propio Suspense cubre cada página.
 */
const Responsive = ({ desktop: Desktop, mobile: Mobile }: ResponsiveProps) => {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <MobileLayout>
        <Mobile />
      </MobileLayout>
    );
  }
  return <Desktop />;
};

export default Responsive;
