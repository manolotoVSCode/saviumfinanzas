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
  divisa: 'MXN' | 'USD' | 'EUR';
  valorMercado?: number; // solo para inversiones - valor actual del mercado
  rendimientoMensual?: number; // rendimiento mensual manual para inversiones
}

export interface Transaction {
  id: string;
  cuentaId: string;
  fecha: Date;
  comentario: string;
  ingreso: number;
  gasto: number;
  subcategoriaId: string;
  csvId?: string; // ID original del CSV (opcional)
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
  activosPorMoneda: {
    MXN: { efectivoBancos: number; inversiones: number; empresasPrivadas: number; total?: number };
    USD: { efectivoBancos: number; inversiones: number; empresasPrivadas: number; total?: number };
    EUR: { efectivoBancos: number; inversiones: number; empresasPrivadas: number; total?: number };
  };
  pasivos: {
    tarjetasCredito: number;
    hipoteca: number;
    total: number;
  };
  pasivosPorMoneda: {
    MXN: { tarjetasCredito: number; hipoteca: number; total?: number };
    USD: { tarjetasCredito: number; hipoteca: number; total?: number };
    EUR: { tarjetasCredito: number; hipoteca: number; total?: number };
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
  
  // Datos del mes anterior (dinámico)
  ingresosMesAnterior: number;
  gastosMesAnterior: number;
  balanceMesAnterior: number;
  
  // Variaciones mes actual vs mes anterior
  variacionIngresosMes: number; // porcentaje
  variacionGastosMes: number; // porcentaje
  
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
  
  // Distribución de activos y pasivos
  distribucionActivos: Array<{ categoria: string; monto: number; porcentaje: number }>;
  distribucionPasivos: Array<{ categoria: string; monto: number; porcentaje: number }>;
  
  topCategorias: Array<{ categoria: string; monto: number; tipo: TransactionType }>;
  topCategoriasMesAnterior: Array<{ categoria: string; monto: number; tipo: TransactionType }>;
  topCategoriasAnual: Array<{ categoria: string; monto: number; tipo: TransactionType }>;
  
  // Distribuciones específicas por tipo
  topCategoriasGastos: Array<{ categoria: string; monto: number; tipo: TransactionType }>;
  topCategoriasGastosMesAnterior: Array<{ categoria: string; monto: number; tipo: TransactionType }>;
  topCategoriasGastosAnual: Array<{ categoria: string; monto: number; tipo: TransactionType }>;
  topCategoriasIngresos: Array<{ categoria: string; monto: number; tipo: TransactionType }>;
  topCategoriasIngresosMesAnterior: Array<{ categoria: string; monto: number; tipo: TransactionType }>;
  topCategoriasIngresosAnual: Array<{ categoria: string; monto: number; tipo: TransactionType }>;
  cuentasResumen: Array<{ cuenta: string; saldo: number; tipo: AccountType }>;
  tendenciaMensual: Array<{ mes: string; ingresos: number; gastos: number }>;
  
  // Métricas de inversiones
  inversionesResumen: {
    totalInversiones: number;
    aportacionesMes: number;
    aportacionesMesAnterior: number;
    variacionAportaciones: number;
    aportacionesPorMes: Array<{ mes: string; monto: number }>;
    retirosPorMes: Array<{ mes: string; monto: number }>;
    totalAportadoAnual: number;
    totalRetiradoAnual: number;
    rendimientoAnualTotal: number;
    rendimientoAnualPorcentaje: number;
    cuentasInversion: Array<{ cuenta: string; id: string; saldo: number; saldoInicial: number; rendimiento: number; movimientosPorMes: Array<{ mes: string; aportaciones: number; retiros: number }> }>;
  };
}