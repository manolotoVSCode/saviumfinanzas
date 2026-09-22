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
