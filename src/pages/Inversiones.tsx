
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
import { useCriptomonedas } from '@/hooks/useCriptomonedas';
import { Account } from '@/types/finance';
import { TrendingUp, TrendingDown, DollarSign, Target, Settings, RefreshCw, AlertTriangle, Plus } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const Inversiones = (): JSX.Element => {
  const { accounts, loading, refreshData, accountTypes, addAccount, updateAccount, deleteAccount } = useFinanceDataSupabase();
  const { criptomonedas } = useCriptomonedas();
  
  // Debug: verificar datos
  console.log('=== DEBUG INVERSIONES ===');
  console.log('Todas las cuentas:', accounts);
  console.log('Loading:', loading);
  
  const { formatCurrency } = useAppConfig();
  const { convertCurrency } = useExchangeRates();

  // Filtrar solo cuentas de inversión
  const cuentasInversion = accounts.filter(account => account.tipo === 'Inversiones');
  
  // Filtrar cuentas de empresas propias
  const cuentasEmpresasPropias = accounts.filter(account => account.tipo === 'Empresa Propia');
  
  // Identificar cuentas que necesitan completar información
  const cuentasSinCompleter = cuentasInversion.filter(cuenta => 
    !cuenta.tipo_inversion || !cuenta.modalidad || !cuenta.fecha_inicio
  );

  const cuentasCompletas = cuentasInversion.filter(cuenta => 
    cuenta.tipo_inversion && cuenta.modalidad && cuenta.fecha_inicio
  );

  const calcularValorActualReinversion = (cuenta: Account): number => {
    // Usar valorMercado si está disponible, sino usar saldoActual
    // valorMercado es el valor de mercado actualizado manualmente
    // saldoActual refleja el balance incluyendo todas las transacciones
    return cuenta.valorMercado !== undefined && cuenta.valorMercado !== null 
      ? cuenta.valorMercado 
      : cuenta.saldoActual;
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

  // Calcular rendimiento total de criptomonedas
  const calcularRendimientoCriptomonedas = () => {
    const totalInvertidoUSD = criptomonedas.reduce((sum, cripto) => 
      sum + (cripto.valor_compra_usd || 0), 0
    );

    const totalActualUSD = criptomonedas.reduce((sum, cripto) => 
      sum + (cripto.valor_actual_usd || 0), 0
    );

    return totalActualUSD >= totalInvertidoUSD;
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
                  <div className="flex flex-col lg:flex-row items-center justify-center gap-6">
                    <div className="h-64 w-full max-w-sm lg:flex-shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            fontSize={12}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => [`$${formatCurrency(value)}`, 'Monto Invertido']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* Leyenda */}
                    <div className="w-full lg:flex-1 space-y-2">
                      <h4 className="font-semibold text-sm text-muted-foreground mb-3">Leyenda</h4>
                      {pieData.map((entry, index) => (
                        <div key={entry.name} className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm truncate">{entry.name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            ${formatCurrency(entry.value)}
                          </span>
                        </div>
                      ))}
                    </div>
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
                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground">
                                Inicial: {cuenta.divisa} {formatCurrency(cuenta.saldoInicial)}
                              </div>
                              <div className="font-bold text-base sm:text-lg">
                                {cuenta.divisa} {formatCurrency(valorActual)}
                              </div>
                              <div className={`text-xs font-medium flex items-center gap-1 ${getRendimientoColor(rendimiento)}`}>
                                {getRendimientoIcon(rendimiento)}
                                {rendimiento >= 0 ? '+' : ''}{formatCurrency(Math.abs(rendimiento))} ({porcentaje >= 0 ? '+' : ''}{porcentaje.toFixed(2)}%)
                              </div>
                            </div>
                            {cuenta.rendimiento_neto ? (
                              <div className="text-xs text-muted-foreground space-y-1 mt-2">
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
                              <div className="text-xs text-muted-foreground mt-2">
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

        {/* 3. Criptomonedas con flecha de rendimiento */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <CardTitle className="flex items-center gap-2">
                Criptomonedas
                {criptomonedas.length > 0 && (
                  calcularRendimientoCriptomonedas() ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )
                )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CriptomonedasManager />
          </CardContent>
        </Card>

        {/* 4. Empresas Propias */}
        <Card>
          <CardHeader>
            <CardTitle>Empresas Propias</CardTitle>
            <CardDescription>
              {cuentasEmpresasPropias.length} empresa{cuentasEmpresasPropias.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cuentasEmpresasPropias.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="text-4xl mb-4">🏢</div>
                <p>No tienes empresas propias registradas</p>
                <p className="text-sm">Agrega tu primera empresa para comenzar el seguimiento</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cuentasEmpresasPropias.map((cuenta) => (
                  <div key={cuenta.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="font-semibold text-sm sm:text-base truncate">{cuenta.nombre}</h3>
                        <Badge variant="outline" className="text-xs">{cuenta.divisa}</Badge>
                        <Badge variant="secondary" className="text-xs">{cuenta.tipo}</Badge>
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        <div>
                          Fecha de registro: {new Date().toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <div className="font-bold text-sm sm:text-base">
                        {cuenta.divisa} {formatCurrency(cuenta.saldoActual)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Saldo actual
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 5. Cuentas - Manager de cuentas de inversión */}
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
