import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import Layout from '@/components/Layout';
import { AccountsManager } from '@/components/AccountsManager';
import { CategoriesManager } from '@/components/CategoriesManager';
import { ProfileEditor } from '@/components/ProfileEditor';
import { AdminUserManagement } from '@/components/AdminUserManagement';
import { DataAudit } from '@/components/DataAudit';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { ExchangeRates } from '@/components/ExchangeRates';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Settings, LogOut, Trash2, Globe, Search } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useState, useEffect } from 'react';

const Configuracion = () => {
  const financeData = useFinanceDataSupabase();
  const { signOut, user } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  // Check if current user is admin
  const isAdmin = user?.email === 'manoloto@hotmail.com';

  if (financeData.loading) {
    return (
      <Layout>
        <div className="animate-fade-in flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>{t('settings.loading')}</p>
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
          <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
        </div>

        {/* EDITOR DE PERFIL */}
        <ProfileEditor />

        {/* CONFIGURACIÓN DE IDIOMA - TEMPORALMENTE INACTIVA */}
        <Card className="border-primary/20 hover:border-primary/40 transition-all duration-300 opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t('settings.language')} (Próximamente)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="language-select">{t('settings.language')}</Label>
              <Select value={language} onValueChange={() => {}} disabled>
                <SelectTrigger id="language-select" disabled>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">{t('settings.language.spanish')}</SelectItem>
                  <SelectItem value="en">{t('settings.language.english')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              {language === 'es' 
                ? 'Funcionalidad temporalmente deshabilitada. Próximamente disponible.'
                : 'Feature temporarily disabled. Coming soon.'
              }
            </p>
          </CardContent>
        </Card>

        {/* TASAS DE CAMBIO ACTUALES */}
        <Card className="border-primary/20 hover:border-primary/40 transition-all duration-300">
          <CardHeader>
            <CardTitle>{t('settings.exchange_rates')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ExchangeRates />
          </CardContent>
        </Card>

        {/* GESTIÓN DE CUENTAS */}
        <Card className="border-secondary/20 hover:border-secondary/40 transition-all duration-300">
          <CardHeader>
            <CardTitle>{t('settings.accounts')}</CardTitle>
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
        <Card className="border-accent/20 hover:border-accent/40 transition-all duration-300">
          <CardHeader>
            <CardTitle>{t('settings.categories')}</CardTitle>
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

        {/* ADMINISTRACIÓN DE USUARIOS - Deshabilitado temporalmente */}
        {isAdmin && (
          <Card className="border-muted/40 opacity-50 pointer-events-none select-none">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-muted-foreground">Administrar Usuarios</CardTitle>
                <Badge variant="outline" className="text-xs text-muted-foreground border-muted">
                  En mantenimiento
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Este módulo está temporalmente inhabilitado.</p>
            </CardHeader>
          </Card>
        )}

        {/* INFORMACIÓN DE LA APP */}
        <Card className="border-muted/20 hover:border-muted/40 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t('settings.about')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              <span className="text-green-600 font-semibold">Savium</span> {t('settings.description')}
            </p>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{t('transactions.title')}</Badge>
              <Badge variant="secondary">{t('investments.title')}</Badge>
              <Badge variant="secondary">{t('dashboard.title')}</Badge>
              <Badge variant="secondary">{t('settings.accounts')}</Badge>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {t('settings.version')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CONFIGURACIÓN DE SESIÓN */}
        <Card className="border-destructive/20 hover:border-destructive/40 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-destructive" />
              {t('settings.session')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                {language === 'es' 
                  ? 'Gestionar datos y cerrar sesión en esta aplicación'
                  : 'Manage data and sign out of this application'
                }
              </p>
              
              {/* Botón para limpiar todas las transacciones */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('settings.clear_data')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('settings.clear_data.confirm')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('settings.clear_data.description')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('settings.clear_data.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={financeData.clearAllTransactions} className="bg-red-600 hover:bg-red-700">
                      {t('settings.clear_data.confirm_action')}
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
                {t('settings.logout')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Configuracion;