import { useState, useEffect } from 'react';

export type CurrencyCode = 'MXN' | 'USD' | 'EUR';

interface AppConfig {
  currency: CurrencyCode;
}

const defaultConfig: AppConfig = {
  currency: 'MXN'
};

export const useAppConfig = () => {
  const [config, setConfig] = useState<AppConfig>(defaultConfig);

  // Cargar configuración desde localStorage al inicializar
  useEffect(() => {
    const savedConfig = localStorage.getItem('savium-app-config');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig({ ...defaultConfig, ...parsedConfig });
      } catch (error) {
        console.error('Error loading app config:', error);
        setConfig(defaultConfig);
      }
    }
  }, []);

  // Guardar configuración en localStorage cuando cambie
  const updateConfig = (updates: Partial<AppConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    localStorage.setItem('savium-app-config', JSON.stringify(newConfig));
  };

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
    updateConfig,
    formatCurrency
  };
};