import { supabase } from '@/integrations/supabase/client';
import { Account, AccountType, Category, Transaction, TransactionType } from '@/types/finance';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = { [key: string]: any };

export const mapAccounts = (cuentasData: Row[]): Account[] => {
  const mappedAccounts: Account[] = cuentasData.map(cuenta => ({
    id: cuenta.id,
    nombre: cuenta.nombre,
    tipo: cuenta.tipo as AccountType,
    saldoInicial: Number(cuenta.saldo_inicial),
    saldoActual: Number(cuenta.saldo_inicial), // Se calculará después
    divisa: cuenta.divisa as 'MXN' | 'USD' | 'EUR',
    valorMercado: cuenta.valor_mercado ? Number(cuenta.valor_mercado) : undefined,
    rendimientoMensual: cuenta.rendimiento_mensual ? Number(cuenta.rendimiento_mensual) : undefined,
    vendida: cuenta.vendida || false,
    // Nuevos campos de inversión
    tipo_inversion: cuenta.tipo_inversion as 'Interés fijo' | 'Fondo variable' | 'Criptomoneda' | undefined,
    modalidad: cuenta.modalidad as 'Reinversión' | 'Pago mensual' | 'Pago trimestral' | undefined,
    rendimiento_bruto: cuenta.rendimiento_bruto ? Number(cuenta.rendimiento_bruto) : undefined,
    rendimiento_neto: cuenta.rendimiento_neto ? Number(cuenta.rendimiento_neto) : undefined,
    fecha_inicio: cuenta.fecha_inicio,
    ultimo_pago: cuenta.ultimo_pago
  }));
  return mappedAccounts;
};

export const mapCategories = (categoriasData: Row[]): Category[] => {
  const mappedCategories: Category[] = categoriasData.map(categoria => ({
    id: categoria.id,
    subcategoria: categoria.subcategoria,
    categoria: categoria.categoria,
    tipo: categoria.tipo as TransactionType,
    seguimiento_pago: Boolean(categoria.seguimiento_pago),
    frecuencia_seguimiento: (categoria as any).frecuencia_seguimiento as 'mensual' | 'anual' | null
  }));
  return mappedCategories;
};

export const mapTransactions = (transaccionesData: Row[]): Transaction[] => {
  const mappedTransactions: Transaction[] = transaccionesData.map(transaccion => ({
    id: transaccion.id,
    fecha: new Date(transaccion.fecha),
    comentario: transaccion.comentario,
    monto: Number(transaccion.ingreso) - Number(transaccion.gasto),
    ingreso: Number(transaccion.ingreso),
    gasto: Number(transaccion.gasto),
    subcategoriaId: transaccion.subcategoria_id,
    cuentaId: transaccion.cuenta_id,
    divisa: transaccion.divisa as 'MXN' | 'USD' | 'EUR',
    csvId: transaccion.csv_id,
    created_at: new Date(transaccion.created_at),
    tarjetahabiente: (transaccion as any).tarjetahabiente || undefined
  }));
  return mappedTransactions;
};

export const fetchAccounts = async (): Promise<Account[]> => {
  const { data, error } = await supabase.from('cuentas').select('*');
  if (error) throw error;
  return mapAccounts(data ?? []);
};

export const fetchCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase.from('categorias').select('*');
  if (error) throw error;
  return mapCategories(data ?? []);
};

/** Supabase/PostgREST capea en 1000 filas por request, así que paginamos. */
export const fetchTransactions = async (): Promise<Transaction[]> => {
  const pageSize = 1000;
  let all: Row[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('transacciones')
      .select('*')
      .order('fecha', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const rows = data ?? [];
    all = all.concat(rows);

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return mapTransactions(all);
};
