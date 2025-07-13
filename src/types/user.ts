export type Currency = 'MXN' | 'USD' | 'EUR';

export interface User {
  id: string;
  name: string;
  email: string;
  primaryCurrency: Currency;
  createdAt: Date;
  updatedAt: Date;
}

export const CURRENCIES: Record<Currency, { name: string; symbol: string }> = {
  MXN: { name: 'Peso Mexicano', symbol: '$' },
  USD: { name: 'Dólar Estadounidense', symbol: 'US$' },
  EUR: { name: 'Euro', symbol: '€' }
};