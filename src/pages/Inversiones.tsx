import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList } from 'recharts';

import Layout from '@/components/Layout';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { TrendingUp, TrendingDown, DollarSign, Edit3 } from 'lucide-react';

const Inversiones = () => {
  const { dashboardMetrics, accounts, updateAccount } = useFinanceData();
  const { formatCurrency } = useAppConfig();
  const { convertCurrency, loading: ratesLoading } = useExchangeRates();
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [rendimientoManual, setRendimientoManual] = useState<string>('');
  const [mostrarMovimientos, setMostrarMovimientos] = useState<{[key: string]: boolean}>({});
  const [reinvertirRendimiento, setReinvertirRendimiento] = useState<{[key: string]: boolean}>({});

  const inversionesResumen = dashboardMetrics.inversionesResumen;
  const cuentasInversion = accounts.filter(acc => acc.tipo === 'Inversiones');

  // Usar los totales ya calculados del resumen
  const totalInvertidoMXN = inversionesResumen.totalInversiones;
  const totalAportadoAnualMXN = inversionesResumen.totalAportadoAnual;
  const totalRetiradoAnualMXN = inversionesResumen.totalRetiradoAnual;

  const getRendimientoColor = (rendimiento: number) => {
    if (rendimiento > 0) return 'text-success';
    if (rendimiento < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const getRendimientoIcon = (rendimiento: number) => {
    return rendimiento >= 0 ? TrendingUp : TrendingDown;
  };

  const handleRendimientoSubmit = (cuentaId: string) => {
    const rendimientoIngresado = parseFloat(rendimientoManual);
    if (!isNaN(rendimientoIngresado)) {
      // Guardamos directamente el rendimiento mensual ingresado
      updateAccount(cuentaId, { rendimientoMensual: rendimientoIngresado });
      setEditingAccount(null);
      setRendimientoManual('');
    }
  };

  const calcularPorcentajeRendimiento = (rendimientoMensual: number, totalAportado: number) => {
    return totalAportado !== 0 ? (rendimientoMensual / totalAportado) * 100 : 0;
  };

  const calcularRendimientoAnual = (rendimientoMensual: number) => {
    // Fórmula de capitalización compuesta: (1 + r_mensual)^12 - 1
    return ((Math.pow(1 + (rendimientoMensual / 100), 12) - 1) * 100);
  };

  const formatAmount = (value: number) => {
    if (value === 0) return '';
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(value));
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
      {/* RESUMEN GENERAL */}
      <Card className="hover-scale border-primary/20 hover:border-primary/40 transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Resumen de Inversiones <strong>MXN</strong>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{formatCurrency(totalInvertidoMXN)}</div>
              <div className="text-sm text-muted-foreground">Total Invertido</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{formatCurrency(totalAportadoAnualMXN)}</div>
              <div className="text-sm text-muted-foreground">Total Aportado {new Date().getFullYear()}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{formatCurrency(totalRetiradoAnualMXN)}</div>
              <div className="text-sm text-muted-foreground">Total Retirado {new Date().getFullYear()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DETALLE POR CUENTA */}
      <div className="grid grid-cols-1 gap-6">
        {inversionesResumen.cuentasInversion.map((inversion) => {
          const cuenta = cuentasInversion.find(c => c.id === inversion.id);
          if (!cuenta) return null;
          
          const totalAportado = cuenta.saldoActual;
          const rendimiento = cuenta.rendimientoMensual || 0;
          const rendimientoMensualPorcentaje = calcularPorcentajeRendimiento(rendimiento, totalAportado);
          const rendimientoAnualPorcentaje = calcularRendimientoAnual(rendimientoMensualPorcentaje);
          const IconComponent = getRendimientoIcon(rendimiento);

          return (
            <Card key={cuenta.id} className="hover-scale border-secondary/20 hover:border-secondary/40 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">
                  {cuenta.nombre} <strong>{cuenta.divisa}</strong>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={rendimiento >= 0 ? 'default' : 'destructive'} className="text-xs">
                      <IconComponent className="h-3 w-3 mr-1" />
                      {rendimiento >= 0 ? '+' : ''}{rendimientoMensualPorcentaje.toFixed(2)}% NETO Mensual
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {rendimientoAnualPorcentaje >= 0 ? '+' : ''}{rendimientoAnualPorcentaje.toFixed(2)}% NETO Anual
                    </Badge>
                  </div>
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
                  {/* Total Aportado en cuadro verde */}
                  <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Total Aportado</span>
                      <span className="text-xl font-bold text-success">{formatCurrency(totalAportado)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Valor total de la inversión
                    </div>
                  </div>
                  
                  {/* Rendimiento Mensual en cuadro gris */}
                  <div className="p-4 rounded-lg bg-muted/5 border border-muted/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Rendimiento Mensual</span>
                      <span className={`text-sm font-medium ${getRendimientoColor(rendimiento)}`}>
                        {rendimiento >= 0 ? '+' : ''}{formatCurrency(rendimiento)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Ganancias/pérdidas del mes
                    </div>
                  </div>

                  {/* Checkboxes de configuración */}
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id={`mostrar-${cuenta.id}`}
                        checked={mostrarMovimientos[cuenta.id] || false}
                        onCheckedChange={(checked) => 
                          setMostrarMovimientos(prev => ({...prev, [cuenta.id]: checked as boolean}))
                        }
                      />
                      <Label htmlFor={`mostrar-${cuenta.id}`} className="text-sm">
                        Mostrar movimientos de esta inversión
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id={`reinvertir-${cuenta.id}`}
                        checked={reinvertirRendimiento[cuenta.id] || false}
                        onCheckedChange={(checked) => 
                          setReinvertirRendimiento(prev => ({...prev, [cuenta.id]: checked as boolean}))
                        }
                      />
                      <Label htmlFor={`reinvertir-${cuenta.id}`} className="text-sm">
                        Reinvertir rendimiento automáticamente
                      </Label>
                    </div>
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
                          onClick={() => handleRendimientoSubmit(cuenta.id)}
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
                        Ingrese el monto del rendimiento mensual en número. El porcentaje mensual y anual se calculará automáticamente.
                      </p>
                    </div>
                  )}

                  {/* Gráfica de movimientos mensuales - Solo si está habilitada */}
                  {mostrarMovimientos[cuenta.id] && (
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium mb-3">Movimientos Mensuales {new Date().getFullYear()}</h4>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={inversion.movimientosPorMes}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis 
                              dataKey="mes" 
                              tick={{ fontSize: 12 }}
                              className="text-muted-foreground"
                            />
                            <YAxis hide />
                            <Bar dataKey="aportaciones" fill="hsl(var(--success))" radius={[2, 2, 0, 0]}>
                              <LabelList dataKey="aportaciones" position="top" fontSize={10} formatter={formatAmount} />
                            </Bar>
                            <Bar dataKey="retiros" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]}>
                              <LabelList dataKey="retiros" position="top" fontSize={10} formatter={formatAmount} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center gap-4 mt-2 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--success))' }}></div>
                          <span>Aportaciones</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--destructive))' }}></div>
                          <span>Retiros</span>
                        </div>
                      </div>
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