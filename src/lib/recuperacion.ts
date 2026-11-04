export type ModoRecuperacion = 'nueva' | 'caducado';

/**
 * Lee el fragmento con el que vuelve el correo de recuperación de Supabase
 * (`#access_token=…&type=recovery` o `#error=…&error_code=otp_expired`).
 * Las rutas de HashRouter (`#/dashboard`) no son recuperación.
 */
export const detectarRecuperacion = (hash: string): ModoRecuperacion | null => {
  const crudo = hash.replace(/^#/, '');
  if (!crudo || crudo.startsWith('/')) return null;
  const parametros = new URLSearchParams(crudo);
  if (parametros.get('type') === 'recovery' && parametros.get('access_token')) return 'nueva';
  if (parametros.get('error_code')) return 'caducado';
  return null;
};

export const MINIMO_CONTRASENA = 8;

export const validarNuevaContrasena = (clave: string, repetida: string): string | null => {
  if (clave.length < MINIMO_CONTRASENA) return `Usa al menos ${MINIMO_CONTRASENA} caracteres.`;
  if (clave !== repetida) return 'Las contraseñas no coinciden.';
  return null;
};

// Se evalúa al cargar: el cliente de Supabase limpia el fragmento en cuanto procesa el enlace.
export const modoRecuperacionInicial: ModoRecuperacion | null =
  typeof window === 'undefined' ? null : detectarRecuperacion(window.location.hash);
