import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useInversiones } from '@/hooks/useInversiones';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { InversionForm } from '@/components/InversionForm';
import { Inversion, InversionFormData } from '@/types/inversiones';
import { TrendingUp, TrendingDown, DollarSign, Target, Edit, Trash2, Plus, RefreshCw, Filter } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const Inversiones = (): JSX.Element => {
  const { inversiones, loading, createInversion, updateInversion, deleteInversion, updateCryptoPrices } = useInversiones();
  const { formatCurrency } = useAppConfig();
  const { convertCurrency } = useExchangeRates();
  
  const [showForm, setShowForm] = useState(false);
  const [editingInversion, setEditingInversion] = useState<Inversion | undefined>();
  const [filtroTipo, setFiltroTipo] = useState<string>('all');
  const [filtroModalidad, setFiltroModalidad] = useState<string>('all');

  // Filtrar inversiones
  const inversionesFiltradas = inversiones.filter(inversion => {
    const matchTipo = filtroTipo === 'all' || inversion.tipo === filtroTipo;
    const matchModalidad = filtroModalidad === 'all' || inversion.modalidad === filtroModalidad;
    return matchTipo && matchModalidad;
  });

  // Calcular resumen
  const resumenPorTipo = inversiones.reduce((acc, inversion) => {
    const valorEnMXN = inversion.moneda === 'MXN' 
      ? inversion.valor_actual 
      : convertCurrency(inversion.valor_actual, inversion.moneda, 'MXN');
    
    const aportadoEnMXN = inversion.moneda === 'MXN' 
      ? inversion.monto_invertido 
      : convertCurrency(inversion.monto_invertido, inversion.moneda, 'MXN');
    
    if (!acc[inversion.tipo]) {
      acc[inversion.tipo] = { valorActual: 0, montoInvertido: 0, count: 0 };
    }
    
    acc[inversion.tipo].valorActual += valorEnMXN;
    acc[inversion.tipo].montoInvertido += aportadoEnMXN;
    acc[inversion.tipo].count += 1;
    
    return acc;
  }, {} as Record<string, { valorActual: number, montoInvertido: number, count: number }>);

  const totalGeneral = Object.values(resumenPorTipo).reduce((acc, item) => ({
    valorActual: acc.valorActual + item.valorActual,
    montoInvertido: acc.montoInvertido + item.montoInvertido,
  }), { valorActual: 0, montoInvertido: 0 });

  // Datos para el gráfico de pie
  const pieData = Object.entries(resumenPorTipo).map(([tipo, data]) => ({
    name: tipo,
    value: data.valorActual,
    count: data.count,
  }));

  const calcularRendimientoAnualizado = (inversion: Inversion): number => {
    const fechaInicio = new Date(inversion.fecha_inicio);
    const fechaActual = new Date();
    const diasTranscurridos = Math.floor((fechaActual.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
    const aniosTranscurridos = diasTranscurridos / 365.25;
    
    if (aniosTranscurridos <= 0) return 0;
    
    const rendimientoTotal = ((inversion.valor_actual - inversion.monto_invertido) / inversion.monto_invertido) * 100;
    return rendimientoTotal / aniosTranscurridos;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Cargando inversiones...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const getRendimientoColor = (rendimiento: number) => {
    if (rendimiento > 0) return 'text-success';
    if (rendimiento < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const getRendimientoIcon = (rendimiento: number) => {
    if (rendimiento > 0) return <TrendingUp className="h-4 w-4" />;
    if (rendimiento < 0) return <TrendingDown className="h-4 w-4" />;
    return <DollarSign className="h-4 w-4" />;
  };

  const handleSubmit = async (data: InversionFormData): Promise<boolean> => {
    if (editingInversion) {
      return await updateInversion(editingInversion.id, data);
    } else {
      return await createInversion(data);
    }
  };

  const handleEdit = (inversion: Inversion) => {
    setEditingInversion(inversion);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta inversión?')) {
      await deleteInversion(id);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingInversion(undefined);
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-foreground">Inversiones</h1>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={updateCryptoPrices}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar Precios
            </Button>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Inversión
            </Button>
          </div>
        </div>

        {/* Resumen General */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total Actual</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${formatCurrency(totalGeneral.valorActual)}</div>
              <p className="text-xs text-muted-foreground">
                {inversiones.length} inversión{inversiones.length !== 1 ? 'es' : ''}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invertido</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${formatCurrency(totalGeneral.montoInvertido)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ganancia/Pérdida</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getRendimientoColor(totalGeneral.valorActual - totalGeneral.montoInvertido)}`}>
                ${formatCurrency(totalGeneral.valorActual - totalGeneral.montoInvertido)}
              </div>
              <p className="text-xs text-muted-foreground">
                {(((totalGeneral.valorActual - totalGeneral.montoInvertido) / totalGeneral.montoInvertido) * 100).toFixed(2)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de distribución y resumen por tipo */}
        {inversiones.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribución del Portafolio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`$${formatCurrency(value)}`, 'Valor']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumen por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(resumenPorTipo).map(([tipo, data]) => (
                    <div key={tipo} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{tipo}</div>
                        <div className="text-sm text-muted-foreground">{data.count} inversión{data.count !== 1 ? 'es' : ''}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">${formatCurrency(data.valorActual)}</div>
                        <div className={`text-sm ${getRendimientoColor(data.valorActual - data.montoInvertido)}`}>
                          {(((data.valorActual - data.montoInvertido) / data.montoInvertido) * 100).toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium">Tipo</label>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Interés fijo">Interés fijo</SelectItem>
                    <SelectItem value="Fondo variable">Fondo variable</SelectItem>
                    <SelectItem value="Criptomoneda">Criptomoneda</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Modalidad</label>
                <Select value={filtroModalidad} onValueChange={setFiltroModalidad}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="Reinversión">Reinversión</SelectItem>
                    <SelectItem value="Pago mensual">Pago mensual</SelectItem>
                    <SelectItem value="Pago trimestral">Pago trimestral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Inversiones */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Inversiones</CardTitle>
            <CardDescription>
              Mostrando {inversionesFiltradas.length} de {inversiones.length} inversiones
            </CardDescription>
          </CardHeader>
          <CardContent>
            {inversionesFiltradas.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Monto Invertido</TableHead>
                      <TableHead>Valor Actual</TableHead>
                      <TableHead>Rendimiento</TableHead>
                      <TableHead>Modalidad</TableHead>
                      <TableHead>Fecha Inicio</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inversionesFiltradas.map((inversion) => {
                      const rendimiento = inversion.valor_actual - inversion.monto_invertido;
                      const porcentaje = (rendimiento / inversion.monto_invertido) * 100;
                      const rendimientoAnualizado = calcularRendimientoAnualizado(inversion);

                      return (
                        <TableRow key={inversion.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div>{inversion.nombre}</div>
                              <Badge variant="outline" className="mt-1">
                                {inversion.moneda}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{inversion.tipo}</Badge>
                          </TableCell>
                          <TableCell>${formatCurrency(inversion.monto_invertido)}</TableCell>
                          <TableCell>${formatCurrency(inversion.valor_actual)}</TableCell>
                          <TableCell>
                            <div className={`flex items-center gap-1 ${getRendimientoColor(rendimiento)}`}>
                              {getRendimientoIcon(rendimiento)}
                              <div>
                                <div className="font-medium">${formatCurrency(Math.abs(rendimiento))}</div>
                                <div className="text-xs">
                                  {porcentaje.toFixed(2)}% ({rendimientoAnualizado.toFixed(2)}% anual)
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div>{inversion.modalidad}</div>
                              {inversion.ultimo_pago && (
                                <div className="text-xs text-muted-foreground">
                                  Último: {new Date(inversion.ultimo_pago).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{new Date(inversion.fecha_inicio).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleEdit(inversion)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDelete(inversion.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {inversiones.length === 0 ? 'No hay inversiones registradas' : 'No se encontraron inversiones con los filtros aplicados'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {inversiones.length === 0 
                    ? 'Comienza agregando tu primera inversión para hacer seguimiento de tu portafolio.'
                    : 'Prueba ajustando los filtros para ver más resultados.'
                  }
                </p>
                {inversiones.length === 0 && (
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Primera Inversión
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formulario de Inversión */}
        <InversionForm
          open={showForm}
          onOpenChange={handleCloseForm}
          onSubmit={handleSubmit}
          inversion={editingInversion}
          title={editingInversion ? 'Editar Inversión' : 'Nueva Inversión'}
        />
      </div>
    </Layout>
  );
};

export default Inversiones;