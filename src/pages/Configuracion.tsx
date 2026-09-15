import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';
import { ProfileEditor } from '@/components/ProfileEditor';
import { DataAudit } from '@/components/DataAudit';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { ExchangeRates } from '@/components/ExchangeRates';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, LogOut, Trash2, Search, Wallet, Tag, Filter } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';

const Configuracion = () => {
  const financeData = useFinanceDataSupabase();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  if (financeData.loading) {
    return (
      <Layout>
        <div className="animate-fade-in flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Cargando configuración...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            <h1 className="text-3xl font-bold">Configuración</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/cuentas')}>
              <Wallet className="h-4 w-4 mr-1" />
              Cuentas
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/categorias')}>
              <Tag className="h-4 w-4 mr-1" />
              Categorías
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/reglas-clasificacion')}>
              <Filter className="h-4 w-4 mr-1" />
              Reglas de Clasificación
            </Button>
          </div>
        </div>

        {/* EDITOR DE PERFIL */}
        <ProfileEditor />

        {/* TASAS DE CAMBIO ACTUALES */}
        <Card className="border-primary/20 hover:border-primary/40 transition-all duration-300">
          <CardHeader>
            <CardTitle>Tasas de Cambio Actuales</CardTitle>
          </CardHeader>
          <CardContent>
            <ExchangeRates />
          </CardContent>
        </Card>


        {/* AUDITORÍA DE DATOS */}
        <Card className="border-blue-200 hover:border-blue-400 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Auditoría de Datos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Analiza tus transacciones, cuentas y categorías para detectar problemas e incoherencias en los datos.
            </p>
            <DataAudit
              transactions={financeData.transactions}
              accounts={financeData.accounts}
              categories={financeData.categories}
            />
          </CardContent>
        </Card>

        {/* INFORMACIÓN DE LA APP */}
        <Card className="border-muted/20 hover:border-muted/40 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Acerca de Savium
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              <span className="text-green-600 font-semibold">Savium</span> es tu aplicación de finanzas personales diseñada para ayudarte a tomar control de tu dinero.
            </p>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Gestión de Transacciones</Badge>
              <Badge variant="secondary">Gestión de Inversiones</Badge>
              <Badge variant="secondary">Dashboard Financiero</Badge>
              <Badge variant="secondary">Gestión de Cuentas</Badge>
            </div>

            <div className="pt-4 border-t flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Versión 6.6 · Desarrollado por Manuel de la Torre · 2025
              </p>
              <Button variant="link" size="sm" className="text-xs" onClick={() => navigate('/changelog')}>
                Ver changelog →
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* CONFIGURACIÓN DE SESIÓN */}
        <Card className="border-destructive/20 hover:border-destructive/40 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-destructive" />
              Sesión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Gestionar datos y cerrar sesión en esta aplicación
              </p>
              
              {/* Botón para limpiar todas las transacciones */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar Todas las Transacciones
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción eliminará todas las transacciones permanentemente. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={financeData.clearAllTransactions} className="bg-red-600 hover:bg-red-700">
                      Eliminar todo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                variant="destructive"
                onClick={signOut}
                className="w-full flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Configuracion;