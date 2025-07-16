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

  // Función para formatear números con punto separador de miles y coma decimal
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount));
  };

  return {
    config,
    formatCurrency
  };
};