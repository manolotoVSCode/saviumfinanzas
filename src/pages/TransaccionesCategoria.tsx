import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Calendar, CreditCard, FileText, Pencil } from 'lucide-react';
import { Transaction } from '@/types/finance';

const TransaccionesCategoria = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const financeData = useFinanceDataSupabase();
  const { formatCurrency } = useAppConfig();

  // Estado para el diálogo de edición
  const [editingTransaction, setEditingTransaction] = useState<(Transaction & { categoria?: string; subcategoria?: string }) | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  // Obtener parámetros de la URL
  const categoria = searchParams.get('categoria') || '';
  const subcategoria = searchParams.get('subcategoria') || '';
  const divisa = searchParams.get('divisa') || 'MXN';
  const periodo = searchParams.get('periodo') || 'Últimos 12 meses';
  const mesIndex = searchParams.get('mes');

  // Obtener categorías únicas agrupadas
  const categoriesGrouped = useMemo(() => {
    const grouped: Record<string, { id: string; subcategoria: string }[]> = {};
    financeData.categories.forEach(cat => {
      if (!grouped[cat.categoria]) {
        grouped[cat.categoria] = [];
      }
      grouped[cat.categoria].push({ id: cat.id, subcategoria: cat.subcategoria });
    });
    return grouped;
  }, [financeData.categories]);

  // Filtrar transacciones según los parámetros
  const filteredTransactions = useMemo(() => {
    let transactions = financeData.transactions.filter(t => 
      t.divisa === divisa && 
      t.tipo === 'Gastos' &&
      t.categoria !== 'Compra Venta Inmuebles'
    );

    // Filtrar por categoría
    if (categoria) {
      transactions = transactions.filter(t => t.categoria === categoria);
    }

    // Filtrar por subcategoría si se especifica
    if (subcategoria) {
      transactions = transactions.filter(t => t.subcategoria === subcategoria);
    }

    // Filtrar por período
    const now = new Date();
    if (mesIndex !== null && mesIndex !== undefined) {
      // Mes específico
      const monthIndex = parseInt(mesIndex);
      const last12Months: Array<{ month: number; year: number }> = [];
      for (let i = 12; i >= 1; i--) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        last12Months.push({
          month: targetDate.getMonth(),
          year: targetDate.getFullYear()
        });
      }
      if (last12Months[monthIndex]) {
        const targetMonth = last12Months[monthIndex];
        transactions = transactions.filter(t => {
          const tDate = new Date(t.fecha);
          return tDate.getMonth() === targetMonth.month && tDate.getFullYear() === targetMonth.year;
        });
      }
    } else {
      // Últimos 12 meses
      const last12Months: Array<{ month: number; year: number }> = [];
      for (let i = 12; i >= 1; i--) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        last12Months.push({
          month: targetDate.getMonth(),
          year: targetDate.getFullYear()
        });
      }
      transactions = transactions.filter(t => {
        const tDate = new Date(t.fecha);
        return last12Months.some(m => m.month === tDate.getMonth() && m.year === tDate.getFullYear());
      });
    }

    // Ordenar por fecha descendente
    return transactions.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [financeData.transactions, categoria, subcategoria, divisa, mesIndex]);

  // Calcular totales
  const totalGastos = filteredTransactions.reduce((sum, t) => sum + Math.abs(t.gasto || 0), 0);

  const formatCurrencyValue = (amount: number, currency: string) => {
    return `${new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)} ${currency}`;
  };

  const handleEditClick = (transaction: Transaction & { categoria?: string; subcategoria?: string }) => {
    setEditingTransaction(transaction);
    setSelectedCategoryId(transaction.subcategoriaId);
  };

  const handleSaveCategory = async () => {
    if (!editingTransaction || !selectedCategoryId) return;
    
    await financeData.updateTransaction(editingTransaction.id, { 
      subcategoriaId: selectedCategoryId 
    });
    
    setEditingTransaction(null);
    setSelectedCategoryId('');
  };

  if (financeData.loading) {
    return (
      <Layout>
        <div className="animate-fade-in flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Cargando transacciones...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const title = subcategoria 
    ? `${categoria} > ${subcategoria}` 
    : categoria;

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        {/* Header con botón de regresar */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{title}</h1>
            <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
              <Badge variant="outline">{divisa}</Badge>
              <span>•</span>
              <span>{periodo}</span>
            </div>
          </div>
        </div>

        {/* Card con resumen */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="text-lg">Resumen</span>
              <span className="text-destructive font-bold text-xl">
                {formatCurrencyValue(totalGastos, divisa)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span>{filteredTransactions.length} transacciones</span>
              </div>
              {filteredTransactions.length > 0 && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(filteredTransactions[filteredTransactions.length - 1].fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' - '}
                      {new Date(filteredTransactions[0].fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabla de transacciones */}
        <Card>
          <CardContent className="p-0">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay transacciones para mostrar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Fecha</TableHead>
                      <TableHead>Cuenta</TableHead>
                      {!subcategoria && <TableHead>Subcategoría</TableHead>}
                      <TableHead className="max-w-[300px]">Comentario / Notas</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((t) => (
                      <TableRow 
                        key={t.id} 
                        className="hover:bg-muted/50 cursor-pointer group"
                        onClick={() => handleEditClick(t)}
                      >
                        <TableCell className="font-medium whitespace-nowrap">
                          {new Date(t.fecha).toLocaleDateString('es-ES', { 
                            day: '2-digit', 
                            month: 'short',
                            year: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {financeData.accounts.find(a => a.id === t.cuentaId)?.nombre || 'Sin cuenta'}
                            </span>
                          </div>
                        </TableCell>
                        {!subcategoria && (
                          <TableCell>
                            <Badge variant="secondary" className="font-normal">
                              {t.subcategoria || 'Sin subcategoría'}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell className="max-w-[300px]">
                          <p className="text-sm truncate" title={t.comentario}>
                            {t.comentario || <span className="text-muted-foreground italic">Sin notas</span>}
                          </p>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-destructive whitespace-nowrap">
                          {formatCurrencyValue(Math.abs(t.gasto || 0), t.divisa || divisa)}
                        </TableCell>
                        <TableCell>
                          <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botón de regresar al final */}
        <div className="flex justify-center pb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al Dashboard
          </Button>
        </div>

        {/* Diálogo de edición de categoría */}
        <Dialog open={!!editingTransaction} onOpenChange={(open) => !open && setEditingTransaction(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Editar Categoría</DialogTitle>
            </DialogHeader>
            {editingTransaction && (
              <div className="space-y-4 py-4">
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <p className="text-sm font-medium">{editingTransaction.comentario || 'Sin comentario'}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(editingTransaction.fecha).toLocaleDateString('es-ES', { 
                      day: 'numeric', 
                      month: 'long',
                      year: 'numeric'
                    })} • {formatCurrencyValue(Math.abs(editingTransaction.gasto || 0), editingTransaction.divisa || 'MXN')}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Categoría / Subcategoría</Label>
                  <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {Object.entries(categoriesGrouped).map(([catName, subcats]) => (
                        <div key={catName}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                            {catName}
                          </div>
                          {subcats.map(sub => (
                            <SelectItem key={sub.id} value={sub.id}>
                              {sub.subcategoria}
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTransaction(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveCategory} disabled={!selectedCategoryId}>
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default TransaccionesCategoria;
