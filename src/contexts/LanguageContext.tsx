import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'es' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Traducciones
const translations = {
  es: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.transactions': 'Transacciones',
    'nav.investments': 'Inversiones',
    'nav.reports': 'Informes',
    'nav.settings': 'Configuración',
    
    // Dashboard
    'dashboard.title': 'Dashboard Financiero',
    'dashboard.loading': 'Cargando datos financieros...',
    'dashboard.welcome': 'Bienvenido a tu dashboard financiero',
    'dashboard.total_balance': 'Balance Total',
    'dashboard.monthly_income': 'Ingresos Mensuales',
    'dashboard.monthly_expenses': 'Gastos Mensuales',
    'dashboard.investments': 'Inversiones',
    'dashboard.recent_transactions': 'Transacciones Recientes',
    'dashboard.view_all': 'Ver todas',
    'dashboard.no_transactions': 'No hay transacciones recientes',
    'dashboard.account_balances': 'Balances de Cuentas',
    
    // Transactions
    'transactions.title': 'Gestión de Transacciones',
    'transactions.add': 'Agregar Transacción',
    'transactions.edit': 'Editar Transacción',
    'transactions.delete': 'Eliminar',
    'transactions.date': 'Fecha',
    'transactions.account': 'Cuenta',
    'transactions.category': 'Categoría',
    'transactions.amount': 'Monto',
    'transactions.comment': 'Comentario',
    'transactions.type': 'Tipo',
    'transactions.income': 'Ingreso',
    'transactions.expense': 'Gasto',
    'transactions.contribution': 'Aportación',
    'transactions.loading': 'Cargando transacciones...',
    'transactions.no_transactions': 'No hay transacciones para mostrar',
    'transactions.import': 'Importar',
    'transactions.export': 'Exportar',
    'transactions.filter': 'Filtrar',
    'transactions.clear_filters': 'Limpiar filtros',
    'transactions.bulk_actions': 'Acciones masivas',
    'transactions.select_all': 'Seleccionar todo',
    'transactions.delete_selected': 'Eliminar seleccionadas',
    'transactions.change_category': 'Cambiar categoría',
    
    // Settings
    'settings.title': 'Configuración',
    'settings.loading': 'Cargando configuración...',
    'settings.profile': 'Perfil de Usuario',
    'settings.language': 'Idioma',
    'settings.language.spanish': 'Español',
    'settings.language.english': 'English',
    'settings.accounts': 'Gestión de Cuentas',
    'settings.categories': 'Gestión de Categorías',
    'settings.session': 'Sesión',
    'settings.about': 'Acerca de Savium',
    'settings.version': 'Versión 1.2.0 · Desarrollado por Manuel de la Torre · 2025',
    'settings.description': 'Savium es tu aplicación de finanzas personales diseñada para ayudarte a tomar control de tu dinero.',
    'settings.logout': 'Cerrar Sesión',
    'settings.clear_data': 'Eliminar Todas las Transacciones',
    'settings.clear_data.confirm': '¿Estás seguro?',
    'settings.clear_data.description': 'Esta acción eliminará todas las transacciones permanentemente. Esta acción no se puede deshacer.',
    'settings.clear_data.cancel': 'Cancelar',
    'settings.clear_data.confirm_action': 'Eliminar todo',
    'settings.exchange_rates': 'Tasas de Cambio Actuales',
    
    // Reports
    'reports.title': 'Informes Financieros',
    'reports.subscriptions': 'Suscripciones',
    'reports.profit_loss': 'Estado de Resultados',
    'reports.balance_sheet': 'Balance General',
    'reports.cash_flow': 'Flujo de Efectivo',
    'reports.loading': 'Generando reportes...',
    
    // Investments
    'investments.title': 'Gestión de Inversiones',
    'investments.loading': 'Cargando inversiones...',
    'investments.add': 'Agregar Inversión',
    'investments.crypto': 'Criptomonedas',
    'investments.stocks': 'Acciones y ETFs',
    'investments.performance': 'Rendimiento',
    'investments.portfolio': 'Portafolio',
    
    // Common
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.edit': 'Editar',
    'common.delete': 'Eliminar',
    'common.add': 'Agregar',
    'common.loading': 'Cargando...',
    'common.search': 'Buscar',
    'common.filter': 'Filtrar',
    'common.sort': 'Ordenar',
    'common.actions': 'Acciones',
    'common.date': 'Fecha',
    'common.amount': 'Monto',
    'common.description': 'Descripción',
    'common.category': 'Categoría',
    'common.account': 'Cuenta',
    'common.currency': 'Moneda',
    'common.yes': 'Sí',
    'common.no': 'No',
    'common.close': 'Cerrar',
    'common.submit': 'Enviar',
    'common.update': 'Actualizar',
    'common.create': 'Crear',
  },
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.transactions': 'Transactions',
    'nav.investments': 'Investments',
    'nav.reports': 'Reports',
    'nav.settings': 'Settings',
    
    // Dashboard
    'dashboard.title': 'Financial Dashboard',
    'dashboard.loading': 'Loading financial data...',
    'dashboard.welcome': 'Welcome to your financial dashboard',
    'dashboard.total_balance': 'Total Balance',
    'dashboard.monthly_income': 'Monthly Income',
    'dashboard.monthly_expenses': 'Monthly Expenses',
    'dashboard.investments': 'Investments',
    'dashboard.recent_transactions': 'Recent Transactions',
    'dashboard.view_all': 'View all',
    'dashboard.no_transactions': 'No recent transactions',
    'dashboard.account_balances': 'Account Balances',
    
    // Transactions
    'transactions.title': 'Transaction Management',
    'transactions.add': 'Add Transaction',
    'transactions.edit': 'Edit Transaction',
    'transactions.delete': 'Delete',
    'transactions.date': 'Date',
    'transactions.account': 'Account',
    'transactions.category': 'Category',
    'transactions.amount': 'Amount',
    'transactions.comment': 'Comment',
    'transactions.type': 'Type',
    'transactions.income': 'Income',
    'transactions.expense': 'Expense',
    'transactions.contribution': 'Contribution',
    'transactions.loading': 'Loading transactions...',
    'transactions.no_transactions': 'No transactions to display',
    'transactions.import': 'Import',
    'transactions.export': 'Export',
    'transactions.filter': 'Filter',
    'transactions.clear_filters': 'Clear filters',
    'transactions.bulk_actions': 'Bulk actions',
    'transactions.select_all': 'Select all',
    'transactions.delete_selected': 'Delete selected',
    'transactions.change_category': 'Change category',
    
    // Settings
    'settings.title': 'Settings',
    'settings.loading': 'Loading settings...',
    'settings.profile': 'User Profile',
    'settings.language': 'Language',
    'settings.language.spanish': 'Español',
    'settings.language.english': 'English',
    'settings.accounts': 'Account Management',
    'settings.categories': 'Category Management',
    'settings.session': 'Session',
    'settings.about': 'About Savium',
    'settings.version': 'Version 1.2.0 · Developed by Manuel de la Torre · 2025',
    'settings.description': 'Savium is your personal finance application designed to help you take control of your money.',
    'settings.logout': 'Sign Out',
    'settings.clear_data': 'Delete All Transactions',
    'settings.clear_data.confirm': 'Are you sure?',
    'settings.clear_data.description': 'This action will permanently delete all transactions. This action cannot be undone.',
    'settings.clear_data.cancel': 'Cancel',
    'settings.clear_data.confirm_action': 'Delete all',
    'settings.exchange_rates': 'Current Exchange Rates',
    
    // Reports
    'reports.title': 'Financial Reports',
    'reports.subscriptions': 'Subscriptions',
    'reports.profit_loss': 'Profit & Loss',
    'reports.balance_sheet': 'Balance Sheet',
    'reports.cash_flow': 'Cash Flow',
    'reports.loading': 'Generating reports...',
    
    // Investments
    'investments.title': 'Investment Management',
    'investments.loading': 'Loading investments...',
    'investments.add': 'Add Investment',
    'investments.crypto': 'Cryptocurrencies',
    'investments.stocks': 'Stocks & ETFs',
    'investments.performance': 'Performance',
    'investments.portfolio': 'Portfolio',
    
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.add': 'Add',
    'common.loading': 'Loading...',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.sort': 'Sort',
    'common.actions': 'Actions',
    'common.date': 'Date',
    'common.amount': 'Amount',
    'common.description': 'Description',
    'common.category': 'Category',
    'common.account': 'Account',
    'common.currency': 'Currency',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.close': 'Close',
    'common.submit': 'Submit',
    'common.update': 'Update',
    'common.create': 'Create',
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('savium-language');
    return (saved as Language) || 'es';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('savium-language', lang);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    let translation = translations[language][key as keyof typeof translations[typeof language]] || key;
    
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        translation = translation.replace(`{{${paramKey}}}`, String(value));
      });
    }
    
    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};