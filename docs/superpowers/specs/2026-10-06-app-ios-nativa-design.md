# App iOS nativa (fase 1) — diseño

Fecha: 2026-10-06. Estado: diseño aprobado por el usuario en chat, sección por sección;
pendiente de revisión de esta spec escrita.

## Objetivo

Una app nativa para iPhone, en SwiftUI y con el aspecto de Apple (Liquid Glass, iOS 26),
para consultar Savium y apuntar gastos e ingresos desde el móvil. Es un **subconjunto de
la web**: la web sigue siendo la herramienta principal y la app nunca la sustituye. Lo
pesado (importar, reglas, informes, configuración, categorías) se queda solo en la web.

## Restricciones fijadas por el usuario

- **Una sola base de datos**: el mismo proyecto de Supabase que usa la web. Ni réplicas
  ni bases locales que se sincronicen.
- Sin widgets por ahora.
- Distribución por la **App Store como app no listada** (no TestFlight).
- La versión móvil web actual (`src/pages/movil`, `src/components/movil`) se mantiene
  sin cambios hasta que la app esté publicada; después se elimina en un cambio aparte.
- La usa solo el usuario, en su iPhone.

## Fuera de alcance (fase 1)

Widgets; alertas de la web (las sustituye la sección «Atención»); editar transacciones (borrar se añadió el 2026-10-08: deslizar en Movimientos, con confirmación); aportación automática y traspasos entre cuentas; marcar pendientes como
cobrados o pagados; actualizar valoraciones; caché en disco y guardado sin conexión;
crear cuentas de usuario; iPad y Mac; cambiar qué entra en el patrimonio.

## Requisito previo

macOS 15.6 o posterior y Xcode 26. A 2026-10-06 la máquina tiene macOS 15.5 y Xcode 16.3,
que no tienen el SDK de iOS 26. Las tareas de Postgres, web y fixtures no lo necesitan y
pueden hacerse antes.

## 1. Arquitectura

**Ubicación.** Carpeta `ios/` en este repositorio. GitHub Pages sigue desplegando solo
la web: el build de Vite no incluye `ios/`. Al workflow de deploy se le añade
`paths-ignore` para `ios/**` y `shared/**`, de modo que un push que solo toque la app
no redespliegue la web.

**Tecnología.** SwiftUI con **iOS 26 como versión mínima** (Liquid Glass solo existe
ahí). Una única dependencia externa: `supabase-swift` (SDK oficial) vía Swift Package
Manager. Gráficos con Swift Charts; Face ID con LocalAuthentication; Sign in with Apple
con AuthenticationServices. Todo lo demás, del sistema.

**Capas.**

- `ios/SaviumCore/` — paquete Swift local con la lógica pura, sin UI ni red: conversión
  de divisas, vencidos, Por pagar, estimado mensual y estado de suscripciones, resumen
  del mes anterior. Equivalente a `src/lib/finance/`. Sus tests corren con `swift test`,
  sin simulador.
- **Datos** — un repositorio por área (`CuentasRepository`, `MovimientosRepository`,
  `PatrimonioRepository`, `PendientesRepository`, `SuscripcionesRepository`,
  `InversionesRepository`, `CategoriasRepository`) que habla con Supabase y devuelve
  tipos Swift. Ninguna vista llama a Supabase directamente.
- **Pantallas** — una vista por pestaña con un almacén `@Observable` propio que carga,
  guarda en memoria y refresca con *pull to refresh*.

**Divisas.** Igual que `src/hooks/useExchangeRates.ts`: misma API
(`https://api.exchangerate-api.com/v4/latest/MXN`), mismos respaldos (USD = 20,
EUR = 22 MXN) y conversión siempre pasando por MXN. La divisa de visualización (MXN, USD
o EUR) se elige en el menú de perfil y se guarda en `UserDefaults`; si no hay ninguna
guardada, se usa `profiles.divisa_preferida`.

**Configuración.** URL de Supabase y clave pública (la misma que usa la web; no es
secreta, la protección son las políticas RLS) en un `.xcconfig`. Bundle ID previsto:
`com.manoloto.savium` (se confirma al crear la app en App Store Connect).

## 2. Cambios en Postgres y en la web

Hoy casi toda la lógica vive en el cliente TypeScript (`src/lib/finance/*.ts`); la BD
solo guarda datos. Se aplica el enfoque mixto aprobado:

**A Postgres (una migración nueva):**

- Vista `saldos_cuentas`, con `security_invoker = true`: columnas de `cuentas` más
  `saldo_actual = saldo_inicial + Σ(ingreso − gasto)` de sus transacciones (0 si no
  tiene). Misma fórmula que `computeAccountBalances` (`src/lib/finance/calculations.ts:4`).
- Vista `patrimonio_por_divisa`, con `security_invoker = true`: una fila por
  (divisa, rubro) con su importe, y la clase `activo` o `pasivo`. Reglas idénticas a
  `computeDashboardMetrics` (`src/lib/finance/dashboardMetrics.ts:195-273`):
  - Divisa nula cuenta como MXN.
  - Activos, sin cuentas `vendida`: `efectivo_bancos` (Efectivo, Banco, Ahorros),
    `inversiones` (Inversiones), `empresas_privadas` (Empresa Propia), `bien_raiz`
    (Bien Raíz).
  - Pasivos: `tarjetas_credito` (Tarjeta de Crédito) e `hipoteca` (Hipoteca), sumando
    solo la parte negativa del saldo en valor absoluto. Como hoy, los pasivos no
    filtran por `vendida`.
  - La conversión a la divisa de visualización la hace cada cliente; la BD no tiene
    tasas.

Las dos vistas deben llevar `security_invoker` para que se apliquen las RLS de
`cuentas` y `transacciones`.

**Comprobación antes de tocar la web.** Con una consulta SQL filtrada por el `user_id`
del usuario, comparar `saldos_cuentas` y `patrimonio_por_divisa` con lo que calcula la
web hoy con los mismos datos. Tienen que coincidir al céntimo; si no, no se cambia la web.

**Cambios en la web:**

- `useFinanceDataSupabase` toma `saldoActual` de `saldos_cuentas` en lugar de
  `computeAccountBalances`.
- `computeDashboardMetrics` toma activos y pasivos de `patrimonio_por_divisa`. El resto
  de métricas (ingresos y gastos del mes y del año, etc.) no cambia y sigue usando las
  transacciones.
- Se regeneran los tipos de Supabase (`src/integrations/supabase/types.ts`).

**Se queda en cliente y se duplica en Swift, protegido por fixtures:** vencidos,
Por pagar (`computeCxP`), estimado mensual y estado de suscripciones, y resumen del mes
anterior (con las mismas exclusiones y el mismo tratamiento de reembolsos que
`dashboardMetrics.ts`).

**Fixtures compartidos.** `shared/fixtures/<regla>/*.json`, cada uno con `input`,
`now` (fecha fija), `currency`, `rates` y `expected`. Reglas: `vencidos`, `cxp`,
`suscripciones`, `mes_anterior`, `divisas`. Los tests de vitest existentes
(`src/lib/finance/*.test.ts`) los leen además de sus casos actuales, y los tests de
`SaviumCore` leen los mismos archivos. Si una regla cambia en un lado y no en el otro,
falla un test.

## 3. Pantallas

Todo con componentes nativos de iOS 26: `TabView` y barras de herramientas con Liquid
Glass, títulos grandes, listas agrupadas, *pull to refresh*, SF Symbols, Dynamic Type y
modo oscuro automático. Sin estilos inventados; el único color propio es el de acento,
tomado del logo de Savium (`src/components/Logo.tsx`). Los importes se muestran siempre
con su código de divisa (`12,345.00 MXN`), como en la versión móvil web.

Cinco pestañas:

**Resumen.**
- Patrimonio neto en grande; tarjetas de Activos y Pasivos que llevan a Patrimonio.
- Sección **«Atención»**, solo si hay algo: pendientes de cobro vencidos y pagos de
  Por pagar en los próximos 7 días.
- Mes anterior: ingresos, gastos y balance, calculados en `SaviumCore` con solo las
  transacciones de ese mes.
- Botón de perfil en la barra superior: divisa de visualización, «Vincular con Apple»
  y cerrar sesión.

**Movimientos.**
- Transacciones agrupadas por día, de la más reciente a la más antigua.
- Paginación al llegar al final, ordenando por fecha e id como la web
  (`src/lib/finance/queries.ts`) para no repetir ni saltarse filas.
- Fila: comentario, categoría, cuenta e importe (verde si es ingreso).
- Filtro por cuenta en la barra superior; búsqueda nativa (`.searchable`) por
  comentario, resuelta en servidor con `ilike`.
- El detalle de cada transacción es de solo lectura.

**Patrimonio.**
- Activos y pasivos por rubro, con sus totales.
- Cuentas agrupadas por tipo con su saldo en su propia divisa. Se ocultan las vendidas
  y las de saldo residual (|saldo| < 0.005), como `ResumenMovil`.
- Sección Inversiones: valor actual, invertido y rendimiento de cada una, con la misma
  regla que `investmentReturn`.
- Gráfico de distribución de activos con Swift Charts.

**Pendientes.**
- Selector segmentado Por cobrar / Por pagar.
- Por cobrar: total pendiente; activos (`pendiente` o `cobrado_parcial`); vencidos
  primero y en rojo. Vencido = `fecha_esperada` anterior a hoy a las 00:00 en hora local.
- Por pagar: lista de `computeCxP` con horizonte de 30, 60 o 90 días (como
  `PorPagarMovil`); los de 7 días o menos, destacados.
- Badge en la pestaña con el número de vencidos.

**Suscripciones.**
- Coste mensual estimado arriba y lista de activas con próxima fecha de cargo e importe.
- Se lee `proximo_pago` de `subscription_services`. La app no escribe en esa tabla;
  la sincronización (`useSubscriptionSync`) sigue siendo cosa de la web.

## 4. Apuntar un gasto o ingreso

Botón **+** flotante con Liquid Glass en Resumen y Movimientos. Abre una hoja con:

1. Gasto / Ingreso (segmentado, empieza en Gasto).
2. Importe en grande con teclado decimal abierto al aparecer.
3. Cuenta: cuentas no vendidas; se recuerda la última usada. **La divisa es la de la
   cuenta** y se muestra junto al importe; no se puede cambiar.
4. Categoría: subcategorías agrupadas por categoría, filtradas por tipo (`Gastos` o
   `Ingreso`), con buscador y las 5 más usadas en los últimos 90 días arriba.
5. Fecha: hoy en **hora local**, editable.
6. Comentario, opcional.

«Guardar» solo se activa con importe > 0, cuenta y categoría. Al guardar:
- Inserta en `transacciones` los mismos campos que `addTransaction`
  (`src/hooks/useFinanceDataSupabase.ts:295`): `cuenta_id`, `fecha` (YYYY-MM-DD local),
  `comentario`, `ingreso`, `gasto`, `subcategoria_id`, `divisa` y `user_id`.
- Vibración de éxito, se cierra la hoja y se refrescan Movimientos, saldos y patrimonio.
- El botón se desactiva mientras guarda, para evitar duplicados por doble toque.
- Si falla, la hoja sigue abierta con lo escrito y un mensaje con opción de reintentar.

No aplica `classification_rules`, igual que la web en las transacciones manuales.

## 5. Sesión, seguridad y errores

**Inicio de sesión.**
- Correo y contraseña de Supabase (`signInWithPassword`). Sesión en el Llavero
  (comportamiento por defecto del SDK en iOS), con renovación automática del token.
- Sin registro en la app. «¿Olvidaste tu contraseña?» abre la web.

**Sign in with Apple.**
- La primera vez se entra con correo y contraseña. En el menú de perfil, «Vincular con
  Apple» enlaza la identidad de Apple al usuario actual mediante vinculación manual de
  identidades de Supabase. Así se conserva el mismo `user_id` aunque Apple entregue un
  correo de relay.
- Después, la pantalla de inicio ofrece «Iniciar sesión con Apple» como opción
  principal y correo y contraseña como alternativa. Esta última es necesaria para la
  cuenta de revisión de Apple y como respaldo.
- Requiere activar el proveedor Apple en Supabase, solo con el bundle ID para el flujo
  nativo (sin la clave secreta que caduca cada 6 meses, que solo hace falta en web), y
  activar la vinculación manual de identidades.
- **Riesgo a validar al inicio del plan:** confirmar que `supabase-swift` permite
  vincular una identidad con el ID token nativo de Apple. Si no lo permite, se informa
  al usuario y se decide antes de implementar esta parte. Nunca se permite un inicio de
  sesión con Apple que cree un usuario nuevo vacío.

**Face ID.**
- Se pide al abrir la app y al volver si llevaba más de 5 minutos en segundo plano.
  Si falla, se puede usar el código del iPhone.
- Al pasar al selector de apps, la pantalla se tapa con el logo.

**Errores.**
- Sin red con datos ya cargados: se siguen mostrando con el aviso «Sin conexión ·
  actualizado hace N min».
- Sin red al arrancar: estado vacío con botón de reintentar.
- No se guardan datos financieros en disco.
- Si fallan las tasas, se usan las de respaldo y se avisa de que son «tasas aproximadas».
- Si la sesión es inválida (falla la renovación del token), se vuelve al inicio de
  sesión con un mensaje.

## 6. Tests y publicación

**Tests.**
- `SaviumCore`: tests unitarios de cada regla, leyendo `shared/fixtures/`.
- Web: los tests de vitest leen también los fixtures. `npm test` y `npm run lint`
  deben pasar.
- Vistas: comparación SQL contra el cálculo actual de la web (sección 2).
- Pantallas: verificación en el simulador con la cuenta de prueba. Capturas de cada
  pestaña en claro, oscuro y tamaño de letra grande, más el flujo completo de apuntar
  un gasto.

**Publicación (al cierre de la fase 1).**
- Cuenta de Apple Developer de pago; app creada en App Store Connect.
- Política de privacidad publicada en savium.manoloto.com. Etiquetas de privacidad:
  datos financieros y correo vinculados al usuario, sin seguimiento.
- Cuenta de revisión en Supabase con datos ficticios. Nunca la del usuario ni sus datos.
- Sin creación de cuentas en la app, así que no se exige borrar la cuenta desde la app.
- Envío a revisión y solicitud de distribución no listada. Riesgo: Apple debe aprobar
  la solicitud de no listada.
- Tras la aprobación: instalar en el iPhone y, en un cambio aparte, eliminar la versión
  móvil web.

## Criterios de aceptación

1. Las vistas `saldos_cuentas` y `patrimonio_por_divisa` coinciden al céntimo con el
   cálculo actual de la web para la cuenta del usuario, y la web en producción muestra
   las mismas cifras antes y después del cambio.
2. Los fixtures compartidos pasan en vitest y en `swift test`.
3. La app muestra el mismo patrimonio neto, activos, pasivos, Por cobrar, Por pagar y
   coste de suscripciones que la web para la misma divisa y las mismas tasas.
4. Un gasto apuntado en la app aparece en la web con la fecha local correcta, su cuenta,
   su categoría y la divisa de la cuenta.
5. Sign in with Apple entra en el mismo usuario (mismo `user_id`) que correo y contraseña.
6. La app está aprobada en la App Store como no listada e instalada en el iPhone del
   usuario.
