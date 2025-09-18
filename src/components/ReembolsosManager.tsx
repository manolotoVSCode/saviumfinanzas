import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Transaction, Account, Category } from '@/types/finance';
import { Plus, RotateCcw, ArrowUp, ArrowDown, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ReembolsosManagerProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'monto'>) => void;
}

interface MonthlyReimbursements {
  mes: string;
  year: number;
  totalReembolsos: number;
  reembolsosIngresos: number;
  reembolsosGastos: number;
  ajusteIngresosNeto: number;
  ajusteGastosNeto: number;
  transacciones: Transaction[];
}

export const ReembolsosManager = ({ 
  transactions, 
  accounts, 
  categories, 
  onAddTransaction 
}: ReembolsosManagerProps) => {
  const [isAddingReimbursement, setIsAddingReimbursement] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  
  const [formData, setFormData] = useState({
    cuentaId: '',
    fecha: new Date().toISOString().split('T')[0],
    comentario: '',
    monto: 0,
    tipoReembolso: 'gasto' as 'ingreso' | 'gasto', // Si es reembolso de ingreso o gasto
    subcategoriaId: '',
    divisa: 'MXN' as 'MXN' | 'USD' | 'EUR'
  });

  // Obtener categorías de tipo Reembolso
  const reembolsoCategories = categories.filter(cat => cat.tipo === 'Reembolso');

  // Calcular reembolsos por mes
  const reembolsosPorMes = useMemo(() => {
    const reembolsoTransactions = transactions.filter(t => {
      const category = categories.find(c => c.id === t.subcategoriaId);
      return category?.tipo === 'Reembolso';
    });

    const monthlyData = new Map<string, MonthlyReimbursements>();

    reembolsoTransactions.forEach(transaction => {
      const fecha = new Date(transaction.fecha);
      const monthKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      const monthName = fecha.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          mes: monthName,
          year: fecha.getFullYear(),
          totalReembolsos: 0,
          reembolsosIngresos: 0,
          reembolsosGastos: 0,
          ajusteIngresosNeto: 0,
          ajusteGastosNeto: 0,
          transacciones: []
        });
      }

      const monthData = monthlyData.get(monthKey)!;
      monthData.transacciones.push(transaction);

      // Los reembolsos se registran como ingresos pero restan de los ingresos reales
      // o como gastos negativos que reducen los gastos totales
      const montoReembolso = Math.abs(transaction.monto);
      
      // Analizar el comentario o categoría para determinar si es reembolso de ingreso o gasto
      const esReembolsoDeGasto = transaction.comentario.toLowerCase().includes('gasto') ||
                                transaction.comentario.toLowerCase().includes('compra') ||
                                transaction.comentario.toLowerCase().includes('pago') ||
                                transaction.ingreso > 0; // Si se registró como ingreso, probablemente es reembolso de gasto

      if (esReembolsoDeGasto) {
        monthData.reembolsosGastos += montoReembolso;
        monthData.ajusteGastosNeto -= montoReembolso; // Reduce los gastos
      } else {
        monthData.reembolsosIngresos += montoReembolso;
        monthData.ajusteIngresosNeto -= montoReembolso; // Reduce los ingresos
      }

      monthData.totalReembolsos += montoReembolso;
    });

    return Array.from(monthlyData.values()).sort((a, b) => b.year - a.year || b.mes.localeCompare(a.mes));
  }, [transactions, categories]);

  // Filtrar por mes seleccionado
  const filteredData = selectedMonth === 'all' 
    ? reembolsosPorMes 
    : reembolsosPorMes.filter(data => data.mes.includes(selectedMonth));

  const resetForm = () => {
    setFormData({
      cuentaId: '',
      fecha: new Date().toISOString().split('T')[0],
      comentario: '',
      monto: 0,
      tipoReembolso: 'gasto',
      subcategoriaId: '',
      divisa: 'MXN'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cuentaId || !formData.subcategoriaId || formData.monto <= 0) return;

    // Crear la transacción de reembolso
    // Los reembolsos de gastos se registran como ingresos
    // Los reembolsos de ingresos se registran como gastos negativos
    const transactionData = {
      ...formData,
      fecha: new Date(formData.fecha + 'T12:00:00'),
      ingreso: formData.tipoReembolso === 'gasto' ? formData.monto : 0,
      gasto: formData.tipoReembolso === 'ingreso' ? formData.monto : 0,
      comentario: `REEMBOLSO (${formData.tipoReembolso}): ${formData.comentario}`
    };

    onAddTransaction(transactionData);
    setIsAddingReimbursement(false);
    resetForm();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const getAccountName = (accountId: string) => {
    return accounts.find(acc => acc.id === accountId)?.nombre || 'Cuenta desconocida';
  };

  // Obtener meses únicos para el filtro
  const availableMonths = Array.from(new Set(reembolsosPorMes.map(data => {
    const [year, month] = data.mes.split(' de ');
    return month;
  }))).sort();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Gestión de Reembolsos
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Los reembolsos ajustan automáticamente tus ingresos y gastos mensuales
          </p>
        </div>
        <Dialog open={isAddingReimbursement} onOpenChange={setIsAddingReimbursement}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddingReimbursement(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Reembolso
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Reembolso</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cuentaId">Cuenta</Label>
                  <Select value={formData.cuentaId} onValueChange={(value) => setFormData({ ...formData, cuentaId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.nombre} ({account.divisa})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="fecha">Fecha</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipoReembolso">Tipo de Reembolso</Label>
                  <Select 
                    value={formData.tipoReembolso} 
                    onValueChange={(value: 'ingreso' | 'gasto') => setFormData({ ...formData, tipoReembolso: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gasto">Reembolso de Gasto</SelectItem>
                      <SelectItem value="ingreso">Reembolso de Ingreso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="monto">Monto</Label>
                  <Input
                    id="monto"
                    type="number"
                    step="0.01"
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="subcategoriaId">Categoría de Reembolso</Label>
                <Select value={formData.subcategoriaId} onValueChange={(value) => setFormData({ ...formData, subcategoriaId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría de reembolso" />
                  </SelectTrigger>
                  <SelectContent>
                    {reembolsoCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.categoria} - {category.subcategoria}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="comentario">Descripción del Reembolso</Label>
                <Textarea
                  id="comentario"
                  value={formData.comentario}
                  onChange={(e) => setFormData({ ...formData, comentario: e.target.value })}
                  placeholder="Describe qué se está reembolsando..."
                  required
                />
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {formData.tipoReembolso === 'gasto' 
                    ? 'Este reembolso reducirá tus gastos del mes y se registrará como un ingreso.'
                    : 'Este reembolso reducirá tus ingresos del mes y se registrará como un gasto.'
                  }
                </AlertDescription>
              </Alert>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsAddingReimbursement(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Registrar Reembolso</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <Label>Filtrar por mes</Label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los meses</SelectItem>
              {availableMonths.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Información sobre cómo funcionan los reembolsos */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p><strong>Cómo funcionan los reembolsos:</strong></p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 text-sm">
              <div className="flex items-center gap-2">
                <ArrowDown className="h-4 w-4 text-green-600" />
                <span><strong>Reembolso de Gastos:</strong> Reduce los gastos mensuales</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUp className="h-4 w-4 text-red-600" />
                <span><strong>Reembolso de Ingresos:</strong> Reduce los ingresos mensuales</span>
              </div>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Resumen de reembolsos por mes */}
      <div className="grid gap-4">
        {filteredData.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <RotateCcw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay reembolsos registrados</p>
              <p className="text-sm text-muted-foreground mt-2">
                Registra tu primer reembolso para comenzar a ver el análisis mensual
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredData.map((monthData, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{monthData.mes}</span>
                  <Badge variant="outline">
                    {monthData.transacciones.length} reembolso{monthData.transacciones.length !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{formatCurrency(monthData.totalReembolsos)}</div>
                    <div className="text-sm text-muted-foreground">Total Reembolsos</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(monthData.reembolsosGastos)}</div>
                    <div className="text-sm text-muted-foreground">Ajuste en Gastos</div>
                    <div className="text-xs text-green-600">-{formatCurrency(Math.abs(monthData.ajusteGastosNeto))}</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-2xl font-bold text-red-600">{formatCurrency(monthData.reembolsosIngresos)}</div>
                    <div className="text-sm text-muted-foreground">Ajuste en Ingresos</div>
                    <div className="text-xs text-red-600">-{formatCurrency(Math.abs(monthData.ajusteIngresosNeto))}</div>
                  </div>
                </div>

                {/* Detalle de transacciones */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Detalle de Reembolsos:</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Cuenta</TableHead>
                          <TableHead>Monto</TableHead>
                          <TableHead>Tipo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthData.transacciones.map((transaction) => {
                          const esReembolsoDeGasto = transaction.ingreso > 0;
                          return (
                            <TableRow key={transaction.id}>
                              <TableCell>{transaction.fecha.toLocaleDateString('es-MX')}</TableCell>
                              <TableCell>{transaction.comentario}</TableCell>
                              <TableCell>{getAccountName(transaction.cuentaId)}</TableCell>
                              <TableCell>{formatCurrency(Math.abs(transaction.monto))}</TableCell>
                              <TableCell>
                                <Badge variant={esReembolsoDeGasto ? "default" : "destructive"}>
                                  {esReembolsoDeGasto ? "Reemb. Gasto" : "Reemb. Ingreso"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};