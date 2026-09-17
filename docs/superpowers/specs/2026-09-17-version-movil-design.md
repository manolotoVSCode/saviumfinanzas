# Versión móvil reducida — diseño

Fecha: 2026-09-17. Estado: aprobado por el usuario en chat.

## Objetivo

En pantallas de menos de 768px, Savium muestra una versión reducida de solo lectura:
navegación rápida, letra grande, sin formularios, sin importar ni subir transacciones.
La versión de escritorio no cambia.

## Activación

Automática por ancho, con el `useIsMobile()` existente (`< 768px`). Sin toggle ni
ruta aparte. Las rutas son las mismas que en escritorio para que un enlace funcione
en ambos.

## Estructura

- `src/components/movil/MobileLayout.tsx`: cabecera + contenido + nav inferior.
  - Cabecera: logo pequeño a la izquierda; a la derecha selector de divisa
    (tres chips MXN/USD/EUR) e icono de cerrar sesión. Sin buscador global.
  - Nav inferior de 5 pestañas, 64px de alto más `env(safe-area-inset-bottom)`:
    Resumen (`/dashboard`) · Inversiones (`/inversiones`) · Suscripciones
    (`/suscripciones`) · Por cobrar (`/pendientes`) · Por pagar (`/cxp`).
    Badge rojo con `overdueCount` de `usePendings` en "Por cobrar".
- `src/pages/movil/`: `ResumenMovil`, `InversionesMovil`, `SuscripcionesMovil`,
  `PorCobrarMovil`, `PorPagarMovil`, `SoloEscritorio`.
- `src/contexts/MobileCurrencyContext.tsx` (o hook equivalente): divisa elegida,
  persistida en `localStorage` (`savium.movil.divisa`), valor inicial la
  `divisa_preferida` del perfil.
- `App.tsx`: cada ruta envuelve su elemento en un selector `Responsive` que
  renderiza la página móvil si `isMobile`, y si no la de escritorio. Las rutas
  sin versión móvil (`/transacciones`, `/informes`, `/configuracion`, `/cuentas`,
  `/categorias`, `/reglas-clasificacion`, `/seguimiento-*`,
  `/transacciones-categoria`, `/ingresos-recurrentes`, `/pagos-anuales`,
  `/changelog`) muestran `SoloEscritorio` en móvil: un texto "Solo disponible en
  escritorio" y un botón a Resumen.
- `Layout.tsx` pierde su rama móvil: solo layout de escritorio. Las páginas de
  escritorio siguen usando `Layout` sin cambios.

## Tipografía y tacto

Base 16px; importe principal de cada pantalla 32px; nada por debajo de 14px.
Filas de lista ≥ 48px de alto. Colores y modo oscuro: los tokens existentes.

## Pantallas

Todas de solo lectura. Ningún botón crea, edita ni borra nada.

### Resumen (`/dashboard`)
Datos: `useFinanceDataSupabase` + `useExchangeRates` → `computeDashboardMetrics`
con la divisa elegida.
1. Patrimonio neto (32px).
2. Dos tarjetas: Activos y Pasivos, con total y desglose por tipo
   (Efectivo/Bancos, Inversiones, Empresas, Bien raíz / Tarjetas, Hipoteca).
3. "Mes anterior (<nombre del mes>)": ingresos, gastos, balance, tomados de
   `ingresosMesAnterior`, `gastosMesAnterior`, `balanceMesAnterior`.
4. Cuentas agrupadas por tipo, saldo en su divisa original; se ocultan las
   vendidas y las de saldo cero. Sin acción al tocar.

### Inversiones (`/inversiones`)
Datos: `useInvestments`. Arriba total invertido y valor actual (convertidos a la
divisa elegida). Lista de inversiones activas: nombre, tipo, valor actual en su
moneda, rendimiento (monto y %) en verde/rojo.

### Suscripciones (`/suscripciones`)
Datos: consulta a `subscription_services` con `active = true` vía TanStack Query
(clave nueva en `financeQueryKeys`). Arriba el total mensual estimado
(anual/12, trimestral/3, etc.). Lista: nombre, último monto, frecuencia, próximo
pago. Las que vencen en ≤ 7 días llevan marca visible.

### Por cobrar (`/pendientes`)
Datos: `usePendings`. Arriba `totalPendientePorCobrar`. Lista de pendientes con
estado `pendiente` o `cobrado_parcial`: concepto, monto restante
(`monto_esperado - monto_cobrado`), fecha esperada. Vencidos primero, en rojo.

### Por pagar (`/cxp`)
Datos: `computeCxP` (ver abajo). Chips 30/60/90 días y total en la divisa
elegida. Lista ordenada por fecha estimada: concepto, etiqueta de tipo, monto en
su divisa, fecha.

## Extracción de lógica

`src/lib/finance/cxp.ts` exporta `computeCxP(input): CxPRow[]` con
`input = { transactions, categories, accounts, subscriptions, horizonte,
baseCurrency, now }`. Es la misma lógica que hoy vive en los `useMemo` de
`src/pages/CxP.tsx` (suscripciones, pagos anuales, recurrentes, tarjetas,
préstamos), movida tal cual y sin cambiar resultados. `CxP.tsx` pasa a llamarla.
Tests en `cxp.test.ts` con vitest: un caso por fuente de filas y uno de horizonte.

La consulta de `subscription_services` sale del `useEffect` de `CxP.tsx` y se
comparte con `SuscripcionesMovil` mediante un hook `useSubscriptionServices`.

## Fuera de alcance

Transacciones, importación, informes, configuración, alertas, pagos anuales como
pantalla propia, edición de cualquier cosa.

## Verificación

- `npx vitest run` en verde, incluidos los tests nuevos de `cxp`.
- Browser pane a 390px: las cinco pantallas con datos reales, modo claro y
  oscuro; una ruta de escritorio (`/transacciones`) muestra `SoloEscritorio`.
- Browser pane a ancho de escritorio: Dashboard, CxP y Suscripciones iguales que
  antes.
- Entrada en Changelog y `APP_VERSION` 7.1 antes del push.
