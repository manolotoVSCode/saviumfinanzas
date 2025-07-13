export type Currency = 'EUR' | 'USD' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'CNY' | 'MXN' | 'ARS';

export interface User {
  id: string;
  name: string;
  email: string;
  primaryCurrency: Currency;
  createdAt: Date;
  updatedAt: Date;
}

export const CURRENCIES: Record<Currency, { name: string; symbol: string }> = {
  EUR: { name: 'Euro', symbol: '€' },
  USD: { name: 'Dólar Estadounidense', symbol: '$' },
  GBP: { name: 'Libra Esterlina', symbol: '£' },
  JPY: { name: 'Yen Japonés', symbol: '¥' },
  CAD: { name: 'Dólar Canadiense', symbol: 'C$' },
  AUD: { name: 'Dólar Australiano', symbol: 'A$' },
  CHF: { name: 'Franco Suizo', symbol: 'CHF' },
  CNY: { name: 'Yuan Chino', symbol: '¥' },
  MXN: { name: 'Peso Mexicano', symbol: '$' },
  ARS: { name: 'Peso Argentino', symbol: '$' }
};