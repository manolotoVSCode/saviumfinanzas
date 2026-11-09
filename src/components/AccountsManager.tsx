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
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2, Search, Copy, Archive, ArchiveRestore } from 'lucide-react';
import { formatearClabe, limpiarClabe } from '@/lib/finance/clabe';
import {
  CampoBancario, ETIQUETAS_CORTAS, PAISES_BANCARIOS, PAIS_POR_DEFECTO,
  errorCampo, etiquetaCampo, formatearCampo, limpiarCodigo, paisBancario,
} from '@/lib/finance/datosBancarios';
import { toast } from 'sonner';

/** Tipos sin cuenta en un banco: no se les piden datos bancarios. */
const SIN_DATOS_BANCARIOS: AccountType[] = ['Efectivo', 'Bien Raíz'];

/** Orden en que se muestran los datos bancarios en la lista. */
const CAMPOS_LISTA: CampoBancario[] = ['clabe', 'numeroCuenta', 'routing', 'iban', 'swift'];

const PLACEHOLDERS: Record<CampoBancario, string> = {
  clabe: '18 dígitos',
  numeroCuenta: 'Número de cuenta',
  routing: '',
  iban: 'Ej.: ES91 2100 0418 4502 0005 1332',
  swift: '8 u 11 caracteres',
};

const copiar = async (valor: string, que: string) => {
  try {
    await navigator.clipboard.writeText(valor);
    toast.success(`${que} copiado`);
  } catch {
    toast.error('No se pudo copiar');
  }
};

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
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCurrency, setFilterCurrency] = useState<string>('all');
  const [filterPositiveBalance, setFilterPositiveBalance] = useState(false);
  const [verArchivadas, setVerArchivadas] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Account | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: '' as AccountType,
    saldoInicial: 0,
    divisa: 'MXN' as 'MXN' | 'USD' | 'EUR',
    vendida: false,
    clabe: '',
    pais: PAIS_POR_DEFECTO,
    banco: '',
    numeroCuenta: '',
    routing: '',
    iban: '',
    swift: '',
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
    const currencySymbol = {
      'MXN': '$',
      'USD': '$',
      'EUR': '€'
    };
    
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    
    return `${currencySymbol[currency]}${formatted}`;
  };

  const resetForm = () => {
    setFormData({ 
      nombre: '', 
      tipo: '' as AccountType, 
      saldoInicial: 0, 
      divisa: 'MXN',
      vendida: false,
      clabe: '',
      pais: PAIS_POR_DEFECTO,
      banco: '',
      numeroCuenta: '',
      routing: '',
      iban: '',
      swift: '',
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

  const handleMarkAsSold = async (account: Account) => {
    if (account.tipo !== 'Bien Raíz') {
      toast.error('Solo las cuentas de tipo "Bien Raíz" pueden marcarse como vendidas');
      return;
    }

    // Calcular el ajuste necesario para que saldoActual sea 0
    // saldoActual = saldoInicial + transacciones
    // Queremos: 0 = nuevoSaldoInicial + transacciones
    // Por lo tanto: nuevoSaldoInicial = -transacciones = -(saldoActual - saldoInicial) = saldoInicial - saldoActual
    const nuevoSaldoInicial = account.saldoInicial - account.saldoActual;

    const updates: Partial<Account> = {
      vendida: true,
      saldoInicial: nuevoSaldoInicial,
    };

    onUpdateAccount(account.id, updates);
    toast.success('Propiedad marcada como vendida. El saldo se ha ajustado a 0.');
  };

  const handleArchivar = (account: Account) => {
    const archivar = !account.archivada;
    onUpdateAccount(account.id, { archivada: archivar });
    if (archivar && account.saldoActual !== 0) {
      toast.success('Cuenta archivada. Tiene saldo: sigue contando en tus totales.');
    } else {
      toast.success(archivar ? 'Cuenta archivada' : 'Cuenta recuperada');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.tipo || !formData.divisa) return;
    const conBanco = !SIN_DATOS_BANCARIOS.includes(formData.tipo);
    const pais = paisBancario(formData.pais);
    if (conBanco) {
      for (const campo of pais.campos) {
        const error = errorCampo(campo, formData[campo], pais);
        if (error) {
          toast.error(error);
          return;
        }
      }
    }
    // Solo se guardan los datos que pide el país; '' borra los que hubiera.
    const dato = (campo: CampoBancario) => {
      if (!conBanco || !pais.campos.includes(campo)) return '';
      return campo === 'clabe' ? limpiarClabe(formData.clabe) : limpiarCodigo(formData[campo]);
    };

    // Preparar datos según el tipo de cuenta
    const accountData: any = {
      nombre: formData.nombre,
      tipo: formData.tipo,
      saldoInicial: formData.saldoInicial,
      divisa: formData.divisa,
      clabe: dato('clabe'),
      // Sin datos bancarios no hay país: se guarda vacío (México por defecto).
      pais: conBanco && pais.codigo !== PAIS_POR_DEFECTO ? pais.codigo : '',
      banco: conBanco ? formData.banco.trim().slice(0, 100) : '',
      numeroCuenta: dato('numeroCuenta'),
      routing: dato('routing'),
      iban: dato('iban'),
      swift: dato('swift'),
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
      vendida: account.vendida || false,
      clabe: account.clabe ? formatearClabe(account.clabe) : '',
      pais: account.pais || PAIS_POR_DEFECTO,
      banco: account.banco || '',
      numeroCuenta: account.numeroCuenta || '',
      routing: account.routing || '',
      iban: account.iban ? formatearCampo('iban', account.iban) : '',
      swift: account.swift || '',
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

  const busquedaCodigo = limpiarCodigo(searchQuery);
  const coincideBusqueda = (account: Account) => {
    const texto = searchQuery.toLowerCase();
    if (account.nombre.toLowerCase().includes(texto)) return true;
    if (account.banco?.toLowerCase().includes(texto)) return true;
    if (!busquedaCodigo) return false;
    return CAMPOS_LISTA.some(c => account[c]?.includes(busquedaCodigo));
  };

  const archivadas = accounts.filter(a => a.archivada).length;

  const filteredAccounts = accounts.filter((account) => {
    if (account.archivada && !verArchivadas) return false;
    if (filterType !== 'all' && account.tipo !== filterType) return false;
    if (filterCurrency !== 'all' && (account.divisa || 'MXN') !== filterCurrency) return false;
    if (filterPositiveBalance && account.saldoActual !== 0) return false;
    if (searchQuery.length >= 3 && !coincideBusqueda(account)) return false;
    return true;
  });

  const sortedAccounts = [...filteredAccounts].sort((a, b) => {
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

  const uniqueTypes = [...new Set(accounts.map(a => a.tipo))].sort();
  const uniqueCurrencies = [...new Set(accounts.map(a => a.divisa || 'MXN'))].sort();

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2 h-9">
          <Checkbox
            id="positive-balance"
            checked={filterPositiveBalance}
            onCheckedChange={(checked) => setFilterPositiveBalance(checked === true)}
          />
          <Label htmlFor="positive-balance" className="text-sm cursor-pointer">Sin Saldo</Label>
        </div>
        <div className="flex items-center gap-2 h-9">
          <Checkbox
            id="ver-archivadas"
            checked={verArchivadas}
            onCheckedChange={(checked) => setVerArchivadas(checked === true)}
          />
          <Label htmlFor="ver-archivadas" className="text-sm cursor-pointer">
            Ver archivadas{archivadas > 0 ? ` (${archivadas})` : ''}
          </Label>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Tipo</Label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {uniqueTypes.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Divisa</Label>
          <Select value={filterCurrency} onValueChange={setFilterCurrency}>
            <SelectTrigger className="w-[120px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {uniqueCurrencies.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 w-[180px]">
          <Label className="text-xs text-muted-foreground">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Mín. 3 letras"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
      </div>

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
              {editingAccount?.vendida && (
                <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    ⚠️ Esta propiedad está marcada como vendida. Los campos están bloqueados.
                  </p>
                </div>
              )}
              <div>
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Nombre de la cuenta"
                  disabled={editingAccount?.vendida}
                  required
                />
              </div>
              <div>
                <Label htmlFor="tipo">Tipo</Label>
                <Select 
                  value={formData.tipo} 
                  onValueChange={(value) => setFormData({ ...formData, tipo: value as AccountType })}
                  disabled={editingAccount?.vendida}
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
                  disabled={editingAccount?.vendida}
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
                  disabled={editingAccount?.vendida}
                />
              </div>

              {formData.tipo && !SIN_DATOS_BANCARIOS.includes(formData.tipo) && (() => {
                const pais = paisBancario(formData.pais);
                return (
                  <div className="space-y-3 rounded-lg border p-3">
                    <p className="text-sm font-medium">Datos bancarios (opcionales)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="pais">País del banco</Label>
                        <Select
                          value={pais.codigo}
                          onValueChange={(value) => setFormData({ ...formData, pais: value })}
                          disabled={editingAccount?.vendida}
                        >
                          <SelectTrigger id="pais">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAISES_BANCARIOS.map(p => (
                              <SelectItem key={p.codigo} value={p.codigo}>{p.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="banco">Banco</Label>
                        <Input
                          id="banco"
                          value={formData.banco}
                          maxLength={100}
                          onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                          placeholder={pais.codigo === 'US' ? 'Ej.: Bank of America' : 'Nombre del banco'}
                          disabled={editingAccount?.vendida}
                        />
                      </div>
                    </div>
                    {pais.campos.map(campo => {
                      const error = errorCampo(campo, formData[campo], pais);
                      return (
                        <div key={campo}>
                          <Label htmlFor={`banco-${campo}`}>{etiquetaCampo(campo, pais)}</Label>
                          <Input
                            id={`banco-${campo}`}
                            inputMode={campo === 'clabe' || (campo === 'routing' && pais.codigo === 'US') ? 'numeric' : 'text'}
                            autoComplete="off"
                            className="font-mono"
                            value={formData[campo]}
                            onChange={(e) => setFormData({ ...formData, [campo]: e.target.value })}
                            onBlur={() => {
                              if (campo === 'clabe') {
                                const limpia = limpiarClabe(formData.clabe);
                                if (limpia.length === 18) setFormData(f => ({ ...f, clabe: formatearClabe(limpia) }));
                              } else if (formData[campo]) {
                                setFormData(f => ({ ...f, [campo]: formatearCampo(campo, limpiarCodigo(f[campo])) }));
                              }
                            }}
                            placeholder={campo === 'routing' && pais.codigo === 'US' ? '9 dígitos' : PLACEHOLDERS[campo]}
                            disabled={editingAccount?.vendida}
                          />
                          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

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
                      <Label htmlFor="saldo_actual">Saldo Actual</Label>
                      <Input
                        id="saldo_actual"
                        type="number"
                        step="0.01"
                        value={editingAccount ? editingAccount.saldoActual : formData.saldoInicial}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Saldo Inicial + Transacciones
                      </p>
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
                {!editingAccount?.vendida && (
                  <Button type="submit">
                    {editingAccount ? 'Actualizar' : 'Crear'}
                  </Button>
                )}
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cuentas ({sortedAccounts.length} de {verArchivadas ? accounts.length : accounts.length - archivadas})</CardTitle>
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
                <TableRow key={account.id} className={account.vendida || account.archivada ? 'opacity-60' : ''}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {account.nombre}
                      {account.vendida && (
                        <Badge variant="outline" className="text-xs">
                          Vendida
                        </Badge>
                      )}
                      {account.archivada && (
                        <Badge variant="outline" className="text-xs">
                          Archivada
                        </Badge>
                      )}
                    </div>
                    {(account.banco || (account.pais && account.pais !== PAIS_POR_DEFECTO)) && (
                      <div className="mt-0.5 text-xs font-normal text-muted-foreground">
                        {[account.banco, account.pais && account.pais !== PAIS_POR_DEFECTO ? paisBancario(account.pais).nombre : null]
                          .filter(Boolean).join(' · ')}
                      </div>
                    )}
                    {CAMPOS_LISTA.filter(c => account[c]).map(campo => {
                      const valor = account[campo]!;
                      const pais = paisBancario(account.pais);
                      const etiqueta = campo === 'routing' && pais.codigo === 'US' ? 'ABA' : ETIQUETAS_CORTAS[campo];
                      return (
                        <button
                          key={campo}
                          type="button"
                          className="mt-0.5 mr-3 inline-flex items-center gap-1 whitespace-nowrap font-mono text-xs font-normal text-muted-foreground hover:text-foreground"
                          title={`Copiar ${etiquetaCampo(campo, pais)}`}
                          onClick={() => copiar(valor, etiquetaCampo(campo, pais))}
                        >
                          {etiqueta} {campo === 'clabe' ? formatearClabe(valor) : formatearCampo(campo, valor)}
                          <Copy className="h-3 w-3" />
                        </button>
                      );
                    })}
                  </TableCell>
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
                    {formatCurrency(
                      account.saldoActual, 
                      account.divisa || 'MXN'
                    )}
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
                      {account.tipo === 'Bien Raíz' && !account.vendida && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleMarkAsSold(account)}
                          title="Marcar como vendida"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleArchivar(account)}
                        title={account.archivada ? 'Sacar del archivo' : 'Archivar (se oculta de la lista)'}
                      >
                        {account.archivada ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled
                        title="Las cuentas no se pueden eliminar para proteger la integridad del sistema"
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