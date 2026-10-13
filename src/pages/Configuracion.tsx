import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Button } from '@/components/ui/button';

import { PageHeader } from '@/components/PageHeader';

import Layout from '@/components/Layout';
import { ProfileEditor } from '@/components/ProfileEditor';

import { ContactosEmergencia } from '@/components/ContactosEmergencia';

import { AparienciaSelector } from '@/components/AparienciaSelector';

import { DataAudit } from '@/components/DataAudit';

import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';

import { useAppConfig } from '@/hooks/useAppConfig';

import { ExchangeRates } from '@/components/ExchangeRates';

import { useAuth } from '@/contexts/AuthContext';

import { LogOut, Trash2, Search, Wallet, Tag, Filter, SunMoon } from 'lucide-react';
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
        <PageHeader title="Configuración" actions={<>
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
          </>} />

        {/* EDITOR DE PERFIL */}
        <ProfileEditor />

        {/* APARIENCIA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SunMoon className="h-5 w-5" />
              Apariencia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <AparienciaSelector />
            <p className="text-muted-foreground text-sm">
              Automática cambia sola con el modo claro u oscuro de tu Mac o iPhone. Se guarda en este navegador.
            </p>
          </CardContent>
        </Card>

        {/* TASAS DE CAMBIO ACTUALES */}
        <ExchangeRates />


        {/* ALERTA DE EMERGENCIA (app iOS) */}
        <ContactosEmergencia />

        {/* AUDITORÍA DE DATOS */}
        <Card>
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

        {/* CONFIGURACIÓN DE SESIÓN */}
        <Card>
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
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 hover:border-destructive/50"
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
                    <AlertDialogAction onClick={financeData.clearAllTransactions} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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