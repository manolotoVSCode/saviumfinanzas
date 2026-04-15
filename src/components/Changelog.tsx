import { Badge } from '@/components/ui/badge';
import { Sparkles, Shield, BarChart3, Upload, Wallet, Tag, Globe, Users, Bug, Zap } from 'lucide-react';

interface ChangelogEntry {
  version: string;
  date: string;
  changes: { icon: React.ReactNode; text: string; type: 'feature' | 'fix' | 'improvement' }[];
}

const changelog: ChangelogEntry[] = [
  {
    version: '6.2',
    date: 'Abril 2026',
    changes: [
      { icon: <Users className="h-4 w-4" />, text: 'Categorías, cuentas y reglas de clasificación por defecto para nuevos usuarios', type: 'feature' },
      { icon: <Tag className="h-4 w-4" />, text: 'Reglas de clasificación con filtro por cuenta (misma keyword, diferente cuenta → diferente categoría)', type: 'feature' },
      { icon: <Shield className="h-4 w-4" />, text: 'Protección de usuario master en administración', type: 'improvement' },
    ],
  },
  {
    version: '6.1',
    date: 'Marzo 2026',
    changes: [
      { icon: <Tag className="h-4 w-4" />, text: 'Motor de reglas de clasificación automática con coincidencia exacta/contiene y prioridad', type: 'feature' },
      { icon: <Upload className="h-4 w-4" />, text: 'Aplicación automática de reglas durante importación de estados de cuenta', type: 'feature' },
      { icon: <Tag className="h-4 w-4" />, text: 'Página dedicada para gestión de reglas de clasificación', type: 'feature' },
    ],
  },
  {
    version: '6.0',
    date: 'Febrero 2026',
    changes: [
      { icon: <Upload className="h-4 w-4" />, text: 'Importador inteligente de transacciones con IA para clasificación automática', type: 'feature' },
      { icon: <Upload className="h-4 w-4" />, text: 'Soporte de importación CSV y Excel con detección automática de formato', type: 'improvement' },
      { icon: <Bug className="h-4 w-4" />, text: 'Corrección de parsing de fechas en formato serial de Excel e ISO', type: 'fix' },
    ],
  },
  {
    version: '5.0',
    date: 'Enero 2026',
    changes: [
      { icon: <BarChart3 className="h-4 w-4" />, text: 'Análisis de categorías con gráficos Sunburst, Treemap y Barras Apiladas', type: 'feature' },
      { icon: <BarChart3 className="h-4 w-4" />, text: 'Top 10 categorías en dashboard con desglose de subcategorías y drill-down a transacciones', type: 'feature' },
      { icon: <Wallet className="h-4 w-4" />, text: 'Separación de activos y pasivos por divisa en dashboard', type: 'improvement' },
      { icon: <BarChart3 className="h-4 w-4" />, text: 'Gráfico de ingresos vs gastos con media anual', type: 'improvement' },
      { icon: <Zap className="h-4 w-4" />, text: 'Paginación para carga de datos (+1000 registros)', type: 'fix' },
    ],
  },
  {
    version: '4.0',
    date: 'Septiembre - Diciembre 2025',
    changes: [
      { icon: <BarChart3 className="h-4 w-4" />, text: 'Informes: P&L, Balance General, Flujo de Efectivo, Activos y Pasivos', type: 'feature' },
      { icon: <BarChart3 className="h-4 w-4" />, text: 'Comparativo mensual de ingresos con análisis de tendencia', type: 'feature' },
      { icon: <Wallet className="h-4 w-4" />, text: 'Detección y gestión de suscripciones recurrentes', type: 'feature' },
      { icon: <BarChart3 className="h-4 w-4" />, text: 'Seguimiento de pagos anuales con predicción de próximo pago', type: 'feature' },
      { icon: <Wallet className="h-4 w-4" />, text: 'Sistema de reembolsos (ingresos en categorías de gasto = reembolso)', type: 'feature' },
      { icon: <Upload className="h-4 w-4" />, text: 'Importador de estados de cuenta bancarios (CSV/Excel)', type: 'feature' },
      { icon: <Bug className="h-4 w-4" />, text: 'Correcciones en cálculos de dashboard y reportes', type: 'fix' },
    ],
  },
  {
    version: '3.0',
    date: 'Agosto 2025',
    changes: [
      { icon: <Shield className="h-4 w-4" />, text: 'Administración de usuarios con roles (admin/user) y RLS', type: 'feature' },
      { icon: <Users className="h-4 w-4" />, text: 'Creación de usuarios por admin con email de bienvenida y magic link', type: 'feature' },
      { icon: <Sparkles className="h-4 w-4" />, text: 'Datos de ejemplo para nuevos usuarios con opción de limpiar', type: 'feature' },
      { icon: <Globe className="h-4 w-4" />, text: 'Criptomonedas: tracking de portfolio con precios en tiempo real', type: 'feature' },
      { icon: <Shield className="h-4 w-4" />, text: 'Migración completa a Supabase con autenticación y RLS', type: 'improvement' },
    ],
  },
  {
    version: '2.0',
    date: 'Julio 2025',
    changes: [
      { icon: <BarChart3 className="h-4 w-4" />, text: 'Dashboard con balance general: Activos, Pasivos y Patrimonio Neto', type: 'feature' },
      { icon: <Wallet className="h-4 w-4" />, text: 'Tipos de cuenta: Banco, Tarjeta de Crédito, Efectivo, Inversiones, Bienes Raíces', type: 'feature' },
      { icon: <BarChart3 className="h-4 w-4" />, text: 'Gráficos interactivos con recharts (dona, líneas, barras)', type: 'feature' },
      { icon: <Wallet className="h-4 w-4" />, text: 'Score de salud financiera con consejos personalizados', type: 'feature' },
      { icon: <Globe className="h-4 w-4" />, text: 'Soporte multi-divisa (MXN, USD, EUR) con tasas de cambio', type: 'feature' },
    ],
  },
  {
    version: '1.0',
    date: 'Julio 2025',
    changes: [
      { icon: <Sparkles className="h-4 w-4" />, text: 'Versión inicial: gestión de transacciones, cuentas y categorías', type: 'feature' },
      { icon: <Zap className="h-4 w-4" />, text: 'Navegación fija inferior estilo app móvil', type: 'feature' },
      { icon: <Wallet className="h-4 w-4" />, text: 'Dashboard con resumen mensual e indicadores', type: 'feature' },
    ],
  },
];

const typeBadge = (type: 'feature' | 'fix' | 'improvement') => {
  switch (type) {
    case 'feature': return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-[10px]">Nuevo</Badge>;
    case 'fix': return <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-[10px]">Fix</Badge>;
    case 'improvement': return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-[10px]">Mejora</Badge>;
  }
};

export const Changelog = () => {
  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {changelog.map((entry) => (
          <div key={entry.version} className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-sm">v{entry.version}</Badge>
              <span className="text-sm text-muted-foreground">{entry.date}</span>
            </div>
            <div className="ml-2 border-l-2 border-muted pl-4 space-y-2">
              {entry.changes.map((change, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground mt-0.5 shrink-0">{change.icon}</span>
                  <span className="flex-1">{change.text}</span>
                  {typeBadge(change.type)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
