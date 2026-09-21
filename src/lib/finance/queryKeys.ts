/**
 * Claves de caché de TanStack Query. Prefijadas por usuario para que un cambio
 * de sesión no reutilice datos ajenos (signOut hace queryClient.clear()).
 */
export const financeQueryKeys = (userId: string | undefined) => ({
  cuentas: ['finance', userId, 'cuentas'] as const,
  categorias: ['finance', userId, 'categorias'] as const,
  transacciones: ['finance', userId, 'transacciones'] as const,
  subscriptions: ['finance', userId, 'subscriptions'] as const,
  perfil: ['finance', userId, 'perfil'] as const,
  pendientes: ['finance', userId, 'pendientes'] as const,
  inversiones: ['finance', userId, 'inversiones'] as const,
  tiposInversion: ['finance', userId, 'tiposInversion'] as const,
  reglas: ['finance', userId, 'reglas'] as const,
  criptomonedas: ['finance', userId, 'criptomonedas'] as const,
  criptoPrecios: ['finance', userId, 'criptoPrecios'] as const,
  paymentSkips: ['finance', userId, 'paymentSkips'] as const,
  alertDismissals: ['finance', userId, 'alertDismissals'] as const,
});

/** Tipos de cambio: no dependen del usuario. */
export const EXCHANGE_RATES_KEY = ['exchange-rates'] as const;

// Los datos solo cambian desde esta app, así que se consideran frescos un buen rato;
// al volver a la pestaña pasado ese tiempo se refrescan solos.
export const STALE_TIME = 5 * 60 * 1000;
