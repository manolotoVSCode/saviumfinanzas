import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';
import { AccountsManager } from '@/components/AccountsManager';
import { CategoriesManager } from '@/components/CategoriesManager';
import { ProfileEditor } from '@/components/ProfileEditor';
import { AdminUserManagement } from '@/components/AdminUserManagement';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { ExchangeRates } from '@/components/ExchangeRates';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, Heart, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';

const Configuracion = () => {
  const financeData = useFinanceDataSupabase();
  const { signOut, user } = useAuth();

  // Check if current user is admin
  const isAdmin = user?.email === 'manoloto@hotmail.com';

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
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Configuración</h1>
        </div>

        {/* EDITOR DE PERFIL */}
        <ProfileEditor />

        {/* TASAS DE CAMBIO ACTUALES */}
        <ExchangeRates />

        {/* GESTIÓN DE CUENTAS */}
        <Card className="hover-scale border-secondary/20 hover:border-secondary/40 transition-all duration-300">
          <CardHeader>
            <CardTitle>Gestión de Cuentas</CardTitle>
          </CardHeader>
          <CardContent>
            <AccountsManager
              accounts={financeData.accounts}
              accountTypes={financeData.accountTypes}
              onAddAccount={financeData.addAccount}
              onUpdateAccount={financeData.updateAccount}
              onDeleteAccount={financeData.deleteAccount}
            />
          </CardContent>
        </Card>

        {/* GESTIÓN DE CATEGORÍAS */}
        <Card className="hover-scale border-accent/20 hover:border-accent/40 transition-all duration-300">
          <CardHeader>
            <CardTitle>Gestión de Categorías</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoriesManager
              categories={financeData.categories}
              transactions={financeData.transactions}
              onAddCategory={financeData.addCategory}
              onUpdateCategory={financeData.updateCategory}
              onDeleteCategory={financeData.deleteCategory}
            />
          </CardContent>
        </Card>

        {/* ADMINISTRACIÓN DE USUARIOS - Solo para admin */}
        {isAdmin && <AdminUserManagement />}

        {/* INFORMACIÓN DE LA APP */}
        <Card className="hover-scale border-muted/20 hover:border-muted/40 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Acerca de <span className="text-green-600 font-semibold">Savium</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              <span className="text-green-600 font-semibold">Savium</span> es tu aplicación de finanzas personales diseñada para ayudarte a tomar control de tu dinero.
            </p>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Gestión de Transacciones</Badge>
              <Badge variant="secondary">Seguimiento de Inversiones</Badge>
              <Badge variant="secondary">Dashboard Financiero</Badge>
              <Badge variant="secondary">Múltiples Cuentas</Badge>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Versión: 1.0.0 • Desarrollado con ❤️
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CONFIGURACIÓN DE SESIÓN */}
        <Card className="hover-scale border-destructive/20 hover:border-destructive/40 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-destructive" />
              Sesión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Cerrar sesión en esta aplicación
              </p>
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