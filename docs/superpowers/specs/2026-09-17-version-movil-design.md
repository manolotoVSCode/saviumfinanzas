# Versión móvil reducida — diseño

Fecha: 2026-09-17. Estado: aprobado por el usuario en chat; revisado contra el
código por los agentes `code-reviewer` y `explorer` (21 hallazgos incorporados).

## Objetivo

En pantallas de menos de 768px, Savium muestra una versión reducida de solo lectura:
navegación rápida, letra grande, sin formularios, sin importar ni subir transacciones.
La versión de escritorio no cambia.

## Activación

Automática por ancho, con `useIsMobile()` (`< 768px`). Sin toggle ni ruta aparte.
Las rutas son las mismas que en escritorio para que un enlace funcione en ambos.

`useIsMobile` hoy arranca en `undefined` y devuelve `false` en el primer render, lo
que en móvil montaría la página de escritorio un instante (descarga de su chunk,
fetches de sus hooks, parpadeo). Se cambia a inicialización síncrona:
`useState(() => window.innerWidth < MOBILE_BREAKPOINT)`. El listener de
`matchMedia` sigue igual.

## Estructura

- `src/components/movil/MobileLayout.tsx`: cabecera + contenido + nav inferior.
  - Cabecera: logo pequeño a la izquierda (`Logo` ignora `size`; se dimensiona con
    `className`); a la derecha selector de divisa (tres chips MXN/USD/EUR) e icono
    de cerrar sesión. Sin buscador global.
  - Nav inferior de 5 pestañas, 64px de alto más `env(safe-area-inset-bottom)`:
    Resumen (`/dashboard`) · Inversiones (`/inversiones`) · Suscripciones
    (`/suscripciones`) · Por cobrar (`/pendientes`) · Por pagar (`/cxp`).
    Badge rojo con `overdueCount` de `usePendings` en "Por cobrar". Se acepta que
    `MobileLayout` y `PorCobrarMovil` consulten `transaction_pendings` cada uno
    (igual que hoy `Layout` + `Pendientes` en escritorio).
  - `Suspense` propio dentro de `MobileLayout` para que al cambiar de pestaña no se
    pierda la nav inferior mientras carga el chunk.
- `index.html`: `viewport-fit=cover` en la meta viewport (sin él, `safe-area-inset-*`
  vale 0 en iPhone).
- `src/pages/movil/`: `ResumenMovil`, `InversionesMovil`, `SuscripcionesMovil`,
  `PorCobrarMovil`, `PorPagarMovil`, `SoloEscritorio`.
- `src/contexts/MobileCurrencyContext.tsx`: divisa elegida para el móvil.
  Prioridad: `localStorage` (`savium.movil.divisa`) si existe; si no, esperar
  `configLoaded` de `useAppConfig` y usar `config.currency`. Solo se escribe en
  `localStorage` cuando el usuario toca un chip (nunca al inicializar, para no
  grabar el `MXN` provisional antes de que llegue el perfil).
- `src/components/Responsive.tsx`: recibe `desktop` y `mobile` (ambos `lazy`) y
  renderiza uno según `useIsMobile`. En `App.tsx` el orden es
  `ProtectedRoute > Responsive > página`, de modo que las páginas móviles nunca se
  montan sin usuario. Rutas con versión móvil: `/` y `/dashboard` → `ResumenMovil`,
  `/inversiones`, `/suscripciones`, `/pendientes`, `/cxp`. Todas las demás rutas
  protegidas (`/transacciones`, `/informes`, `/alertas`, `/configuracion`,
  `/cuentas`, `/categorias`, `/reglas-clasificacion`, `/seguimiento-gastos`,
  `/seguimiento-ingresos`, `/transacciones-categoria`, `/ingresos-recurrentes`,
  `/pagos-anuales`, `/changelog`) usan `mobile={SoloEscritorio}`: texto "Solo
  disponible en escritorio" y un botón a Resumen. `/auth` y `*` (NotFound) no
  llevan `ProtectedRoute` ni `Layout` y quedan fuera del selector.
- `Layout.tsx` pierde su rama móvil: solo layout de escritorio. Las páginas de
  escritorio siguen usando `Layout` sin cambios. Los `useIsMobile` que quedan en
  `Dashboard.tsx`, `Transacciones.tsx` y `TransactionsManager.tsx` pasan a ser código
  muerto (ya no se renderizan bajo 768px); se dejan y se limpian en un commit aparte.

## Tipografía y tacto

Base 16px; importe principal de cada pantalla 32px; nada por debajo de 14px.
Filas de lista ≥ 48px de alto. Colores y modo oscuro: los tokens existentes.

## Formato de importes

`formatCurrency(amount)` de `useAppConfig` solo formatea el número (`1,234.56`), sin
símbolo ni divisa. Las pantallas móviles muestran siempre el código de divisa junto
al número (`12,345.00 MXN`). `Investment.moneda` y `Pending.divisa` son `string`; se
convierten con el mismo `as CurrencyCode` que usa `Inversiones.tsx` (`toPref`).

## Pantallas

Todas de solo lectura. Ningún botón crea, edita ni borra nada. Los únicos controles
son los chips de divisa (cabecera) y los chips de horizonte en Por pagar.

### Resumen (`/dashboard` y `/`)
Datos: `accounts` y `transactions` de `useFinanceDataSupabase` (ya vienen con
saldos y enriquecidas) + `convertCurrency` de `useExchangeRates` →
`computeDashboardMetrics(accounts, transactions, convertCurrency, divisaElegida)`.
Se llama directamente porque el `dashboardMetrics` del hook está fijo a
`config.currency`.
1. Patrimonio neto (32px).
2. Dos tarjetas: Activos y Pasivos, con total y desglose por tipo
   (Efectivo/Bancos, Inversiones, Empresas, Bien raíz / Tarjetas, Hipoteca).
3. "Mes anterior (<nombre del mes>)": ingresos, gastos, balance, tomados de
   `ingresosMesAnterior`, `gastosMesAnterior`, `balanceMesAnterior`.
4. Cuentas agrupadas por tipo, saldo en su divisa original; se ocultan las
   vendidas y las de saldo cero. Sin acción al tocar.

### Inversiones (`/inversiones`)
Datos: `investments` y `valuations` de `useInvestments`. Criptomonedas
(`useCriptomonedas`) **fuera**: el total móvil no las incluye, y se indica con una
nota "sin cripto" bajo el total.
Arriba total invertido y valor actual, convertidos a la divisa elegida. Lista de
inversiones activas (`activa !== false`): nombre, tipo, valor actual en su moneda,
rendimiento (monto y %) en verde/rojo.
Fórmula de rendimiento: la misma de `Inversiones.tsx:135-144` (base = primera
valuación si hay más de una, si no `monto_invertido`; delta = valor − base). Se
extrae a `src/lib/finance/investmentReturn.ts` como función pura
`investmentReturn(inv, valuations)` y `Inversiones.tsx` pasa a usarla.

### Suscripciones (`/suscripciones`)
Datos: hook nuevo `useSubscriptionServices` (TanStack Query, clave
`financeQueryKeys.subscriptions`, `select('*')`, `active = true`, `staleTime: 0`
porque `SubscriptionsManager` escribe en la tabla sin invalidar nada y CxP de
escritorio debe seguir viendo datos frescos al montarse). Se mantiene aparte la
query parcial de `useAlerts` (`subscriptions-for-alerts`); son dos cachés de la
misma tabla, aceptado.
La tabla **no tiene divisa**: todo importe se trata como `config.currency` (la del
perfil), igual que hace CxP.
`frecuencia` admite `Semanal | Mensual | Bimestral | Trimestral | Semestral | Anual
| Irregular` (CHECK de la migración 20260809033858).
Arriba "Estimado mensual" convertido a la divisa elegida, prorrateando: Semanal×52/12,
Mensual×1, Bimestral/2, Trimestral/3, Semestral/6, Anual/12; **Irregular se excluye**
y se cuenta aparte ("3 irregulares sin estimar"). Este número difiere a propósito del
total de escritorio, que solo suma las mensuales; la etiqueta lo deja claro.
Lista: nombre, último monto (con código de `config.currency`), frecuencia, próximo
pago. Las que vencen en ≤ 7 días llevan marca visible.

### Por cobrar (`/pendientes`)
Datos: `pendings` de `usePendings`. Se filtran `estado ∈ {pendiente,
cobrado_parcial}`. El total de arriba **no** usa `totalPendientePorCobrar` (suma sin
convertir): se calcula convirtiendo cada `monto_esperado − monto_cobrado` de su
`divisa` a la elegida con `convertCurrency`. Lista: concepto, monto restante en su
divisa, fecha esperada. Vencidos primero (misma regla que `usePendings`:
`fecha_esperada < hoy`), en rojo.

### Por pagar (`/cxp`)
Datos: `computeCxP` (ver abajo) con `baseCurrency = config.currency` **siempre**,
nunca la divisa elegida: `baseCurrency` es el fallback de filas sin divisa y forma
parte de la clave de agrupación de recurrentes, así que cambiarla alteraría las filas.
Chips 30/60/90 seleccionables (estado local, por defecto 30). Total arriba convertido
a la divisa elegida por la página con `convertCurrency`, fila a fila. Lista ordenada
por fecha estimada: concepto, etiqueta de tipo, monto en su divisa, fecha.

## Extracción de lógica

`src/lib/finance/cxp.ts` exporta `CxPRow` y
`computeCxP({ transactions, categories, accounts, subscriptions, horizonte,
baseCurrency, now }): CxPRow[]`. Misma lógica que los cinco `useMemo` de
`src/pages/CxP.tsx` (suscripciones, pagos anuales, recurrentes, tarjetas, préstamos)
con un único `now` inyectado en las cinco fuentes, incluida la fecha "+15 días" de
tarjetas (hoy cada bloque hace su propio `new Date()`). `computeCxP` **no convierte
divisas**: devuelve filas con su divisa; totales y liquidez los calcula cada página
con `convertCurrency`. `CxP.tsx` importa `CxPRow` y `computeCxP` en vez de
redeclararlos, y toma las suscripciones de `useSubscriptionServices` en lugar de su
`useEffect`.
Tests en `cxp.test.ts` con vitest, fixtures al estilo de `dashboardMetrics.test.ts`
(`NOW` fijo, factories `account()`/`tx()`): un caso por fuente de filas, uno de
horizonte y uno de fila sin divisa que cae en `baseCurrency`.

`src/lib/finance/investmentReturn.ts` + `investmentReturn.test.ts`: caso con una
valuación, con varias y sin `monto_invertido`.

## Fuera de alcance

Transacciones, importación, informes, alertas, configuración, criptomonedas, pagos
anuales como pantalla propia, edición de cualquier cosa, limpieza de los
`useIsMobile` muertos.

## Verificación

- `npx vitest run` en verde, incluidos `cxp.test.ts` e `investmentReturn.test.ts`.
- Browser pane a 390px: las cinco pantallas con datos reales, modo claro y oscuro;
  `/transacciones` y `/alertas` muestran `SoloEscritorio`; cambiar el chip de divisa
  recalcula los totales y persiste al recargar.
- Browser pane a ancho de escritorio: Dashboard, Inversiones, CxP y Suscripciones
  iguales que antes (mismas filas y totales en CxP).
- Nueva entrada 7.1 en el array `changelog` de `Changelog.tsx` (de ahí sale
  `APP_VERSION`) antes del push.
