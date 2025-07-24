import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AccountsManager } from '@/components/AccountsManager';
import CriptomonedasManager from '@/components/CriptomonedasManager';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { Account } from '@/types/finance';
import { TrendingUp, TrendingDown, DollarSign, Target, Settings, RefreshCw, AlertTriangle, Plus } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const Inversiones = (): JSX.Element => {
  const { accounts, loading, refreshData, accountTypes, addAccount, updateAccount, deleteAccount } = useFinanceDataSupabase();
  
  // Debug: verificar datos
  console.log('=== DEBUG INVERSIONES ===');
  console.log('Todas las cuentas:', accounts);
  console.log('Loading:', loading);
  
  const { formatCurrency } = useAppConfig();
  const { convertCurrency } = useExchangeRates();

  // Filtrar solo cuentas de inversión
  const cuentasInversion = accounts.filter(account => account.tipo === 'Inversiones');
  
  // Identificar cuentas que necesitan completar información
  const cuentasSinCompleter = cuentasInversion.filter(cuenta => 
    !cuenta.tipo_inversion || !cuenta.modalidad || !cuenta.fecha_inicio
  );

  const cuentasCompletas = cuentasInversion.filter(cuenta => 
    cuenta.tipo_inversion && cuenta.modalidad && cuenta.fecha_inicio
  );

  const calcularValorActualReinversion = (cuenta: Account): number => {
    // Si no es modalidad de reinversión, devolver el valor actual normal
    if (cuenta.modalidad !== 'Reinversión' || !cuenta.rendimiento_neto || !cuenta.fecha_inicio) {
      return cuenta.valorMercado || cuenta.saldoActual;
    }
    
    const fechaInicio = new Date(cuenta.fecha_inicio);
    const fechaActual = new Date();
    const mesesTranscurridos = Math.floor((fechaActual.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24 * 30.44)); // Promedio de días por mes
    
    if (mesesTranscurridos <= 0) return cuenta.saldoInicial;
    
    // Calcular valor con interés compuesto mensual
    const rendimientoDecimal = cuenta.rendimiento_neto / 100;
    const valorConReinversion = cuenta.saldoInicial * Math.pow(1 + rendimientoDecimal, mesesTranscurridos);
    
    return valorConReinversion;
  };

  const calcularRendimientoAnualizado = (cuenta: Account): number => {
    // Si tiene rendimiento neto mensual definido, simplemente multiplicarlo por 12
    if (cuenta.rendimiento_neto) {
      return cuenta.rendimiento_neto * 12;
    }
    
    // Fallback: cálculo basado en fecha y valor actual
    if (!cuenta.fecha_inicio) return 0;
    
    const fechaInicio = new Date(cuenta.fecha_inicio);
    const fechaActual = new Date();
    const diasTranscurridos = Math.floor((fechaActual.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
    const aniosTranscurridos = diasTranscurridos / 365.25;
    
    if (aniosTranscurridos <= 0) return 0;
    
    const valorActual = calcularValorActualReinversion(cuenta);
    const rendimientoTotal = ((valorActual - cuenta.saldoInicial) / cuenta.saldoInicial) * 100;
    return rendimientoTotal / aniosTranscurridos;
  };

  // Calcular resumen solo de cuentas completas - manteniendo moneda original
  const resumenPorTipo = cuentasCompletas.reduce((acc, cuenta) => {
    const valorActual = calcularValorActualReinversion(cuenta);
    const tipo = cuenta.tipo_inversion || 'Sin clasificar';
    
    if (!acc[tipo]) {
      acc[tipo] = { cuentas: [] };
    }
    
    acc[tipo].cuentas.push({
      ...cuenta,
      valorActual,
      rendimiento: valorActual - cuenta.saldoInicial,
      porcentaje: ((valorActual - cuenta.saldoInicial) / cuenta.saldoInicial) * 100
    });
    
    return acc;
  }, {} as Record<string, { cuentas: Array<typeof cuentasCompletas[0] & { valorActual: number, rendimiento: number, porcentaje: number }> }>);

  // Calcular totales en MXN para resumen general
  const totalGeneral = Object.values(resumenPorTipo).reduce((acc, item) => {
    const valorActualMXN = item.cuentas.reduce((sum, cuenta) => {
      const valorEnMXN = cuenta.divisa === 'MXN' 
        ? cuenta.valorActual
        : convertCurrency(cuenta.valorActual, cuenta.divisa, 'MXN');
      return sum + valorEnMXN;
    }, 0);
    
    const montoInvertidoMXN = item.cuentas.reduce((sum, cuenta) => {
      const montoEnMXN = cuenta.divisa === 'MXN' 
        ? cuenta.saldoInicial
        : convertCurrency(cuenta.saldoInicial, cuenta.divisa, 'MXN');
      return sum + montoEnMXN;
    }, 0);
    
    return {
      valorActual: acc.valorActual + valorActualMXN,
      montoInvertido: acc.montoInvertido + montoInvertidoMXN,
    };
  }, { valorActual: 0, montoInvertido: 0 });

  // Datos para el gráfico de pie - por cuenta individual y monto invertido
  const pieData = cuentasCompletas.map((cuenta) => {
    const montoEnMXN = cuenta.divisa === 'MXN' 
      ? cuenta.saldoInicial
      : convertCurrency(cuenta.saldoInicial, cuenta.divisa, 'MXN');
    
    return {
      name: cuenta.nombre,
      value: montoEnMXN,
    };
  });


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
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Inversiones</h1>
        </div>

        {/* Solo mostrar estadísticas si hay cuentas completas */}
        {cuentasCompletas.length > 0 && (
          <>
            {/* 1. Distribución del Portafolio */}
            {pieData.length > 0 && (
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
                        <Tooltip formatter={(value: number) => [`$${formatCurrency(value)}`, 'Monto Invertido']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 2. Detalle de Inversiones */}
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
                      const valorActual = calcularValorActualReinversion(cuenta);
                      const rendimiento = valorActual - cuenta.saldoInicial;
                      const porcentaje = (rendimiento / cuenta.saldoInicial) * 100;
                      const rendimientoAnualizado = calcularRendimientoAnualizado(cuenta);
                      
                      const importeMensualNeto = cuenta.rendimiento_neto 
                        ? (valorActual * cuenta.rendimiento_neto) / 100 
                        : 0;
                      const importeAnualNeto = importeMensualNeto * 12;

                      return (
                        <div key={cuenta.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="font-semibold text-sm sm:text-base truncate">{cuenta.nombre}</h3>
                              <Badge variant="outline" className="text-xs">{cuenta.divisa}</Badge>
                              <Badge variant="secondary" className="text-xs hidden sm:inline-flex">{cuenta.tipo_inversion}</Badge>
                              <Badge variant="outline" className="text-xs hidden sm:inline-flex">{cuenta.modalidad}</Badge>
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground">
                              <div className="sm:hidden mb-1">
                                {cuenta.tipo_inversion} • {cuenta.modalidad}
                              </div>
                              <div>
                                Inicio: {cuenta.fecha_inicio ? new Date(cuenta.fecha_inicio).toLocaleDateString() : 'No definido'}
                              </div>
                              {cuenta.ultimo_pago && (
                                <div className="hidden sm:block">
                                  Último pago: {new Date(cuenta.ultimo_pago).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-left sm:text-right flex-shrink-0">
                            <div className="font-bold text-sm sm:text-base">{cuenta.divisa} {formatCurrency(valorActual)}</div>
                            {cuenta.rendimiento_neto ? (
                              <div className="text-xs text-muted-foreground space-y-1">
                                <div className="hidden sm:block">
                                  {cuenta.rendimiento_neto}% mensual NETO | {rendimientoAnualizado.toFixed(2)}% anual
                                </div>
                                <div className="sm:hidden">
                                  {cuenta.rendimiento_neto}% mensual NETO
                                </div>
                                <div className="font-medium text-green-600">
                                  <div className="sm:hidden">
                                    {cuenta.divisa} {formatCurrency(importeMensualNeto)}/mes
                                  </div>
                                  <div className="hidden sm:block">
                                    {cuenta.divisa} {formatCurrency(importeMensualNeto)}/mes | {cuenta.divisa} {formatCurrency(importeAnualNeto)}/año
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground">
                                {rendimientoAnualizado.toFixed(2)}% anual
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* 3. Criptomonedas */}
        <CriptomonedasManager />

        {/* 4. Cuentas - Manager de cuentas de inversión */}
        <AccountsManager
          accounts={cuentasInversion}
          accountTypes={['Inversiones']} // Solo permitir crear cuentas de inversión
          onAddAccount={addAccount}
          onUpdateAccount={updateAccount}
          onDeleteAccount={deleteAccount}
        />

      </div>
    </Layout>
  );
};

export default Inversiones;