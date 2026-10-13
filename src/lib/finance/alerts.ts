import { Category, Transaction } from '@/types/finance';
import { groupAnnualPayments, isAnnualCategory } from './annualPayments';
import { diasDesdeRevision, estadoRevision } from './familia';
import { finMesAnterior, toFechaISO } from './fechas';
import { agruparCiclos } from './subscriptions';

export type AlertType = 'pago_anual' | 'suscripcion_sube' | 'categoria_disparada' | 'familia_revision' | 'cripto_umbral';

export interface Alert {
  /** Clave estable de la ocurrencia; un descarte se guarda por clave. */
  key: string;
  type: AlertType;
  title: string;
  detail: string;
  /** Importe principal en la divisa de la transacción origen; sin importe en avisos que no son de dinero. */
  amount?: number;
  currency: string;
  /** Fecha relevante (vencimiento / último cobro / mes). */
  date: Date;
  /** Ruta de la app donde se resuelve. */
  href: string;
  severity: 'alta' | 'media';
}

/** Subconjunto de subscription_services que usan las alertas (la fila completa es asignable). */
export interface SubscriptionForAlerts {
  id: string;
  service_name: string;
  active: boolean;
  original_comments: string[];
}

/** Estado de revisión de «Para mi familia»; null = sin fila, cargando o error (no alerta). */
export interface RevisionFamilia {
  revisadoAt: string | null;
}

export interface AlertsInput {
  categories: Category[];
  transactions: Transaction[];
  subscriptions: SubscriptionForAlerts[];
  /** Ids de pagos anuales marcados como inactivos por el usuario. */
  inactiveAnnualIds: Set<string>;
  revisionFamilia?: RevisionFamilia | null;
  /** null = sin umbrales, cargando o error (no alerta). */
  cripto?: CriptoAlertasInput | null;
  now?: Date;
}

/** Una compra de la tabla criptomonedas (la fila completa es asignable). */
export interface CriptoParaAlertas {
  simbolo: string;
  cantidad: number;
  precio_compra: number;
  divisa_compra: string;
}

/** Fila de alertas_cripto: % sobre el precio de compra; null = sin aviso en ese sentido. */
export interface UmbralCripto {
  simbolo: string;
  sube_pct: number | null;
  baja_pct: number | null;
}

export interface CriptoAlertasInput {
  criptos: CriptoParaAlertas[];
  /** Precio actual en USD por símbolo; sin precio no hay alerta. */
  precios: Record<string, number>;
  umbrales: UmbralCripto[];
  /** Importe en la divisa dada → USD. */
  aUSD: (importe: number, divisa: string) => number;
}

/** Umbrales. */
export const ALERT_RULES = {
  /** Pago anual: avisar cuando falten ≤ N días desde hoy. */
  annualDaysAhead: 15,
  /** Pago anual vencido: solo si el vencimiento cae ≤ N días antes del corte de datos (fin del mes anterior); lo vencido en el mes en curso está pendiente de importar. */
  annualDaysOverdue: 30,
  /** Suscripción: subida mínima del último cobro respecto al anterior. */
  subscriptionIncreaseRatio: 1.01,
  /** Categoría: gasto del último mes cerrado respecto a la media de los 12 meses anteriores a ese. */
  categoryOverRatio: 1.4,
  /** Categoría: media mínima mensual para considerarla (evita ruido en categorías casi vacías). */
  categoryMinAverage: 500,
  /** Categoría: meses con gasto necesarios para tener una media fiable. */
  categoryMinMonths: 3,
};

const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const dayMs = 24 * 60 * 60 * 1000;

export const annualPaymentAlerts = (categories: Category[], transactions: Transaction[], inactive: Set<string>, now: Date): Alert[] => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const corte = finMesAnterior(now);
  const corteDia = new Date(corte.getFullYear(), corte.getMonth(), corte.getDate());
  return groupAnnualPayments(categories, transactions)
    .filter(g => !inactive.has(g.id))
    .flatMap(g => {
      const due = new Date(g.nextPayment.getFullYear(), g.nextPayment.getMonth(), g.nextPayment.getDate());
      const days = Math.round((due.getTime() - today.getTime()) / dayMs);
      if (days > ALERT_RULES.annualDaysAhead) return [];
      if (days < 0) {
        // Vencido: solo cuenta si cae en un mes ya importado (≤ corte) y a ≤ N días del corte.
        // groupAnnualPayments ya adelanta nextPayment un año cuando el pago existe.
        const diasAntesDelCorte = Math.round((corteDia.getTime() - due.getTime()) / dayMs);
        if (diasAntesDelCorte < 0 || diasAntesDelCorte > ALERT_RULES.annualDaysOverdue) return [];
      }
      const when = days < 0 ? `venció hace ${-days} día${days === -1 ? '' : 's'}` : days === 0 ? 'vence hoy' : `vence en ${days} día${days === 1 ? '' : 's'}`;
      const currency = g.history[0] ? transactions.find(t => t.comentario === g.history[0].comment && t.subcategoriaId === g.categoryId)?.divisa ?? 'MXN' : 'MXN';
      return [{
        key: `pago_anual:${g.id}:${toFechaISO(due)}`,
        type: 'pago_anual' as const,
        title: g.concept,
        detail: `${g.subcategoryName} · ${when} (último pago ${g.lastDate.getDate()} de ${MONTH_NAMES[g.lastDate.getMonth()]} de ${g.lastDate.getFullYear()})`,
        amount: g.lastAmount,
        currency,
        date: due,
        href: '/pagos-anuales',
        severity: days <= 0 ? 'alta' as const : 'media' as const,
      }];
    });
};

/**
 * Suscripción cuyo cobro sube de precio: compara ciclos de cobro, no cargos sueltos.
 * Con ≥2 ciclos, compara el último cargo del último ciclo con el último cargo del
 * ciclo anterior. Con un único ciclo que tiene ≥2 cargos (cambio de plan a mitad de
 * ciclo, p.ej. cancelación + nueva suscripción en la misma ventana de `agruparCiclos`),
 * compara el primer cargo del ciclo con el último.
 */
export const subscriptionIncreaseAlerts = (subscriptions: SubscriptionForAlerts[], transactions: Transaction[]): Alert[] => {
  return subscriptions
    .filter(s => s.active && s.original_comments.length > 0)
    .flatMap(s => {
      const comments = new Set(s.original_comments);
      const payments = transactions.filter(t => t.gasto > 0 && comments.has(t.comentario));
      const ciclos = agruparCiclos(payments, p => p.fecha);
      let prev: Transaction;
      let last: Transaction;
      if (ciclos.length >= 2) {
        last = ciclos[ciclos.length - 1][ciclos[ciclos.length - 1].length - 1];
        prev = ciclos[ciclos.length - 2][ciclos[ciclos.length - 2].length - 1];
      } else if (ciclos.length === 1 && ciclos[0].length >= 2) {
        prev = ciclos[0][0];
        last = ciclos[0][ciclos[0].length - 1];
      } else {
        return [];
      }
      if (last.divisa !== prev.divisa) return [];
      if (last.gasto < prev.gasto * ALERT_RULES.subscriptionIncreaseRatio) return [];
      const pct = ((last.gasto - prev.gasto) / prev.gasto) * 100;
      return [{
        key: `suscripcion_sube:${s.id}:${last.id}`,
        type: 'suscripcion_sube' as const,
        title: s.service_name,
        detail: `Subió de ${prev.gasto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} a ${last.gasto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${last.divisa} (+${pct.toFixed(1)}%)`,
        amount: last.gasto,
        currency: last.divisa,
        date: last.fecha,
        href: '/suscripciones',
        severity: 'media' as const,
      }];
    });
};

/**
 * Categoría (nivel `categoria`, no subcategoría) cuyo gasto neto del ÚLTIMO MES
 * CERRADO (corte de datos: el mes en curso aún no está importado) supera en
 * `categoryOverRatio` la media de los 12 meses anteriores con gasto.
 * Se excluyen inmuebles y las categorías con seguimiento anual (picos por diseño).
 * La clave `categoria_disparada:<categoria>:<yyyy-mm>` es la que se habría generado
 * en su momento, así que los descartes no resucitan.
 */
export const categorySpikeAlerts = (categories: Category[], transactions: Transaction[], now: Date): Alert[] => {
  const corte = finMesAnterior(now);
  const year = corte.getFullYear();
  const month = corte.getMonth();
  const excluded = new Set(categories.filter(isAnnualCategory).map(c => c.id));
  const byId = new Map(categories.map(c => [c.id, c]));

  // gasto neto (gasto − reembolsos) por categoría y mes, misma divisa que la transacción
  const monthly = new Map<string, Map<string, number>>(); // categoria -> 'y-m' -> neto
  const currencyByCat = new Map<string, string>();
  for (const t of transactions) {
    const c = byId.get(t.subcategoriaId);
    if (!c || c.tipo !== 'Gastos' || excluded.has(c.id) || c.categoria === 'Compra Venta Inmuebles') continue;
    const ym = `${t.fecha.getFullYear()}-${t.fecha.getMonth()}`;
    if (!monthly.has(c.categoria)) monthly.set(c.categoria, new Map());
    const m = monthly.get(c.categoria)!;
    m.set(ym, (m.get(ym) ?? 0) + t.gasto - t.ingreso);
    if (!currencyByCat.has(c.categoria)) currencyByCat.set(c.categoria, t.divisa);
  }

  const alerts: Alert[] = [];
  const currentKey = `${year}-${month}`;
  for (const [categoria, months] of monthly) {
    const current = months.get(currentKey) ?? 0;
    if (current <= 0) continue;
    const previous: number[] = [];
    for (let i = 1; i <= 12; i++) {
      const d = new Date(year, month - i, 1);
      const v = months.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (v !== undefined && v > 0) previous.push(v);
    }
    if (previous.length < ALERT_RULES.categoryMinMonths) continue;
    const avg = previous.reduce((a, b) => a + b, 0) / previous.length;
    if (avg < ALERT_RULES.categoryMinAverage || current < avg * ALERT_RULES.categoryOverRatio) continue;
    const pct = ((current - avg) / avg) * 100;
    alerts.push({
      key: `categoria_disparada:${categoria}:${year}-${String(month + 1).padStart(2, '0')}`,
      type: 'categoria_disparada',
      title: categoria,
      detail: `${MONTH_NAMES[month]}: ${current.toLocaleString('en-US', { maximumFractionDigits: 0 })} frente a una media de ${avg.toLocaleString('en-US', { maximumFractionDigits: 0 })} (+${pct.toFixed(0)}%)`,
      amount: current,
      currency: currencyByCat.get(categoria) ?? 'MXN',
      date: new Date(year, month, 1),
      href: `/transacciones-categoria?categoria=${encodeURIComponent(categoria)}&divisa=${encodeURIComponent(currencyByCat.get(categoria) ?? 'MXN')}&monthNum=${month}&yearNum=${year}&periodo=${encodeURIComponent(MONTH_NAMES[month] + ' ' + year)}`,
      severity: 'media',
    });
  }
  return alerts.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
};

/**
 * «Para mi familia» sin revisar hace más de DIAS_REVISION días. La clave lleva
 * la fecha local de la última revisión: al marcar como revisado deja de estar
 * vencida, y un descarte vale solo hasta la siguiente revisión.
 */
export const familiaRevisionAlerts = (revision: RevisionFamilia | null, now: Date): Alert[] => {
  if (!revision?.revisadoAt || estadoRevision(revision.revisadoAt, now) !== 'vencida') return [];
  const fecha = new Date(revision.revisadoAt);
  return [{
    key: `familia_revision:${toFechaISO(fecha)}`,
    type: 'familia_revision',
    title: 'Revisa la información para tu familia',
    detail: `Última revisión hace ${diasDesdeRevision(revision.revisadoAt, now)} días`,
    currency: 'MXN',
    date: fecha,
    href: '/familia',
    severity: 'media',
  }];
};

export interface PosicionCripto {
  costoUSD: number;
  valorUSD: number;
  /** Ganancia (+) o pérdida (−) sobre lo pagado, en %. */
  pct: number;
}

/**
 * Todas las compras de cada símbolo juntas: lo pagado (convertido a USD) frente a lo que
 * valen hoy. Igual que la tarjeta de Criptomonedas, el % no depende del tipo de cambio
 * porque compra y valor actual se convierten con la misma tasa.
 */
export const posicionesCripto = (criptos: CriptoParaAlertas[], precios: Record<string, number>, aUSD: CriptoAlertasInput['aUSD']): Map<string, PosicionCripto> => {
  const acumulado = new Map<string, { costoUSD: number; valorUSD: number }>();
  for (const c of criptos) {
    const precio = precios[c.simbolo];
    if (precio === undefined) continue;
    const a = acumulado.get(c.simbolo) ?? { costoUSD: 0, valorUSD: 0 };
    a.costoUSD += c.cantidad * aUSD(c.precio_compra, c.divisa_compra);
    a.valorUSD += c.cantidad * precio;
    acumulado.set(c.simbolo, a);
  }
  const posiciones = new Map<string, PosicionCripto>();
  for (const [simbolo, a] of acumulado) {
    if (a.costoUSD > 0) posiciones.set(simbolo, { ...a, pct: (a.valorUSD / a.costoUSD - 1) * 100 });
  }
  return posiciones;
};

const pctConSigno = (n: number, decimales: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(decimales)}%`;

/**
 * Cripto cuya posición sube ≥ sube_pct o baja ≥ baja_pct respecto a lo pagado.
 * La clave lleva el umbral: un descarte vale hasta que se cambie el umbral, y si el
 * precio vuelve a la zona normal la alerta desaparece sola. Orden por símbolo.
 * Port en Swift: SaviumCore/AlertasCripto.swift (fixture shared/fixtures/alertas_cripto.json).
 */
export const criptoAlerts = ({ criptos, precios, umbrales, aUSD }: CriptoAlertasInput, now: Date): Alert[] => {
  const posiciones = posicionesCripto(criptos, precios, aUSD);
  return [...umbrales]
    .sort((a, b) => a.simbolo.localeCompare(b.simbolo))
    .flatMap(u => {
      const p = posiciones.get(u.simbolo);
      if (!p) return [];
      const sube = u.sube_pct !== null && p.pct >= u.sube_pct;
      const baja = u.baja_pct !== null && p.pct <= -u.baja_pct;
      if (!sube && !baja) return [];
      const umbral = sube ? u.sube_pct! : u.baja_pct!;
      return [{
        key: `cripto_${sube ? 'sube' : 'baja'}:${u.simbolo}:${umbral}`,
        type: 'cripto_umbral' as const,
        title: `${u.simbolo} ${pctConSigno(p.pct, 1)}`,
        detail: `${sube ? 'Subió' : 'Bajó'} ${Math.abs(p.pct).toFixed(1)}% sobre tu precio de compra (avisar desde ${sube ? '+' : '−'}${umbral}%)`,
        amount: p.valorUSD,
        currency: 'USD',
        date: now,
        href: '/inversiones',
        severity: sube ? 'media' as const : 'alta' as const,
      }];
    });
};

export const computeAlerts = ({ categories, transactions, subscriptions, inactiveAnnualIds, revisionFamilia = null, cripto = null, now = new Date() }: AlertsInput): Alert[] => [
  ...annualPaymentAlerts(categories, transactions, inactiveAnnualIds, now),
  ...subscriptionIncreaseAlerts(subscriptions, transactions),
  ...categorySpikeAlerts(categories, transactions, now),
  ...familiaRevisionAlerts(revisionFamilia, now),
  ...(cripto ? criptoAlerts(cripto, now) : []),
];
