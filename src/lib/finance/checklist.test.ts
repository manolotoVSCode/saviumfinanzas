import { describe, expect, it } from 'vitest';
import { agruparChecklist, checklistAlerts, ChecklistItem, estaVencida } from './checklist';
import { computeAlerts } from './alerts';

const NOW = new Date(2026, 10, 9, 15, 0); // 9 nov 2026, 15:00 local

const item = (over: Partial<ChecklistItem>): ChecklistItem => ({
  id: 'a',
  texto: 'Actualizar transacción',
  fecha: null,
  transaccion_id: null,
  completada: false,
  completada_at: null,
  created_at: '2026-11-01T10:00:00Z',
  ...over,
});

describe('estaVencida', () => {
  it('el día de la fecha todavía no vence; al día siguiente sí', () => {
    expect(estaVencida(item({ fecha: '2026-11-09' }), NOW)).toBe(false);
    expect(estaVencida(item({ fecha: '2026-11-08' }), NOW)).toBe(true);
  });
  it('sin fecha o completada nunca vence', () => {
    expect(estaVencida(item({ fecha: null }), NOW)).toBe(false);
    expect(estaVencida(item({ fecha: '2026-01-01', completada: true }), NOW)).toBe(false);
  });
});

describe('agruparChecklist', () => {
  it('reparte en vencidas, próximas, sin fecha y completadas', () => {
    const g = agruparChecklist([
      item({ id: 'v2', fecha: '2026-11-05' }),
      item({ id: 'v1', fecha: '2026-11-01' }),
      item({ id: 'p', fecha: '2026-11-09' }),
      item({ id: 's' }),
      item({ id: 'c1', completada: true, completada_at: '2026-11-02T00:00:00Z' }),
      item({ id: 'c2', completada: true, completada_at: '2026-11-03T00:00:00Z', fecha: '2026-10-01' }),
    ], NOW);
    expect(g.vencidas.map(i => i.id)).toEqual(['v1', 'v2']);
    expect(g.proximas.map(i => i.id)).toEqual(['p']);
    expect(g.sinFecha.map(i => i.id)).toEqual(['s']);
    expect(g.completadas.map(i => i.id)).toEqual(['c2', 'c1']);
  });
});

describe('checklistAlerts', () => {
  it('una alerta alta por tarea vencida, con la fecha en la clave', () => {
    const alerts = checklistAlerts([
      item({ id: 'x', fecha: '2026-11-08' }),
      item({ id: 'y', fecha: '2026-11-10' }),
      item({ id: 'z', fecha: '2026-11-01', completada: true }),
    ], NOW);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ key: 'checklist:x:2026-11-08', type: 'checklist', severity: 'alta', href: '/checklist' });
    expect(alerts[0].detail).toBe('Venció hace 1 día y sigue sin completar');
  });

  it('computeAlerts las incluye', () => {
    const alerts = computeAlerts({
      categories: [], transactions: [], subscriptions: [], inactiveAnnualIds: new Set(),
      checklist: [item({ fecha: '2026-11-01' })], now: NOW,
    });
    expect(alerts.map(a => a.type)).toEqual(['checklist']);
  });
});
