import { useEffect } from 'react';
import { useTheme } from 'next-themes';

const COLOR = { light: '#F2F2F7', dark: '#000000' } as const;

/**
 * Barra de título de la app instalada (Dock en Mac) del color del fondo. Las <meta theme-color> de
 * index.html siguen al sistema; si se fuerza Clara u Oscura en Configuración, se ajustan aquí.
 */
export const ColorVentana = () => {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (resolvedTheme !== 'light' && resolvedTheme !== 'dark') return;
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', COLOR[resolvedTheme]));
  }, [resolvedTheme]);
  return null;
};
