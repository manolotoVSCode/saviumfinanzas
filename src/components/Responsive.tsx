import { ComponentType } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileLayout from '@/components/movil/MobileLayout';

interface ResponsiveProps {
  /** Página de escritorio (lazy). Monta su propio Layout. */
  desktop: ComponentType;
  /** Página móvil (lazy). Se renderiza dentro de MobileLayout. */
  mobile: ComponentType;
}

/**
 * Elige la versión según el ancho. Va dentro de ProtectedRoute, así que las
 * páginas móviles nunca se montan sin usuario.
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
