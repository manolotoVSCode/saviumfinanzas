export type TransactionType = 'Ingreso' | 'Gastos' | 'Aportación' | 'Retiro' | 'Reembolso';

export type AccountType = 'Efectivo' | 'Banco' | 'Tarjeta de Crédito' | 'Ahorros' | 'Inversiones' | 'Hipoteca' | 'Empresa Propia' | 'Bien Raíz';

export interface Category {
  id: string;
  subcategoria: string;
  categoria: string;
  tipo: TransactionType;
  seguimiento_pago?: boolean;
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
  // Campos adicionales para inversiones
  tipo_inversion?: 'Interés fijo' | 'Fondo variable' | 'Criptomoneda';
  modalidad?: 'Reinversión' | 'Pago mensual' | 'Pago trimestral';
  rendimiento_bruto?: number;
  rendimiento_neto?: number;
  fecha_inicio?: string;
  ultimo_pago?: string;
  // Campo para marcar propiedades como vendidas
  vendida?: boolean;
}

export interface Transaction {
  id: string;
  cuentaId: string;
  fecha: Date;
  comentario: string;
  ingreso: number;
  gasto: number;
  subcategoriaId: string;
  divisa: 'MXN' | 'USD' | 'EUR'; // Nueva propiedad
  csvId?: string; // ID original del CSV (opcional)
  created_at?: Date; // Fecha de creación en la base de datos
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
    bienRaiz: number;
    total: number;
  };
  activosPorMoneda: {
    MXN: { efectivoBancos: number; inversiones: number; empresasPrivadas: number; bienRaiz: number; total?: number };
    USD: { efectivoBancos: number; inversiones: number; empresasPrivadas: number; bienRaiz: number; total?: number };
    EUR: { efectivoBancos: number; inversiones: number; empresasPrivadas: number; bienRaiz: number; total?: number };
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
    score: number; // 0-100
    nivel: 'Excelente' | 'Buena' | 'Regular' | 'Mejorable' | 'Crítica';
    descripcion: string;
    detalles?: {
      liquidez: {
        puntos: number;
        maxPuntos: number;
        ratio: number;
        mesesCobertura: string;
      };
      ahorro: {
        puntos: number;
        maxPuntos: number;
        ratio: number;
        porcentaje: string;
      };
      endeudamiento: {
        puntos: number;
        maxPuntos: number;
        ratio: number;
        porcentaje: string;
      };
      rendimientoInversiones: {
        puntos: number;
        maxPuntos: number;
        rendimiento: number;
        porcentaje: string;
      };
      diversificacion: {
        puntos: number;
        maxPuntos: number;
        tiposActivos: string[];
      };
    };
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
  
  // Media de últimos 12 meses
  mediaIngresosUltimos12Meses: number;
  mediaGastosUltimos12Meses: number;
  
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