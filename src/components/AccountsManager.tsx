import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Account, AccountType } from '@/types/finance';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface AccountsManagerProps {
  accounts: Account[];
  accountTypes: AccountType[];
  onAddAccount: (account: Omit<Account, 'id' | 'saldoActual'>) => void;
  onUpdateAccount: (id: string, updates: Partial<Account>) => void;
  onDeleteAccount: (id: string) => void;
}

export const AccountsManager = ({
  accounts,
  accountTypes,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount
}: AccountsManagerProps) => {
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: '' as AccountType,
    saldoInicial: 0,
    divisa: 'MXN' as 'MXN' | 'USD' | 'EUR'
  });

  const formatCurrency = (amount: number, currency: 'MXN' | 'USD' | 'EUR' = 'MXN') => {
    const currencyInfo = {
      'MXN': { code: 'MXN', locale: 'es-MX' },
      'USD': { code: 'USD', locale: 'en-US' },
      'EUR': { code: 'EUR', locale: 'de-DE' }
    };
    
    const { code, locale } = currencyInfo[currency];
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code
    }).format(amount);
  };

  const resetForm = () => {
    setFormData({ nombre: '', tipo: '' as AccountType, saldoInicial: 0, divisa: 'MXN' });
    setEditingAccount(null);
    setIsAddingAccount(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.tipo || !formData.divisa) return;

    if (editingAccount) {
      onUpdateAccount(editingAccount.id, formData);
    } else {
      onAddAccount(formData);
    }
    resetForm();
  };

  const handleEdit = (account: Account) => {
    setFormData({
      nombre: account.nombre,
      tipo: account.tipo,
      saldoInicial: account.saldoInicial,
      divisa: account.divisa || 'MXN' // Valor por defecto para cuentas existentes
    });
    setEditingAccount(account);
    setIsAddingAccount(true);
  };

  const getAccountTypeBadgeVariant = (tipo: AccountType) => {
    switch (tipo) {
      case 'Banco': return 'default';
      case 'Efectivo': return 'secondary';
      case 'Tarjeta de Crédito': return 'destructive';
      case 'Ahorros': return 'outline';
      case 'Inversiones': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Dialog open={isAddingAccount} onOpenChange={setIsAddingAccount}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddingAccount(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Cuenta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Nombre de la cuenta"
                  required
                />
              </div>
              <div>
                <Label htmlFor="tipo">Tipo</Label>
                <Select 
                  value={formData.tipo} 
                  onValueChange={(value) => setFormData({ ...formData, tipo: value as AccountType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountTypes.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="divisa">Divisa</Label>
                <Select 
                  value={formData.divisa} 
                  onValueChange={(value) => setFormData({ ...formData, divisa: value as 'MXN' | 'USD' | 'EUR' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una divisa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MXN">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">MXN</span>
                        <span>$ - Peso Mexicano</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="USD">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">USD</span>
                        <span>$ - Dólar Estadounidense</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="EUR">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">EUR</span>
                        <span>€ - Euro</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="saldoInicial">Saldo Inicial</Label>
                <Input
                  id="saldoInicial"
                  type="number"
                  step="0.01"
                  value={formData.saldoInicial}
                  onChange={(e) => setFormData({ ...formData, saldoInicial: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingAccount ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cuentas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Divisa</TableHead>
                <TableHead>Saldo Inicial</TableHead>
                <TableHead>Saldo Actual</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.nombre}</TableCell>
                  <TableCell>
                    <Badge variant={getAccountTypeBadgeVariant(account.tipo)}>
                      {account.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {account.divisa || 'MXN'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(account.saldoInicial, account.divisa || 'MXN')}</TableCell>
                  <TableCell className={account.saldoActual >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(account.saldoActual, account.divisa || 'MXN')}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(account)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => onDeleteAccount(account.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};