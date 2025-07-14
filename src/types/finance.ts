export type TransactionType = 'Ingreso' | 'Gastos' | 'Aportación' | 'Retiro';

export type AccountType = 'Efectivo' | 'Banco' | 'Tarjeta de Crédito' | 'Ahorros' | 'Inversiones' | 'Hipoteca' | 'Empresa Propia';

export interface Category {
  id: string;
  subcategoria: string;
  categoria: string;
  tipo: TransactionType;
}

export interface Account {
  id: string;
  nombre: string;
  tipo: AccountType;
  saldoInicial: number;
  saldoActual: number; // calculado
  valorMercado?: number; // solo para inversiones - valor actual del mercado
}

export interface Transaction {
  id: string;
  cuentaId: string;
  fecha: Date;
  comentario: string;
  ingreso: number;
  gasto: number;
  subcategoriaId: string;
  // campos calculados
  categoria?: string;
  monto: number; // ingreso - gasto
  tipo?: TransactionType;
}

export interface DashboardMetrics {
  // Balance general tradicional (mantener para compatibilidad)
  balanceTotal: number;
  
  // Nuevo balance estructurado
  activos: {
    efectivoBancos: number;
    inversiones: number;
    empresasPrivadas: number;
    total: number;
  };
  pasivos: {
    tarjetasCredito: number;
    hipoteca: number;
    total: number;
  };
  patrimonioNeto: number;
  patrimonioNetoAnterior: number;
  variacionPatrimonio: number;
  
  // Métricas mensuales
  ingresosMes: number;
  gastosMes: number;
  balanceMes: number;
  
  // Métricas anuales
  ingresosAnio: number;
  gastosAnio: number;
  balanceAnio: number;
  
  // Comparativo mes anterior
  ingresosMesAnterior: number;
  gastosMesAnterior: number;
  balanceMesAnterior: number;
  variacionIngresos: number; // porcentaje
  variacionGastos: number; // porcentaje
  
  // Comparativo año anterior
  ingresosAnioAnterior: number;
  gastosAnioAnterior: number;
  balanceAnioAnterior: number;
  variacionIngresosAnual: number; // porcentaje
  variacionGastosAnual: number; // porcentaje
  variacionBalanceAnual: number; // porcentaje
  
  // Score de salud financiera
  saludFinanciera: {
    score: number; // 0-10
    nivel: 'Excelente' | 'Buena' | 'Regular' | 'Mejorable' | 'Crítica';
    descripcion: string;
  };
  
  // Distribución de activos
  distribucionActivos: Array<{ categoria: string; monto: number; porcentaje: number }>;
  
  topCategorias: Array<{ categoria: string; monto: number; tipo: TransactionType }>;
  topCategoriasMesAnterior: Array<{ categoria: string; monto: number; tipo: TransactionType }>;
  topCategoriasAnual: Array<{ categoria: string; monto: number; tipo: TransactionType }>;
  cuentasResumen: Array<{ cuenta: string; saldo: number; tipo: AccountType }>;
  tendenciaMensual: Array<{ mes: string; ingresos: number; gastos: number }>;
  
  // Métricas de inversiones
  inversionesResumen: {
    totalInversiones: number;
    aportacionesMes: number;
    aportacionesMesAnterior: number;
    variacionAportaciones: number;
    cuentasInversion: Array<{ cuenta: string; saldo: number; saldoInicial: number; rendimiento: number }>;
  };
}