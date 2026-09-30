import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KeyRound } from 'lucide-react';
import { GrupoInversiones, PartidaCripto, ResumenPatrimonio } from '@/lib/finance/familiaResumen';

interface Props {
  resumen: ResumenPatrimonio;
  inversiones: GrupoInversiones[];
  cripto: PartidaCripto[];
  notas: Record<string, string>;
  /** Sin callback (información sin cargar) las notas se muestran solo lectura. */
  onNota?: (clave: string, texto: string) => void;
  currency: string;
  formatCurrency: (n: number) => string;
}

export const PatrimonioFamilia = ({ resumen, inversiones, cripto, notas, onNota, currency, formatCurrency }: Props) => {
  const nota = (clave: string) =>
    onNota ? (
      <Input
        className="h-8 text-sm mt-1"
        placeholder="Nota para la familia (beneficiario, a quién llamar…)"
        value={notas[clave] ?? ''}
        onChange={e => onNota(clave, e.target.value)}
      />
    ) : notas[clave] ? <p className="text-sm mt-1">{notas[clave]}</p> : null;
  const mes = resumen.ultimoMesCompleto.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const importe = (n: number, divisa: string) => `$${formatCurrency(n)} ${divisa}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Patrimonio</CardTitle>
        <CardDescription>Saldos según lo importado. Último mes completo: {mes}. Se calcula solo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div><p className="text-xs text-muted-foreground">Activos</p><p className="font-semibold tabular-nums">{importe(resumen.activos, currency)}</p></div>
          <div><p className="text-xs text-muted-foreground">Deudas</p><p className="font-semibold tabular-nums text-destructive">{importe(resumen.pasivos, currency)}</p></div>
          <div><p className="text-xs text-muted-foreground">Patrimonio neto</p><p className="font-bold tabular-nums">{importe(resumen.patrimonio, currency)}</p></div>
        </div>

        {resumen.grupos.map(g => (
          <div key={g.id} className="space-y-2">
            <div className="flex items-baseline justify-between border-b pb-1">
              <h3 className="font-semibold">{g.titulo}</h3>
              <span className="text-sm tabular-nums">{importe(g.subtotal, currency)}</span>
            </div>
            {g.partidas.map(p => (
              <div key={p.clave}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate">{p.nombre}</span>
                  <span className="text-sm tabular-nums shrink-0">
                    {p.sinDeuda ? <Badge variant="outline">sin deuda</Badge> : importe(p.saldo, p.divisa)}
                    {!p.sinDeuda && p.divisa !== currency && <span className="text-muted-foreground"> ≈ {importe(p.saldoConvertido, currency)}</span>}
                  </span>
                </div>
                {nota(p.clave)}
              </div>
            ))}
          </div>
        ))}

        {inversiones.length > 0 && (
          <div className="space-y-3">
            <div className="border-b pb-1">
              <h3 className="font-semibold">Detalle de inversiones</h3>
              <p className="text-xs text-muted-foreground">Informativo: no suma al patrimonio (ya está en las cuentas).</p>
            </div>
            {inversiones.map(g => (
              <div key={g.tipo} className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{g.tipo}</p>
                {g.partidas.map(p => (
                  <div key={p.clave}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate">{p.nombre}</span>
                      <span className="text-sm tabular-nums shrink-0">{importe(p.valor, p.moneda)}</span>
                    </div>
                    {(p.vencimiento || p.tasaAnual !== null) && (
                      <p className="text-xs text-muted-foreground">
                        {p.vencimiento && `Vence ${p.vencimiento}`}{p.vencimiento && p.tasaAnual !== null && ' · '}{p.tasaAnual !== null && `${p.tasaAnual}% anual`}
                      </p>
                    )}
                    {nota(p.clave)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {cripto.length > 0 && (
          <div className="space-y-2">
            <div className="border-b pb-1">
              <h3 className="font-semibold">Criptomonedas</h3>
              <p className="text-xs text-muted-foreground">En USD. Informativo: no suma al patrimonio.</p>
            </div>
            <Alert>
              <KeyRound className="h-4 w-4" />
              <AlertDescription>Indica dónde están las llaves o el acceso al exchange, nunca la frase semilla.</AlertDescription>
            </Alert>
            {cripto.map(c => (
              <div key={c.clave}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate">{c.nombre} <span className="text-muted-foreground text-sm">{c.cantidad} {c.simbolo}</span></span>
                  <span className="text-sm tabular-nums shrink-0">
                    {importe(c.valorUsd, 'USD')}{c.aPrecioDeCompra && <span className="text-muted-foreground"> (precio de compra)</span>}
                  </span>
                </div>
                {nota(c.clave)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
