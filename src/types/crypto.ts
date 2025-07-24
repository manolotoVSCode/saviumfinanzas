export interface Criptomoneda {
  id: string;
  user_id: string;
  simbolo: string;
  nombre: string;
  cantidad: number;
  precio_compra: number;
  divisa_compra: string;
  fecha_compra: string;
  notas?: string;
  created_at: string;
  updated_at: string;
}

export interface CryptoPrice {
  price: number;
  change24h: number;
}

export interface CryptoPrices {
  [symbol: string]: CryptoPrice;
}

export interface CryptoWithPrice extends Criptomoneda {
  precio_actual_usd?: number;
  precio_compra_usd?: number; // precio convertido a USD
  valor_actual_usd?: number;
  valor_compra_usd?: number; // valor de compra convertido a USD
  ganancia_perdida_usd?: number;
  ganancia_perdida_porcentaje?: number;
}