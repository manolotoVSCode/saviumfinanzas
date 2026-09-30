# «Para mi familia» — diseño

Fecha: 2026-09-30. Estado: contenido y enfoque aprobados en chat; pendiente de revisión del spec por el usuario.

## Objetivo

Una página con lo que la familia necesita saber si el usuario falta: qué hacer primero, a quién llamar, qué seguros hay, qué patrimonio existe y dónde, qué pagos mantener o cancelar, y dónde están los documentos. Mezcla **datos que Savium ya tiene** (calculados en vivo) con **información que el usuario escribe**.

**Fuera de alcance (decidido):** cómo accede la familia. Queda abierto; esta versión vive dentro de la app, detrás del login. El diseño deja todo el contenido en una forma serializable (un documento + un resumen calculado por funciones puras) para que un PDF o un acceso de solo lectura se añadan después sin rehacer nada.

## Principios

- Lógica pura en `src/lib/finance/familia.ts`, testeada con vitest; el hook solo carga y guarda; los componentes solo pintan.
- Los importes y la clasificación de activos y pasivos son **los mismos** que en Informes › Patrimonio Neto (`ASSET_TYPES` / `LIABILITY_TYPES` de `netWorthHistory.ts`, sin cuentas vendidas), así que los totales coinciden. Esas dos constantes se exportan en lugar de duplicarse.
- Nunca se guardan contraseñas, NIP ni frases semilla. La página lo recuerda en los bloques de documentos y cripto.
- La migración la ejecuta el usuario en el SQL Editor; el código que dependa de ella se despliega después.

## Datos

### Tabla `informacion_familia`

Una fila por usuario, con RLS como `alert_dismissals`:

```sql
CREATE TABLE public.informacion_familia (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  contenido JSONB NOT NULL DEFAULT '{}'::jsonb,
  revisado_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- GRANTs a authenticated / service_role, ENABLE RLS,
-- política FOR ALL USING/WITH CHECK (auth.uid() = user_id)
```

Guardar = `upsert` del documento completo (`onConflict: user_id`). «Marcar como revisado» = `upsert` de `revisado_at = now()`. Clave de caché nueva `informacionFamilia` en `queryKeys.ts`.

### Forma de `contenido`

```ts
interface InfoFamilia {
  carta: string;                        // "Si estás leyendo esto": texto libre, pasos en orden
  contactos: Contacto[];
  seguros: Seguro[];
  documentos: Documento[];
  notasPatrimonio: Record<string, string>;   // clave `cuenta:<id>` | `inversion:<id>` | `cripto:<id>`
  pagos: Record<string, DecisionPago>;       // clave `sub:<id>` | `anual:<groupId>`
}
interface Contacto  { id: string; nombre: string; rol: string; telefono: string; email: string; nota: string }
interface Seguro    { id: string; tipo: string; aseguradora: string; poliza: string;
                      sumaAsegurada: number | null; divisa: 'MXN' | 'USD' | 'EUR';
                      beneficiarios: string; vencimiento: string | null;  // YYYY-MM-DD
                      comoReclamar: string; contactoId: string | null; pagoAnualId: string | null }
interface Documento { id: string; que: string; donde: string; nota: string }
interface DecisionPago { decision: 'mantener' | 'cancelar' | null; nota: string }
```

`normalizarInfoFamilia(json: unknown): InfoFamilia` convierte lo que venga de la BD en un documento válido: rellena valores por defecto, descarta elementos mal formados y conserva lo demás. Así, un cambio de forma en el futuro no rompe la página. Los `id` se generan con `crypto.randomUUID()`.

Las notas y decisiones que apuntan a una cuenta, inversión, cripto o pago que ya no existe **no se borran solas**. Se agrupan al final en «Notas sin partida» para que el usuario las reasigne o las elimine, porque si desaparecieran sin avisar se perdería información escrita a mano.

## Cálculo (puro, testeado)

`resumenPatrimonioFamilia({ accounts, investments, cryptos, cryptoPrices, convert, currency })` devuelve:

- **Grupos** en este orden: Bancos y efectivo (`Efectivo`, `Banco`, `Ahorros`), Inversiones, Bienes raíces, Empresas, Cripto y Deudas (`Tarjeta de Crédito`, `Hipoteca`, solo con saldo negativo).
- En cada grupo, las **partidas** con nombre, saldo en su divisa, saldo convertido y clave de nota. Las cuentas de tipo `Inversiones` llevan como sub-partidas sus inversiones activas (`inversiones.cuenta_id`), con tipo, vencimiento y tasa, para que la familia sepa qué instrumento hay dentro de cada cuenta.
- Los **totales**: activos, pasivos y patrimonio en la divisa del perfil, más la fecha del dato, que es el corte `finMesAnterior` (el libro solo está completo hasta ahí).
- La cripto se valora al precio actual cuando lo hay; si no, se muestra la cantidad sin importe y no se suma. Su total se muestra **aparte** y no entra en el patrimonio, igual que hoy no entra en Patrimonio Neto. Así el número principal coincide con Informes.

`pagosRecurrentesFamilia({ subscriptions, annualGroups, decisiones })` lista las suscripciones activas y los pagos anuales (`groupAnnualPayments`, sin los inactivos), cada uno con su monto, frecuencia y la `DecisionPago` guardada.

`estadoRevision(revisadoAt, now)` devuelve `'nunca' | 'al_dia' | 'vencida'`; se considera vencida cuando pasan más de 180 días.

## Página `/familia`

Va en el menú de escritorio después de «Informes Financieros», con el icono `HeartHandshake`. La página tiene una cabecera con «Última revisión: 12 mar 2026» y el botón **Marcar como revisado**, y debajo siete tarjetas en este orden:

1. **Si estás leyendo esto**: un textarea con los pasos en orden.
2. **Contactos clave**: una tabla editable (añadir, editar en diálogo, borrar).
3. **Seguros**: tarjetas por póliza. Una póliza puede vincularse a un contacto (el agente) y a un pago anual; si lo tiene, se muestra la fecha de su próximo cargo. Un vencimiento a menos de 30 días se resalta.
4. **Patrimonio** (automático): grupos con subtotales y, en cada partida, un campo «Nota para la familia» que se edita en línea. Sobre la cripto aparece el aviso: «Indica dónde están las llaves o el acceso al exchange, nunca la frase semilla».
5. **Pagos recurrentes** (automático): tabla con un selector Mantener / Cancelar / — y una nota por fila.
6. **Documentos y accesos**: lista de qué, dónde y nota, con el aviso fijo «No escribas contraseñas aquí; indica dónde están (gestor, caja fuerte) y quién tiene acceso».
7. **Notas sin partida**: solo aparece si hay alguna.

Cada tarjeta se edita por separado y tiene su propio botón **Guardar**, que hace upsert del documento completo. Si hay cambios sin guardar, la tarjeta muestra «Sin guardar» y un `beforeunload` avisa al cerrar la pestaña. En el móvil se usa `Responsive` con una página de **solo lectura** (`FamiliaMovil`), con las mismas secciones sin edición y los teléfonos y emails como enlaces `tel:` y `mailto:`.

## Alerta de revisión

Se añade el tipo `familia_revision` en `alerts.ts`: si `estadoRevision` es `vencida` o `nunca` (en este caso, solo si ya hay contenido guardado), aparece una alerta de severidad media «Revisa la información para tu familia», con `href: '/familia'` y la clave `familia_revision:<fecha de revisado_at o 'nunca'>`, de modo que al marcarla como revisada deja de aparecer. `AlertsInput` recibe `revisionFamilia: { revisadoAt: string | null; tieneContenido: boolean }`. También se añade la entrada correspondiente en `TYPE_META` de `Alertas.tsx`. Esta alerta no tiene importe (`amount: 0`), así que `AlertRow` deja de pintar el monto cuando vale 0.

## Errores

- Fallo de carga: tarjeta de error con Reintentar. El patrimonio automático se sigue pintando, porque no depende de la tabla nueva.
- Fallo al guardar: toast con el motivo real de Supabase (como en el importador) y los cambios se quedan en el formulario.
- Tabla inexistente (migración sin aplicar): mensaje explícito «Falta aplicar la migración informacion_familia».

## Pruebas

Vitest sobre `familia.ts`:
- `normalizarInfoFamilia`: vacío, `null`, campos faltantes, elementos mal formados y claves desconocidas que se conservan.
- `resumenPatrimonioFamilia`: agrupación por tipo, cuentas vendidas excluidas, deudas solo en negativo, sub-partidas de inversión, conversión de divisa, cripto sin precio y **total igual al último punto de `computeNetWorthHistory`** para los mismos datos.
- Notas huérfanas: detección de las claves que no casan con ninguna partida.
- `pagosRecurrentesFamilia`: excluye inactivos y respeta las decisiones.
- `estadoRevision` y la alerta `familia_revision`: nunca con o sin contenido, al día, vencida y en el límite de 180 días.

Además `tsc`, `build` y una comprobación manual en el navegador (escritorio y móvil) antes de dar por terminado.

## Entrega

Commits por tema: migración, lógica y tests, página de escritorio, móvil, alerta y changelog. Nueva versión en `Changelog.tsx`. El push y la migración, **cuando el usuario lo diga**.
