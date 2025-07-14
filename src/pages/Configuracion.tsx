import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Layout from '@/components/Layout';
import { AccountsManager } from '@/components/AccountsManager';
import { CategoriesManager } from '@/components/CategoriesManager';
import { UserConfig } from '@/components/UserConfig';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useUser } from '@/hooks/useUser';
import { Settings, LogOut, Info, Heart } from 'lucide-react';

const Configuracion = () => {
  const financeData = useFinanceData();
  const { user, updateUser } = useUser();

  const handleLogout = () => {
    // Aquí iría la lógica de logout cuando se implemente autenticación
    console.log('Logout functionality - To be implemented');
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
      {/* CONFIGURACIÓN DE USUARIO */}
      <Card className="hover-scale border-primary/20 hover:border-primary/40 transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Configuración de Usuario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UserConfig user={user} onUpdateUser={updateUser} />
        </CardContent>
      </Card>

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
            onAddCategory={financeData.addCategory}
            onUpdateCategory={financeData.updateCategory}
            onDeleteCategory={financeData.deleteCategory}
          />
        </CardContent>
      </Card>

      {/* INFORMACIÓN Y ACCIONES */}
      <Card className="hover-scale border-muted/20 hover:border-muted/40 transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-muted-foreground" />
            Información y Acciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* SOBRE SAVIUM */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20">
            <div className="flex items-center gap-3 mb-3">
              <Heart className="h-5 w-5 text-primary" />
              <div>
                <h4 className="font-semibold text-primary">Sobre Savium</h4>
                <p className="text-sm text-muted-foreground">Plataforma de gestión financiera personal</p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Versión 1.0.0</p>
              <p>• Control total de tus finanzas personales</p>
              <p>• Desarrollado para ayudarte a alcanzar tus metas financieras</p>
              <p>• Análisis inteligente de patrones de gasto e inversión</p>
            </div>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <a 
                href="https://savium.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                Más información
              </a>
            </Button>
          </div>

          <Separator />

          {/* LOGOUT */}
          <div className="flex flex-col space-y-3">
            <h4 className="font-medium text-destructive">Zona de Seguridad</h4>
            <p className="text-sm text-muted-foreground">
              Cierra tu sesión de forma segura cuando termines de usar la aplicación.
            </p>
            <Button 
              variant="destructive" 
              onClick={handleLogout}
              className="w-full flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              La funcionalidad de autenticación se implementará próximamente
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
    </Layout>
  );
};

export default Configuracion;