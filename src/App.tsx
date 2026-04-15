import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";

import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Transacciones from "./pages/Transacciones";
import Inversiones from "./pages/Inversiones";
import Informes from "./pages/Informes";
import Configuracion from "./pages/Configuracion";
import TransaccionesCategoria from "./pages/TransaccionesCategoria";
import ReglasClasificacion from "./pages/ReglasClasificacion";
import Cuentas from "./pages/Cuentas";
import Categorias from "./pages/Categorias";
import SeguimientoGastos from "./pages/SeguimientoGastos";
import SeguimientoIngresos from "./pages/SeguimientoIngresos";
import ChangelogPage from "./pages/ChangelogPage";
import Terminos from "./pages/Terminos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <HashRouter>
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
              <Route path="/changelog" element={
                <ProtectedRoute>
                  <ChangelogPage />
                </ProtectedRoute>
              } />
              <Route path="/terminos" element={
                <ProtectedRoute>
                  <Terminos />
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
