// Saldos por unidad. Nunca mezcla unidades distintas; agrupa sin distinguir mayúsculas, acentos ni espacios.
// Misma especificación que RewardsCore/Totales.swift.
import { unidadDe, type Programa, type Tarjeta } from "./tipos";

export interface TotalUnidad { unidad: string; total: number }

const clave = (u: string) => u.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function porUnidad(tarjetas: Tarjeta[], programas: Map<string, Programa>): TotalUnidad[] {
  const totales = new Map<string, TotalUnidad & { orden: number }>();
  for (const t of tarjetas) {
    if (t.borrado || t.saldo === null) continue;
    const unidad = unidadDe(t, t.programa_id ? programas.get(t.programa_id) : undefined).trim();
    const k = clave(unidad);
    const actual = totales.get(k);
    if (actual) actual.total += t.saldo;
    else totales.set(k, { unidad, total: t.saldo, orden: totales.size });
  }
  return [...totales.values()]
    .sort((a, b) => (b.total !== a.total ? b.total - a.total : a.orden - b.orden))
    .map(({ unidad, total }) => ({ unidad, total }));
}
