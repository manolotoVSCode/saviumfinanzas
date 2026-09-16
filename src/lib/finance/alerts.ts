import { Category, Transaction } from '@/types/finance';
import { groupAnnualPayments, isAnnualCategory } from './annualPayments';

export type AlertType = 'pago_anual' | 'suscripcion_sube' | 'categoria_disparada';

export interface Alert {
  /** Clave estable de la ocurrencia; un descarte se guarda por clave. */
  key: string;
  type: AlertType;
  title: string;
  detail: string;
  /** Importe principal en la divisa de la transacción origen. */
  amount: number;
  currency: string;
  /** Fecha relevante (vencimiento / último cobro / mes). */
  date: Date;
  /** Ruta de la app donde se resuelve. */
  href: string;
  severity: 'alta' | 'media';
}

export interface SubscriptionForAlerts {
  id: string;
  serviceName: string;
  active: boolean;
  originalComments: string[];
}

export interface AlertsInput {
  categories: Category[];
  transactions: Transaction[];
  subscriptions: SubscriptionForAlerts[];
  /** Ids de pagos anuales marcados como inactivos por el usuario. */
  inactiveAnnualIds: Set<string>;
  now?: Date;
}

/** Umbrales. */
export const ALERT_RULES = {
  /** Pago anual: avisar cuando falten ≤ N días (o ya haya vencido hasta hace N días). */
  annualDaysAhead: 15,
  annualDaysOverdue: 30,
  /** Suscripción: subida mínima del último cobro respecto al anterior. */
  subscriptionIncreaseRatio: 1.01,
  /** Categoría: gasto del mes respecto a la media de los 12 meses anteriores. */
  categoryOverRatio: 1.4,
  /** Categoría: media mínima mensual para considerarla (evita ruido en categorías casi vacías). */
  categoryMinAverage: 500,
  /** Categoría: meses con gasto necesarios para tener una media fiable. */
  categoryMinMonths: 3,
};

const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const dayMs = 24 * 60 * 60 * 1000;
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const sameMonth = (d: Date, y: number, m: number) => d.getFullYear() === y && d.getMonth() === m;

export const annualPaymentAlerts = (categories: Category[], transactions: Transaction[], inactive: Set<string>, now: Date): Alert[] => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return groupAnnualPayments(categories, transactions)
    .filter(g => !inactive.has(g.id))
    .flatMap(g => {
      const due = new Date(g.nextPayment.getFullYear(), g.nextPayment.getMonth(), g.nextPayment.getDate());
      const days = Math.round((due.getTime() - today.getTime()) / dayMs);
      if (days > ALERT_RULES.annualDaysAhead || days < -ALERT_RULES.annualDaysOverdue) return [];
      const when = days < 0 ? `venció hace ${-days} día${days === -1 ? '' : 's'}` : days === 0 ? 'vence hoy' : `vence en ${days} día${days === 1 ? '' : 's'}`;
      const currency = g.history[0] ? transactions.find(t => t.comentario === g.history[0].comment && t.subcategoriaId === g.categoryId)?.divisa ?? 'MXN' : 'MXN';
      return [{
        key: `pago_anual:${g.id}:${isoDay(due)}`,
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

export const subscriptionIncreaseAlerts = (subscriptions: SubscriptionForAlerts[], transactions: Transaction[]): Alert[] => {
  return subscriptions
    .filter(s => s.active && s.originalComments.length > 0)
    .flatMap(s => {
      const comments = new Set(s.originalComments);
      const payments = transactions
        .filter(t => t.gasto > 0 && comments.has(t.comentario))
        .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
      if (payments.length < 2) return [];
      const [last, prev] = payments;
      if (last.divisa !== prev.divisa) return [];
      if (last.gasto < prev.gasto * ALERT_RULES.subscriptionIncreaseRatio) return [];
      const pct = ((last.gasto - prev.gasto) / prev.gasto) * 100;
      return [{
        key: `suscripcion_sube:${s.id}:${last.id}`,
        type: 'suscripcion_sube' as const,
        title: s.serviceName,
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
 * Categoría (nivel `categoria`, no subcategoría) cuyo gasto neto del mes en curso
 * supera en `categoryOverRatio` la media de los 12 meses anteriores con gasto.
 * Se excluyen inmuebles y las categorías con seguimiento anual (picos por diseño).
 */
export const categorySpikeAlerts = (categories: Category[], transactions: Transaction[], now: Date): Alert[] => {
  const year = now.getFullYear();
  const month = now.getMonth();
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
  return alerts.sort((a, b) => b.amount - a.amount);
};

export const computeAlerts = ({ categories, transactions, subscriptions, inactiveAnnualIds, now = new Date() }: AlertsInput): Alert[] => [
  ...annualPaymentAlerts(categories, transactions, inactiveAnnualIds, now),
  ...subscriptionIncreaseAlerts(subscriptions, transactions),
  ...categorySpikeAlerts(categories, transactions, now),
];
