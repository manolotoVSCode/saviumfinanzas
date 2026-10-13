// Tipos de las tablas rewards_* (snake_case, tal cual llegan de PostgREST).

export const TIPOS_CODIGO = ["qr", "code128", "ean13", "ean8", "upca", "code39", "pdf417", "aztec", "ninguno"] as const;
export type TipoCodigo = (typeof TIPOS_CODIGO)[number];

export const TIPOS_PROGRAMA = ["tarjeta_credito", "aerolinea", "hotel", "comercio"] as const;
export type TipoPrograma = (typeof TIPOS_PROGRAMA)[number];

export interface Programa {
  id: string;
  nombre: string;
  tipo: TipoPrograma;
  pais: "MX" | "ES" | "INT";
  color: string;
  unidad: string;
  codigo_tipo: TipoCodigo;
  activo: boolean;
}

export interface Tarjeta {
  id: string;
  user_id: string;
  programa_id: string | null;
  nombre: string | null;
  color: string | null;
  unidad: string | null;
  numero_socio: string | null;
  codigo_valor: string | null;
  codigo_tipo: TipoCodigo;
  titular: string | null;
  saldo: number | null;
  saldo_fecha: string | null;
  caducidad: string | null;
  notas: string | null;
  compartida: boolean;
  orden: number;
  actualizado: string;
  sincronizado?: string;
  borrado: boolean;
}

export interface Miembro {
  user_id: string;
  familia_id: string;
  nombre: string;
  rol: "admin" | "miembro";
  pais: "MX" | "ES";
}

export const NOMBRE_TIPO_CODIGO: Record<TipoCodigo, string> = {
  qr: "QR", code128: "Code 128", ean13: "EAN-13", ean8: "EAN-8", upca: "UPC-A",
  code39: "Code 39", pdf417: "PDF417", aztec: "Aztec", ninguno: "Sin código",
};

export const NOMBRE_TIPO_PROGRAMA: Record<TipoPrograma, string> = {
  tarjeta_credito: "Tarjetas de crédito", aerolinea: "Aerolíneas", hotel: "Hoteles", comercio: "Comercios",
};

export const SALDO_MAXIMO = 1_000_000_000_000;

export const titulo = (t: Tarjeta, p?: Programa) => t.nombre ?? p?.nombre ?? "";
export const unidadDe = (t: Tarjeta, p?: Programa) => t.unidad ?? p?.unidad ?? "puntos";
export const colorDe = (t: Tarjeta, p?: Programa) => t.color ?? p?.color ?? "#4F8248";

/** «aaaa-mm-dd» → «13 oct 2026». */
export function dia(texto: string | null): string | null {
  if (!texto) return null;
  const [a, m, d] = texto.split("-").map(Number);
  if (!a || !m || !d) return null;
  return new Date(a, m - 1, d).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}
