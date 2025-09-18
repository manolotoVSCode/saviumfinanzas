import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Transaction, Account, Category } from '@/types/finance';
import { FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExcelExporterProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
}

export const ExcelExporter = ({ transactions, accounts, categories }: ExcelExporterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [exportType, setExportType] = useState<'all' | 'dateRange'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const getAccountName = (accountId: string) => {
    return accounts.find(account => account.id === accountId)?.nombre || 'Cuenta desconocida';
  };

  const getCategoryInfo = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return {
      categoria: category?.categoria || 'Sin categoría',
      subcategoria: category?.subcategoria || 'Sin subcategoría',
      tipo: category?.tipo || 'No definido'
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const exportToExcel = () => {
    let filteredTransactions = [...transactions];

    // Filtrar por fechas si se seleccionó rango de fechas
    if (exportType === 'dateRange' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Incluir todo el día final

      filteredTransactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.fecha);
        return transactionDate >= start && transactionDate <= end;
      });
    }

    // Preparar datos para Excel
    const excelData = filteredTransactions.map(transaction => {
      const categoryInfo = getCategoryInfo(transaction.subcategoriaId);
      return {
        'Fecha': transaction.fecha.toLocaleDateString('es-MX'),
        'Cuenta': getAccountName(transaction.cuentaId),
        'Categoría': categoryInfo.categoria,
        'Subcategoría': categoryInfo.subcategoria,
        'Tipo': categoryInfo.tipo,
        'Comentario': transaction.comentario,
        'Ingreso': transaction.ingreso > 0 ? formatCurrency(transaction.ingreso) : '',
        'Gasto': transaction.gasto > 0 ? formatCurrency(transaction.gasto) : '',
        'Monto Neto': formatCurrency(transaction.monto),
        'Divisa': transaction.divisa
      };
    });

    // Crear libro de Excel
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Ajustar ancho de columnas
    const columnWidths = [
      { wch: 12 }, // Fecha
      { wch: 20 }, // Cuenta
      { wch: 15 }, // Categoría
      { wch: 20 }, // Subcategoría
      { wch: 12 }, // Tipo
      { wch: 30 }, // Comentario
      { wch: 15 }, // Ingreso
      { wch: 15 }, // Gasto
      { wch: 15 }, // Monto Neto
      { wch: 8 }   // Divisa
    ];
    worksheet['!cols'] = columnWidths;

    // Añadir hoja al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transacciones');

    // Generar nombre del archivo
    const dateRange = exportType === 'dateRange' && startDate && endDate 
      ? `_${startDate}_${endDate}` 
      : '';
    const fileName = `transacciones${dateRange}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Descargar archivo
    XLSX.writeFile(workbook, fileName);

    setIsOpen(false);
  };

  const isDateRangeValid = () => {
    if (exportType === 'all') return true;
    return startDate && endDate && startDate <= endDate;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileDown className="h-4 w-4" />
          Exportar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Transacciones a Excel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="exportType">Tipo de exportación</Label>
            <Select value={exportType} onValueChange={(value: 'all' | 'dateRange') => setExportType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las transacciones</SelectItem>
                <SelectItem value="dateRange">Rango de fechas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {exportType === 'dateRange' && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="startDate">Fecha inicial</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate">Fecha final</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={exportToExcel}
              disabled={!isDateRangeValid()}
            >
              Exportar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};