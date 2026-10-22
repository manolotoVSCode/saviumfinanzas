/**
 * Administrador de Savium (manoloto@gmail.com). Solo él ve los paneles de las apps (la función share_panel
 * de la base de datos lo comprueba también: error 42501 para los demás), «Para mi familia» y los contactos
 * y el código de la alerta de emergencia. Las demás cuentas titulares (amigos) tienen todo lo demás.
 */
export const ADMIN_ID = '01ad1bcc-00e7-47a7-88b6-8b2fc8afa52e';

export const esAdmin = (userId?: string | null) => userId === ADMIN_ID;
