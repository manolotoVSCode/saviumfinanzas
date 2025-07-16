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

  // Función para formatear números sin símbolo de moneda
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-ES').format(Math.round(amount));
  };

  return {
    config,
    formatCurrency
  };
};