import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { INVESTMENT_BEHAVIORS, InvestmentBehavior, InvestmentType } from '@/types/investments';
import { useInvestmentTypes } from '@/hooks/useInvestmentTypes';

interface Props {
  usageCount: Record<string, number>;
}

const emptyForm = {
  nombre: '',
  comportamiento: 'valuacion_manual' as InvestmentBehavior,
  permite_reinversion: false,
  requiere_vencimiento: false,
};

export const InvestmentTypesManager = ({ usageCount }: Props) => {
  const { types, createType, updateType, deleteType } = useInvestmentTypes();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InvestmentType | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (t: InvestmentType) => {
    setEditing(t);
    setForm({
      nombre: t.nombre,
      comportamiento: t.comportamiento,
      permite_reinversion: t.permite_reinversion,
      requiere_vencimiento: t.requiere_vencimiento,
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.nombre.trim()) return;
    const ok = editing ? await updateType(editing.id, form) : await createType(form);
    if (ok) setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Tipos de inversión</CardTitle>
          <CardDescription>Define tus propios tipos y cómo se comporta cada uno.</CardDescription>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo tipo
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {types.map((t) => {
          const behavior = INVESTMENT_BEHAVIORS.find((b) => b.value === t.comportamiento);
          const used = usageCount[t.id] || 0;
          return (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{t.nombre}</span>
                  <Badge variant="secondary" className="text-xs">{behavior?.label}</Badge>
                  {t.permite_reinversion && <Badge variant="outline" className="text-xs">Reinversión</Badge>}
                  {t.requiere_vencimiento && <Badge variant="outline" className="text-xs">Con vencimiento</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {behavior?.help} · {used} inversión{used !== 1 ? 'es' : ''}
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={used > 0}
                  title={used > 0 ? 'Tiene inversiones asociadas' : 'Eliminar'}
                  onClick={() => deleteType(t.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
        {types.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">Aún no tienes tipos de inversión.</p>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar tipo' : 'Nuevo tipo de inversión'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej. Fideicomiso Rakennus"
              />
            </div>
            <div>
              <Label>Comportamiento</Label>
              <Select
                value={form.comportamiento}
                onValueChange={(v) => setForm({ ...form, comportamiento: v as InvestmentBehavior })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INVESTMENT_BEHAVIORS.map((b) => (
                    <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {INVESTMENT_BEHAVIORS.find((b) => b.value === form.comportamiento)?.help}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="reinv">Admite reinversión</Label>
              <Switch
                id="reinv"
                checked={form.permite_reinversion}
                onCheckedChange={(v) => setForm({ ...form, permite_reinversion: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="venc">Requiere fecha de vencimiento</Label>
              <Switch
                id="venc"
                checked={form.requiere_vencimiento}
                onCheckedChange={(v) => setForm({ ...form, requiere_vencimiento: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
