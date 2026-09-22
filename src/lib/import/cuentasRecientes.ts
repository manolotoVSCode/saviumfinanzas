const CLAVE = 'savium.import.cuentasRecientes';
const MAXIMO = 3;

const leer = (): string[] => {
  try {
    const raw = localStorage.getItem(CLAVE);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

/** Ids de las últimas cuentas usadas al importar, la más reciente primero. */
export const cuentasRecientes = (idsValidos: string[]): string[] =>
  leer().filter((id) => idsValidos.includes(id)).slice(0, MAXIMO);

/** Registra la cuenta usada; se guarda en el navegador, no en la base de datos. */
export const registrarCuentaReciente = (id: string): void => {
  if (!id) return;
  const siguiente = [id, ...leer().filter((x) => x !== id)].slice(0, MAXIMO);
  try {
    localStorage.setItem(CLAVE, JSON.stringify(siguiente));
  } catch {
    // sin almacenamiento disponible: los atajos duran lo que la sesión
  }
};

/** Recientes primero (en su orden) y el resto detrás, sin alterar el orden original. */
export const ordenarPorRecientes = <T extends { id: string }>(cuentas: T[], recientes: string[]): { recientes: T[]; resto: T[] } => {
  const enRecientes = recientes
    .map((id) => cuentas.find((c) => c.id === id))
    .filter((c): c is T => c !== undefined);
  const ids = new Set(enRecientes.map((c) => c.id));
  return { recientes: enRecientes, resto: cuentas.filter((c) => !ids.has(c.id)) };
};

/**
 * Arranque cuando el navegador no tiene historial (primera vez, otro equipo):
 * las cuentas con MÁS movimientos, que son las que se alimentan de estados de
 * cuenta. Ordenar por fecha del último movimiento no sirve: una cuenta de
 * efectivo con cuatro apuntes a mano se cuela por delante del banco.
 * Empate a movimientos → gana la del movimiento más reciente.
 */
export const cuentasPorActividad = <T extends { id: string }>(
  cuentas: T[],
  transactions: { cuentaId?: string | null; fecha: Date | string }[],
  max: number = MAXIMO,
): string[] => {
  const ultima = new Map<string, number>();
  const cuantas = new Map<string, number>();

  for (const t of transactions) {
    if (!t.cuentaId) continue;
    const ts = t.fecha instanceof Date ? t.fecha.getTime() : new Date(t.fecha).getTime();
    if (!Number.isFinite(ts)) continue;
    cuantas.set(t.cuentaId, (cuantas.get(t.cuentaId) ?? 0) + 1);
    const previa = ultima.get(t.cuentaId);
    if (previa === undefined || ts > previa) ultima.set(t.cuentaId, ts);
  }

  return cuentas
    .filter((c) => ultima.has(c.id))
    .sort((a, b) => ((cuantas.get(b.id) ?? 0) - (cuantas.get(a.id) ?? 0)) || (ultima.get(b.id)! - ultima.get(a.id)!))
    .slice(0, max)
    .map((c) => c.id);
};
