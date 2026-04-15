import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Layout from '@/components/Layout';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';

const SeguimientoIngresos = () => {
  const navigate = useNavigate();
  const financeData = useFinanceDataSupabase();

  if (financeData.loading) {
    return (
      <Layout>
        <div className="animate-fade-in flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Cargando...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const incomeCategories = financeData.categories
    .filter(c => c.tipo === 'Ingreso')
    .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.subcategoria.localeCompare(b.subcategoria));

  const toggleTracking = (categoryId: string, currentValue: boolean) => {
    financeData.updateCategory(categoryId, { seguimiento_pago: !currentValue });
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/categorias')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            <h1 className="text-3xl font-bold">Seguimiento de Ingresos</h1>
          </div>
        </div>

        <Alert className="border-success/30 bg-success/5">
          <Info className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p className="font-medium">¿Cómo funciona?</p>
            <p>
              Activa el seguimiento en las subcategorías de ingreso que quieras monitorear.
              Esto te permite verificar mes a mes que recibiste cada fuente de ingreso esperada.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Visualiza en <strong>Informes → Comparativo de Ingresos</strong> la evolución mensual de cada fuente.</li>
              <li>Detecta rápidamente si algún ingreso esperado no se registró en un mes determinado.</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Subcategorías de Ingreso</CardTitle>
            <CardDescription>
              Activa el seguimiento para monitorear la recepción de cada fuente de ingreso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subcategoría</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="w-[100px] text-center">Seguimiento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeCategories.map(cat => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.subcategoria}</TableCell>
                    <TableCell className="text-muted-foreground">{cat.categoria}</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={cat.seguimiento_pago || false}
                        onCheckedChange={() => toggleTracking(cat.id, cat.seguimiento_pago || false)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SeguimientoIngresos;
