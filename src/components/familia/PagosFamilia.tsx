import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DecisionPago } from '@/lib/finance/familia';
import { PagoRecurrente } from '@/lib/finance/familiaResumen';

interface Props {
  pagos: PagoRecurrente[];
  onDecision: (clave: string, p: DecisionPago) => void;
  formatCurrency: (n: number) => string;
}

export const PagosFamilia = ({ pagos, onDecision, formatCurrency }: Props) => (
  <Card>
    <CardHeader>
      <CardTitle>Pagos recurrentes</CardTitle>
      <CardDescription>Suscripciones y pagos anuales: qué mantener y qué cancelar.</CardDescription>
    </CardHeader>
    <CardContent>
      {pagos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay suscripciones ni pagos anuales activos.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Concepto</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="w-36">Qué hacer</TableHead>
              <TableHead>Nota</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagos.map(p => (
              <TableRow key={p.clave}>
                <TableCell>
                  <div className="font-medium">{p.concepto}</div>
                  <div className="text-xs text-muted-foreground">{p.frecuencia}</div>
                </TableCell>
                <TableCell className="text-right tabular-nums">${formatCurrency(p.monto)} {p.divisa}</TableCell>
                <TableCell>
                  <Select
                    value={p.decision.decision ?? 'ninguna'}
                    onValueChange={v => onDecision(p.clave, { ...p.decision, decision: v === 'ninguna' ? null : (v as 'mantener' | 'cancelar') })}
                  >
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ninguna">—</SelectItem>
                      <SelectItem value="mantener">Mantener</SelectItem>
                      <SelectItem value="cancelar">Cancelar</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    className="h-8 text-sm"
                    placeholder="Cómo cancelarlo, a nombre de quién…"
                    value={p.decision.nota}
                    onChange={e => onDecision(p.clave, { ...p.decision, nota: e.target.value })}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CardContent>
  </Card>
);
