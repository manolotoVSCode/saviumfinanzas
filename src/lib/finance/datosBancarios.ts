/**
 * Datos para identificar una cuenta bancaria según su país: CLABE en México,
 * número de cuenta y routing (ABA) en Estados Unidos, IBAN en Europa, y SWIFT/BIC
 * en todos para las transferencias internacionales.
 */
import { errorClabe } from './clabe';

export type CampoBancario = 'clabe' | 'numeroCuenta' | 'routing' | 'iban' | 'swift';

export interface PaisBancario {
  codigo: string;
  nombre: string;
  campos: CampoBancario[];
  /** Cómo se llama allí el código del banco o sucursal (campo routing). */
  etiquetaRouting?: string;
}

/** Países con IBAN: la cuenta se identifica con IBAN + SWIFT. */
const IBAN: CampoBancario[] = ['iban', 'swift'];

export const PAISES_BANCARIOS: PaisBancario[] = [
  { codigo: 'MX', nombre: 'México', campos: ['clabe', 'numeroCuenta', 'swift'] },
  { codigo: 'US', nombre: 'Estados Unidos', campos: ['numeroCuenta', 'routing', 'swift'], etiquetaRouting: 'Routing number (ABA)' },
  { codigo: 'CA', nombre: 'Canadá', campos: ['numeroCuenta', 'routing', 'swift'], etiquetaRouting: 'Transit e institución' },
  { codigo: 'ES', nombre: 'España', campos: IBAN },
  { codigo: 'DE', nombre: 'Alemania', campos: IBAN },
  { codigo: 'AD', nombre: 'Andorra', campos: IBAN },
  { codigo: 'AT', nombre: 'Austria', campos: IBAN },
  { codigo: 'BE', nombre: 'Bélgica', campos: IBAN },
  { codigo: 'FR', nombre: 'Francia', campos: IBAN },
  { codigo: 'IE', nombre: 'Irlanda', campos: IBAN },
  { codigo: 'IT', nombre: 'Italia', campos: IBAN },
  { codigo: 'LU', nombre: 'Luxemburgo', campos: IBAN },
  { codigo: 'NL', nombre: 'Países Bajos', campos: IBAN },
  { codigo: 'PT', nombre: 'Portugal', campos: IBAN },
  { codigo: 'GB', nombre: 'Reino Unido', campos: IBAN },
  { codigo: 'CH', nombre: 'Suiza', campos: IBAN },
  { codigo: 'ZZ', nombre: 'Otro país', campos: ['numeroCuenta', 'routing', 'iban', 'swift'], etiquetaRouting: 'Código del banco o sucursal' },
];

export const PAIS_POR_DEFECTO = 'MX';

export const paisBancario = (codigo?: string | null): PaisBancario =>
  PAISES_BANCARIOS.find(p => p.codigo === (codigo || PAIS_POR_DEFECTO)) ?? PAISES_BANCARIOS[PAISES_BANCARIOS.length - 1];

export const ETIQUETAS: Record<CampoBancario, string> = {
  clabe: 'CLABE',
  numeroCuenta: 'Número de cuenta',
  routing: 'Código del banco',
  iban: 'IBAN',
  swift: 'SWIFT / BIC',
};

/** Etiqueta corta para la lista de cuentas. */
export const ETIQUETAS_CORTAS: Record<CampoBancario, string> = {
  clabe: 'CLABE',
  numeroCuenta: 'Cta.',
  routing: 'Routing',
  iban: 'IBAN',
  swift: 'SWIFT',
};

export const etiquetaCampo = (campo: CampoBancario, pais: PaisBancario): string =>
  campo === 'routing' && pais.etiquetaRouting ? pais.etiquetaRouting : ETIQUETAS[campo];

/** Mayúsculas y sin espacios ni guiones: así se guarda todo. */
export const limpiarCodigo = (texto: string): string => texto.replace(/[\s-]/g, '').toUpperCase();

// ---- Routing number ABA (Estados Unidos): 9 dígitos con dígito de control.
// 3·(d1+d4+d7) + 7·(d2+d5+d8) + (d3+d6+d9) debe ser múltiplo de 10.
export const abaValido = (aba: string): boolean => {
  if (!/^\d{9}$/.test(aba)) return false;
  const d = [...aba].map(Number);
  const suma = 3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8]);
  return suma % 10 === 0;
};

// ---- IBAN (ISO 13616): los 4 primeros al final, letras a números (A=10…Z=35), mód 97 = 1.
export const ibanValido = (iban: string): boolean => {
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const reordenado = iban.slice(4) + iban.slice(0, 4);
  let resto = 0;
  for (const c of reordenado) {
    const v = c >= 'A' ? c.charCodeAt(0) - 55 : Number(c);
    resto = Number(`${resto}${v}`) % 97;
  }
  return resto === 1;
};

/** 'ES91 2100 0418 4502 0005 1332': de cuatro en cuatro para leerlo sin errores. */
export const formatearIban = (iban: string): string => iban.replace(/(.{4})(?=.)/g, '$1 ');

// ---- SWIFT/BIC: banco (4 letras), país (2 letras), plaza (2), sucursal opcional (3).
export const swiftValido = (swift: string): boolean => /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(swift);

/** null si el valor es válido (o está vacío); si no, el motivo para mostrar. */
export const errorCampo = (campo: CampoBancario, texto: string, pais: PaisBancario): string | null => {
  if (!texto.trim()) return null;
  const v = limpiarCodigo(texto);
  switch (campo) {
    case 'clabe':
      return errorClabe(texto);
    case 'numeroCuenta':
      return /^[A-Z0-9]{4,34}$/.test(v) ? null : 'El número de cuenta lleva solo letras y números (entre 4 y 34)';
    case 'routing':
      if (pais.codigo === 'US') {
        if (!/^\d{9}$/.test(v)) return `El routing number tiene 9 dígitos; este tiene ${v.replace(/\D/g, '').length}`;
        return abaValido(v) ? null : 'El dígito de control del routing number no cuadra: revisa que esté bien copiado';
      }
      return /^[A-Z0-9]{3,20}$/.test(v) ? null : 'El código del banco lleva solo letras y números';
    case 'iban':
      if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(v)) return 'El IBAN empieza por el código del país (2 letras) y 2 dígitos, y tiene entre 15 y 34 caracteres';
      if (pais.codigo !== 'ZZ' && v.slice(0, 2) !== pais.codigo) return `Un IBAN de ${pais.nombre} empieza por ${pais.codigo}`;
      return ibanValido(v) ? null : 'Los dígitos de control del IBAN no cuadran: revisa que esté bien copiado';
    case 'swift':
      return swiftValido(v) ? null : 'El SWIFT/BIC tiene 8 u 11 caracteres: 4 letras del banco, 2 del país y el resto letras o números';
  }
};

/** Valor tal como se muestra en la lista y en el formulario. */
export const formatearCampo = (campo: CampoBancario, valor: string): string =>
  campo === 'iban' ? formatearIban(valor) : valor;
