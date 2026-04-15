import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Info, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Layout from '@/components/Layout';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';

const SeguimientoGastos = () => {
  const navigate = useNavigate();
  const financeData = useFinanceDataSupabase();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<string>('all');
  const [filterTracking, setFilterTracking] = useState<string>('all');
  const [filterFrequency, setFilterFrequency] = useState<string>('all');

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

  const expenseCategories = financeData.categories
    .filter(c => c.tipo === 'Gastos')
    .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.subcategoria.localeCompare(b.subcategoria));

  const uniqueCategories = [...new Set(expenseCategories.map(c => c.categoria))].sort();

  const filteredCategories = expenseCategories.filter(cat => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!cat.subcategoria.toLowerCase().includes(q) && !cat.categoria.toLowerCase().includes(q)) return false;
    }
    if (filterCategoria !== 'all' && cat.categoria !== filterCategoria) return false;
    if (filterTracking === 'active' && !cat.seguimiento_pago) return false;
    if (filterTracking === 'inactive' && cat.seguimiento_pago) return false;
    if (filterFrequency !== 'all') {
      if (!cat.seguimiento_pago) return false;
      const freq = (cat as any).frecuencia_seguimiento || 'mensual';
      if (freq !== filterFrequency) return false;
    }
    return true;
  });

  const toggleTracking = (categoryId: string, currentValue: boolean) => {
    financeData.updateCategory(categoryId, { seguimiento_pago: !currentValue });
  };

  const updateFrequency = (categoryId: string, frecuencia: 'mensual' | 'anual') => {
    financeData.updateCategory(categoryId, { frecuencia_seguimiento: frecuencia });
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/categorias')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            <h1 className="text-3xl font-bold">Seguimiento de Pagos Recurrentes</h1>
          </div>
        </div>

        <Alert className="border-primary/30 bg-primary/5">
          <Info className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p className="font-medium">¿Cómo funciona?</p>
            <p>
              Activa el seguimiento en las subcategorías de gastos que representan pagos recurrentes
              (electricidad, internet, seguros, etc.). Esto te permite:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Pagos mensuales:</strong> Verificar que se registró el pago cada mes en la sección de Informes → Control de Pagos Mensuales.</li>
              <li><strong>Pagos anuales:</strong> Rastrear pagos que se realizan una vez al año (tenencia, predial, seguros anuales) en Informes → Pagos Anuales.</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Subcategorías de Gastos</CardTitle>
            <CardDescription>
              Activa el seguimiento y selecciona la periodicidad para cada subcategoría.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              <div className="relative w-full sm:w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {uniqueCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterTracking} onValueChange={setFilterTracking}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Seguimiento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Con seguimiento</SelectItem>
                  <SelectItem value="inactive">Sin seguimiento</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterFrequency} onValueChange={setFilterFrequency}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Periodicidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subcategoría</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="w-[140px]">Periodicidad</TableHead>
                  <TableHead className="w-[100px] text-center">Seguimiento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.length > 0 ? (
                  filteredCategories.map(cat => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.subcategoria}</TableCell>
                      <TableCell className="text-muted-foreground">{cat.categoria}</TableCell>
                      <TableCell>
                        {cat.seguimiento_pago ? (
                          <Select
                            value={(cat as any).frecuencia_seguimiento || 'mensual'}
                            onValueChange={(v) => updateFrequency(cat.id, v as 'mensual' | 'anual')}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mensual">Mensual</SelectItem>
                              <SelectItem value="anual">Anual</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={cat.seguimiento_pago || false}
                          onCheckedChange={() => toggleTracking(cat.id, cat.seguimiento_pago || false)}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No se encontraron subcategorías con los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SeguimientoGastos;
