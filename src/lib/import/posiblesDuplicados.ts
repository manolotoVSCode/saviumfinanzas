import { fechaTxISO, toFechaISO } from '@/lib/finance/fechas';
import { Transaction } from '@/types/finance';
import { montoConSigno, ParsedRow } from './toParsedRows';

const MAX_DIAS = 2;

const diaUTC = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / 86_400_000;

type Fila = Pick<ParsedRow, 'id' | 'fecha' | 'monto' | 'esGasto' | 'esReembolso'>;
type Existente = Pick<Transaction, 'id' | 'cuentaId' | 'fecha' | 'monto' | 'comentario'>;

/**
 * Filas del archivo que probablemente ya están en la cuenta: mismo importe con
 * signo y ±2 días. La descripción NO se compara a propósito: un pago capturado a
 * mano ("Pago Mastercard") y su línea del banco ("PAGO AUT TARJ CRED") no se
 * parecen en nada. Cada movimiento existente cubre a una sola fila, emparejando
 * primero los de fecha más cercana, para que dos cargos iguales del mismo día con
 * uno ya capturado marquen solo uno.
 */
export const posiblesDuplicados = <T extends Existente>(filas: Fila[], existentes: T[], cuentaId: string): Map<string, T> => {
  const deCuenta = existentes.filter(t => t.cuentaId === cuentaId);
  const candidatos: { fila: string; tx: T; dias: number }[] = [];

  for (const f of filas) {
    const monto = montoConSigno(f);
    const dia = diaUTC(toFechaISO(f.fecha));
    for (const t of deCuenta) {
      if (Math.abs(t.monto - monto) >= 0.01) continue;
      // Transaction.fecha es medianoche UTC; la fila, medianoche local.
      const dias = Math.abs(diaUTC(fechaTxISO(t.fecha)) - dia);
      if (dias <= MAX_DIAS) candidatos.push({ fila: f.id, tx: t, dias });
    }
  }

  candidatos.sort((a, b) => a.dias - b.dias);
  const resultado = new Map<string, T>();
  const usados = new Set<string>();
  for (const c of candidatos) {
    if (resultado.has(c.fila) || usados.has(c.tx.id)) continue;
    resultado.set(c.fila, c.tx);
    usados.add(c.tx.id);
  }
  return resultado;
};
