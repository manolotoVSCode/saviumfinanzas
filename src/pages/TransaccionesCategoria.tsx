import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';
import Layout from '@/components/Layout';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, CreditCard, FileText } from 'lucide-react';

const TransaccionesCategoria = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const financeData = useFinanceDataSupabase();
  const { formatCurrency } = useAppConfig();

  // Obtener parámetros de la URL
  const categoria = searchParams.get('categoria') || '';
  const subcategoria = searchParams.get('subcategoria') || '';
  const divisa = searchParams.get('divisa') || 'MXN';
  const periodo = searchParams.get('periodo') || 'Últimos 12 meses';
  const mesIndex = searchParams.get('mes');

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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((t) => (
                      <TableRow key={t.id} className="hover:bg-muted/50">
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
      </div>
    </Layout>
  );
};

export default TransaccionesCategoria;
