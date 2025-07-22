export interface Inversion {
  id: string;
  user_id: string;
  nombre: string;
  tipo: 'Interés fijo' | 'Fondo variable' | 'Criptomoneda';
  monto_invertido: number;
  rendimiento_bruto?: number; // Solo para Interés fijo
  rendimiento_neto?: number; // Solo para Interés fijo
  valor_actual: number;
  modalidad: 'Reinversión' | 'Pago mensual' | 'Pago trimestral';
  moneda: 'MXN' | 'USD' | 'EUR';
  fecha_inicio: string;
  ultimo_pago?: string; // Solo para modalidades de pago
  created_at: string;
  updated_at: string;
}

export interface InversionFormData {
  nombre: string;
  tipo: 'Interés fijo' | 'Fondo variable' | 'Criptomoneda';
  monto_invertido: number;
  rendimiento_bruto?: number;
  rendimiento_neto?: number;
  valor_actual: number;
  modalidad: 'Reinversión' | 'Pago mensual' | 'Pago trimestral';
  moneda: 'MXN' | 'USD' | 'EUR';
  fecha_inicio: string;
  ultimo_pago?: string;
}

export interface CryptoPrice {
  id: string;
  current_price: number;
  price_change_percentage_24h: number;
}