import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, FolderKanban, Calendar, DollarSign, Search, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useAppConfig } from '@/hooks/useAppConfig';

interface Cliente {
  id: string;
  nombre: string;
}

interface Proyecto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  tipo: string;
  estatus: string;
  presupuesto: number | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  notas: string | null;
  cliente_id: string | null;
  clientes?: { nombre: string } | null;
}

const TIPOS_PROYECTO = [
  'Motor CHP',
  'Mantenimiento',
  'Refacciones',
  'Servicio Correctivo',
  'Otro'
];

const ESTATUS_PROYECTO = [
  { value: 'cotizado', label: 'Cotizado', color: 'bg-gray-500' },
  { value: 'aprobado', label: 'Aprobado', color: 'bg-blue-500' },
  { value: 'en_proceso', label: 'En Proceso', color: 'bg-yellow-500' },
  { value: 'completado', label: 'Completado', color: 'bg-green-500' },
  { value: 'facturado', label: 'Facturado', color: 'bg-purple-500' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-500' }
];

export const ProyectosManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { formatCurrency } = useAppConfig();
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProyecto, setEditingProyecto] = useState<Proyecto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstatus, setFilterEstatus] = useState<string>('all');
  
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    tipo: 'Motor CHP',
    estatus: 'cotizado',
    presupuesto: '',
    fecha_inicio: '',
    fecha_fin: '',
    notas: '',
    cliente_id: ''
  });

  const loadData = async () => {
    if (!user) return;
    
    const [proyectosRes, clientesRes] = await Promise.all([
      supabase
        .from('proyectos')
        .select('*, clientes(nombre)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('clientes')
        .select('id, nombre')
        .eq('user_id', user.id)
        .eq('activo', true)
        .order('nombre')
    ]);
    
    if (proyectosRes.error) {
      toast({ title: 'Error', description: 'No se pudieron cargar los proyectos', variant: 'destructive' });
    } else {
      setProyectos(proyectosRes.data || []);
    }
    
    setClientes(clientesRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const generateCodigo = () => {
    const year = new Date().getFullYear();
    const num = (proyectos.length + 1).toString().padStart(3, '0');
    return `PRY-${year}-${num}`;
  };

  const resetForm = () => {
    setFormData({
      codigo: generateCodigo(),
      nombre: '',
      descripcion: '',
      tipo: 'Motor CHP',
      estatus: 'cotizado',
      presupuesto: '',
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: '',
      notas: '',
      cliente_id: ''
    });
    setEditingProyecto(null);
  };

  const handleOpenDialog = (proyecto?: Proyecto) => {
    if (proyecto) {
      setEditingProyecto(proyecto);
      setFormData({
        codigo: proyecto.codigo,
        nombre: proyecto.nombre,
        descripcion: proyecto.descripcion || '',
        tipo: proyecto.tipo,
        estatus: proyecto.estatus,
        presupuesto: proyecto.presupuesto?.toString() || '',
        fecha_inicio: proyecto.fecha_inicio || '',
        fecha_fin: proyecto.fecha_fin || '',
        notas: proyecto.notas || '',
        cliente_id: proyecto.cliente_id || ''
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const proyectoData = {
      user_id: user.id,
      codigo: formData.codigo,
      nombre: formData.nombre,
      descripcion: formData.descripcion || null,
      tipo: formData.tipo,
      estatus: formData.estatus,
      presupuesto: formData.presupuesto ? parseFloat(formData.presupuesto) : null,
      fecha_inicio: formData.fecha_inicio || null,
      fecha_fin: formData.fecha_fin || null,
      notas: formData.notas || null,
      cliente_id: formData.cliente_id || null
    };

    if (editingProyecto) {
      const { error } = await supabase
        .from('proyectos')
        .update(proyectoData)
        .eq('id', editingProyecto.id);

      if (error) {
        toast({ title: 'Error', description: 'No se pudo actualizar el proyecto', variant: 'destructive' });
      } else {
        toast({ title: 'Éxito', description: 'Proyecto actualizado' });
      }
    } else {
      const { error } = await supabase
        .from('proyectos')
        .insert(proyectoData);

      if (error) {
        toast({ title: 'Error', description: 'No se pudo crear el proyecto', variant: 'destructive' });
      } else {
        toast({ title: 'Éxito', description: 'Proyecto creado' });
      }
    }

    setDialogOpen(false);
    resetForm();
    loadData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('proyectos')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar el proyecto', variant: 'destructive' });
    } else {
      toast({ title: 'Éxito', description: 'Proyecto eliminado' });
      loadData();
    }
  };

  const getEstatusConfig = (estatus: string) => {
    return ESTATUS_PROYECTO.find(e => e.value === estatus) || ESTATUS_PROYECTO[0];
  };

  const filteredProyectos = proyectos.filter(p => {
    const matchSearch = 
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.clientes?.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEstatus = filterEstatus === 'all' || p.estatus === filterEstatus;
    return matchSearch && matchEstatus;
  });

  if (loading) {
    return <div className="text-center py-8">Cargando proyectos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar proyecto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterEstatus} onValueChange={setFilterEstatus}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {ESTATUS_PROYECTO.map(e => (
                <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Proyecto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingProyecto ? 'Editar Proyecto' : 'Nuevo Proyecto'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código *</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder="PRY-2025-001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo *</Label>
                  <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_PROYECTO.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del Proyecto *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Instalación Motor CHP Planta Norte"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cliente_id">Cliente</Label>
                  <Select 
                    value={formData.cliente_id} 
                    onValueChange={(v) => setFormData({ ...formData, cliente_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estatus">Estado</Label>
                  <Select 
                    value={formData.estatus} 
                    onValueChange={(v) => setFormData({ ...formData, estatus: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTATUS_PROYECTO.map(e => (
                        <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Descripción del proyecto..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="presupuesto">Presupuesto</Label>
                  <Input
                    id="presupuesto"
                    type="number"
                    value={formData.presupuesto}
                    onChange={(e) => setFormData({ ...formData, presupuesto: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha_inicio">Fecha Inicio</Label>
                  <Input
                    id="fecha_inicio"
                    type="date"
                    value={formData.fecha_inicio}
                    onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha_fin">Fecha Fin</Label>
                  <Input
                    id="fecha_fin"
                    type="date"
                    value={formData.fecha_fin}
                    onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  id="notas"
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  placeholder="Notas adicionales..."
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingProyecto ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {filteredProyectos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{searchTerm || filterEstatus !== 'all' ? 'No se encontraron proyectos' : 'No hay proyectos registrados'}</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead className="hidden md:table-cell">Cliente</TableHead>
                <TableHead className="hidden sm:table-cell">Presupuesto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProyectos.map((proyecto) => {
                const estatusConfig = getEstatusConfig(proyecto.estatus);
                return (
                  <TableRow key={proyecto.id}>
                    <TableCell className="font-mono text-sm">{proyecto.codigo}</TableCell>
                    <TableCell>
                      <div className="font-medium">{proyecto.nombre}</div>
                      <div className="text-xs text-muted-foreground">{proyecto.tipo}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {proyecto.clientes?.nombre ? (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {proyecto.clientes.nombre}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {proyecto.presupuesto ? (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {formatCurrency(proyecto.presupuesto)}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${estatusConfig.color} text-white`}>
                        {estatusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(proyecto)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar proyecto?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará "{proyecto.nombre}" permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(proyecto.id)} className="bg-destructive">
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
