import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { InvestmentMigrationForm } from '@/components/InvestmentMigrationForm';
import { Account } from '@/types/finance';
import { TrendingUp, TrendingDown, DollarSign, Target, Settings, RefreshCw, AlertTriangle, Plus } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const Inversiones = (): JSX.Element => {
  const { accounts, loading, refreshData } = useFinanceDataSupabase();
  
  // Debug: verificar datos
  console.log('=== DEBUG INVERSIONES ===');
  console.log('Todas las cuentas:', accounts);
  console.log('Loading:', loading);
  const { formatCurrency } = useAppConfig();
  const { convertCurrency } = useExchangeRates();
  
  const [showMigrationForms, setShowMigrationForms] = useState(false);

  // Filtrar solo cuentas de inversión
  const cuentasInversion = accounts.filter(account => account.tipo === 'Inversiones');
  
  // Identificar cuentas que necesitan completar información
  const cuentasSinCompleter = cuentasInversion.filter(cuenta => 
    !cuenta.tipo_inversion || !cuenta.modalidad || !cuenta.fecha_inicio
  );

  const cuentasCompletas = cuentasInversion.filter(cuenta => 
    cuenta.tipo_inversion && cuenta.modalidad && cuenta.fecha_inicio
  );

  // Calcular resumen solo de cuentas completas
  const resumenPorTipo = cuentasCompletas.reduce((acc, cuenta) => {
    const valorEnMXN = cuenta.divisa === 'MXN' 
      ? (cuenta.valorMercado || cuenta.saldoActual)
      : convertCurrency(cuenta.valorMercado || cuenta.saldoActual, cuenta.divisa, 'MXN');
    
    const aportadoEnMXN = cuenta.divisa === 'MXN' 
      ? cuenta.saldoInicial 
      : convertCurrency(cuenta.saldoInicial, cuenta.divisa, 'MXN');
    
    const tipo = cuenta.tipo_inversion || 'Sin clasificar';
    
    if (!acc[tipo]) {
      acc[tipo] = { valorActual: 0, montoInvertido: 0, count: 0 };
    }
    
    acc[tipo].valorActual += valorEnMXN;
    acc[tipo].montoInvertido += aportadoEnMXN;
    acc[tipo].count += 1;
    
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

  const calcularRendimientoAnualizado = (cuenta: Account): number => {
    if (!cuenta.fecha_inicio) return 0;
    
    const fechaInicio = new Date(cuenta.fecha_inicio);
    const fechaActual = new Date();
    const diasTranscurridos = Math.floor((fechaActual.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
    const aniosTranscurridos = diasTranscurridos / 365.25;
    
    if (aniosTranscurridos <= 0) return 0;
    
    const valorActual = cuenta.valorMercado || cuenta.saldoActual;
    const rendimientoTotal = ((valorActual - cuenta.saldoInicial) / cuenta.saldoInicial) * 100;
    return rendimientoTotal / aniosTranscurridos;
  };

  const getRendimientoColor = (rendimiento: number): string => {
    if (rendimiento > 0) return 'text-green-600';
    if (rendimiento < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getRendimientoIcon = (rendimiento: number) => {
    if (rendimiento > 0) return <TrendingUp className="h-4 w-4" />;
    if (rendimiento < 0) return <TrendingDown className="h-4 w-4" />;
    return <DollarSign className="h-4 w-4" />;
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

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-foreground">Inversiones</h1>
          <div className="flex gap-2">
            <Button 
              variant="default" 
              onClick={() => {
                // Navegar a configuración para crear cuentas
                window.location.href = '/configuracion';
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Cuenta de Inversión
            </Button>
            {cuentasSinCompleter.length > 0 && (
              <Button 
                variant="outline" 
                onClick={() => setShowMigrationForms(!showMigrationForms)}
                className="text-orange-600 border-orange-200"
              >
                <Settings className="h-4 w-4 mr-2" />
                Completar Info ({cuentasSinCompleter.length})
              </Button>
            )}
          </div>
        </div>

        {/* Alerta de cuentas sin completar */}
        {cuentasSinCompleter.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <AlertTriangle className="h-5 w-5" />
                Información incompleta
              </CardTitle>
              <CardDescription>
                Tienes {cuentasSinCompleter.length} cuenta{cuentasSinCompleter.length !== 1 ? 's' : ''} de inversión que necesita{cuentasSinCompleter.length === 1 ? '' : 'n'} completar información adicional para aprovechar todas las funcionalidades.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Formularios de migración */}
        {showMigrationForms && cuentasSinCompleter.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Completar información de inversiones</h2>
            {cuentasSinCompleter.map((cuenta) => (
              <InvestmentMigrationForm
                key={cuenta.id}
                account={cuenta}
                onComplete={() => {
                  console.log('onComplete llamado para cuenta:', cuenta.id);
                  refreshData();
                  setTimeout(() => {
                    setShowMigrationForms(false);
                  }, 1000);
                }}
              />
            ))}
          </div>
        )}

        {/* Solo mostrar estadísticas si hay cuentas completas */}
        {cuentasCompletas.length > 0 && (
          <>
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
                    {cuentasCompletas.length} inversión{cuentasCompletas.length !== 1 ? 'es' : ''} activa{cuentasCompletas.length !== 1 ? 's' : ''}
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
                    {totalGeneral.montoInvertido > 0 ? (((totalGeneral.valorActual - totalGeneral.montoInvertido) / totalGeneral.montoInvertido) * 100).toFixed(2) : 0}%
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico de distribución y resumen por tipo */}
            {pieData.length > 0 && (
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
                              {data.montoInvertido > 0 ? (((data.valorActual - data.montoInvertido) / data.montoInvertido) * 100).toFixed(2) : 0}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Lista detallada de inversiones completas */}
            <Card>
              <CardHeader>
                <CardTitle>Detalle de Inversiones</CardTitle>
                <CardDescription>
                  {cuentasCompletas.length} inversión{cuentasCompletas.length !== 1 ? 'es' : ''} con información completa
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cuentasCompletas.map((cuenta) => {
                    const valorActual = cuenta.valorMercado || cuenta.saldoActual;
                    const rendimiento = valorActual - cuenta.saldoInicial;
                    const porcentaje = (rendimiento / cuenta.saldoInicial) * 100;
                    const rendimientoAnualizado = calcularRendimientoAnualizado(cuenta);

                    return (
                      <div key={cuenta.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{cuenta.nombre}</h3>
                            <Badge variant="outline">{cuenta.divisa}</Badge>
                            <Badge variant="secondary">{cuenta.tipo_inversion}</Badge>
                            <Badge variant="outline">{cuenta.modalidad}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Inicio: {cuenta.fecha_inicio ? new Date(cuenta.fecha_inicio).toLocaleDateString() : 'No definido'}
                            {cuenta.ultimo_pago && ` | Último pago: ${new Date(cuenta.ultimo_pago).toLocaleDateString()}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">${formatCurrency(valorActual)}</div>
                          <div className={`text-sm flex items-center gap-1 ${getRendimientoColor(rendimiento)}`}>
                            {getRendimientoIcon(rendimiento)}
                            ${formatCurrency(Math.abs(rendimiento))} ({porcentaje.toFixed(2)}%)
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {rendimientoAnualizado.toFixed(2)}% anual
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Mensaje cuando no hay inversiones */}
        {cuentasInversion.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay cuentas de inversión</h3>
              <p className="text-muted-foreground text-center mb-4">
                Primero crea cuentas de tipo "Inversiones" en el módulo de cuentas.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Inversiones;