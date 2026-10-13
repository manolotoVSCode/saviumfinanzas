import React, { useMemo, useState } from 'react';
import { Plus, Edit, Trash2, Bell, BellRing } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useCriptomonedas } from '@/hooks/useCriptomonedas';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { Criptomoneda } from '@/types/crypto';
import { toFechaISO } from '@/lib/finance/fechas';
import { useAlertasCripto } from '@/hooks/useAlertasCripto';
import { nivelConSigno, pctConSigno, PosicionCripto, posicionesCripto, UmbralCripto } from '@/lib/finance/alerts';
import { CurrencyCode } from '@/lib/finance/dashboardMetrics';

const CRIPTOMONEDAS_DISPONIBLES = [
  { simbolo: 'BTC', nombre: 'Bitcoin' },
  { simbolo: 'ETH', nombre: 'Ethereum' },
  { simbolo: 'SHIB', nombre: 'Shiba Inu' },
];

interface CriptoFormProps {
  cripto?: Criptomoneda;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}

const CriptoForm: React.FC<CriptoFormProps> = ({ cripto, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    simbolo: cripto?.simbolo || '',
    nombre: cripto?.nombre || '',
    cantidad: cripto?.cantidad?.toString() || '',
    precio_compra: cripto?.precio_compra?.toString() || '',
    divisa_compra: cripto?.divisa_compra || 'USD',
    fecha_compra: cripto?.fecha_compra || toFechaISO(new Date()),
    notas: cripto?.notas || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await onSave({
        simbolo: formData.simbolo,
        nombre: formData.nombre,
        cantidad: parseFloat(formData.cantidad),
        precio_compra: parseFloat(formData.precio_compra),
        divisa_compra: formData.divisa_compra,
        fecha_compra: formData.fecha_compra,
        notas: formData.notas,
      });
      onClose();
    } catch (error) {
      console.error('Error saving crypto:', error);
    }
  };

  const handleCriptoChange = (simbolo: string) => {
    const cryptoInfo = CRIPTOMONEDAS_DISPONIBLES.find(c => c.simbolo === simbolo);
    if (cryptoInfo) {
      setFormData(prev => ({
        ...prev,
        simbolo: cryptoInfo.simbolo,
        nombre: cryptoInfo.nombre,
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} method="post" className="space-y-4">
      <div>
        <Label htmlFor="simbolo">Criptomoneda</Label>
        <Select 
          value={formData.simbolo} 
          onValueChange={handleCriptoChange}
          disabled={!!cripto}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una criptomoneda" />
          </SelectTrigger>
          <SelectContent>
            {CRIPTOMONEDAS_DISPONIBLES.map((crypto) => (
              <SelectItem key={crypto.simbolo} value={crypto.simbolo}>
                {crypto.simbolo} - {crypto.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="cantidad">Cantidad</Label>
        <Input
          type="number"
          step="0.00000001"
          value={formData.cantidad}
          onChange={(e) => setFormData(prev => ({ ...prev, cantidad: e.target.value }))}
          placeholder="Ej: 0.5"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="precio_compra">Precio de Compra</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.precio_compra}
            onChange={(e) => setFormData(prev => ({ ...prev, precio_compra: e.target.value }))}
            placeholder="Ej: 50000"
            required
          />
        </div>
        <div>
          <Label htmlFor="divisa_compra">Divisa</Label>
          <Select value={formData.divisa_compra} onValueChange={(value) => setFormData(prev => ({ ...prev, divisa_compra: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="EUR">EUR (€)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="fecha_compra">Fecha de Compra</Label>
        <Input
          type="date"
          value={formData.fecha_compra}
          onChange={(e) => setFormData(prev => ({ ...prev, fecha_compra: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="notas">Notas (opcional)</Label>
        <Textarea
          value={formData.notas}
          onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
          placeholder="Notas adicionales sobre esta compra..."
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1">
          {cripto ? 'Actualizar' : 'Agregar'} Criptomoneda
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </form>
  );
};

/** '' → sin aviso; si no, un % con signo mayor que −100 (por debajo no se puede perder más). */
const leerNivel = (texto: string): number | null | undefined => {
  if (texto.trim() === '') return null;
  const n = Number(texto.replace('−', '-'));
  return Number.isFinite(n) && n > -100 ? n : undefined;
};

interface AlertaCriptoFormProps {
  simbolo: string;
  umbral?: UmbralCripto;
  posicion?: PosicionCripto;
  onSave: (umbral: UmbralCripto) => Promise<void>;
  onClose: () => void;
}

const AlertaCriptoForm: React.FC<AlertaCriptoFormProps> = ({ simbolo, umbral, posicion, onSave, onClose }) => {
  const [arriba, setArriba] = useState(umbral?.nivel_arriba?.toString() ?? '');
  const [abajo, setAbajo] = useState(umbral?.nivel_abajo?.toString() ?? '');
  const nivelArriba = leerNivel(arriba);
  const nivelAbajo = leerNivel(abajo);
  const error = nivelArriba === undefined || nivelAbajo === undefined
    ? 'Escribe un porcentaje mayor que −100 (con el signo menos si es pérdida).'
    : nivelArriba !== null && nivelAbajo !== null && nivelAbajo >= nivelArriba
      ? 'El nivel de abajo tiene que ser menor que el de arriba.'
      : null;

  const guardar = async (u: UmbralCripto) => {
    try {
      await onSave(u);
      onClose();
    } catch {
      // el hook ya avisa con un toast
    }
  };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (!error) guardar({ simbolo, nivel_arriba: nivelArriba!, nivel_abajo: nivelAbajo! }); }}
      className="space-y-4"
    >
      <p className="text-sm text-muted-foreground">
        Escribe el % que quieres vigilar, con su signo, igual que el que ves en la tarjeta. Se calcula con
        todas tus compras de {simbolo} juntas, sobre lo que pagaste
        {posicion && <> (hoy vas <span className={posicion.pct >= 0 ? 'text-success font-medium' : 'text-destructive font-medium'}>{pctConSigno(posicion.pct, 1)}</span>)</>}.
        La alerta aparece en Alertas y en la app del iPhone.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="nivel_arriba">Avisar si llega a o supera (%)</Label>
          <Input id="nivel_arriba" type="number" inputMode="decimal" step="any" placeholder="Ej: -20 o 50"
            value={arriba} onChange={(e) => setArriba(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="nivel_abajo">Avisar si cae a o por debajo de (%)</Label>
          <Input id="nivel_abajo" type="number" inputMode="decimal" step="any" placeholder="Ej: -95"
            value={abajo} onChange={(e) => setAbajo(e.target.value)} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Deja un campo vacío para no avisar en ese sentido. Si descartas una alerta, vuelve a avisar cuando cambies su porcentaje.</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1" disabled={!!error}>Guardar alerta</Button>
        {umbral && (
          <Button type="button" variant="outline" onClick={() => guardar({ simbolo, nivel_arriba: null, nivel_abajo: null })}>Quitar</Button>
        )}
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
      </div>
    </form>
  );
};

const describirUmbral = (u: UmbralCripto) =>
  [u.nivel_arriba !== null && `≥ ${nivelConSigno(u.nivel_arriba)}`, u.nivel_abajo !== null && `≤ ${nivelConSigno(u.nivel_abajo)}`].filter(Boolean).join(' · ');

const CriptomonedasManager: React.FC = () => {
  const { criptomonedas, precios, loading, addCriptomoneda, updateCriptomoneda, deleteCriptomoneda } = useCriptomonedas();
  const { formatCurrency } = useAppConfig();
  const { convertCurrency } = useExchangeRates();
  const { umbrales, guardar: guardarUmbral } = useAlertasCripto();
  const [alertaDe, setAlertaDe] = useState<string | undefined>();
  const umbralPorSimbolo = useMemo(() => new Map(umbrales.map(u => [u.simbolo, u])), [umbrales]);
  const posiciones = useMemo(
    () => posicionesCripto(
      criptomonedas,
      Object.fromEntries(Object.entries(precios).map(([s, p]) => [s, p.price])),
      (importe, divisa) => convertCurrency(importe, divisa as CurrencyCode, 'USD'),
    ),
    [criptomonedas, precios, convertCurrency]
  );

  // Función para formatear con decimales usando el formato estándar (coma miles, punto decimales)
  const formatWithDecimals = (amount: number, decimals: number = 2): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  };

  // Función específica para formatear precios de criptomonedas (más decimales para números muy pequeños)
  const formatCryptoPrice = (amount: number): string => {
    if (amount === 0) return '0.00';
    if (amount < 0.01) {
      // Para precios muy pequeños, usar hasta 8 decimales
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
      }).format(amount);
    }
    // Para precios normales, usar 2 decimales
    return formatWithDecimals(amount, 2);
  };
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCripto, setEditingCripto] = useState<Criptomoneda | undefined>();

  const handleAddCripto = async (data: any) => {
    await addCriptomoneda(data);
    setDialogOpen(false);
  };

  const handleEditCripto = async (data: any) => {
    if (editingCripto) {
      await updateCriptomoneda(editingCripto.id, data);
      setEditingCripto(undefined);
    }
  };

  const handleDeleteCripto = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta criptomoneda?')) {
      await deleteCriptomoneda(id);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  const totalInvertidoUSD = criptomonedas.reduce((sum, cripto) => 
    sum + (cripto.valor_compra_usd || 0), 0
  );

  const totalActualUSD = criptomonedas.reduce((sum, cripto) => 
    sum + (cripto.valor_actual_usd || 0), 0
  );

  const gananciaTotalUSD = totalActualUSD - totalInvertidoUSD;
  const gananciaTotalPorcentaje = totalInvertidoUSD > 0 ? (gananciaTotalUSD / totalInvertidoUSD) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <CardTitle className="flex items-center gap-2">
            Criptomonedas
            <Badge variant="secondary">{criptomonedas.length}</Badge>
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Cripto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Agregar Criptomoneda</DialogTitle>
              </DialogHeader>
              <CriptoForm
                onSave={handleAddCripto}
                onClose={() => setDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {criptomonedas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-4">💰</div>
            <p>No tienes criptomonedas registradas</p>
            <p className="text-sm">Agrega tu primera criptomoneda para comenzar el seguimiento</p>
          </div>
        ) : (
          <>
            {/* Lista de Criptomonedas */}
            <div className="space-y-3">
              {criptomonedas.map((cripto) => (
                <div key={cripto.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold">{cripto.simbolo} - {cripto.nombre}</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatWithDecimals(cripto.cantidad, 2)} {cripto.simbolo}
                      </p>
                      {umbralPorSimbolo.has(cripto.simbolo) && (
                        <p className="text-xs text-primary flex items-center gap-1 mt-0.5">
                          <BellRing className="h-3 w-3" /> Alerta {describirUmbral(umbralPorSimbolo.get(cripto.simbolo)!)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Dialog open={alertaDe === cripto.id} onOpenChange={(open) => setAlertaDe(open ? cripto.id : undefined)}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" title={`Alerta de ${cripto.simbolo}`}>
                            {umbralPorSimbolo.has(cripto.simbolo) ? <BellRing className="h-4 w-4 text-primary" /> : <Bell className="h-4 w-4" />}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Alerta de {cripto.simbolo}</DialogTitle>
                          </DialogHeader>
                          <AlertaCriptoForm
                            simbolo={cripto.simbolo}
                            umbral={umbralPorSimbolo.get(cripto.simbolo)}
                            posicion={posiciones.get(cripto.simbolo)}
                            onSave={guardarUmbral}
                            onClose={() => setAlertaDe(undefined)}
                          />
                        </DialogContent>
                      </Dialog>
                      <Dialog open={editingCripto?.id === cripto.id} onOpenChange={(open) => !open && setEditingCripto(undefined)}>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setEditingCripto(cripto)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Editar Criptomoneda</DialogTitle>
                          </DialogHeader>
                          <CriptoForm
                            cripto={cripto}
                            onSave={handleEditCripto}
                            onClose={() => setEditingCripto(undefined)}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeleteCripto(cripto.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Precio Compra</p>
                      <p className="font-medium">
                        {formatCryptoPrice(cripto.precio_compra)} {cripto.divisa_compra}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Precio Actual</p>
                      <p className="font-medium">
                        {cripto.precio_actual_usd ? (
                          cripto.divisa_compra === 'EUR' ? 
                            `${formatCryptoPrice(convertCurrency(cripto.precio_actual_usd, 'USD', 'EUR'))} EUR` :
                            `${formatCryptoPrice(cripto.precio_actual_usd)} USD`
                        ) : 'Cargando...'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Valor Compra</p>
                      <p className="font-medium">
                        {cripto.divisa_compra === 'EUR' ? 
                          `${formatWithDecimals(cripto.cantidad * cripto.precio_compra)} EUR` :
                          `${formatWithDecimals(cripto.cantidad * cripto.precio_compra)} USD`
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Valor Actual</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {cripto.precio_actual_usd ? (
                            cripto.divisa_compra === 'EUR' ? 
                              `${formatWithDecimals(cripto.cantidad * convertCurrency(cripto.precio_actual_usd, 'USD', 'EUR'))} EUR` :
                              `${formatWithDecimals(cripto.cantidad * cripto.precio_actual_usd)} USD`
                          ) : 'Cargando...'}
                        </p>
                        {cripto.ganancia_perdida_porcentaje !== undefined && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            cripto.ganancia_perdida_porcentaje >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {formatWithDecimals(cripto.ganancia_perdida_porcentaje)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CriptomonedasManager;