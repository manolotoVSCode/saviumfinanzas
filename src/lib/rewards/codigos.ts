// Copia de SaviumRewards/web/src/lib (misma especificación que RewardsCore en la app). Casos comunes en
// shared/fixtures/rewards-codigos.json, copiado de SaviumRewards/shared/fixtures/codigos.json.
// Validación de los contenidos de cada tipo de código. Misma especificación que RewardsCore/Codigos.swift
// (casos comunes en shared/fixtures/codigos.json).
import type { TipoCodigo } from "./tipos";

export type Motivo = "vacio" | "longitud" | "caracteres" | "digitoControl" | "noAdmiteValor" | "demasiadoLargo";

export const LONGITUD_MAXIMA = 512;
const CODE39 = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%");
const LONGITUD_NUMERICA: Partial<Record<TipoCodigo, number>> = { ean13: 13, ean8: 8, upca: 12 };

export const MOTIVOS: Record<Motivo, string> = {
  vacio: "Escribe el código.",
  longitud: "El número no tiene la longitud de este tipo de código.",
  caracteres: "Tiene caracteres que este tipo de código no admite.",
  digitoControl: "El último dígito no cuadra: revisa el número.",
  noAdmiteValor: "Sin código no lleva contenido.",
  demasiadoLargo: "Es demasiado largo.",
};

export function normalizar(valor: string, tipo: TipoCodigo): string {
  const recortado = valor.trim();
  return LONGITUD_NUMERICA[tipo] ? recortado.replace(/\s+/g, "") : recortado;
}

/** Dígito de control GS1 (EAN/UPC): pesos 3 y 1 alternos empezando por la derecha. */
export function digitoControl(digitos: string): number | null {
  if (!/^[0-9]+$/.test(digitos)) return null;
  let suma = 0;
  [...digitos].reverse().forEach((c, i) => { suma += Number(c) * (i % 2 === 0 ? 3 : 1); });
  return (10 - (suma % 10)) % 10;
}

/** Devuelve null si es válido, o el motivo por el que no lo es. */
export function validar(bruto: string, tipo: TipoCodigo): Motivo | null {
  const valor = normalizar(bruto, tipo);
  if (tipo === "ninguno") return valor === "" ? null : "noAdmiteValor";
  if (valor === "") return "vacio";
  if ([...valor].length > LONGITUD_MAXIMA) return "demasiadoLargo";
  const longitud = LONGITUD_NUMERICA[tipo];
  if (longitud) {
    if (!/^[0-9]+$/.test(valor)) return "caracteres";
    if (valor.length !== longitud) return "longitud";
    return digitoControl(valor.slice(0, -1)) === Number(valor.slice(-1)) ? null : "digitoControl";
  }
  if (tipo === "code39") return [...valor].every((c) => CODE39.has(c)) ? null : "caracteres";
  if (tipo === "code128") return /^[\x20-\x7E]+$/.test(valor) ? null : "caracteres";
  return null;
}

/** Si falta solo el dígito de control, devuelve el código completo. */
export function completar(bruto: string, tipo: TipoCodigo): string | null {
  const longitud = LONGITUD_NUMERICA[tipo];
  const valor = bruto.replace(/\s+/g, "");
  if (!longitud || valor.length !== longitud - 1) return null;
  const d = digitoControl(valor);
  return d === null ? null : valor + d;
}
