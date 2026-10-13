import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/** Lo que puede abrir una lectora en la web: lo mismo que ve en la app del iPhone. */
export const RUTAS_LECTORA = ['/', '/dashboard', '/transacciones', '/transacciones-categoria', '/inversiones', '/pendientes', '/cxp', '/suscripciones', '/alertas', '/configuracion'];

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallbackPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, fallbackPath = '/auth' }) => {
  const { user, loading, soloLectura } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate(fallbackPath);
    }
  }, [user, loading, navigate, fallbackPath]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (soloLectura && !RUTAS_LECTORA.includes(pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;