import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Trash2 } from 'lucide-react';
import { NotaHuerfana } from '@/lib/finance/familia';

interface Props {
  notas: NotaHuerfana[];
  onBorrar: (n: NotaHuerfana) => void;
}

export const NotasHuerfanas = ({ notas, onBorrar }: Props) => (
  <Card className="border-amber-500/40">
    <CardHeader>
      <CardTitle>Notas sin partida</CardTitle>
      <CardDescription>
        Notas de cuentas, inversiones o pagos que ya no existen. Cópialas donde corresponda o bórralas.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-2">
      {notas.map(n => (
        <div key={`${n.origen}:${n.clave}`} className="flex items-start gap-2 rounded-lg border p-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm">{n.texto}</p>
            <p className="text-xs text-muted-foreground">{n.clave}</p>
          </div>
          <Button variant="ghost" size="icon" title="Copiar" onClick={() => void navigator.clipboard.writeText(n.texto)}><Copy className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" title="Borrar" onClick={() => { if (window.confirm('¿Borrar esta nota?')) onBorrar(n); }}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
    </CardContent>
  </Card>
);
