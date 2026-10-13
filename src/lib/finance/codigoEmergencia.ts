// Código de coacción de la alerta de emergencia (app iOS). Solo se guarda su hash, calculado aquí en el navegador
// igual que en la app y en Postgres: sha256('savium-coaccion:' + user_id + ':' + código).

export async function hashCodigoEmergencia(codigo: string, userId: string): Promise<string> {
  const texto = `savium-coaccion:${userId.toLowerCase()}:${codigo.trim()}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** null si es válido; si no, el motivo. */
export function validarCodigoEmergencia(codigo: string, confirmacion: string): string | null {
  const c = codigo.trim();
  if (c.length < 4) return 'El código debe tener al menos 4 caracteres.';
  if (/\s/.test(c)) return 'El código no puede llevar espacios.';
  if (c !== confirmacion.trim()) return 'Los códigos no coinciden.';
  return null;
}

export function validarEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
}
