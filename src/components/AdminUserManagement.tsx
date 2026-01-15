import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Trash2, RefreshCw, UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

interface UserStats {
  id: string;
  user_id: string;
  nombre: string;
  apellidos: string;
  divisa_preferida: string;
  created_at: string;
  transactionCount: number;
  categoryCount: number;
  accountCount: number;
  inversionesCount: number;
  criptomonedasCount: number;
}

const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  nombre: z.string().min(1, 'Nombre requerido'),
  apellidos: z.string().min(1, 'Apellidos requeridos'),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

export const AdminUserManagement = () => {
  const [users, setUsers] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      password: '',
      nombre: '',
      apellidos: ''
    }
  });

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
        divisa_preferida: user.divisa_preferida,
        created_at: user.created_at || new Date().toISOString(),
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

  const createUser = async (data: CreateUserForm) => {
    try {
      setCreating(true);

      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      // Call the Edge Function to create user (always with MXN currency)
      const { data: result, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: data.email,
          password: data.password,
          nombre: data.nombre,
          apellidos: data.apellidos,
          divisa_preferida: 'MXN'
        }
      });

      if (error) throw error;
      if (!result.success) throw new Error(result.error);

      await loadUsersWithStats();
      setCreateDialogOpen(false);
      form.reset();
      
      toast({
        title: "Usuario creado",
        description: `Usuario ${data.nombre} ${data.apellidos} creado exitosamente. Se ha enviado un email con las credenciales de acceso.`,
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el usuario",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
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
    <Card className="border-primary/20 hover:border-primary/40 transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Administración de Usuarios
          </div>
          <div className="flex gap-2">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" size="sm">
                  <UserPlus className="h-4 w-4" />
                  Crear Usuario
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(createUser)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="usuario@ejemplo.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contraseña Temporal</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" placeholder="Contraseña temporal" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="nombre"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Nombre" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="apellidos"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Apellidos</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Apellidos" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="bg-muted/50 p-3 rounded-md">
                      <p className="text-sm text-muted-foreground">
                        <strong>Divisa:</strong> MXN (Peso Mexicano) - Por defecto para todos los usuarios
                      </p>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCreateDialogOpen(false)}
                        disabled={creating}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={creating}>
                        {creating ? 'Creando...' : 'Crear Usuario'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            <Button 
              onClick={loadUsersWithStats} 
              variant="outline" 
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
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
                  <TableHead className="hidden sm:table-cell">Divisa</TableHead>
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
                          {user.divisa_preferida}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline">{user.divisa_preferida}</Badge>
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