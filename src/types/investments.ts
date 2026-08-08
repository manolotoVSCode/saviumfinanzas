export type InvestmentBehavior = 'valuacion_manual' | 'interes_fijo' | 'reparto_variable';

export const INVESTMENT_BEHAVIORS: { value: InvestmentBehavior; label: string; help: string }[] = [
  {
    value: 'valuacion_manual',
    label: 'Valuación manual',
    help: 'Tú actualizas el valor mes a mes y el sistema calcula si creció o bajó.',
  },
  {
    value: 'interes_fijo',
    label: 'Interés fijo',
    help: 'Tasa conocida. Puede reinvertirse o pagarse periódicamente.',
  },
  {
    value: 'reparto_variable',
    label: 'Reparto variable a plazo',
    help: 'El beneficio se conoce al vencimiento (fideicomisos, participaciones).',
  },
];

export type PayoutMode = 'Reinversión' | 'Pago mensual' | 'Pago trimestral' | 'Pago anual' | 'Al vencimiento';

export const PAYOUT_MODES: PayoutMode[] = [
  'Reinversión',
  'Pago mensual',
  'Pago trimestral',
  'Pago anual',
  'Al vencimiento',
];

export interface InvestmentType {
  id: string;
  user_id: string;
  nombre: string;
  comportamiento: InvestmentBehavior;
  permite_reinversion: boolean;
  requiere_vencimiento: boolean;
  color: string | null;
  orden: number;
  active: boolean;
}

export interface Investment {
  id: string;
  user_id: string;
  nombre: string;
  tipo: string;
  tipo_id: string | null;
  monto_invertido: number;
  valor_actual: number;
  rendimiento_bruto: number | null;
  rendimiento_neto: number | null;
  tasa_anual: number | null;
  modalidad: string;
  modalidad_pago: string | null;
  moneda: string;
  fecha_inicio: string;
  fecha_vencimiento: string | null;
  ultimo_pago: string | null;
  cuenta_id: string | null;
  beneficio_estimado: number | null;
  notas: string | null;
  activa: boolean;
  /** Saldo calculado de la cuenta vinculada (saldo inicial + movimientos). */
  saldo_cuenta?: number | null;
}

export interface InvestmentValuation {
  id: string;
  user_id: string;
  inversion_id: string;
  fecha: string;
  valor: number;
  aportacion: number;
  retiro: number;
  notas: string | null;
}

export interface InvestmentPayout {
  id: string;
  user_id: string;
  inversion_id: string;
  fecha: string;
  monto: number;
  divisa: string;
  reinvertido: boolean;
  notas: string | null;
}
