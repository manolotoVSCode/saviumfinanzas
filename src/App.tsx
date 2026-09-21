import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

import ProtectedRoute from "@/components/ProtectedRoute";
import Responsive from "@/components/Responsive";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Las páginas se cargan bajo demanda para reducir el bundle inicial.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Transacciones = lazy(() => import("./pages/Transacciones"));
const Inversiones = lazy(() => import("./pages/Inversiones"));
const Informes = lazy(() => import("./pages/Informes"));
const Configuracion = lazy(() => import("./pages/Configuracion"));
const TransaccionesCategoria = lazy(() => import("./pages/TransaccionesCategoria"));
const ReglasClasificacion = lazy(() => import("./pages/ReglasClasificacion"));
const Cuentas = lazy(() => import("./pages/Cuentas"));
const Categorias = lazy(() => import("./pages/Categorias"));
const SeguimientoGastos = lazy(() => import("./pages/SeguimientoGastos"));
const SeguimientoIngresos = lazy(() => import("./pages/SeguimientoIngresos"));
const Pendientes = lazy(() => import("./pages/Pendientes"));
const Suscripciones = lazy(() => import("./pages/Suscripciones"));
const IngresosRecurrentes = lazy(() => import("./pages/IngresosRecurrentes"));
const PagosAnuales = lazy(() => import("./pages/PagosAnuales"));
const CxP = lazy(() => import("./pages/CxP"));
const ChangelogPage = lazy(() => import("./pages/ChangelogPage"));
const Alertas = lazy(() => import("./pages/Alertas"));

// Versión móvil (< 768px), solo lectura.
const SoloEscritorio = lazy(() => import("./pages/movil/SoloEscritorio"));
const ResumenMovil = lazy(() => import("./pages/movil/ResumenMovil"));
const InversionesMovil = lazy(() => import("./pages/movil/InversionesMovil"));
const SuscripcionesMovil = lazy(() => import("./pages/movil/SuscripcionesMovil"));
const PorCobrarMovil = lazy(() => import("./pages/movil/PorCobrarMovil"));
const PorPagarMovil = lazy(() => import("./pages/movil/PorPagarMovil"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p>Cargando...</p>
    </div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={
                <ProtectedRoute fallbackPath="/auth">
                  <Responsive desktop={Dashboard} mobile={ResumenMovil} />
                </ProtectedRoute>
              } />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Responsive desktop={Dashboard} mobile={ResumenMovil} />
                </ProtectedRoute>
              } />
              <Route path="/transacciones" element={
                <ProtectedRoute>
                  <Responsive desktop={Transacciones} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/inversiones" element={
                <ProtectedRoute>
                  <Responsive desktop={Inversiones} mobile={InversionesMovil} />
                </ProtectedRoute>
              } />
              <Route path="/informes" element={
                <ProtectedRoute>
                  <Responsive desktop={Informes} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/configuracion" element={
                <ProtectedRoute>
                  <Responsive desktop={Configuracion} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/transacciones-categoria" element={
                <ProtectedRoute>
                  <Responsive desktop={TransaccionesCategoria} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/reglas-clasificacion" element={
                <ProtectedRoute>
                  <Responsive desktop={ReglasClasificacion} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/cuentas" element={
                <ProtectedRoute>
                  <Responsive desktop={Cuentas} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/categorias" element={
                <ProtectedRoute>
                  <Responsive desktop={Categorias} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/seguimiento-gastos" element={
                <ProtectedRoute>
                  <Responsive desktop={SeguimientoGastos} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/seguimiento-ingresos" element={
                <ProtectedRoute>
                  <Responsive desktop={SeguimientoIngresos} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/pendientes" element={
                <ProtectedRoute>
                  <Responsive desktop={Pendientes} mobile={PorCobrarMovil} />
                </ProtectedRoute>
              } />
              <Route path="/suscripciones" element={
                <ProtectedRoute>
                  <Responsive desktop={Suscripciones} mobile={SuscripcionesMovil} />
                </ProtectedRoute>
              } />
              <Route path="/ingresos-recurrentes" element={
                <ProtectedRoute>
                  <Responsive desktop={IngresosRecurrentes} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/pagos-anuales" element={
                <ProtectedRoute>
                  <Responsive desktop={PagosAnuales} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/cxp" element={
                <ProtectedRoute>
                  <Responsive desktop={CxP} mobile={PorPagarMovil} />
                </ProtectedRoute>
              } />
              <Route path="/alertas" element={
                <ProtectedRoute>
                  <Responsive desktop={Alertas} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              <Route path="/changelog" element={
                <ProtectedRoute>
                  <Responsive desktop={ChangelogPage} mobile={SoloEscritorio} />
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </HashRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
