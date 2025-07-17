import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';
import { AccountsManager } from '@/components/AccountsManager';
import { CategoriesManager } from '@/components/CategoriesManager';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { ExchangeRates } from '@/components/ExchangeRates';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, Heart, LogOut, Users, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface UserProfile {
  id: string;
  user_id: string;
  nombre: string;
  apellidos: string;
  edad: number | null;
  divisa_preferida: string;
  created_at: string;
}

const Configuracion = () => {
  const financeData = useFinanceDataSupabase();
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Check if current user is admin
  const isAdmin = user?.email === 'manoloto@hotmail.com';

  // Load users if admin
  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive"
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const deleteUser = async (userId: string, userDisplayName: string) => {
    try {
      // First delete from auth.users (this will cascade delete the profile)
      const { error } = await supabase.auth.admin.deleteUser(userId);
      
      if (error) throw error;

      // Refresh users list
      await loadUsers();
      
      toast({
        title: "Usuario eliminado",
        description: `El usuario ${userDisplayName} ha sido eliminado exitosamente`,
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el usuario. Verifica los permisos de administrador.",
        variant: "destructive"
      });
    }
  };

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
        {isAdmin && (
          <Card className="hover-scale border-primary/20 hover:border-primary/40 transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Administración de Usuarios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  Gestiona los usuarios registrados en la aplicación
                </p>
                
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {users.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No hay usuarios registrados</p>
                    ) : (
                      users.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">
                              {user.nombre} {user.apellidos}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ID: {user.user_id}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Divisa: {user.divisa_preferida} • Edad: {user.edad || 'No especificada'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Registrado: {new Date(user.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                className="ml-4"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Estás seguro de que deseas eliminar al usuario <strong>{user.nombre} {user.apellidos}</strong>? 
                                  Esta acción no se puede deshacer y eliminará todas sus transacciones, cuentas y datos.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUser(user.user_id, `${user.nombre} ${user.apellidos}`)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))
                    )}
                  </div>
                )}
                
                <Button 
                  onClick={loadUsers} 
                  variant="outline" 
                  className="w-full"
                  disabled={loadingUsers}
                >
                  Actualizar Lista
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* INFORMACIÓN DE LA APP */}
        <Card className="hover-scale border-muted/20 hover:border-muted/40 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Acerca de Savium
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Savium es tu aplicación de finanzas personales diseñada para ayudarte a tomar control de tu dinero.
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