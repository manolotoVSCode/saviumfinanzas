import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Estado { fallo: boolean }

/**
 * Evita la pantalla en blanco si una página falla al pintarse o su archivo ya no existe tras un despliegue
 * (las páginas se cargan bajo demanda). Recargar trae la versión publicada.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { fallo: false };

  static getDerivedStateFromError(): Estado {
    return { fallo: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Fallo de pantalla:', error, info.componentStack);
  }

  render() {
    if (!this.state.fallo) return this.props.children;
    return (
      <main role="alert" className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-4">
          <h1 className="text-xl font-semibold">Esta pantalla no se pudo abrir</h1>
          <p className="text-sm text-muted-foreground">Tus datos no se han visto afectados. Recarga para volver a intentarlo.</p>
          <Button onClick={() => window.location.reload()}>Recargar</Button>
        </div>
      </main>
    );
  }
}
