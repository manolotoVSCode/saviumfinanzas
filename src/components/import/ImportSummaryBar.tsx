import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ParseMeta, SkippedRow, SkipReason } from '@/lib/import/bankStatementParser';
import { esEntrada, ParsedRow } from '@/lib/import/toParsedRows';

const MOTIVO: Record<SkipReason, string> = {
  sin_fecha: 'Sin fecha válida',
  monto_cero: 'Importe 0 o vacío',
  monto_invalido: 'Importe no numérico',
};

const formatMoney = (amount: number) =>
  new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

interface Props {
  rows: ParsedRow[];
  skipped: SkippedRow[];
  meta: ParseMeta | null;
  currency: string;
  importing: boolean;
  selectedCount: number;
  onBack: () => void;
  onImport: () => void;
}

/** Pie del preview: totales de las filas incluidas, descartadas con motivo, cómo se leyó el archivo, Importar. */
export const ImportSummaryBar = ({ rows, skipped, meta, currency, importing, selectedCount, onBack, onImport }: Props) => {
  const [showSkipped, setShowSkipped] = useState(false);

  const totales = useMemo(() => {
    const incluidas = rows.filter(r => r.incluir);
    const gastos = incluidas.filter(r => !esEntrada(r));
    const ingresos = incluidas.filter(esEntrada);
    return {
      nGastos: gastos.length,
      gastos: gastos.reduce((s, r) => s + r.monto, 0),
      nIngresos: ingresos.length,
      ingresos: ingresos.reduce((s, r) => s + r.monto, 0),
    };
  }, [rows]);

  const lectura = meta
    ? [meta.encoding === 'windows-1252' ? 'Archivo leído como Latin-1' : null, meta.delimiter && meta.delimiter !== ',' ? `separador "${meta.delimiter === '\t' ? 'tab' : meta.delimiter}"` : null]
        .filter(Boolean).join(' · ')
    : '';

  return (
    <div className="space-y-2 pt-3 border-t">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{totales.nGastos} gasto{totales.nGastos !== 1 ? 's' : ''} · <span className="text-destructive font-medium">-{formatMoney(totales.gastos)} {currency}</span></span>
        <span>{totales.nIngresos} ingreso{totales.nIngresos !== 1 ? 's' : ''} · <span className="text-green-600 font-medium">+{formatMoney(totales.ingresos)} {currency}</span></span>
        {lectura && <span>{lectura}</span>}
      </div>

      {skipped.length > 0 && (
        <Collapsible open={showSkipped} onOpenChange={setShowSkipped}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground">
              {showSkipped ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
              {skipped.length} fila{skipped.length !== 1 ? 's' : ''} descartada{skipped.length !== 1 ? 's' : ''}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="max-h-32 overflow-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs px-2 w-14">Fila</TableHead>
                    <TableHead className="text-xs px-2 w-40">Motivo</TableHead>
                    <TableHead className="text-xs px-2">Contenido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skipped.map(s => (
                    <TableRow key={s.sourceRow}>
                      <TableCell className="text-xs px-2">{s.sourceRow + 1}</TableCell>
                      <TableCell className="text-xs px-2">{MOTIVO[s.reason]}</TableCell>
                      <TableCell className="text-xs px-2 truncate max-w-[420px]" title={s.cells.join(' | ')}>{s.cells.join(' | ')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" onClick={onBack}>Atrás</Button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{selectedCount} de {rows.length} a importar</span>
          <Button size="sm" onClick={onImport} disabled={importing || selectedCount === 0}>
            {importing ? 'Importando...' : 'Importar'}
          </Button>
        </div>
      </div>
    </div>
  );
};
