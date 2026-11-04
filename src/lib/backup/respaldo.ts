/**
 * Copia de seguridad completa de los datos de una cuenta, en JSON.
 *
 * Las tablas van de padres a hijas para poder restaurar respetando las claves ajenas.
 * Restaurar solo inserta o actualiza por clave primaria: nunca borra lo que no esté en el archivo.
 * Fuera a propósito: credenciales y datos técnicos (ver TABLAS_EXCLUIDAS).
 */
export type Fila = Record<string, unknown>;

export const TABLAS_RESPALDO = [
  { nombre: 'profiles', clave: 'id' },
  { nombre: 'categorias', clave: 'id' },
  { nombre: 'cuentas', clave: 'id' },
  { nombre: 'investment_types', clave: 'id' },
  { nombre: 'inversiones', clave: 'id' },
  { nombre: 'investment_valuations', clave: 'id' },
  { nombre: 'investment_payouts', clave: 'id' },
  { nombre: 'criptomonedas', clave: 'id' },
  { nombre: 'alertas_cripto', clave: 'id' },
  { nombre: 'classification_rules', clave: 'id' },
  { nombre: 'subscription_services', clave: 'id' },
  { nombre: 'transacciones', clave: 'id' },
  { nombre: 'transaction_pendings', clave: 'id' },
  { nombre: 'provisiones_cxp', clave: 'id' },
  { nombre: 'payment_skips', clave: 'id' },
  { nombre: 'alert_dismissals', clave: 'id' },
  { nombre: 'contactos_alerta', clave: 'id' },
  { nombre: 'informacion_familia', clave: 'user_id' },
] as const;

/** Tablas con datos que no deben viajar en un archivo sin cifrar o que no son de la cuenta. */
export const TABLAS_EXCLUIDAS = ['codigos_emergencia', 'keepalive_pings', 'lectores'] as const;

export const FORMATO_RESPALDO = 'savium-respaldo';
export const VERSION_RESPALDO = 1;
const TAM_PAGINA = 1000;
const TAM_LOTE = 500;

export interface Respaldo {
  formato: typeof FORMATO_RESPALDO;
  version: number;
  creado: string;
  userId: string;
  tablas: Record<string, Fila[]>;
}

export type LeerPagina = (tabla: string, clave: string, desde: number, hasta: number) => Promise<Fila[]>;
export type EscribirLote = (tabla: string, clave: string, filas: Fila[]) => Promise<void>;

export interface ResumenTabla { tabla: string; filas: number }

/** Lee todas las páginas de cada tabla. Cualquier error aborta: una copia parcial es peor que ninguna. */
export const crearRespaldo = async (leer: LeerPagina, userId: string, ahora = new Date()): Promise<Respaldo> => {
  const tablas: Record<string, Fila[]> = {};
  for (const { nombre, clave } of TABLAS_RESPALDO) {
    const filas: Fila[] = [];
    for (let desde = 0; ; desde += TAM_PAGINA) {
      let pagina: Fila[];
      try {
        pagina = await leer(nombre, clave, desde, desde + TAM_PAGINA - 1);
      } catch (e) {
        throw new Error(`No se pudo leer ${nombre}: ${e instanceof Error ? e.message : String(e)}`);
      }
      filas.push(...pagina);
      if (pagina.length < TAM_PAGINA) break;
    }
    tablas[nombre] = filas;
  }
  return { formato: FORMATO_RESPALDO, version: VERSION_RESPALDO, creado: ahora.toISOString(), userId, tablas };
};

export const resumirRespaldo = (r: Pick<Respaldo, 'tablas'>): ResumenTabla[] =>
  TABLAS_RESPALDO
    .map(({ nombre }) => ({ tabla: nombre, filas: r.tablas[nombre]?.length ?? 0 }))
    .filter(t => t.filas > 0);

/** Comprueba que el archivo es una copia de esta cuenta antes de ofrecer restaurarla. */
export const validarRespaldo = (
  datos: unknown,
  userId: string,
): { ok: true; respaldo: Respaldo } | { ok: false; motivo: string } => {
  const r = datos as Partial<Respaldo> | null;
  if (!r || typeof r !== 'object' || r.formato !== FORMATO_RESPALDO || !r.tablas || typeof r.tablas !== 'object') {
    return { ok: false, motivo: 'El archivo no es una copia de seguridad de Savium.' };
  }
  if (r.version !== VERSION_RESPALDO) return { ok: false, motivo: 'La versión de la copia no es compatible.' };
  if (r.userId !== userId) return { ok: false, motivo: 'La copia pertenece a otra cuenta.' };

  const conocidas = new Set<string>(TABLAS_RESPALDO.map(t => t.nombre));
  for (const [tabla, filas] of Object.entries(r.tablas)) {
    if (!conocidas.has(tabla)) return { ok: false, motivo: `La copia trae una tabla desconocida: ${tabla}.` };
    if (!Array.isArray(filas)) return { ok: false, motivo: `La tabla ${tabla} no es válida.` };
    if (filas.some(f => (f as Fila)?.user_id !== userId)) {
      return { ok: false, motivo: `La tabla ${tabla} contiene filas de otra cuenta.` };
    }
  }
  return { ok: true, respaldo: r as Respaldo };
};

/** Escribe de padres a hijas y se detiene en el primer error, indicando qué tabla falló. */
export const restaurarRespaldo = async (respaldo: Respaldo, escribir: EscribirLote): Promise<ResumenTabla[]> => {
  const hechas: ResumenTabla[] = [];
  for (const { nombre, clave } of TABLAS_RESPALDO) {
    const filas = respaldo.tablas[nombre] ?? [];
    for (let i = 0; i < filas.length; i += TAM_LOTE) {
      try {
        await escribir(nombre, clave, filas.slice(i, i + TAM_LOTE));
      } catch (e) {
        throw new Error(`Restauración detenida en ${nombre}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (filas.length > 0) hechas.push({ tabla: nombre, filas: filas.length });
  }
  return hechas;
};
