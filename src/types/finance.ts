export type TransactionType = 'Ingreso' | 'Gastos' | 'Aportación' | 'Retiro';

export type AccountType = 'Efectivo' | 'Banco' | 'Tarjeta de Crédito' | 'Ahorros' | 'Inversiones';

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
  balanceTotal: number;
  ingresosMes: number;
  gastosMes: number;
  balanceMes: number;
  // Comparativo mes anterior
  ingresosMesAnterior: number;
  gastosMesAnterior: number;
  balanceMesAnterior: number;
  variacionIngresos: number; // porcentaje
  variacionGastos: number; // porcentaje
  topCategorias: Array<{ categoria: string; monto: number; tipo: TransactionType }>;
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