import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

import ProtectedRoute from "@/components/ProtectedRoute";
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
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/transacciones" element={
                <ProtectedRoute>
                  <Transacciones />
                </ProtectedRoute>
              } />
              <Route path="/inversiones" element={
                <ProtectedRoute>
                  <Inversiones />
                </ProtectedRoute>
              } />
              <Route path="/informes" element={
                <ProtectedRoute>
                  <Informes />
                </ProtectedRoute>
              } />
              <Route path="/configuracion" element={
                <ProtectedRoute>
                  <Configuracion />
                </ProtectedRoute>
              } />
              <Route path="/transacciones-categoria" element={
                <ProtectedRoute>
                  <TransaccionesCategoria />
                </ProtectedRoute>
              } />
              <Route path="/reglas-clasificacion" element={
                <ProtectedRoute>
                  <ReglasClasificacion />
                </ProtectedRoute>
              } />
              <Route path="/cuentas" element={
                <ProtectedRoute>
                  <Cuentas />
                </ProtectedRoute>
              } />
              <Route path="/categorias" element={
                <ProtectedRoute>
                  <Categorias />
                </ProtectedRoute>
              } />
              <Route path="/seguimiento-gastos" element={
                <ProtectedRoute>
                  <SeguimientoGastos />
                </ProtectedRoute>
              } />
              <Route path="/seguimiento-ingresos" element={
                <ProtectedRoute>
                  <SeguimientoIngresos />
                </ProtectedRoute>
              } />
              <Route path="/pendientes" element={
                <ProtectedRoute>
                  <Pendientes />
                </ProtectedRoute>
              } />
              <Route path="/suscripciones" element={
                <ProtectedRoute>
                  <Suscripciones />
                </ProtectedRoute>
              } />
              <Route path="/ingresos-recurrentes" element={
                <ProtectedRoute>
                  <IngresosRecurrentes />
                </ProtectedRoute>
              } />
              <Route path="/pagos-anuales" element={
                <ProtectedRoute>
                  <PagosAnuales />
                </ProtectedRoute>
              } />
              <Route path="/cxp" element={
                <ProtectedRoute>
                  <CxP />
                </ProtectedRoute>
              } />
              <Route path="/alertas" element={
                <ProtectedRoute>
                  <Alertas />
                </ProtectedRoute>
              } />
              <Route path="/changelog" element={
                <ProtectedRoute>
                  <ChangelogPage />
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
