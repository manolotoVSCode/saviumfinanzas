import type { Alert } from './alerts';
import { diasHasta, parseFechaLocal } from './fechas';

/** Fila de checklist_items (la fila completa es asignable). */
export interface ChecklistItem {
  id: string;
  texto: string;
  /** 'YYYY-MM-DD' o null si no tiene fecha. */
  fecha: string | null;
  transaccion_id: string | null;
  completada: boolean;
  completada_at: string | null;
  created_at: string;
}

export type GrupoChecklist = 'vencidas' | 'proximas' | 'sinFecha' | 'completadas';

/** Vencida: sin completar y su fecha ya pasó (el día de la fecha todavía no cuenta). */
export const estaVencida = (item: Pick<ChecklistItem, 'fecha' | 'completada'>, now: Date = new Date()): boolean =>
  !item.completada && item.fecha !== null && diasHasta(item.fecha, now) < 0;

const porFecha = (a: ChecklistItem, b: ChecklistItem) =>
  (a.fecha ?? '').localeCompare(b.fecha ?? '') || a.created_at.localeCompare(b.created_at);

/**
 * Reparte las tareas en los cuatro grupos de la página Checklist.
 * Vencidas y próximas por fecha (la más antigua primero); completadas, la última completada primero.
 */
export const agruparChecklist = (items: ChecklistItem[], now: Date = new Date()): Record<GrupoChecklist, ChecklistItem[]> => {
  const grupos: Record<GrupoChecklist, ChecklistItem[]> = { vencidas: [], proximas: [], sinFecha: [], completadas: [] };
  for (const item of items) {
    if (item.completada) grupos.completadas.push(item);
    else if (item.fecha === null) grupos.sinFecha.push(item);
    else if (estaVencida(item, now)) grupos.vencidas.push(item);
    else grupos.proximas.push(item);
  }
  grupos.vencidas.sort(porFecha);
  grupos.proximas.sort(porFecha);
  grupos.sinFecha.sort((a, b) => a.created_at.localeCompare(b.created_at));
  grupos.completadas.sort((a, b) => (b.completada_at ?? '').localeCompare(a.completada_at ?? ''));
  return grupos;
};

/**
 * Una alerta por tarea vencida. La clave lleva la fecha: si se descarta y luego se cambia
 * la fecha, vuelve a avisar al vencer la nueva.
 */
export const checklistAlerts = (items: ChecklistItem[], now: Date): Alert[] =>
  items
    .filter(item => estaVencida(item, now))
    .sort(porFecha)
    .map(item => {
      const dias = -diasHasta(item.fecha as string, now);
      return {
        key: `checklist:${item.id}:${item.fecha}`,
        type: 'checklist',
        title: item.texto,
        detail: `Venció hace ${dias} ${dias === 1 ? 'día' : 'días'} y sigue sin completar`,
        currency: 'MXN',
        date: parseFechaLocal(item.fecha as string),
        href: '/checklist',
        severity: 'alta',
      };
    });
