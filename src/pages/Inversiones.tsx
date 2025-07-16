import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

import Layout from '@/components/Layout';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useAppConfig } from '@/hooks/useAppConfig';
import { TrendingUp, TrendingDown, DollarSign, Edit3 } from 'lucide-react';

const Inversiones = () => {
  const { dashboardMetrics, accounts, updateAccount } = useFinanceData();
  const { formatCurrency } = useAppConfig();
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [rendimientoManual, setRendimientoManual] = useState<string>('');

  const inversionesResumen = dashboardMetrics.inversionesResumen;
  const cuentasInversion = accounts.filter(acc => acc.tipo === 'Inversiones');

  const getRendimientoColor = (rendimiento: number) => {
    if (rendimiento > 0) return 'text-success';
    if (rendimiento < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const getRendimientoIcon = (rendimiento: number) => {
    return rendimiento >= 0 ? TrendingUp : TrendingDown;
  };

  const handleRendimientoSubmit = (cuentaId: string, valorActual: number) => {
    const rendimientoIngresado = parseFloat(rendimientoManual);
    if (!isNaN(rendimientoIngresado)) {
      const cuenta = accounts.find(a => a.id === cuentaId);
      if (cuenta) {
        const nuevoValorMercado = valorActual + rendimientoIngresado;
        updateAccount(cuentaId, { valorMercado: nuevoValorMercado });
        setEditingAccount(null);
        setRendimientoManual('');
      }
    }
  };

  const calcularPorcentajeRendimiento = (valorActual: number, totalAportado: number) => {
    const rendimiento = valorActual - totalAportado;
    return totalAportado !== 0 ? (rendimiento / totalAportado) * 100 : 0;
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
      {/* RESUMEN GENERAL */}
      <Card className="hover-scale border-primary/20 hover:border-primary/40 transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Resumen de Inversiones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{formatCurrency(inversionesResumen.totalInversiones)}</div>
              <div className="text-sm text-muted-foreground">Total Invertido</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{formatCurrency(inversionesResumen.totalAportadoAnual)}</div>
              <div className="text-sm text-muted-foreground">Total Aportado {new Date().getFullYear()}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{formatCurrency(inversionesResumen.totalRetiradoAnual)}</div>
              <div className="text-sm text-muted-foreground">Total Retirado {new Date().getFullYear()}</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                inversionesResumen.rendimientoAnualPorcentaje >= 0 ? 'text-success' : 'text-destructive'
              }`}>
                {inversionesResumen.rendimientoAnualPorcentaje >= 0 ? '+' : ''}{inversionesResumen.rendimientoAnualPorcentaje.toFixed(2)}%
              </div>
              <div className="text-sm text-muted-foreground">Rendimiento Anual</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DETALLE MENSUAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Aportaciones por Mes - {new Date().getFullYear()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inversionesResumen.aportacionesPorMes.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-1">
                  <span className="text-sm text-muted-foreground capitalize">{item.mes}</span>
                  <span className="font-medium">{formatCurrency(item.monto)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Retiros por Mes - {new Date().getFullYear()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inversionesResumen.retirosPorMes.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-1">
                  <span className="text-sm text-muted-foreground capitalize">{item.mes}</span>
                  <span className="font-medium text-destructive">{formatCurrency(item.monto)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DETALLE POR CUENTA */}
      <div className="grid grid-cols-1 gap-6">
        {cuentasInversion.map((cuenta) => {
          const valorActual = cuenta.valorMercado || cuenta.saldoActual;
          const totalAportado = cuenta.saldoActual; // El saldoActual representa lo aportado
          const rendimiento = valorActual - totalAportado;
          const rendimientoPorcentaje = calcularPorcentajeRendimiento(valorActual, totalAportado);
          const IconComponent = getRendimientoIcon(rendimiento);

          return (
            <Card key={cuenta.id} className="hover-scale border-secondary/20 hover:border-secondary/40 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">{cuenta.nombre}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={rendimiento >= 0 ? 'default' : 'destructive'}>
                    <IconComponent className="h-3 w-3 mr-1" />
                    {rendimiento >= 0 ? '+' : ''}{rendimientoPorcentaje.toFixed(2)}%
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingAccount(cuenta.id);
                      setRendimientoManual('');
                    }}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Valor Actual de Mercado</span>
                    <span className="text-xl font-bold text-primary">{formatCurrency(valorActual)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Aportado</span>
                    <span className="text-sm font-medium">{formatCurrency(totalAportado)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Ganancia/Pérdida</span>
                    <span className={`text-sm font-medium ${getRendimientoColor(rendimiento)}`}>
                      {rendimiento >= 0 ? '+' : ''}{formatCurrency(rendimiento)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Rendimiento</span>
                    <span className={`text-lg font-bold ${getRendimientoColor(rendimiento)}`}>
                      {rendimientoPorcentaje > 0 ? '+' : ''}{rendimientoPorcentaje.toFixed(2)}%
                    </span>
                  </div>

                  {/* Formulario para agregar rendimientos */}
                  {editingAccount === cuenta.id && (
                    <div className="border-t pt-4 space-y-3">
                      <Label className="text-sm font-medium">Agregar Rendimiento Mensual</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Monto del rendimiento mensual"
                          value={rendimientoManual}
                          onChange={(e) => setRendimientoManual(e.target.value)}
                          className="flex-1"
                        />
                        <Button 
                          onClick={() => handleRendimientoSubmit(cuenta.id, valorActual)}
                          disabled={!rendimientoManual}
                          size="sm"
                        >
                          Guardar
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setEditingAccount(null)}
                          size="sm"
                        >
                          Cancelar
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ingrese el monto del rendimiento mensual en número. El porcentaje se calculará automáticamente.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
    </Layout>
  );
};

export default Inversiones;