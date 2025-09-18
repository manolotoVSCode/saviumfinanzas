import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Transaction, Account, Category } from '@/types/finance';
import { Search, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';

interface DataAuditProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
}

interface AuditIssue {
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  count?: number;
  items?: string[];
}

export const DataAudit = ({ transactions, accounts, categories }: DataAuditProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [auditResults, setAuditResults] = useState<AuditIssue[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const runAudit = () => {
    setIsLoading(true);
    const issues: AuditIssue[] = [];

    // 1. Verificar transacciones huérfanas (sin cuenta válida)
    const orphanedTransactionsByAccount = transactions.filter(t => 
      !accounts.some(a => a.id === t.cuentaId)
    );
    if (orphanedTransactionsByAccount.length > 0) {
      issues.push({
        type: 'error',
        category: 'Transacciones',
        message: 'Transacciones sin cuenta válida',
        count: orphanedTransactionsByAccount.length,
        items: orphanedTransactionsByAccount.map(t => `${t.comentario} (${new Date(t.fecha).toLocaleDateString()})`).slice(0, 10)
      });
    }

    // 2. Verificar transacciones sin categoría válida
    const orphanedTransactionsByCategory = transactions.filter(t => 
      !categories.some(c => c.id === t.subcategoriaId)
    );
    if (orphanedTransactionsByCategory.length > 0) {
      issues.push({
        type: 'error',
        category: 'Transacciones',
        message: 'Transacciones sin categoría válida',
        count: orphanedTransactionsByCategory.length,
        items: orphanedTransactionsByCategory.map(t => `${t.comentario} (${new Date(t.fecha).toLocaleDateString()})`).slice(0, 10)
      });
    }

    // 3. Categorías no utilizadas
    const unusedCategories = categories.filter(c => 
      !transactions.some(t => t.subcategoriaId === c.id) &&
      !(c.categoria.toLowerCase() === 'sin asignar' && c.subcategoria.toLowerCase() === 'sin asignar')
    );
    if (unusedCategories.length > 0) {
      issues.push({
        type: 'warning',
        category: 'Categorías',
        message: 'Categorías sin transacciones asociadas',
        count: unusedCategories.length,
        items: unusedCategories.map(c => `${c.categoria} - ${c.subcategoria}`).slice(0, 10)
      });
    }

    // 4. Cuentas sin transacciones
    const unusedAccounts = accounts.filter(a => 
      !transactions.some(t => t.cuentaId === a.id)
    );
    if (unusedAccounts.length > 0) {
      issues.push({
        type: 'warning',
        category: 'Cuentas',
        message: 'Cuentas sin transacciones asociadas',
        count: unusedAccounts.length,
        items: unusedAccounts.map(a => a.nombre)
      });
    }

    // 5. Transacciones con montos inconsistentes
    const inconsistentAmounts = transactions.filter(t => 
      (t.ingreso > 0 && t.gasto > 0) || (t.ingreso === 0 && t.gasto === 0)
    );
    if (inconsistentAmounts.length > 0) {
      issues.push({
        type: 'error',
        category: 'Transacciones',
        message: 'Transacciones con montos inconsistentes (ingreso y gasto ambos > 0 o ambos = 0)',
        count: inconsistentAmounts.length,
        items: inconsistentAmounts.map(t => `${t.comentario} (I:${t.ingreso}, G:${t.gasto})`).slice(0, 10)
      });
    }

    // 6. Fechas futuras
    const futureTransactions = transactions.filter(t => 
      new Date(t.fecha) > new Date()
    );
    if (futureTransactions.length > 0) {
      issues.push({
        type: 'warning',
        category: 'Transacciones',
        message: 'Transacciones con fechas futuras',
        count: futureTransactions.length,
        items: futureTransactions.map(t => `${t.comentario} (${new Date(t.fecha).toLocaleDateString()})`).slice(0, 10)
      });
    }

    // 7. Categorías duplicadas
    const categoryKeys = categories.map(c => `${c.categoria}|${c.subcategoria}|${c.tipo}`);
    const duplicateCategories = categoryKeys.filter((key, index) => 
      categoryKeys.indexOf(key) !== index
    );
    if (duplicateCategories.length > 0) {
      const uniqueDuplicates = [...new Set(duplicateCategories)];
      issues.push({
        type: 'warning',
        category: 'Categorías',
        message: 'Categorías duplicadas detectadas',
        count: uniqueDuplicates.length,
        items: uniqueDuplicates.map(key => key.replace(/\|/g, ' - '))
      });
    }

    // 8. Cuentas con nombres duplicados
    const accountNames = accounts.map(a => a.nombre.toLowerCase());
    const duplicateAccounts = accounts.filter((account, index) => 
      accountNames.indexOf(account.nombre.toLowerCase()) !== index
    );
    if (duplicateAccounts.length > 0) {
      issues.push({
        type: 'warning',
        category: 'Cuentas',
        message: 'Cuentas con nombres duplicados',
        count: duplicateAccounts.length,
        items: duplicateAccounts.map(a => a.nombre)
      });
    }

    // 9. Transacciones sin comentario o con comentario muy corto
    const poorDescriptions = transactions.filter(t => 
      !t.comentario || t.comentario.trim().length < 3
    );
    if (poorDescriptions.length > 0) {
      issues.push({
        type: 'info',
        category: 'Calidad de Datos',
        message: 'Transacciones con descripciones pobres o vacías',
        count: poorDescriptions.length,
        items: poorDescriptions.map(t => `${t.comentario || '(vacío)'} - ${new Date(t.fecha).toLocaleDateString()}`).slice(0, 10)
      });
    }

    // 10. Montos muy grandes que podrían ser errores
    const largeAmounts = transactions.filter(t => 
      Math.abs(t.monto) > 1000000 // Más de 1 millón
    );
    if (largeAmounts.length > 0) {
      issues.push({
        type: 'warning',
        category: 'Transacciones',
        message: 'Transacciones con montos muy grandes (posibles errores)',
        count: largeAmounts.length,
        items: largeAmounts.map(t => `${t.comentario} - $${Math.abs(t.monto).toLocaleString()}`).slice(0, 10)
      });
    }

    // Si no hay problemas
    if (issues.length === 0) {
      issues.push({
        type: 'info',
        category: 'Estado',
        message: '¡Excelente! No se detectaron problemas en tus datos',
        count: 0
      });
    }

    setAuditResults(issues);
    setIsLoading(false);
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getIssueVariant = (type: string) => {
    switch (type) {
      case 'error':
        return 'destructive' as const;
      case 'warning':
        return 'default' as const;
      case 'info':
        return 'secondary' as const;
      default:
        return 'default' as const;
    }
  };

  const errorCount = auditResults.filter(issue => issue.type === 'error').length;
  const warningCount = auditResults.filter(issue => issue.type === 'warning').length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => {
            setIsOpen(true);
            runAudit();
          }}
        >
          <Search className="h-4 w-4 mr-2" />
          Auditar Datos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Auditoría de Datos
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Analizando datos...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumen */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{errorCount}</div>
                    <div className="text-sm text-muted-foreground">Errores</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
                    <div className="text-sm text-muted-foreground">Advertencias</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {transactions.length + accounts.length + categories.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Total registros</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Resultados detallados */}
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {auditResults.map((issue, index) => (
                  <Alert key={index} className="border-l-4" style={{
                    borderLeftColor: issue.type === 'error' ? '#ef4444' : 
                                   issue.type === 'warning' ? '#f59e0b' : '#3b82f6'
                  }}>
                    <div className="flex items-start gap-3">
                      {getIssueIcon(issue.type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getIssueVariant(issue.type)} className="text-xs">
                            {issue.category}
                          </Badge>
                          {issue.count !== undefined && issue.count > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {issue.count} elemento{issue.count !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <AlertDescription className="font-medium">
                          {issue.message}
                        </AlertDescription>
                        {issue.items && issue.items.length > 0 && (
                          <div className="mt-2">
                            <div className="text-sm text-muted-foreground mb-1">Ejemplos:</div>
                            <ul className="text-sm space-y-1">
                              {issue.items.map((item, itemIndex) => (
                                <li key={itemIndex} className="ml-4 text-muted-foreground">
                                  • {item}
                                </li>
                              ))}
                              {issue.count && issue.count > issue.items.length && (
                                <li className="ml-4 text-muted-foreground font-medium">
                                  ... y {issue.count - issue.items.length} más
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cerrar
              </Button>
              <Button onClick={runAudit} disabled={isLoading}>
                <Search className="h-4 w-4 mr-2" />
                Volver a Auditar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};