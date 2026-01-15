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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, FileText, Search, ArrowUpRight, ArrowDownLeft, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useAppConfig } from '@/hooks/useAppConfig';

interface Cliente {
  id: string;
  nombre: string;
}

interface Proveedor {
  id: string;
  nombre: string;
}

interface Proyecto {
  id: string;
  codigo: string;
  nombre: string;
}

interface Factura {
  id: string;
  numero_factura: string;
  tipo: string;
  concepto: string | null;
  fecha_emision: string;
  fecha_vencimiento: string;
  subtotal: number;
  iva: number;
  isr_retenido: number;
  iva_retenido: number;
  total: number;
  monto_pagado: number;
  estatus: string;
  divisa: string;
  notas: string | null;
  cliente_id: string | null;
  proveedor_id: string | null;
  proyecto_id: string | null;
  clientes?: { nombre: string } | null;
  proveedores?: { nombre: string } | null;
  proyectos?: { codigo: string; nombre: string } | null;
}

const ESTATUS_FACTURA = [
  { value: 'pendiente', label: 'Pendiente', color: 'bg-yellow-500' },
  { value: 'pagada', label: 'Pagada', color: 'bg-green-500' },
  { value: 'vencida', label: 'Vencida', color: 'bg-red-500' },
  { value: 'cancelada', label: 'Cancelada', color: 'bg-gray-500' }
];

export const FacturasManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { formatCurrency, config } = useAppConfig();
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFactura, setEditingFactura] = useState<Factura | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoTab, setTipoTab] = useState<'emitida' | 'recibida'>('emitida');
  
  const [formData, setFormData] = useState({
    numero_factura: '',
    tipo: 'emitida' as 'emitida' | 'recibida',
    concepto: '',
    fecha_emision: new Date().toISOString().split('T')[0],
    fecha_vencimiento: '',
    subtotal: '',
    iva: '',
    isr_retenido: '',
    iva_retenido: '',
    monto_pagado: '0',
    estatus: 'pendiente',
    divisa: 'MXN',
    notas: '',
    cliente_id: '',
    proveedor_id: '',
    proyecto_id: ''
  });

  const loadData = async () => {
    if (!user) return;
    
    const [facturasRes, clientesRes, proveedoresRes, proyectosRes] = await Promise.all([
      supabase
        .from('facturas')
        .select('*, clientes(nombre), proveedores(nombre), proyectos(codigo, nombre)')
        .eq('user_id', user.id)
        .order('fecha_emision', { ascending: false }),
      supabase.from('clientes').select('id, nombre').eq('user_id', user.id).eq('activo', true).order('nombre'),
      supabase.from('proveedores').select('id, nombre').eq('user_id', user.id).eq('activo', true).order('nombre'),
      supabase.from('proyectos').select('id, codigo, nombre').eq('user_id', user.id).order('codigo')
    ]);
    
    if (facturasRes.error) {
      toast({ title: 'Error', description: 'No se pudieron cargar las facturas', variant: 'destructive' });
    } else {
      setFacturas(facturasRes.data || []);
    }
    
    setClientes(clientesRes.data || []);
    setProveedores(proveedoresRes.data || []);
    setProyectos(proyectosRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const calculateTotal = () => {
    const subtotal = parseFloat(formData.subtotal) || 0;
    const iva = parseFloat(formData.iva) || 0;
    const isrRetenido = parseFloat(formData.isr_retenido) || 0;
    const ivaRetenido = parseFloat(formData.iva_retenido) || 0;
    return subtotal + iva - isrRetenido - ivaRetenido;
  };

  const resetForm = () => {
    const vencimiento = new Date();
    vencimiento.setDate(vencimiento.getDate() + 30);
    
    setFormData({
      numero_factura: '',
      tipo: tipoTab,
      concepto: '',
      fecha_emision: new Date().toISOString().split('T')[0],
      fecha_vencimiento: vencimiento.toISOString().split('T')[0],
      subtotal: '',
      iva: '',
      isr_retenido: '0',
      iva_retenido: '0',
      monto_pagado: '0',
      estatus: 'pendiente',
      divisa: 'MXN',
      notas: '',
      cliente_id: '',
      proveedor_id: '',
      proyecto_id: ''
    });
    setEditingFactura(null);
  };

  const handleOpenDialog = (factura?: Factura) => {
    if (factura) {
      setEditingFactura(factura);
      setFormData({
        numero_factura: factura.numero_factura,
        tipo: factura.tipo as 'emitida' | 'recibida',
        concepto: factura.concepto || '',
        fecha_emision: factura.fecha_emision,
        fecha_vencimiento: factura.fecha_vencimiento,
        subtotal: factura.subtotal.toString(),
        iva: factura.iva.toString(),
        isr_retenido: factura.isr_retenido.toString(),
        iva_retenido: factura.iva_retenido.toString(),
        monto_pagado: factura.monto_pagado.toString(),
        estatus: factura.estatus,
        divisa: factura.divisa,
        notas: factura.notas || '',
        cliente_id: factura.cliente_id || '',
        proveedor_id: factura.proveedor_id || '',
        proyecto_id: factura.proyecto_id || ''
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const facturaData = {
      user_id: user.id,
      numero_factura: formData.numero_factura,
      tipo: formData.tipo,
      concepto: formData.concepto || null,
      fecha_emision: formData.fecha_emision,
      fecha_vencimiento: formData.fecha_vencimiento,
      subtotal: parseFloat(formData.subtotal) || 0,
      iva: parseFloat(formData.iva) || 0,
      isr_retenido: parseFloat(formData.isr_retenido) || 0,
      iva_retenido: parseFloat(formData.iva_retenido) || 0,
      total: calculateTotal(),
      monto_pagado: parseFloat(formData.monto_pagado) || 0,
      estatus: formData.estatus,
      divisa: formData.divisa,
      notas: formData.notas || null,
      cliente_id: formData.tipo === 'emitida' ? (formData.cliente_id || null) : null,
      proveedor_id: formData.tipo === 'recibida' ? (formData.proveedor_id || null) : null,
      proyecto_id: formData.proyecto_id || null
    };

    if (editingFactura) {
      const { error } = await supabase
        .from('facturas')
        .update(facturaData)
        .eq('id', editingFactura.id);

      if (error) {
        toast({ title: 'Error', description: 'No se pudo actualizar la factura', variant: 'destructive' });
      } else {
        toast({ title: 'Éxito', description: 'Factura actualizada' });
      }
    } else {
      const { error } = await supabase
        .from('facturas')
        .insert(facturaData);

      if (error) {
        toast({ title: 'Error', description: 'No se pudo crear la factura', variant: 'destructive' });
      } else {
        toast({ title: 'Éxito', description: 'Factura creada' });
      }
    }

    setDialogOpen(false);
    resetForm();
    loadData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('facturas')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar la factura', variant: 'destructive' });
    } else {
      toast({ title: 'Éxito', description: 'Factura eliminada' });
      loadData();
    }
  };

  const getEstatusConfig = (estatus: string) => {
    return ESTATUS_FACTURA.find(e => e.value === estatus) || ESTATUS_FACTURA[0];
  };

  const filteredFacturas = facturas.filter(f => {
    const matchSearch = 
      f.numero_factura.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.concepto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.clientes?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.proveedores?.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = f.tipo === tipoTab;
    return matchSearch && matchTipo;
  });

  const totales = filteredFacturas.reduce((acc, f) => ({
    total: acc.total + f.total,
    pagado: acc.pagado + f.monto_pagado,
    pendiente: acc.pendiente + (f.total - f.monto_pagado)
  }), { total: 0, pagado: 0, pendiente: 0 });

  if (loading) {
    return <div className="text-center py-8">Cargando facturas...</div>;
  }

  return (
    <div className="space-y-4">
      <Tabs value={tipoTab} onValueChange={(v) => setTipoTab(v as 'emitida' | 'recibida')}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList>
            <TabsTrigger value="emitida" className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" />
              Emitidas (Ingresos)
            </TabsTrigger>
            <TabsTrigger value="recibida" className="flex items-center gap-2">
              <ArrowDownLeft className="h-4 w-4" />
              Recibidas (Gastos)
            </TabsTrigger>
          </TabsList>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Factura
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingFactura ? 'Editar Factura' : 'Nueva Factura'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select 
                      value={formData.tipo} 
                      onValueChange={(v) => setFormData({ ...formData, tipo: v as 'emitida' | 'recibida' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="emitida">Emitida (Ingreso)</SelectItem>
                        <SelectItem value="recibida">Recibida (Gasto)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numero_factura">Número de Factura *</Label>
                    <Input
                      id="numero_factura"
                      value={formData.numero_factura}
                      onChange={(e) => setFormData({ ...formData, numero_factura: e.target.value })}
                      placeholder="A-001"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Divisa</Label>
                    <Select value={formData.divisa} onValueChange={(v) => setFormData({ ...formData, divisa: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MXN">MXN</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {formData.tipo === 'emitida' ? (
                    <div className="space-y-2">
                      <Label>Cliente</Label>
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
                  ) : (
                    <div className="space-y-2">
                      <Label>Proveedor</Label>
                      <Select 
                        value={formData.proveedor_id} 
                        onValueChange={(v) => setFormData({ ...formData, proveedor_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar proveedor" />
                        </SelectTrigger>
                        <SelectContent>
                          {proveedores.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Proyecto (opcional)</Label>
                    <Select 
                      value={formData.proyecto_id} 
                      onValueChange={(v) => setFormData({ ...formData, proyecto_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sin proyecto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sin proyecto</SelectItem>
                        {proyectos.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.codigo} - {p.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="concepto">Concepto</Label>
                  <Input
                    id="concepto"
                    value={formData.concepto}
                    onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                    placeholder="Descripción del bien o servicio"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fecha_emision">Fecha Emisión *</Label>
                    <Input
                      id="fecha_emision"
                      type="date"
                      value={formData.fecha_emision}
                      onChange={(e) => setFormData({ ...formData, fecha_emision: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fecha_vencimiento">Fecha Vencimiento *</Label>
                    <Input
                      id="fecha_vencimiento"
                      type="date"
                      value={formData.fecha_vencimiento}
                      onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subtotal">Subtotal *</Label>
                    <Input
                      id="subtotal"
                      type="number"
                      step="0.01"
                      value={formData.subtotal}
                      onChange={(e) => setFormData({ ...formData, subtotal: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="iva">IVA</Label>
                    <Input
                      id="iva"
                      type="number"
                      step="0.01"
                      value={formData.iva}
                      onChange={(e) => setFormData({ ...formData, iva: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="isr_retenido">ISR Retenido</Label>
                    <Input
                      id="isr_retenido"
                      type="number"
                      step="0.01"
                      value={formData.isr_retenido}
                      onChange={(e) => setFormData({ ...formData, isr_retenido: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="iva_retenido">IVA Retenido</Label>
                    <Input
                      id="iva_retenido"
                      type="number"
                      step="0.01"
                      value={formData.iva_retenido}
                      onChange={(e) => setFormData({ ...formData, iva_retenido: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg flex justify-between items-center">
                  <span className="font-medium">Total:</span>
                  <span className="text-xl font-bold">{formatCurrency(calculateTotal())}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="monto_pagado">Monto Pagado</Label>
                    <Input
                      id="monto_pagado"
                      type="number"
                      step="0.01"
                      value={formData.monto_pagado}
                      onChange={(e) => setFormData({ ...formData, monto_pagado: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select value={formData.estatus} onValueChange={(v) => setFormData({ ...formData, estatus: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTATUS_FACTURA.map(e => (
                          <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    {editingFactura ? 'Actualizar' : 'Crear'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar factura..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <div className="text-muted-foreground">Total</div>
              <div className="font-bold">{formatCurrency(totales.total)}</div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">Pagado</div>
              <div className="font-bold text-green-600">{formatCurrency(totales.pagado)}</div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">Pendiente</div>
              <div className="font-bold text-red-600">{formatCurrency(totales.pendiente)}</div>
            </div>
          </div>
        </div>

        <TabsContent value={tipoTab} className="mt-4">
          {filteredFacturas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{searchTerm ? 'No se encontraron facturas' : `No hay facturas ${tipoTab === 'emitida' ? 'emitidas' : 'recibidas'}`}</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>{tipoTab === 'emitida' ? 'Cliente' : 'Proveedor'}</TableHead>
                    <TableHead className="hidden md:table-cell">Concepto</TableHead>
                    <TableHead className="hidden sm:table-cell">Vencimiento</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFacturas.map((factura) => {
                    const estatusConfig = getEstatusConfig(factura.estatus);
                    const entidad = tipoTab === 'emitida' ? factura.clientes?.nombre : factura.proveedores?.nombre;
                    return (
                      <TableRow key={factura.id}>
                        <TableCell className="font-mono text-sm">{factura.numero_factura}</TableCell>
                        <TableCell>
                          <div className="font-medium">{entidad || '-'}</div>
                          {factura.proyectos && (
                            <div className="text-xs text-muted-foreground">{factura.proyectos.codigo}</div>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                          {factura.concepto || '-'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {new Date(factura.fecha_vencimiento).toLocaleDateString('es-MX')}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-medium">{formatCurrency(factura.total)}</div>
                          {factura.monto_pagado > 0 && factura.monto_pagado < factura.total && (
                            <div className="text-xs text-muted-foreground">
                              Pagado: {formatCurrency(factura.monto_pagado)}
                            </div>
                          )}
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
                              onClick={() => handleOpenDialog(factura)}
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
                                  <AlertDialogTitle>¿Eliminar factura?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Se eliminará la factura "{factura.numero_factura}" permanentemente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(factura.id)} className="bg-destructive">
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
        </TabsContent>
      </Tabs>
    </div>
  );
};
