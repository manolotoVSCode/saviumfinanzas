import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { Investment, InvestmentPayout, InvestmentValuation } from '@/types/investments';
import { formatNumber } from '@/lib/formatters';
import {
  CartesianGrid,
  Line,
  LineChart as RLineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  investment: Investment | null;
  valuations: InvestmentValuation[];
  payouts: InvestmentPayout[];
  onAddValuation: (
    id: string,
    v: { fecha: string; valor: number; aportacion?: number; retiro?: number; notas?: string },
  ) => Promise<boolean>;
  onDeleteValuation: (id: string) => Promise<boolean>;
  onAddPayout: (
    id: string,
    v: { fecha: string; monto: number; divisa: string; reinvertido?: boolean; notas?: string },
  ) => Promise<boolean>;
  onDeletePayout: (id: string) => Promise<boolean>;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX');
};

export const InvestmentTrackingDialog = ({
  open,
  onOpenChange,
  investment,
  valuations,
  payouts,
  onAddValuation,
  onDeleteValuation,
  onAddPayout,
  onDeletePayout,
}: Props) => {
  const [valForm, setValForm] = useState({ fecha: todayISO(), valor: '', aportacion: '', retiro: '' });
  const [payForm, setPayForm] = useState({ fecha: todayISO(), monto: '' });

  if (!investment) return null;

  const invValuations = valuations
    .filter((v) => v.inversion_id === investment.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const invPayouts = payouts.filter((p) => p.inversion_id === investment.id);

  const submitValuation = async () => {
    if (!valForm.valor) return;
    const ok = await onAddValuation(investment.id, {
      fecha: valForm.fecha,
      valor: Number(valForm.valor),
      aportacion: Number(valForm.aportacion || 0),
      retiro: Number(valForm.retiro || 0),
    });
    if (ok) setValForm({ fecha: todayISO(), valor: '', aportacion: '', retiro: '' });
  };

  const submitPayout = async () => {
    if (!payForm.monto) return;
    const ok = await onAddPayout(investment.id, {
      fecha: payForm.fecha,
      monto: Number(payForm.monto),
      divisa: investment.moneda,
    });
    if (ok) setPayForm({ fecha: todayISO(), monto: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="truncate">Seguimiento · {investment.nombre}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="valuaciones">
          <TabsList>
            <TabsTrigger value="valuaciones">Valuaciones</TabsTrigger>
            <TabsTrigger value="cobros">Cobros</TabsTrigger>
          </TabsList>

          <TabsContent value="valuaciones" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
              <div>
                <Label className="text-xs">Fecha</Label>
                <Input type="date" value={valForm.fecha} onChange={(e) => setValForm({ ...valForm, fecha: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Valor</Label>
                <Input type="number" value={valForm.valor} onChange={(e) => setValForm({ ...valForm, valor: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Aportación</Label>
                <Input type="number" value={valForm.aportacion} onChange={(e) => setValForm({ ...valForm, aportacion: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Retiro</Label>
                <Input type="number" value={valForm.retiro} onChange={(e) => setValForm({ ...valForm, retiro: e.target.value })} />
              </div>
            </div>
            <Button size="sm" onClick={submitValuation}>Registrar valuación</Button>

            {invValuations.length > 1 && (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RLineChart data={[...invValuations].reverse().map((v) => ({ fecha: fmtDate(v.fecha), valor: v.valor }))}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="fecha" fontSize={11} />
                    <YAxis fontSize={11} tickFormatter={(v: number) => formatNumber(v)} width={80} />
                    <RTooltip formatter={(v: number) => [`${investment.moneda} ${formatNumber(v)}`, 'Valor']} />
                    <Line type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2} dot />
                  </RLineChart>
                </ResponsiveContainer>
              </div>
            )}


            <div className="space-y-2">
              {invValuations.map((v, idx) => {
                const prev = invValuations[idx + 1];
                const flujo = (v.aportacion || 0) - (v.retiro || 0);
                const delta = prev ? v.valor - prev.valor - flujo : 0;
                const pct = prev && prev.valor !== 0 ? (delta / prev.valor) * 100 : 0;
                return (
                  <div key={v.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium">{fmtDate(v.fecha)}</div>
                      {(v.aportacion > 0 || v.retiro > 0) && (
                        <div className="text-xs text-muted-foreground">
                          {v.aportacion > 0 && `+${formatNumber(v.aportacion)} aportación `}
                          {v.retiro > 0 && `-${formatNumber(v.retiro)} retiro`}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{investment.moneda} {formatNumber(v.valor)}</div>
                      {prev && (
                        <div className={`text-xs flex items-center justify-end gap-1 ${delta >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                          {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {delta >= 0 ? '+' : '-'}{formatNumber(Math.abs(delta))} ({pct.toFixed(2)}%)
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => onDeleteValuation(v.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
              {invValuations.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Sin valuaciones registradas.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="cobros" className="space-y-4">
            <div className="grid grid-cols-2 gap-2 items-end">
              <div>
                <Label className="text-xs">Fecha</Label>
                <Input type="date" value={payForm.fecha} onChange={(e) => setPayForm({ ...payForm, fecha: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Monto cobrado</Label>
                <Input type="number" value={payForm.monto} onChange={(e) => setPayForm({ ...payForm, monto: e.target.value })} />
              </div>
            </div>
            <Button size="sm" onClick={submitPayout}>Registrar cobro</Button>

            <div className="space-y-2">
              {invPayouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                  <span>{fmtDate(p.fecha)}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{p.divisa}</Badge>
                    <span className="font-semibold">{formatNumber(p.monto)}</span>
                    <Button variant="ghost" size="icon" onClick={() => onDeletePayout(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {invPayouts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Sin cobros registrados.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
