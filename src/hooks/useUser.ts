import { useState } from 'react';
import { User, Currency } from '@/types/user';

const defaultUser: User = {
  id: '1',
  nombre: 'Juan',
  apellidos: 'Pérez García',
  email: 'juan.perez@ejemplo.com',
  password: '********',
  pais: 'México',
  edad: 28,
  primaryCurrency: 'MXN',
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
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getCurrencySymbol = () => {
    switch (user.primaryCurrency) {
      case 'MXN': return '$';
      case 'USD': return 'US$';
      case 'EUR': return '€';
      default: return '$';
    }
  };

  return {
    user,
    updateUser,
    formatCurrency,
    getCurrencySymbol
  };
};