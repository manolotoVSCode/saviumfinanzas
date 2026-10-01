# «Para mi familia» — diseño

Fecha: 2026-09-30. Estado: revisada por `code-reviewer` (15 hallazgos) y `explorer` (12 verificaciones), todos incorporados. Pendiente de aprobación del usuario.

## Objetivo

Una página con lo que la familia necesita saber si el usuario falta: qué hacer primero, a quién llamar, qué seguros hay, qué patrimonio existe y dónde, qué pagos mantener o cancelar, y dónde están los documentos. Mezcla **datos que Savium ya tiene** (calculados en vivo) con **información que el usuario escribe**.

**Fuera de alcance (decidido):** cómo accede la familia. Esta versión vive dentro de la app, detrás del login y solo en escritorio. Todo el contenido queda en una forma serializable (un documento + un resumen calculado por funciones puras) para que un PDF, una vista móvil o un acceso de solo lectura se añadan después sin rehacer nada.

**Recortado tras la revisión (YAGNI):** vínculos seguro→contacto y seguro→pago anual (se rompían en silencio), guardado por tarjeta, vista móvil propia.

## Principios

- Lógica pura en `src/lib/finance/familia.ts` (documento y revisión) y `src/lib/finance/familiaResumen.ts` (cálculos sobre datos de Savium), testeada con vitest; el hook solo carga y guarda; los componentes solo pintan.
- El patrimonio usa **el mismo cálculo** que Informes › Patrimonio Neto, así que el total coincide con su KPI «Patrimonio neto actual».
- Nunca se guardan contraseñas, NIP ni frases semilla. La página lo recuerda en los bloques de documentos y cripto.
- **Nada escrito a mano se pierde en silencio**: ni al normalizar, ni por notas huérfanas, ni por dos pestañas.
- La migración la ejecuta el usuario en el SQL Editor; el código que dependa de ella se despliega después.

## Datos

### Tabla `informacion_familia`

```sql
CREATE TABLE public.informacion_familia (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  contenido JSONB NOT NULL DEFAULT '{}'::jsonb,
  revisado_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- GRANT SELECT, INSERT, UPDATE, DELETE a authenticated; ALL a service_role;
-- ENABLE RLS; política FOR ALL USING/WITH CHECK (auth.uid() = user_id)
-- (patrón de 20260915180000_alert_dismissals.sql)
CREATE TRIGGER update_informacion_familia_updated_at
  BEFORE UPDATE ON public.informacion_familia
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

El trigger es imprescindible: `DEFAULT now()` solo actúa al insertar, y el control de concurrencia se basa en `updated_at`.

### Lectura y escritura (`useInformacionFamilia`)

- Clave de caché `informacionFamilia` en `queryKeys.ts`. Lee la fila completa (`maybeSingle`) con `refetchOnWindowFocus: false`.
- **Primer guardado** (no existe fila): `insert` con `revisado_at = new Date().toISOString()`, porque crear la información cuenta como primera revisión.
- **Guardados siguientes**: `update({ contenido }).eq('user_id', uid).eq('updated_at', updatedAtLeido)`. Si la actualización no afecta a ninguna fila, es un **conflicto**: otra pestaña o dispositivo guardó antes. En ese caso no se sobrescribe nada; se avisa «Se guardó una versión más nueva en otro sitio» y se ofrecen dos opciones: *Recargar* (descarta lo local) o *Guardar la mía* (update sin la condición).
- **Marcar como revisado**: `update({ revisado_at: new Date().toISOString() })` con el reloj del cliente, aceptable para esto. El botón está deshabilitado mientras no exista la fila.
- **Error de tabla inexistente** (Postgres `42P01` o PostgREST `PGRST205`): se trata como «migración sin aplicar».

### Forma de `contenido`

```ts
interface InfoFamilia {
  carta: string;                              // "Si estás leyendo esto": texto libre, pasos en orden
  contactos: Contacto[];
  seguros: Seguro[];
  documentos: Documento[];
  notasPatrimonio: Record<string, string>;    // clave `cuenta:<id>` | `inversion:<id>` | `cripto:<id>`
  pagos: Record<string, DecisionPago>;        // clave `sub:<id>` | `anual:<groupId>`
  /** Lo que normalizar no supo interpretar; se reescribe tal cual al guardar. */
  extra: Record<string, unknown>;
}
interface Contacto  { id: string; nombre: string; rol: string; telefono: string; email: string; nota: string }
interface Seguro    { id: string; tipo: string; aseguradora: string; poliza: string;
                      sumaAsegurada: number | null; divisa: 'MXN' | 'USD' | 'EUR';
                      beneficiarios: string; vencimiento: string | null;   // YYYY-MM-DD, local
                      comoReclamar: string }                              // incluye agente y teléfono
interface Documento { id: string; que: string; donde: string; nota: string }
interface DecisionPago { decision: 'mantener' | 'cancelar' | null; nota: string }
```

**`normalizarInfoFamilia(json: unknown): InfoFamilia` repara en vez de descartar.** Rellena los campos que falten con su valor por defecto, asigna un `id` (`crypto.randomUUID()`) al elemento que no lo tenga y convierte a texto los valores escalares. Lo que no pueda reparar (un elemento de lista que no es un objeto, una clave de primer nivel desconocida, un valor de `notasPatrimonio` o `pagos` que no casa con la forma esperada) va a `extra`, bajo su ruta original, y se guarda sin cambios. `serializarInfoFamilia` hace lo inverso y vuelve a fundir `extra`, de modo que ida y vuelta es idempotente.

## Cálculo (puro, testeado)

### Patrimonio: `resumenPatrimonioFamilia`

- **Saldo por cuenta**: se extrae de `netWorthHistory.ts` un helper exportado `saldosAlCierre(accounts, transactions, fechaCierre)`, que devuelve el saldo inicial más los movimientos con fecha menor o igual al cierre. `computeNetWorthHistory` no se toca (su bucle incremental es más eficiente); un test garantiza que `saldosAlCierre` al cierre del mes en curso da exactamente su último punto. También se exportan `ASSET_TYPES` y `LIABILITY_TYPES`.
- **Fecha que se muestra**: «Saldos según lo importado. Último mes completo: agosto 2026» (`finMesAnterior`). No se recorta al corte, porque entonces no coincidiría con Informes; solo se rotula.
- **Grupos**, en este orden:
  - Bancos y efectivo (`Efectivo`, `Banco`, `Ahorros`).
  - Inversiones (cuentas tipo `Inversiones`).
  - Bienes raíces (`Bien Raíz`).
  - Empresas (`Empresa Propia`).
  - Deudas (`Tarjeta de Crédito`, `Hipoteca`).
  - Las cuentas vendidas quedan fuera de los activos. Las cuentas de deuda **salen siempre**: con saldo negativo aparecen como deuda y cuentan en el total; con saldo 0 o positivo se ven con la etiqueta «sin deuda», sin sumar, porque igual hay que cancelarlas.
- **Totales**: activos, pasivos y patrimonio en la divisa del perfil, convertidos con `convertCurrency`. El test exige que sean iguales al último punto de `computeNetWorthHistory`.
- **Detalle de inversiones** (informativo, no suma). Hoy ninguna pantalla rellena `inversiones.cuenta_id`, así que no se cuelgan de las cuentas. Se listan aparte, agrupadas por `investment_types.nombre` (vía `tipo_id`), con valor, vencimiento y tasa. El valor se calcula con la misma regla que la página Inversiones (`useInvestments.ts:62-75`). Clave de nota: `inversion:<id>`.
- **Cripto** (informativo, no suma, en USD). Cantidad y valor con la misma regla que la página Inversiones: el precio actual y, si no lo hay, el valor de compra marcado como «precio de compra». Clave de nota: `cripto:<id>`. Lleva el aviso «Indica dónde están las llaves o el acceso al exchange, nunca la frase semilla». Las cuentas con `tipo_inversion = 'Criptomoneda'` siguen en su grupo por saldo, como en Informes.

### Pagos recurrentes: `pagosRecurrentesFamilia`

- Incluye las suscripciones activas: monto `ultimo_pago_monto` en la divisa del perfil (la tabla no guarda divisa, igual que en `SuscripcionesMovil`) y su `frecuencia`.
- Incluye los pagos anuales de `groupAnnualPayments`, sin los marcados como inactivos en `localStorage['inactive_annual_payments']`. Por eso, igual que en Alertas, la lista depende del dispositivo; queda documentado y no se arregla aquí. La divisa se deduce como en `alerts.ts:77` y la frecuencia es «anual».
- Cada fila lleva su `DecisionPago`.
- Riesgo aceptado: el id de un pago anual cambia si se edita su concepto o su subcategoría. La decisión pasa entonces a «Notas sin partida» en lugar de perderse.

### Notas sin partida: `notasHuerfanas`

- Una clave es huérfana si **la entidad no existe**, no si no se pinta. Se compara con los ids de todas las cuentas (también las vendidas), inversiones, cripto, suscripciones (también las inactivas) y grupos anuales.
- Solo se calcula cuando **todas** esas fuentes han cargado sin error; mientras tanto la sección no aparece.
- Cada nota huérfana se puede borrar o copiar su texto. No hay reasignación, que sería YAGNI.

### Revisión: `estadoRevision(revisadoAt, now)`

- Devuelve `'sin_datos' | 'al_dia' | 'vencida'`.
- Los días se cuentan en días naturales locales, con el mismo cálculo que `diasHasta` en `fechas.ts`: 180 días o menos es `al_dia`, y 181 o más es `vencida`.
- Si no existe la fila, devuelve `sin_datos`.

## Página `/familia` (solo escritorio)

**Navegación:**
- El menú de escritorio lleva «Para mi familia» con el icono `HeartHandshake`, después de «Informes Financieros» y antes de «Alertas».
- La ruta es `<Responsive desktop={Familia} mobile={SoloEscritorio} />`.

**Cabecera:**
- Muestra «Última revisión: 12 mar 2026», o «Nunca» si no la hay.
- A su lado está el botón **Marcar como revisado**.
- Debajo, el indicador de guardado: «Guardado», «Guardando…», «Sin guardar» o «Conflicto».

**Guardado automático, un solo estado para toda la página:**
- Todo el documento es un único estado local, que se hidrata de la caché **una sola vez** y no se vuelve a pisar mientras haya cambios sin guardar.
- Cada cambio programa un guardado con un retraso de 1,5 s.
- Al desmontar la página (navegación interna con `HashRouter`, sin `useBlocker`) y en `beforeunload` se lanza el guardado pendiente de inmediato. Si aun así la pestaña se cierra con cambios sin guardar, `beforeunload` pide confirmación.
- Así no hay botones Guardar ni pérdidas al cambiar de página.

**Tarjetas**, en este orden:
1. **Si estás leyendo esto**: un textarea.
2. **Contactos clave**: una tabla con añadir, editar en diálogo y borrar.
3. **Seguros**: una tarjeta por póliza. Si el vencimiento cae en 30 días o menos, se resalta en ámbar; si **ya venció**, en rojo con el texto «Vencida».
4. **Patrimonio** (automático): grupos con subtotales, el detalle de inversiones, la cripto y un campo «Nota para la familia» en línea en cada partida.
5. **Pagos recurrentes** (automático): una tabla con un selector Mantener / Cancelar / — y una nota por fila.
6. **Documentos y accesos**: qué es, dónde está y una nota. Lleva el aviso fijo «No escribas contraseñas aquí; indica dónde están (gestor, caja fuerte) y quién tiene acceso».
7. **Notas sin partida**: solo aparece si hay alguna.

## Alerta de revisión

- **Tipo nuevo `familia_revision`** en `alerts.ts`. `AlertsInput` recibe `revisionFamilia: { revisadoAt: string | null } | null`, donde `null` significa sin fila, cargando o con error; en ese caso no hay alerta.
- **Cuándo aparece**: solo si `estadoRevision` es `vencida`, porque con `sin_datos` no hay nada que revisar.
- **Contenido de la alerta**:
  - Severidad `media`.
  - Título: «Revisa la información para tu familia».
  - Detalle: «Última revisión hace N días».
  - `href: '/familia'`, `date` = `revisado_at` y `currency: 'MXN'`.
  - Clave: `familia_revision:<toFechaISO(revisado_at) en hora local>`.
- **Al marcar como revisado** desaparece porque el estado vuelve a `al_dia`. Si en cambio se descarta, no vuelve hasta la siguiente revisión que venza.
- **`Alert.amount` pasa a ser opcional** (`amount?: number`). Es más limpio que usar 0.
- **Consulta ligera en `useAlerts`**: como se monta en todas las páginas vía `Layout`, `useAlerts` lee con su propia clave solo `select('revisado_at')` de `informacion_familia`, sin traer el contenido sensible.
  - Si esa consulta falla (por ejemplo, con la migración sin aplicar), la tratamos como `null`: no bloquea `loading` ni el resto de alertas.
  - Guardar o marcar como revisado invalida las dos claves.
- **Cambios de UI necesarios**:
  1. `TYPE_META` en `Alertas.tsx`.
  2. `AlertRow` no pinta el importe si `amount` es `undefined`.
  3. El texto descriptivo de `Alertas.tsx:71` debe incluir la revisión de la información familiar.
  4. `ICONO` en `movil/AlertasResumen.tsx:8`, con el importe condicionado igual que en `AlertRow`. En el móvil la alerta se ve, pero la página es solo de escritorio.

## Backup

`DatabaseBackup.tsx` añade `informacion_familia` a su lista de tablas:
- El JSONB se escribe con `JSON.stringify`.
- Se corrige el escapado CSV para todas las tablas: se entrecomilla cualquier valor con comas, comillas o saltos de línea, y se duplican las comillas.

Hoy la carta, con sus saltos de línea, rompería el CSV. El diálogo de backup avisa de que el archivo contiene datos personales en claro.

## Errores

- **Migración sin aplicar**: la página muestra «Falta aplicar la migración `informacion_familia`» en lugar de las tarjetas manuales. El patrimonio automático se sigue pintando.
- **Otro fallo de carga**: tarjeta de error con Reintentar, y el patrimonio automático se sigue pintando.
- **Fallo al guardar**: toast con el motivo real (patrón de `BankStatementImporter.tsx:295-302`) y estado «Sin guardar». El cambio se reintenta en la siguiente edición o con el botón Reintentar del indicador.
- **Conflicto**: se resuelve como se describe en «Lectura y escritura».

## Pruebas

Vitest sobre `familia.ts` y `alerts.ts`:
- **`normalizarInfoFamilia` / `serializarInfoFamilia`**:
  - Entradas vacías: vacío y `null`.
  - Campos faltantes y elementos sin `id`: se reparan.
  - Lo irreparable y las claves desconocidas van a `extra`.
  - La ida y vuelta es idempotente y no pierde nada.
- **`saldosAlCierre`**: suma hasta el cierre incluido y coincide con `computeNetWorthHistory`.
- **`resumenPatrimonioFamilia`**:
  - Agrupación por tipo y cuentas vendidas excluidas.
  - Deudas: con saldo negativo suman; con saldo 0 o positivo aparecen como «sin deuda».
  - Conversión de divisa.
  - El total es igual al último punto de `computeNetWorthHistory` **con una transacción en el mes en curso**.
  - Las inversiones y la cripto no suman; la cripto sin precio usa el valor de compra.
- **`notasHuerfanas`**:
  - Las entidades existentes no huérfanas incluyen las vendidas, las inactivas y la tarjeta liquidada.
  - Las entidades borradas sí son huérfanas.
- **`pagosRecurrentesFamilia`**: excluye los inactivos y respeta las decisiones.
- **`estadoRevision`** y la alerta:
  - `sin_datos`.
  - El límite de 180 frente a 181 días, contados en días locales.
  - Una fecha que cruza un cambio de horario.
  - La clave es estable.

Además `tsc`, `build`, y una comprobación manual en el navegador antes de dar por terminado:
- Crear información.
- Editar y cambiar de página sin perder nada.
- Conflicto entre dos pestañas.
- Marcar como revisado.
- La alerta de revisión en escritorio y en el móvil.
- El backup, abriendo el CSV.

## Entrega

- Commits por tema:
  1. Migración.
  2. `saldosAlCierre`.
  3. Lógica y tests de `familia.ts`.
  4. Hook y página.
  5. Alerta.
  6. Backup.
  7. Changelog.
- Nueva versión en `Changelog.tsx`.
- La migración, cuando el usuario la ejecute; el push, cuando lo diga.
