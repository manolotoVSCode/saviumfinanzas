export type Currency = 'MXN' | 'USD' | 'EUR';

export interface User {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  password: string;
  pais: string;
  edad: number;
  primaryCurrency: Currency;
  createdAt: Date;
  updatedAt: Date;
}

export const CURRENCIES: Record<Currency, { name: string; symbol: string }> = {
  MXN: { name: 'Peso Mexicano', symbol: '$' },
  USD: { name: 'Dólar Estadounidense', symbol: 'US$' },
  EUR: { name: 'Euro', symbol: '€' }
};