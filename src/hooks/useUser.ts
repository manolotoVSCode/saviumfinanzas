import { useState } from 'react';
import { User, Currency } from '@/types/user';

const defaultUser: User = {
  id: '1',
  name: 'Usuario Demo',
  email: 'demo@ejemplo.com',
  primaryCurrency: 'EUR',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date()
};

export const useUser = () => {
  const [user, setUser] = useState<User>(defaultUser);

  const updateUser = (updates: Partial<Omit<User, 'id' | 'createdAt'>>) => {
    setUser(prev => ({
      ...prev,
      ...updates,
      updatedAt: new Date()
    }));
  };

  const formatCurrency = (amount: number) => {
    const currency = user.primaryCurrency;
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getCurrencySymbol = () => {
    switch (user.primaryCurrency) {
      case 'EUR': return '€';
      case 'USD': return '$';
      case 'GBP': return '£';
      case 'JPY': return '¥';
      case 'CAD': return 'C$';
      case 'AUD': return 'A$';
      case 'CHF': return 'CHF';
      case 'CNY': return '¥';
      case 'MXN': return '$';
      case 'ARS': return '$';
      default: return '€';
    }
  };

  return {
    user,
    updateUser,
    formatCurrency,
    getCurrencySymbol
  };
};