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
import { Plus, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useSampleData } from '@/hooks/useSampleData';
import { toast } from 'sonner';

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
  const { hasSampleData, clearSampleData } = useSampleData();
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Account | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: '' as AccountType,
    saldoInicial: 0,
    divisa: 'MXN' as 'MXN' | 'USD' | 'EUR',
    // Campos específicos de inversión
    tipo_inversion: '' as 'Interés fijo' | 'Fondo variable' | 'Criptomoneda' | '',
    modalidad: '' as 'Reinversión' | 'Pago mensual' | 'Pago trimestral' | '',
    rendimiento_bruto: 0,
    rendimiento_neto: 0,
    fecha_inicio: '',
    ultimo_pago: '',
    valor_mercado: 0
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
    setFormData({ 
      nombre: '', 
      tipo: '' as AccountType, 
      saldoInicial: 0, 
      divisa: 'MXN',
      tipo_inversion: '',
      modalidad: '',
      rendimiento_bruto: 0,
      rendimiento_neto: 0,
      fecha_inicio: '',
      ultimo_pago: '',
      valor_mercado: 0
    });
    setEditingAccount(null);
    setIsAddingAccount(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.tipo || !formData.divisa) return;

    // Limpiar datos de ejemplo antes de crear la primera cuenta real
    if (!editingAccount && hasSampleData) {
      const success = await clearSampleData();
      if (success) {
        toast.success('Datos de ejemplo eliminados. Creando tu primera cuenta...');
      }
    }

    // Preparar datos según el tipo de cuenta
    const accountData: any = {
      nombre: formData.nombre,
      tipo: formData.tipo,
      saldoInicial: formData.saldoInicial,
      divisa: formData.divisa
    };

    // Solo agregar campos de inversión si es una cuenta de inversión y están llenos
    if (formData.tipo === 'Inversiones') {
      if (formData.tipo_inversion) accountData.tipo_inversion = formData.tipo_inversion;
      if (formData.modalidad) accountData.modalidad = formData.modalidad;
      if (formData.rendimiento_bruto) accountData.rendimiento_bruto = formData.rendimiento_bruto;
      if (formData.rendimiento_neto) accountData.rendimiento_neto = formData.rendimiento_neto;
      if (formData.fecha_inicio) accountData.fecha_inicio = formData.fecha_inicio;
      if (formData.ultimo_pago) accountData.ultimo_pago = formData.ultimo_pago;
      if (formData.valor_mercado) accountData.valorMercado = formData.valor_mercado;
    }

    if (editingAccount) {
      onUpdateAccount(editingAccount.id, accountData);
    } else {
      onAddAccount(accountData);
    }
    resetForm();
  };

  const handleEdit = (account: Account) => {
    setFormData({
      nombre: account.nombre,
      tipo: account.tipo,
      saldoInicial: account.saldoInicial,
      divisa: account.divisa || 'MXN',
      tipo_inversion: account.tipo_inversion || '',
      modalidad: account.modalidad || '',
      rendimiento_bruto: account.rendimiento_bruto || 0,
      rendimiento_neto: account.rendimiento_neto || 0,
      fecha_inicio: account.fecha_inicio || '',
      ultimo_pago: account.ultimo_pago || '',
      valor_mercado: account.valorMercado || 0
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
      case 'Bien Raíz': return 'default';
      default: return 'outline';
    }
  };

  const handleSort = (key: keyof Account) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey: keyof Account) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />;
  };

  const sortedAccounts = [...accounts].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue);
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      const comparison = aValue - bValue;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    }
    
    return 0;
  });

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
            <form onSubmit={handleSubmit} method="post" className="space-y-4">
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

              {/* Campos específicos de inversión */}
              {formData.tipo === 'Inversiones' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="tipo_inversion">Tipo de Inversión</Label>
                      <Select 
                        value={formData.tipo_inversion} 
                        onValueChange={(value) => setFormData({ ...formData, tipo_inversion: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Interés fijo">Interés fijo</SelectItem>
                          <SelectItem value="Fondo variable">Fondo variable</SelectItem>
                          <SelectItem value="Criptomoneda">Criptomoneda</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="modalidad">Modalidad</Label>
                      <Select 
                        value={formData.modalidad} 
                        onValueChange={(value) => setFormData({ ...formData, modalidad: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar modalidad" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Reinversión">Reinversión</SelectItem>
                          <SelectItem value="Pago mensual">Pago mensual</SelectItem>
                          <SelectItem value="Pago trimestral">Pago trimestral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="fecha_inicio">Fecha de Inicio</Label>
                    <Input
                      id="fecha_inicio"
                      type="date"
                      value={formData.fecha_inicio}
                      onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="valor_mercado">Valor Actual</Label>
                      <Input
                        id="valor_mercado"
                        type="number"
                        step="0.01"
                        value={formData.valor_mercado}
                        onChange={(e) => setFormData({ ...formData, valor_mercado: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                      />
                    </div>

                    {formData.modalidad !== 'Reinversión' && (
                      <div>
                        <Label htmlFor="ultimo_pago">Último Pago</Label>
                        <Input
                          id="ultimo_pago"
                          type="date"
                          value={formData.ultimo_pago}
                          onChange={(e) => setFormData({ ...formData, ultimo_pago: e.target.value })}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="rendimiento_neto">Rendimiento Neto (% mensual)</Label>
                    <Input
                      id="rendimiento_neto"
                      type="number"
                      step="0.01"
                      value={formData.rendimiento_neto}
                      onChange={(e) => setFormData({ ...formData, rendimiento_neto: parseFloat(e.target.value) || 0 })}
                      placeholder="Ej: 1.2"
                    />
                  </div>
                </>
              )}

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
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('nombre')} className="h-auto p-0 font-medium hover:bg-transparent">
                    <span className="flex items-center gap-1">
                      Nombre
                      {getSortIcon('nombre')}
                    </span>
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('tipo')} className="h-auto p-0 font-medium hover:bg-transparent">
                    <span className="flex items-center gap-1">
                      Tipo
                      {getSortIcon('tipo')}
                    </span>
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('divisa')} className="h-auto p-0 font-medium hover:bg-transparent">
                    <span className="flex items-center gap-1">
                      Divisa
                      {getSortIcon('divisa')}
                    </span>
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('saldoInicial')} className="h-auto p-0 font-medium hover:bg-transparent">
                    <span className="flex items-center gap-1">
                      Saldo Inicial
                      {getSortIcon('saldoInicial')}
                    </span>
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('saldoActual')} className="h-auto p-0 font-medium hover:bg-transparent">
                    <span className="flex items-center gap-1">
                      Saldo Actual
                      {getSortIcon('saldoActual')}
                    </span>
                  </Button>
                </TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAccounts.map((account) => (
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