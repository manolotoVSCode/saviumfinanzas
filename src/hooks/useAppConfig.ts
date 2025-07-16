import { useState, useEffect } from 'react';

export type CurrencyCode = 'MXN' | 'USD' | 'EUR';

interface AppConfig {
  currency: CurrencyCode;
}

const defaultConfig: AppConfig = {
  currency: 'MXN'
};

export const useAppConfig = () => {
  // Configuración fija en MXN
  const config: AppConfig = defaultConfig;

  // Función para formatear moneda según la configuración
  const formatCurrency = (amount: number): string => {
    const currencyMap = {
      MXN: 'es-MX',
      USD: 'en-US', 
      EUR: 'es-ES'
    };

    return new Intl.NumberFormat(currencyMap[config.currency], {
      style: 'currency',
      currency: config.currency
    }).format(amount);
  };

  return {
    config,
    formatCurrency
  };
};