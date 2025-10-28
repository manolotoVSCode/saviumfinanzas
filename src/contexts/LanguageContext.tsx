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
    'dashboard.assets': 'ACTIVOS',
    'dashboard.liabilities': 'PASIVOS',
    'dashboard.total_assets': 'TOTAL ACTIVOS',
    'dashboard.total_liabilities': 'TOTAL PASIVOS',
    'dashboard.cash_banks': 'Efectivo y Bancos',
    'dashboard.investments_label': 'Inversiones',
    'dashboard.credit_card': 'Tarjeta de Crédito',
    'dashboard.available_immediately': 'Dinero disponible inmediatamente',
    'dashboard.funds_stocks_etfs': 'Fondos, acciones y ETFs',
    'dashboard.business_assets': 'Activos empresariales',
    'dashboard.mortgage': 'Hipoteca',
    'dashboard.quick_start': 'Guía de Inicio Rápido',
    'dashboard.quick_start_description': 'Aprende a usar todas las funciones de tu gestor financiero',
    'dashboard.sample_data': 'Datos de ejemplo',
    'dashboard.sample_data_description': 'Estás viendo datos de muestra para que puedas explorar la aplicación. Cuando crees tu primera cuenta o categoría, estos datos se eliminarán automáticamente.',
    'dashboard.remove_now': 'Eliminar ahora',
    'dashboard.sample_data_removed': 'Datos de ejemplo eliminados correctamente',
    'dashboard.sample_data_error': 'Error al eliminar los datos de ejemplo',
    'dashboard.financial_health': 'Salud Financiera',
    'dashboard.advice_title': 'Consejo para subir de nivel',
    'dashboard.income_vs_expenses': 'Ingresos vs Gastos - Últimos 12 Meses',
    'dashboard.advice.excellent': 'Mantén tu disciplina financiera y considera diversificar más tus inversiones para optimizar el rendimiento a largo plazo.',
    'dashboard.advice.good': 'Aumenta tu fondo de emergencia a 6 meses de gastos y considera incrementar tus inversiones mensuales en un 10%.',
    'dashboard.advice.regular': 'Enfócate en reducir gastos innecesarios y destina al menos 20% de tus ingresos al ahorro e inversión.',
    'dashboard.advice.improvable': 'Prioriza pagar deudas de alta tasa de interés y crea un presupuesto detallado para controlar mejor tus gastos.',
    'dashboard.advice.critical': 'Busca asesoría financiera profesional, consolida tus deudas y considera fuentes adicionales de ingresos.',
    'dashboard.advice.default': 'Evalúa tu situación financiera y establece metas claras de ahorro e inversión.',
    'dashboard.monthly_result': 'Resultado del Mes',
    'dashboard.monthly_income_label': 'Ingresos del Mes',
    'dashboard.monthly_expenses_label': 'Gastos del Mes',
    'dashboard.annual_result': 'Resultado del Año',
    'dashboard.annual_income_label': 'Ingresos del Año',
    'dashboard.annual_expenses_label': 'Gastos del Año',
    'dashboard.expenses_distribution': 'Distribución Gastos',
    'dashboard.income_distribution': 'Distribución Ingresos',
    'dashboard.summary_month': 'Resumen',
    'dashboard.summary_year': 'Resumen del Año',
    
    // Welcome Guide
    'guide.step1.title': '1. Cuentas',
    'guide.step1.description': 'Gestiona tus cuentas bancarias, tarjetas e inversiones',
    'guide.step1.action': 'Crea tus cuentas en la sección principal',
    'guide.step2.title': '2. Categorías',
    'guide.step2.description': 'Organiza tus ingresos y gastos',
    'guide.step2.action': 'Configura categorías en Configuración',
    'guide.step3.title': '3. Transacciones',
    'guide.step3.description': 'Registra tus movimientos financieros',
    'guide.step3.action': 'Ve a Transacciones para empezar',
    'guide.step4.title': '4. Inversiones',
    'guide.step4.description': 'Gestiona tus activos digitales',
    'guide.step4.action': 'Explora el módulo de Inversiones',
    'guide.step5.title': '5. Reportes',
    'guide.step5.description': 'Analiza tu progreso financiero',
    'guide.step5.action': 'Consulta tus reportes detallados',
    'guide.step6.title': '6. Configuración',
    'guide.step6.description': 'Personaliza tu experiencia',
    'guide.step6.action': 'Ajusta la app a tus necesidades',
    'guide.previous': 'Anterior',
    'guide.next': 'Siguiente',
    'guide.step_count': '{{current}} de {{total}}',
    
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
    'settings.version': 'Versión 2.0.11 · Desarrollado por Manuel de la Torre · 2025',
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
    'dashboard.assets': 'ASSETS',
    'dashboard.liabilities': 'LIABILITIES',
    'dashboard.total_assets': 'TOTAL ASSETS',
    'dashboard.total_liabilities': 'TOTAL LIABILITIES',
    'dashboard.cash_banks': 'Cash & Banks',
    'dashboard.investments_label': 'Investments',
    'dashboard.credit_card': 'Credit Card',
    'dashboard.available_immediately': 'Money available immediately',
    'dashboard.funds_stocks_etfs': 'Funds, stocks and ETFs',
    'dashboard.business_assets': 'Business assets',
    'dashboard.mortgage': 'Mortgage',
    'dashboard.quick_start': 'Quick Start Guide',
    'dashboard.quick_start_description': 'Learn to use all the functions of your financial manager',
    'dashboard.sample_data': 'Sample data',
    'dashboard.sample_data_description': 'You are viewing sample data so you can explore the application. When you create your first account or category, this data will be automatically deleted.',
    'dashboard.remove_now': 'Remove now',
    'dashboard.sample_data_removed': 'Sample data removed successfully',
    'dashboard.sample_data_error': 'Error removing sample data',
    'dashboard.financial_health': 'Financial Health',
    'dashboard.advice_title': 'Advice to level up',
    'dashboard.income_vs_expenses': 'Income vs Expenses - Last 12 Months',
    'dashboard.advice.excellent': 'Maintain your financial discipline and consider diversifying your investments more to optimize long-term performance.',
    'dashboard.advice.good': 'Increase your emergency fund to 6 months of expenses and consider increasing your monthly investments by 10%.',
    'dashboard.advice.regular': 'Focus on reducing unnecessary expenses and allocate at least 20% of your income to savings and investment.',
    'dashboard.advice.improvable': 'Prioritize paying off high-interest debt and create a detailed budget to better control your expenses.',
    'dashboard.advice.critical': 'Seek professional financial advice, consolidate your debts and consider additional sources of income.',
    'dashboard.advice.default': 'Evaluate your financial situation and set clear savings and investment goals.',
    'dashboard.monthly_result': 'Monthly Result',
    'dashboard.monthly_income_label': 'Monthly Income',
    'dashboard.monthly_expenses_label': 'Monthly Expenses',
    'dashboard.annual_result': 'Annual Result',
    'dashboard.annual_income_label': 'Annual Income',
    'dashboard.annual_expenses_label': 'Annual Expenses',
    'dashboard.expenses_distribution': 'Expenses Distribution',
    'dashboard.income_distribution': 'Income Distribution',
    'dashboard.summary_month': 'Summary',
    'dashboard.summary_year': 'Year Summary',
    
    // Welcome Guide
    'guide.step1.title': '1. Accounts',
    'guide.step1.description': 'Manage your bank accounts, cards and investments',
    'guide.step1.action': 'Create your accounts in the main section',
    'guide.step2.title': '2. Categories',
    'guide.step2.description': 'Organize your income and expenses',
    'guide.step2.action': 'Configure categories in Settings',
    'guide.step3.title': '3. Transactions',
    'guide.step3.description': 'Record your financial movements',
    'guide.step3.action': 'Go to Transactions to get started',
    'guide.step4.title': '4. Investments',
    'guide.step4.description': 'Manage your digital assets',
    'guide.step4.action': 'Explore the Investments module',
    'guide.step5.title': '5. Reports',
    'guide.step5.description': 'Analyze your financial progress',
    'guide.step5.action': 'Check your detailed reports',
    'guide.step6.title': '6. Settings',
    'guide.step6.description': 'Customize your experience',
    'guide.step6.action': 'Adjust the app to your needs',
    'guide.previous': 'Previous',
    'guide.next': 'Next',
    'guide.step_count': '{{current}} of {{total}}',
    
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
    'settings.version': 'Version 2.0.11 · Developed by Manuel de la Torre · 2025',
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