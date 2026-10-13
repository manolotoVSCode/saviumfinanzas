import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2 } from 'lucide-react';
import { CxPProvision, ETIQUETA_FRECUENCIA, ProvisionFrecuencia, siguienteFechaProvision } from '@/lib/finance/cxp';
import { formatFechaCorta, parseFechaLocal, toFechaISO } from '@/lib/finance/fechas';
import { formatNumber } from '@/lib/formatters';
import type { NuevaProvision } from '@/hooks/useProvisionesCxP';

const FRECUENCIAS = Object.keys(ETIQUETA_FRECUENCIA) as ProvisionFrecuencia[];

// ---------- Alta / edición ----------
interface ProvisionFormProps {
  initial: CxPProvision | null;
  defaultCurrency: string;
  onCancel: () => void;
  onSave: (data: NuevaProvision) => Promise<void>;
}
export const ProvisionForm = ({ initial, defaultCurrency, onCancel, onSave }: ProvisionFormProps) => {
  const [concepto, setConcepto] = useState(initial?.concepto ?? '');
  const [monto, setMonto] = useState(initial?.monto?.toString() ?? '');
  const [divisa, setDivisa] = useState(initial?.divisa ?? defaultCurrency);
  const [fecha, setFecha] = useState(initial?.fecha ?? toFechaISO(new Date()));
  const [frecuencia, setFrecuencia] = useState<ProvisionFrecuencia>(initial?.frecuencia ?? 'unica');
  const [notas, setNotas] = useState(initial?.notas ?? '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(monto);
    if (!concepto.trim() || !(n > 0) || !fecha) return;
    await onSave({ concepto: concepto.trim(), monto: n, divisa, fecha, frecuencia, notas: notas.trim() || null });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar provisión' : 'Nueva provisión'}</DialogTitle>
          <DialogDescription>
            Aparta dinero para un pago futuro. Suma en el total por pagar, pero no mueve el saldo de ninguna cuenta.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>Concepto</Label>
            <Input value={concepto} onChange={(e) => setConcepto(e.target.value)} required placeholder="Ej: Colegiatura, tenencia, dentista" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Monto</Label>
              <Input type="number" step="0.01" min="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} required />
            </div>
            <div>
              <Label>Divisa</Label>
              <Select value={divisa} onValueChange={setDivisa}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MXN">MXN</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{frecuencia === 'unica' ? 'Fecha de pago' : 'Próximo pago'}</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </div>
            <div>
              <Label>Se repite</Label>
              <Select value={frecuencia} onValueChange={(v) => setFrecuencia(v as ProvisionFrecuencia)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FRECUENCIAS.map((f) => (
                    <SelectItem key={f} value={f}>{f === 'unica' ? 'No (pago único)' : ETIQUETA_FRECUENCIA[f]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Notas (opcional)</Label>
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button type="submit">{initial ? 'Guardar' : 'Añadir provisión'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ---------- Marcar como pagada ----------
interface PayProvisionDialogProps {
  provision: CxPProvision;
  onCancel: () => void;
  onConfirm: (fechaPago: Date) => Promise<void>;
}
export const PayProvisionDialog = ({ provision, onCancel, onConfirm }: PayProvisionDialogProps) => {
  const [fecha, setFecha] = useState(toFechaISO(new Date()));
  const siguiente = siguienteFechaProvision(parseFechaLocal(provision.fecha), provision.frecuencia);

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar como pagada</DialogTitle>
          <DialogDescription>
            Solo cambia la provisión. No se crea ningún movimiento: el pago real llegará al importar tu estado de cuenta.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm p-3 bg-muted rounded">
            <div className="font-medium">{provision.concepto}</div>
            <div className="text-xs text-muted-foreground">
              {formatNumber(provision.monto)} {provision.divisa} · previsto el {formatFechaCorta(parseFechaLocal(provision.fecha))}
            </div>
            {siguiente && (
              <div className="text-xs text-muted-foreground mt-1">
                {ETIQUETA_FRECUENCIA[provision.frecuencia]}: el siguiente pago queda para el {formatFechaCorta(siguiente)}.
              </div>
            )}
          </div>
          <div>
            <Label>Fecha de pago</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={() => fecha && onConfirm(parseFechaLocal(fecha))}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
