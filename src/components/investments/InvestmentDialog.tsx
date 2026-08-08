import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Investment, InvestmentType, PAYOUT_MODES } from '@/types/investments';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  types: InvestmentType[];
  investment: Investment | null;
  onSave: (values: Partial<Investment>, id?: string) => Promise<boolean>;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export const InvestmentDialog = ({ open, onOpenChange, types, investment, onSave }: Props) => {
  const [form, setForm] = useState<Partial<Investment>>({});

  useEffect(() => {
    if (!open) return;
    setForm(
      investment || {
        nombre: '',
        tipo_id: types[0]?.id ?? null,
        monto_invertido: 0,
        valor_actual: 0,
        moneda: 'MXN',
        modalidad_pago: 'Reinversión',
        fecha_inicio: todayISO(),
        activa: true,
      },
    );
  }, [open, investment, types]);

  const selectedType = types.find((t) => t.id === form.tipo_id);
  const behavior = selectedType?.comportamiento ?? 'valuacion_manual';

  const submit = async () => {
    if (!form.nombre?.trim() || !form.tipo_id) return;
    const ok = await onSave({ ...form, tipo: selectedType?.nombre || 'Otros' }, investment?.id);
    if (ok) onOpenChange(false);
  };

  const num = (v: string) => (v === '' ? null : Number(v));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{investment ? 'Editar inversión' : 'Nueva inversión'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nombre</Label>
            <Input value={form.nombre || ''} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>

          <div>
            <Label>Tipo</Label>
            <Select value={form.tipo_id || ''} onValueChange={(v) => setForm({ ...form, tipo_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecciona tipo" /></SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Monto invertido</Label>
              <Input
                type="number"
                value={form.monto_invertido ?? 0}
                onChange={(e) => setForm({ ...form, monto_invertido: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Divisa</Label>
              <Select value={form.moneda || 'MXN'} onValueChange={(v) => setForm({ ...form, moneda: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['MXN', 'USD', 'EUR'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(behavior === 'valuacion_manual' || behavior === 'activo_patrimonial') && (
            <div>
              <Label>{behavior === 'activo_patrimonial' ? 'Valor estimado actual' : 'Valor actual'}</Label>
              <Input
                type="number"
                value={form.valor_actual ?? 0}
                onChange={(e) => setForm({ ...form, valor_actual: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Podrás registrar el valor mes a mes desde el seguimiento.
              </p>
            </div>
          )}


          {behavior === 'interes_fijo' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tasa anual (%)</Label>
                <Input
                  type="number"
                  value={form.tasa_anual ?? ''}
                  onChange={(e) => setForm({ ...form, tasa_anual: num(e.target.value) })}
                />
              </div>
              <div>
                <Label>Rendimiento neto mensual (%)</Label>
                <Input
                  type="number"
                  value={form.rendimiento_neto ?? ''}
                  onChange={(e) => setForm({ ...form, rendimiento_neto: num(e.target.value) })}
                />
              </div>
            </div>
          )}

          {behavior === 'reparto_variable' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Beneficio estimado</Label>
                <Input
                  type="number"
                  value={form.beneficio_estimado ?? ''}
                  onChange={(e) => setForm({ ...form, beneficio_estimado: num(e.target.value) })}
                />
              </div>
              <div>
                <Label>Vencimiento estimado</Label>
                <Input
                  type="date"
                  value={form.fecha_vencimiento || ''}
                  onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Modalidad de pago</Label>
              <Select
                value={form.modalidad_pago || 'Reinversión'}
                onValueChange={(v) => setForm({ ...form, modalidad_pago: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYOUT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha de inicio</Label>
              <Input
                type="date"
                value={form.fecha_inicio || todayISO()}
                onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
              />
            </div>
          </div>

          {selectedType?.requiere_vencimiento && behavior !== 'reparto_variable' && (
            <div>
              <Label>Vencimiento</Label>
              <Input
                type="date"
                value={form.fecha_vencimiento || ''}
                onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })}
              />
            </div>
          )}

          <div>
            <Label>Notas</Label>
            <Textarea value={form.notas || ''} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="activa">Inversión activa</Label>
            <Switch
              id="activa"
              checked={form.activa ?? true}
              onCheckedChange={(v) => setForm({ ...form, activa: v })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
