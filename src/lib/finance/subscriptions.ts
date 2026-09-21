import { Category, Transaction } from '@/types/finance';
import type { Database } from '@/integrations/supabase/types';
import { fechaTxISO, parseFechaLocal, toFechaISO } from './fechas';
import { matchTransactionToPattern, SUBSCRIPTION_PATTERNS } from './subscriptionPatterns';

/** Valores admitidos por el CHECK de subscription_services.frecuencia (migración 20260809033858). Única definición. */
export type SubscriptionFrequency = 'Semanal' | 'Mensual' | 'Bimestral' | 'Trimestral' | 'Semestral' | 'Anual' | 'Irregular';

type Tabla = Database['public']['Tables']['subscription_services'];
export type SubscriptionRow = Tabla['Row'];
/** Fila a insertar; el hook añade user_id. */
export type SubscriptionInsert = Omit<Tabla['Insert'], 'user_id'>;
export interface SubscriptionUpdate { id: string; data: Tabla['Update'] }

/** Alias definidos por el usuario (fusiones manuales previas): canon_key → nombre/tipo/aliases. */
export interface AliasEntry { canonKey: string; serviceName: string; tipoServicio: string; aliases: string[] }

export interface DetectedSubscription {
  canonKey: string;
  serviceName: string;
  tipoServicio: string;
  /** `fecha` es Transaction.fecha (medianoche UTC): se escribe con fechaTxISO. */
  ultimoPago: { monto: number; fecha: Date };
  frecuencia: SubscriptionFrequency;
  /** Fecha local: se escribe con toFechaISO. */
  proximoPago: Date;
  numeroPagos: number;
  originalComments: string[];
}

const DIA_MS = 86_400_000;
/** Dos cargos a ≤ 15 días son del mismo ciclo (cambio de plan, cargo doble). */
export const DIAS_MISMO_CICLO = 15;
/** Meses hacia atrás que se analizan. */
const MESES_ANALIZADOS = 24;

const diasEntre = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DIA_MS);

/** Transaction.fecha es medianoche UTC; para sumar meses en local hay que pasarla a medianoche local. */
const utcALocal = (d: Date): Date => parseFechaLocal(fechaTxISO(d));

/** 1) alias del usuario, 2) patrones embebidos, 3) nombre limpio + clave `custom-…`. */
export const resolveServiceName = (
  comentario: string,
  monto: number,
  aliases: AliasEntry[] = [],
): { serviceName: string; tipoServicio: string; canonKey: string } => {
  const lower = comentario.toLowerCase();
  for (const entry of aliases) {
    for (const alias of entry.aliases) {
      const a = (alias || '').toLowerCase().trim();
      if (a && lower.includes(a)) {
        return { serviceName: entry.serviceName, tipoServicio: entry.tipoServicio, canonKey: entry.canonKey };
      }
    }
  }
  for (const pattern of SUBSCRIPTION_PATTERNS) {
    if (matchTransactionToPattern(comentario, monto, pattern)) {
      return { serviceName: pattern.serviceName, tipoServicio: pattern.tipoServicio, canonKey: pattern.id };
    }
  }
  const cleanName = comentario.replace(/[*#\d]/g, '').trim().split(/\s+/).slice(0, 3).join(' ') || comentario.substring(0, 20);
  const canonKey = `custom-${comentario.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20)}`;
  return { serviceName: cleanName, tipoServicio: 'Suscripción', canonKey };
};

/** Ordena por fecha y agrupa en ciclos: un elemento a ≤ 15 días del anterior cae en el mismo ciclo. */
export const agruparCiclos = <T,>(items: T[], fecha: (item: T) => Date): T[][] => {
  const orden = [...items].sort((a, b) => fecha(a).getTime() - fecha(b).getTime());
  const ciclos: T[][] = [];
  for (const it of orden) {
    const actual = ciclos[ciclos.length - 1];
    if (actual && diasEntre(fecha(actual[actual.length - 1]), fecha(it)) <= DIAS_MISMO_CICLO) actual.push(it);
    else ciclos.push([it]);
  }
  return ciclos;
};

const frecuenciaPorMediana = (dias: number): SubscriptionFrequency => {
  if (dias >= 20 && dias <= 45) return 'Mensual';
  if (dias >= 46 && dias <= 75) return 'Bimestral';
  if (dias >= 76 && dias <= 120) return 'Trimestral';
  if (dias >= 150 && dias <= 220) return 'Semestral';
  if (dias >= 300 && dias <= 400) return 'Anual';
  return 'Irregular';
};

/**
 * Frecuencia por la MEDIANA de los gaps entre el último cargo de cada ciclo y el
 * del siguiente (la media se rompía con un cargo de cambio de plan a 9 días).
 * `Semanal` no se detecta (el colapso de ciclo lo impide): queda como opción manual.
 */
export const detectFrequency = (fechas: Date[]): { frecuencia: SubscriptionFrequency; ciclos: Date[][] } => {
  const ciclos = agruparCiclos(fechas, (d) => d);
  if (ciclos.length < 2) return { frecuencia: 'Irregular', ciclos };
  const gaps: number[] = [];
  for (let i = 1; i < ciclos.length; i++) {
    const prev = ciclos[i - 1];
    const cur = ciclos[i];
    gaps.push(diasEntre(prev[prev.length - 1], cur[cur.length - 1]));
  }
  gaps.sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  const mediana = gaps.length % 2 === 1 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
  return { frecuencia: frecuenciaPorMediana(Math.round(mediana)), ciclos };
};

/** Próximo pago sobre una copia de una fecha LOCAL (setMonth desborda fin de mes como siempre). */
export const calculateNextPayment = (ultimoPago: Date, frecuencia: SubscriptionFrequency): Date => {
  const next = new Date(ultimoPago);
  switch (frecuencia) {
    case 'Semanal': next.setDate(next.getDate() + 7); break;
    case 'Mensual': next.setMonth(next.getMonth() + 1); break;
    case 'Bimestral': next.setMonth(next.getMonth() + 2); break;
    case 'Trimestral': next.setMonth(next.getMonth() + 3); break;
    case 'Semestral': next.setMonth(next.getMonth() + 6); break;
    case 'Anual': next.setFullYear(next.getFullYear() + 1); break;
    case 'Irregular': next.setMonth(next.getMonth() + 1); break;
  }
  return next;
};

/** Último cargo del ciclo anterior al más reciente (icono de tendencia); null si no hay dos ciclos. */
export const previousPaymentAmount = (originalComments: string[], transactions: Transaction[]): number | null => {
  const comments = new Set(originalComments);
  const pagos = transactions.filter(t => t.gasto > 0 && comments.has(t.comentario));
  const ciclos = agruparCiclos(pagos, t => t.fecha);
  if (ciclos.length < 2) return null;
  const anterior = ciclos[ciclos.length - 2];
  return anterior[anterior.length - 1].gasto;
};

/** Gastos de la subcategoría "Suscripciones" de los últimos 24 meses, agrupados por servicio. */
export const detectSubscriptions = (
  transactions: Transaction[],
  categories: Category[],
  aliases: AliasEntry[],
  now: Date = new Date(),
): DetectedSubscription[] => {
  const ids = new Set(categories.filter(c => c.subcategoria.toLowerCase() === 'suscripciones').map(c => c.id));
  if (ids.size === 0) return [];

  const desde = new Date(now);
  desde.setMonth(desde.getMonth() - MESES_ANALIZADOS);

  const candidatas = transactions.filter(t => t.gasto > 0 && ids.has(t.subcategoriaId) && t.fecha >= desde);

  const grupos = new Map<string, { serviceName: string; tipoServicio: string; txs: Transaction[] }>();
  for (const t of candidatas) {
    const { serviceName, tipoServicio, canonKey } = resolveServiceName(t.comentario, t.gasto, aliases);
    if (!grupos.has(canonKey)) grupos.set(canonKey, { serviceName, tipoServicio, txs: [] });
    grupos.get(canonKey)!.txs.push(t);
  }

  const out: DetectedSubscription[] = [];
  for (const [canonKey, g] of grupos) {
    const sorted = [...g.txs].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
    const ultimo = sorted[0];
    const { frecuencia } = detectFrequency(sorted.map(t => t.fecha));
    out.push({
      canonKey,
      serviceName: g.serviceName,
      tipoServicio: g.tipoServicio,
      ultimoPago: { monto: ultimo.gasto, fecha: ultimo.fecha },
      frecuencia,
      proximoPago: calculateNextPayment(utcALocal(ultimo.fecha), frecuencia),
      numeroPagos: sorted.length,
      originalComments: sorted.map(t => t.comentario),
    });
  }
  return out;
};

const nombreLibre = (base: string, ocupados: Set<string>): string => {
  if (!ocupados.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidato = `${base} (${n})`;
    if (!ocupados.has(candidato)) return candidato;
  }
};

const mismosComentarios = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * Cruza lo detectado con lo guardado. Preserva service_name, active y aliases;
 * preserva frecuencia solo si frecuencia_manual; recalcula proximo_pago siempre.
 * Solo devuelve updates con cambios reales. Los inserts reciben sufijo " (2)", " (3)"…
 * si el nombre ya existe (UNIQUE (user_id, service_name)). Huérfanas = filas sin
 * canon_key o cuya clave ya no se detecta.
 */
export const mergeWithStored = (
  detected: DetectedSubscription[],
  stored: SubscriptionRow[],
): { updates: SubscriptionUpdate[]; inserts: SubscriptionInsert[]; orphanIds: string[] } => {
  const porCanon = new Map(stored.filter(s => s.canon_key).map(s => [s.canon_key as string, s]));
  const canonDetectados = new Set(detected.map(d => d.canonKey));
  // Nombres ocupados: solo por filas que van a seguir existiendo (las huérfanas se borran en el mismo sync)
  const ocupados = new Set(stored.filter(s => s.canon_key && canonDetectados.has(s.canon_key)).map(s => s.service_name));
  const vistos = new Set<string>();
  const updates: SubscriptionUpdate[] = [];
  const inserts: SubscriptionInsert[] = [];

  for (const d of detected) {
    vistos.add(d.canonKey);
    const existente = porCanon.get(d.canonKey);
    const frecuencia: SubscriptionFrequency = existente?.frecuencia_manual
      ? (existente.frecuencia as SubscriptionFrequency)
      : d.frecuencia;
    const comunes = {
      tipo_servicio: d.tipoServicio,
      ultimo_pago_monto: d.ultimoPago.monto,
      ultimo_pago_fecha: fechaTxISO(d.ultimoPago.fecha),
      frecuencia,
      proximo_pago: toFechaISO(calculateNextPayment(utcALocal(d.ultimoPago.fecha), frecuencia)),
      numero_pagos: d.numeroPagos,
      original_comments: d.originalComments,
    };

    if (existente) {
      const cambia =
        existente.tipo_servicio !== comunes.tipo_servicio ||
        Number(existente.ultimo_pago_monto) !== comunes.ultimo_pago_monto ||
        existente.ultimo_pago_fecha !== comunes.ultimo_pago_fecha ||
        existente.frecuencia !== comunes.frecuencia ||
        existente.proximo_pago !== comunes.proximo_pago ||
        existente.numero_pagos !== comunes.numero_pagos ||
        !mismosComentarios(existente.original_comments ?? [], comunes.original_comments);
      if (cambia) updates.push({ id: existente.id, data: comunes });
    } else {
      const service_name = nombreLibre(d.serviceName, ocupados);
      ocupados.add(service_name);
      inserts.push({ ...comunes, service_name, active: true, canon_key: d.canonKey, frecuencia_manual: false });
    }
  }

  const orphanIds = stored.filter(s => !s.canon_key || !vistos.has(s.canon_key)).map(s => s.id);
  return { updates, inserts, orphanIds };
};
