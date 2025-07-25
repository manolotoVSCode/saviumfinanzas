import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Trash2, RefreshCw } from 'lucide-react';

interface UserStats {
  id: string;
  user_id: string;
  nombre: string;
  apellidos: string;
  edad: number | null;
  divisa_preferida: string;
  created_at: string;
  transactionCount: number;
  categoryCount: number;
  accountCount: number;
  inversionesCount: number;
  criptomonedasCount: number;
}

export const AdminUserManagement = () => {
  const [users, setUsers] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUsersWithStats();
  }, []);

  const loadUsersWithStats = async () => {
    try {
      setLoading(true);

      // Use the secure admin function to get all user stats
      const { data: usersData, error } = await supabase
        .rpc('get_admin_user_stats');

      if (error) {
        console.error('Error fetching admin user stats:', error);
        throw error;
      }

      // Transform the data to match the expected UserStats interface
      const transformedUsers: UserStats[] = (usersData || []).map((user: any) => ({
        id: user.user_id, // Using user_id as id since we need it for the key
        user_id: user.user_id,
        nombre: user.nombre,
        apellidos: user.apellidos,
        edad: null, // Not included in the admin function, but not critical
        divisa_preferida: user.divisa_preferida,
        created_at: new Date().toISOString(), // Not critical for display
        transactionCount: Number(user.transacciones_count),
        categoryCount: Number(user.categorias_count),
        accountCount: Number(user.cuentas_count),
        inversionesCount: Number(user.inversiones_count),
        criptomonedasCount: Number(user.criptomonedas_count),
      }));

      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error loading users with stats:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string, userDisplayName: string) => {
    try {
      // Use the secure admin function to delete user completely
      const { error } = await supabase.rpc('admin_delete_user', {
        target_user_id: userId
      });
      
      if (error) throw error;

      await loadUsersWithStats();
      
      toast({
        title: "Usuario eliminado",
        description: `El usuario ${userDisplayName} y todos sus datos han sido eliminados completamente`,
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el usuario",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="hover-scale border-primary/20 hover:border-primary/40 transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Administración de Usuarios
          </div>
          <Button 
            onClick={loadUsersWithStats} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : users.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No hay usuarios registrados</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead className="hidden sm:table-cell">Divisa/Edad</TableHead>
                  <TableHead className="hidden md:table-cell">Registro</TableHead>
                  <TableHead>Trans.</TableHead>
                  <TableHead>Cat.</TableHead>
                  <TableHead>Cuentas</TableHead>
                  <TableHead className="hidden sm:table-cell">Crypto</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">
                          {user.nombre} {user.apellidos}
                        </div>
                        <div className="sm:hidden text-xs text-muted-foreground">
                          {user.divisa_preferida} {user.edad ? `• ${user.edad}a` : ''}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="space-y-1">
                        <Badge variant="outline">{user.divisa_preferida}</Badge>
                        <div className="text-sm text-muted-foreground">
                          {user.edad ? `${user.edad} años` : 'Sin edad'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="text-sm">
                        {new Date(user.created_at).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {user.transactionCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {user.categoryCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {user.accountCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary" className="text-xs">
                        {user.criptomonedasCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                            <AlertDialogDescription>
                              ¿Estás seguro de que deseas eliminar al usuario <strong>{user.nombre} {user.apellidos}</strong>? 
                              Esta acción eliminará permanentemente:
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                  <li>{user.transactionCount} transacciones</li>
                                  <li>{user.categoryCount} categorías</li>
                                  <li>{user.accountCount} cuentas</li>
                                  <li>{user.criptomonedasCount} criptomonedas</li>
                                  <li>Todos sus datos personales</li>
                                </ul>
                              Esta acción no se puede deshacer.
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};