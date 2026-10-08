import { toFechaISO } from '@/lib/finance/fechas';
import { Transaction } from '@/types/finance';
import { montoConSigno, ParsedRow } from './toParsedRows';

const MAX_DIAS = 2;

const diaUTC = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / 86_400_000;
const normalizar = (s: string | undefined) => (s ?? '').trim().replace(/\s+/g, ' ').toUpperCase();

type Fila = Pick<ParsedRow, 'id' | 'fecha' | 'monto' | 'esGasto' | 'esReembolso' | 'descripcion'>;
type Existente = Pick<Transaction, 'id' | 'cuentaId' | 'fecha' | 'monto' | 'comentario'>;

/**
 * Filas del archivo que probablemente ya están en la cuenta: mismo importe con
 * signo y ±2 días. La descripción NO se compara a propósito: un pago capturado a
 * mano ("Pago Mastercard") y su línea del banco ("PAGO AUT TARJ CRED") no se
 * parecen en nada. Pero si el texto SÍ es el del banco (la misma línea ya
 * importada de un estado que se solapa), la fecha también es la misma: con el
 * mismo texto se exige el mismo día, o una caseta diaria de 20.97 taparía a la
 * del día siguiente. Cada movimiento existente cubre a una sola fila, emparejando
 * primero los de fecha más cercana, para que dos cargos iguales del mismo día con
 * uno ya capturado marquen solo uno.
 */
export const posiblesDuplicados = <T extends Existente>(filas: Fila[], existentes: T[], cuentaId: string): Map<string, T> => {
  const deCuenta = existentes.filter(t => t.cuentaId === cuentaId);
  const candidatos: { fila: string; tx: T; dias: number }[] = [];

  for (const f of filas) {
    const monto = montoConSigno(f);
    const dia = diaUTC(toFechaISO(f.fecha));
    const texto = normalizar(f.descripcion);
    for (const t of deCuenta) {
      if (Math.abs(t.monto - monto) >= 0.01) continue;
      const dias = Math.abs(diaUTC(toFechaISO(t.fecha)) - dia);
      const maxDias = texto && normalizar(t.comentario) === texto ? 0 : MAX_DIAS;
      if (dias <= maxDias) candidatos.push({ fila: f.id, tx: t, dias });
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
