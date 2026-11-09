/**
 * CLABE interbancaria: 18 dígitos (banco 3, plaza 3, cuenta 11, control 1).
 * Dígito de control: cada uno de los 17 primeros por 3, 7, 1, 3, 7, 1…, se suma
 * cada producto módulo 10, y el control es (10 − suma mód 10) mód 10.
 */
const PESOS = [3, 7, 1];

/** Solo los dígitos (quita espacios y guiones al pegarla). */
export const limpiarClabe = (texto: string): string => texto.replace(/\D/g, '');

export const digitoControlClabe = (primeros17: string): number => {
  const suma = [...primeros17].reduce((s, d, i) => s + ((Number(d) * PESOS[i % 3]) % 10), 0);
  return (10 - (suma % 10)) % 10;
};

/** null si es válida (o está vacía); si no, el motivo para mostrar. */
export const errorClabe = (texto: string): string | null => {
  const clabe = limpiarClabe(texto);
  if (!clabe) return null;
  if (clabe.length !== 18) return `La CLABE tiene 18 dígitos; esta tiene ${clabe.length}`;
  if (digitoControlClabe(clabe.slice(0, 17)) !== Number(clabe[17])) return 'El dígito de control no cuadra: revisa que esté bien copiada';
  return null;
};

/** '012 180 01234567890 1' (banco, plaza, cuenta, control) para leerla sin errores. */
export const formatearClabe = (clabe: string): string =>
  clabe.length === 18 ? `${clabe.slice(0, 3)} ${clabe.slice(3, 6)} ${clabe.slice(6, 17)} ${clabe[17]}` : clabe;
