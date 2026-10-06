import { describe, expect, it } from 'vitest';
import { Category, Transaction } from '@/types/finance';
import { enrichTransactions } from './calculations';

const tx = (over: Partial<Transaction>): Transaction => ({
  id: 't', cuentaId: 'a1', fecha: new Date(2026, 8, 1), comentario: '', ingreso: 0, gasto: 0,
  monto: 0, subcategoriaId: 'c1', divisa: 'MXN', ...over,
});

describe('enrichTransactions', () => {
  const categories: Category[] = [
    { id: 'c1', categoria: 'Casa', subcategoria: 'Luz', tipo: 'Gastos' },
  ];

  it('añade categoría, subcategoría y tipo de la categoría', () => {
    const [t] = enrichTransactions([tx({ subcategoriaId: 'c1' })], categories);
    expect(t.categoria).toBe('Casa');
    expect(t.subcategoria).toBe('Luz');
    expect(t.tipo).toBe('Gastos');
  });

  it('marca SIN ASIGNAR cuando la categoría no existe', () => {
    const [t] = enrichTransactions([tx({ subcategoriaId: 'nope' })], categories);
    expect(t.categoria).toBe('SIN ASIGNAR');
    expect(t.subcategoria).toBe('SIN ASIGNAR');
    expect(t.tipo).toBeUndefined();
  });
});
