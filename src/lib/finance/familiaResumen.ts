import { Account, AccountType, Transaction } from '@/types/finance';
import { Investment, InvestmentType } from '@/types/investments';
import { CryptoWithPrice } from '@/types/crypto';
import { ConvertCurrency, CurrencyCode } from './dashboardMetrics';
import { AnnualPaymentGroup } from './annualPayments';
import { saldosAlCierre } from './netWorthHistory';
import { finMesAnterior } from './fechas';
import { DecisionPago, InfoFamilia, NotaHuerfana } from './familia';

export type GrupoId = 'liquidez' | 'inversiones' | 'inmuebles' | 'empresas' | 'deudas';
export interface PartidaCuenta {
  clave: string; nombre: string;
  /** En la divisa de la cuenta. */
  saldo: number; divisa: CurrencyCode;
  saldoConvertido: number;
  /** Deuda con saldo ≥ 0: se muestra pero no suma. */
  sinDeuda: boolean;
}
export interface GrupoPatrimonio { id: GrupoId; titulo: string; partidas: PartidaCuenta[]; subtotal: number }
export interface ResumenPatrimonio {
  grupos: GrupoPatrimonio[];
  activos: number; pasivos: number; patrimonio: number;
  /** Fin del mes anterior: hasta aquí el libro está completo. */
  ultimoMesCompleto: Date;
}

const GRUPOS: { id: GrupoId; titulo: string; tipos: AccountType[] }[] = [
  { id: 'liquidez', titulo: 'Bancos y efectivo', tipos: ['Efectivo', 'Banco', 'Ahorros'] },
  { id: 'inversiones', titulo: 'Inversiones', tipos: ['Inversiones'] },
  { id: 'inmuebles', titulo: 'Bienes raíces', tipos: ['Bien Raíz'] },
  { id: 'empresas', titulo: 'Empresas', tipos: ['Empresa Propia'] },
  { id: 'deudas', titulo: 'Deudas', tipos: ['Tarjeta de Crédito', 'Hipoteca'] },
];

const porNombre = <T extends { nombre: string }>(a: T, b: T) => a.nombre.localeCompare(b.nombre, 'es');

/**
 * Patrimonio para la familia con la misma regla que Informes › Patrimonio Neto:
 * saldos al cierre del mes en curso, activos sin vendidas, pasivos = parte
 * negativa de tarjetas e hipotecas. Las cuentas con saldo cero no se listan
 * (no aportan nada); una deuda con saldo a favor sí, marcada «sin deuda».
 */
export const resumenPatrimonioFamilia = ({ accounts, transactions, convert, currency, now = new Date() }: {
  accounts: Account[]; transactions: Transaction[]; convert: ConvertCurrency; currency: CurrencyCode; now?: Date;
}): ResumenPatrimonio => {
  const cierre = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const saldos = saldosAlCierre(accounts, transactions, cierre);
  let activos = 0;
  let pasivos = 0;

  const grupos = GRUPOS.flatMap(g => {
    const esDeuda = g.id === 'deudas';
    const partidas: PartidaCuenta[] = accounts
      .filter(a => g.tipos.includes(a.tipo) && (esDeuda || !a.vendida))
      .map(a => {
        const divisa = (a.divisa || 'MXN') as CurrencyCode;
        const saldo = saldos.get(a.id) ?? a.saldoInicial;
        const saldoConvertido = convert(saldo, divisa, currency);
        return { clave: `cuenta:${a.id}`, nombre: a.nombre, saldo, divisa, saldoConvertido, sinDeuda: esDeuda && saldoConvertido >= 0 };
      })
      .filter(p => Math.abs(p.saldo) >= 0.005)
      .sort(porNombre);
    if (partidas.length === 0) return [];
    const subtotal = esDeuda
      ? partidas.reduce((s, p) => s + Math.abs(Math.min(0, p.saldoConvertido)), 0)
      : partidas.reduce((s, p) => s + p.saldoConvertido, 0);
    if (esDeuda) pasivos += subtotal;
    else activos += subtotal;
    return [{ id: g.id, titulo: g.titulo, partidas, subtotal }];
  });

  return { grupos, activos, pasivos, patrimonio: activos - pasivos, ultimoMesCompleto: finMesAnterior(now) };
};

export interface PartidaInversion {
  clave: string; nombre: string; valor: number; moneda: string;
  vencimiento: string | null; tasaAnual: number | null;
}
export interface GrupoInversiones { tipo: string; partidas: PartidaInversion[] }

/** Inversiones activas agrupadas por tipo. Informativo: no suma al patrimonio. `valor_actual` ya viene calculado por useInvestments. */
export const detalleInversionesFamilia = (investments: Investment[], types: InvestmentType[]): GrupoInversiones[] => {
  const nombreTipo = new Map(types.map(t => [t.id, t.nombre]));
  const grupos = new Map<string, PartidaInversion[]>();
  for (const i of investments) {
    if (!i.activa) continue;
    const tipo = (i.tipo_id && nombreTipo.get(i.tipo_id)) || 'Sin tipo asignado';
    if (!grupos.has(tipo)) grupos.set(tipo, []);
    grupos.get(tipo)!.push({
      clave: `inversion:${i.id}`, nombre: i.nombre, valor: i.valor_actual || i.monto_invertido || 0,
      moneda: i.moneda || 'MXN', vencimiento: i.fecha_vencimiento, tasaAnual: i.tasa_anual,
    });
  }
  return [...grupos.entries()]
    .map(([tipo, partidas]) => ({ tipo, partidas: partidas.sort(porNombre) }))
    .sort((a, b) => (a.tipo === 'Sin tipo asignado' ? 1 : b.tipo === 'Sin tipo asignado' ? -1 : a.tipo.localeCompare(b.tipo, 'es')));
};

export interface PartidaCripto {
  clave: string; nombre: string; simbolo: string; cantidad: number;
  valorUsd: number;
  /** Sin precio actual: se valora al de compra, como en la página Inversiones. */
  aPrecioDeCompra: boolean;
}

export const detalleCriptoFamilia = (criptos: CryptoWithPrice[]): PartidaCripto[] =>
  criptos
    .map(c => ({
      clave: `cripto:${c.id}`, nombre: c.nombre, simbolo: c.simbolo, cantidad: c.cantidad,
      valorUsd: c.valor_actual_usd ?? c.valor_compra_usd ?? 0,
      aPrecioDeCompra: c.valor_actual_usd === undefined,
    }))
    .sort(porNombre);

export interface SuscripcionFamilia {
  id: string; service_name: string; active: boolean; frecuencia: string | null; ultimo_pago_monto: number | null;
}
export interface PagoRecurrente {
  clave: string; concepto: string; monto: number; divisa: string; frecuencia: string; decision: DecisionPago;
}

const SIN_DECISION: DecisionPago = { decision: null, nota: '' };

/**
 * Suscripciones activas (divisa del perfil: la tabla no la guarda) y pagos
 * anuales no marcados inactivos (divisa deducida como en alerts.ts).
 */
export const pagosRecurrentesFamilia = ({ subscriptions, annualGroups, transactions, inactiveAnnualIds, baseCurrency, decisiones }: {
  subscriptions: SuscripcionFamilia[];
  annualGroups: AnnualPaymentGroup[];
  transactions: Transaction[];
  inactiveAnnualIds: Set<string>;
  baseCurrency: CurrencyCode;
  decisiones: Record<string, DecisionPago>;
}): PagoRecurrente[] => {
  const subs = subscriptions
    .filter(s => s.active)
    .map(s => ({
      clave: `sub:${s.id}`, concepto: s.service_name, monto: s.ultimo_pago_monto ?? 0,
      divisa: baseCurrency as string, frecuencia: s.frecuencia ?? '',
    }))
    .sort((a, b) => a.concepto.localeCompare(b.concepto, 'es'));
  const anuales = annualGroups
    .filter(g => !inactiveAnnualIds.has(g.id))
    .map(g => {
      const ultimo = g.history[0];
      const divisa = (ultimo && transactions.find(t => t.comentario === ultimo.comment && t.subcategoriaId === g.categoryId)?.divisa) || baseCurrency;
      return { clave: `anual:${g.id}`, concepto: g.concept, monto: g.lastAmount, divisa, frecuencia: 'Anual' };
    })
    .sort((a, b) => a.concepto.localeCompare(b.concepto, 'es'));
  return [...subs, ...anuales].map(p => ({ ...p, decision: decisiones[p.clave] ?? SIN_DECISION }));
};

export interface IdsExistentes {
  cuentas: string[]; inversiones: string[]; criptos: string[]; suscripciones: string[]; anuales: string[];
}

const PREFIJOS: Record<string, keyof IdsExistentes> = {
  cuenta: 'cuentas', inversion: 'inversiones', cripto: 'criptos', sub: 'suscripciones', anual: 'anuales',
};
const ETIQUETA_DECISION = { mantener: 'Mantener', cancelar: 'Cancelar' } as const;

/**
 * Notas y decisiones cuya entidad ya no existe. Se compara con TODAS las
 * entidades (vendidas, inactivas, liquidadas incluidas), no con lo que se pinta.
 * Llamar solo cuando todas las fuentes han cargado sin error.
 */
export const notasHuerfanas = (info: InfoFamilia, ids: IdsExistentes): NotaHuerfana[] => {
  const existentes = Object.fromEntries(
    Object.entries(ids).map(([k, v]) => [k, new Set(v)])
  ) as Record<keyof IdsExistentes, Set<string>>;
  const existe = (clave: string) => {
    const i = clave.indexOf(':');
    const grupo = PREFIJOS[clave.slice(0, i)];
    return i > 0 && grupo !== undefined && existentes[grupo].has(clave.slice(i + 1));
  };
  const notas: NotaHuerfana[] = Object.entries(info.notasPatrimonio)
    .filter(([clave, texto]) => texto.trim() !== '' && !existe(clave))
    .map(([clave, texto]) => ({ origen: 'nota', clave, texto }));
  const pagos: NotaHuerfana[] = Object.entries(info.pagos)
    .filter(([clave, p]) => (p.decision || p.nota) && !existe(clave))
    .map(([clave, p]) => ({
      origen: 'pago', clave,
      texto: [p.decision ? ETIQUETA_DECISION[p.decision] : '', p.nota].filter(Boolean).join(' · '),
    }));
  return [...notas, ...pagos];
};
