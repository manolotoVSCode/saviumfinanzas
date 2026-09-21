# Mejorar la detección automática de transacciones y el preview de importación

## Contexto

El importador de estados de cuenta (`src/components/BankStatementImporter.tsx`, 1480 líneas en un solo componente) es la vía principal para meter movimientos a Savium. Hoy funciona, pero:

- **Parser frágil**: CSV solo con coma (la ayuda promete `;`), solo UTF-8 (la ayuda promete Latin-1), fechas se guardan con −1 día en zonas UTC+ (España), en Excel la heurística "último numérico de derecha a izquierda" pisa la columna `Importe` detectada por cabecera, hay un `safeCol(3)` hardcoded "para ING", y si falla el insert el diálogo se cierra como si hubiera ido bien. Las filas descartadas (sin fecha / monto 0) desaparecen en silencio.
- **Categorización opaca y laxa**: el historial pisa a las reglas explícitas del usuario; el match parcial por `includes` con descripciones de ≥3 caracteres ("uber", "pago") acierta con casi todo; "última gana" en vez de "más frecuente"; no se ve *por qué* se sugirió una categoría ni se puede crear una regla desde el preview.
- **Preview poco editable**: no se puede corregir fecha/monto/descripción/tipo, no hay asignación de categoría en bloque, no hay buscador, no hay totales, no hay toast al terminar.

El usuario pidió mejorar **categorización, preview y robustez del parser** (duplicados quedan fuera de esta ronda). Sin IA ni PDF: todo sigue siendo heurístico en cliente.

## Decisiones de diseño

1. **Extraer la lógica pura a `src/lib/`** y testearla con vitest (el proyecto no tiene tests; se añade `vitest` como devDependency y script `test`). Solo se testea la lógica pura, no componentes.
2. **Orden de categorización**: historial exacto → reglas → historial parcial (estricto). Las reglas explícitas ganan a las adivinanzas; las descripciones idénticas a algo ya categorizado se respetan.
3. **Bulk por filtro, no por selección**: el checkbox de fila sigue siendo "incluir". Para asignar en bloque se usa un buscador de texto en el preview + botón "Asignar categoría a las N filas filtradas", con opción de crear regla con ese mismo texto. Evita inventar un segundo concepto de selección.
4. **Edición por fila en popover**, no celdas inline: un lápiz por fila abre fecha / descripción / monto / tipo. Mantiene la tabla legible.
5. **Partir el componente** en `src/components/import/`. `Transacciones.tsx` actualiza el import.

## Estructura de archivos resultante

```
src/lib/
  dates.ts                      # toDateOnlyString(date) → 'yyyy-MM-dd' local (date-fns format)
  bankStatementParser.ts        # pure: bytes → RawMovement[] + skipped[] + meta
  bankStatementParser.test.ts
  importCategorizer.ts          # pure: historial + reglas → sugerencia con fuente
  importCategorizer.test.ts
src/components/import/
  BankStatementImporter.tsx     # orquestador: pasos, estado, handleImport (≈350 líneas)
  ImportPreviewTable.tsx        # tabla + ordenación + filtros + badges de fuente
  ImportRowEditor.tsx           # popover de edición por fila
  ImportBulkAssign.tsx          # buscador + "asignar a filtradas" + "crear regla"
  CreateRuleFromRowDialog.tsx   # crear regla prellenada desde una fila
  ImportSummaryBar.tsx          # totales, descartadas, botón Importar
```

Se borran: `src/components/TransactionImporter.tsx` (muerto), `parseCSVLine`, `getCategoriesForRow`, `console.log` de debug. Se corrige `src/components/Changelog.tsx:63` (ya no hay IA).

---

## Fase 1 — Parser robusto (`src/lib/bankStatementParser.ts`)

Mover `parseAmount`, `parseDate`, `detectDateAmbiguity`, `stripPreamble`, `detectFormat`, `excelSerialToDate` tal cual (hoy están dentro del componente, líneas 165–449 y 563–571) y unificar CSV/Excel en una sola ruta:

```ts
export interface RawMovement {
  sourceRow: number;          // índice en el archivo, para "ver fila original"
  fecha: Date;
  descripcion: string;
  montoFirmado: number;       // tal cual viene del archivo (antes de aplicar tipo de cuenta)
  cargoAbono?: 'cargo' | 'abono'; // si venía en columnas separadas
  tarjetahabiente?: string;
}
export interface SkippedRow { sourceRow: number; reason: 'sin_fecha' | 'monto_cero' | 'monto_invalido'; cells: string[] }
export interface ParseResult {
  movements: RawMovement[];
  skipped: SkippedRow[];
  ambiguousDate: boolean;
  meta: { delimiter?: string; encoding: 'utf-8' | 'windows-1252'; sheet?: string; columns: { fecha: number; descripcion: number; monto: number; cargo?: number; abono?: number } };
}
export async function parseStatementFile(file: File, hint: DateHint): Promise<ParseResult>
export function parseCsvRows(text: string, hint): ParseResult      // testeable
export function parseSheetRows(rows: string[][], hint): ParseResult // testeable, compartido con CSV tras convertir celdas
```

Cambios concretos respecto a hoy:

- **Delimitador**: `Papa.parse(text, { delimitersToGuess: [',', ';', '\t', '|'], ... })` (quitar `delimiter: ','`). Guardar el detectado en `meta`.
- **Encoding**: leer `ArrayBuffer`; quitar BOM; intentar `new TextDecoder('utf-8', { fatal: true })`; si lanza, `new TextDecoder('windows-1252')`.
- **Excel**: recorrer `workbook.SheetNames` y quedarse con la primera hoja que produzca ≥1 movimiento (hoy solo `SheetNames[0]`). Eliminar el `safeCol(3)` (l.670–675): la descripción es la columna detectada; si no hay cabecera, `detectFormat` ya elige la de texto más largo. La heurística derecha→izquierda (l.690–699) **solo** se aplica cuando `amountCol === -1`, y además salta columnas cuya cabecera normalizada sea `saldo|balance|saldo final|saldo disponible`.
- **`parseAmount`**: aceptar paréntesis como negativo `(1.234,56)`; devolver `NaN` (no `0`) cuando el texto no es numérico para distinguir `monto_invalido` de `monto_cero`.
- **`parseDate`**: aceptar año de 2 dígitos `DD/MM/YY` (siglo: `< 70 → 20xx`), ya lo hacía el importador muerto.
- **Filas descartadas**: en lugar de `continue` silencioso, empujar a `skipped` con motivo.
- **Signo → tipo** pasa a una función pura en el mismo archivo, usada una sola vez (hoy duplicada en l.497–556 y l.680–743):
  ```ts
  export function resolveSignedAmount(m: RawMovement, isCreditCard: boolean): { monto: number; isExpenseLike: boolean }
  ```

**Tests** (`bankStatementParser.test.ts`) con fixtures inline mínimos: CSV con `;` y decimales europeos; CSV BBVA con preámbulo y columnas Cargo/Abono; CSV AMEX con campo multilínea; hoja con cabecera `Importe` + `Saldo` a la derecha (debe respetar `Importe`); fechas `DD/MM/YY`; fila sin fecha → `skipped.sin_fecha`; Latin-1 (`Uint8Array` con `0xF3` → "ó").

### Fecha sin desfase (`src/lib/dates.ts`)

```ts
import { format } from 'date-fns';
export const toDateOnlyString = (d: Date) => format(d, 'yyyy-MM-dd');
```
Sustituir `fecha.toISOString().split('T')[0]` en `src/hooks/useFinanceDataSupabase.ts:984, 1044, 1084, 1127, 1183` y en el vínculo de pendientes del importador (hoy l.928). Test: `TZ=Europe/Madrid` con `new Date(2025,0,15)` → `'2025-01-15'`.

> Fuera de alcance pero anotado: la lectura `fecha: new Date(transaccion.fecha)` (`useFinanceDataSupabase.ts:104`) crea medianoche UTC; en México se muestra el día anterior si se formatea en local. Conviene revisarlo en otra ronda.

### Error de inserción no se traga

`addTransactionsBatch` (`useFinanceDataSupabase.ts:1072–1113`) hoy hace toast y devuelve `undefined`. Cambiar a: **relanzar** el error tras el `console.error` (quitar el toast de ahí, el único llamador es el importador). En `handleImport`, el `catch` ya hace toast y `finally` quita `importing`; el diálogo permanece en `preview` con las filas intactas.

---

## Fase 2 — Categorización explicable (`src/lib/importCategorizer.ts`)

```ts
export type SuggestionSource = 'historial' | 'regla' | 'historial_parcial';
export interface CategorySuggestion { categoriaId: string; source: SuggestionSource; detail: string; confidence: 'alta' | 'media' }
export function buildHistoryIndex(transactions: Transaction[]): HistoryIndex
export function suggestCategory(desc: string, amount: number, accountId: string, history: HistoryIndex, findMatchingRule): CategorySuggestion | null
```

- **`buildHistoryIndex`**: por descripción normalizada (reutilizar `normalizeRuleText`-style; hoy `normalizeDescription` l.99), contar ocurrencias por `subcategoriaId` y quedarse con la **más frecuente** (desempate: más reciente por `fecha`). Guardar también la clave `firstWords` (primeras 3 palabras, solo si la clave tiene ≥2 palabras y ≥8 caracteres) → categoría más frecuente. `detail` = `"12 movimientos iguales"`.
- **Orden**: (1) exacto en historial → `alta`; (2) `findMatchingRule` → `alta`, `detail = nombre de la regla` (hoy `findMatchingRule` devuelve solo `category_id`; añadir `findMatchingRuleDetailed` en `useClassificationRules.ts:79` que devuelva `{ category_id, name, keyword }`, manteniendo la función actual); (3) `firstWords` en historial → `media`. **Eliminar** el `includes` bidireccional (l.119) — es la fuente de falsos positivos.
- `ParsedRow` gana `suggestion?: CategorySuggestion` y `categoriaManual: boolean` (true cuando el usuario la cambió a mano; la UI deja de mostrar la fuente y muestra "Manual").

**Tests**: más frecuente gana a última; "uber eats madrid" no coincide con historial "uber" (sin includes); regla gana a parcial; exacto gana a regla.

### UI de la fuente

En `ImportPreviewTable`, junto al combobox de categoría un icono pequeño con tooltip:
- `historial` → `History` icon, "Historial · 12 movimientos iguales"
- `regla` → `ListChecks` icon, "Regla · Netflix"
- `historial_parcial` → `History` icon con `opacity-60`, "Parecido a · uber bcn"
- manual → `Pencil`, "Manual"
- sin sugerencia → se mantiene el borde amarillo actual.

Filtro adicional junto a "Todas / Sin Asignar": **"Dudosas (N)"** = `confidence === 'media'`.

### Crear regla desde una fila (`CreateRuleFromRowDialog.tsx`)

Ítem al pie del `Command` del combobox de categoría: "＋ Crear regla para filas como esta…". Abre diálogo prellenado:
- Nombre: primeras 2 palabras normalizadas de la descripción.
- Palabra clave: las mismas 2 palabras (editable). Tipo: `contains`.
- Categoría: la actual de la fila (combobox reutilizando el mismo listado agrupado).
- Cuenta: checkbox "solo para esta cuenta" (off por defecto) → `cuenta_id`.
- Vista previa en vivo: "Coincide con N filas de este archivo" usando `matchesClassificationRule` de `src/lib/classificationRules.ts`.
- Al guardar: `addRule(...)` del hook (`useClassificationRules.ts:50`), y aplicar la categoría a todas las filas del preview que coincidan y **no** sean `categoriaManual` → `suggestion = { source: 'regla', ... }`. Toast: "Regla creada · aplicada a N filas".

---

## Fase 3 — Preview editable y cierre del flujo

### `ImportBulkAssign.tsx` (barra sobre la tabla)
- Input "Buscar en descripción…" que filtra `filteredPreviewRows` (se combina con Todas/Sin Asignar/Dudosas).
- Cuando hay texto y ≥1 fila filtrada: combobox de categoría + botón "Asignar a las N filtradas" (marca `categoriaManual = true`) y enlace "…y crear regla" que abre `CreateRuleFromRowDialog` con keyword = texto buscado.

### `ImportRowEditor.tsx` (popover por fila, icono lápiz)
Campos: fecha (`<Input type="date">`, valor vía `toDateOnlyString`), descripción, monto (`> 0`), tipo (`Select` Gastos/Ingreso/Aportación/Retiro). Al guardar:
- `tipo` → recalcular `esGasto`; si la categoría actual no es compatible con el nuevo tipo, pasar a Sin Asignar y marcar borde amarillo.
- Cambiar descripción re-ejecuta `suggestCategory` **solo si** `!categoriaManual`.
- Botón "Excluir" dentro del popover (además del checkbox).

### `ImportSummaryBar.tsx` (pie)
- Totales de las filas incluidas: `N gastos · −$X` / `M ingresos · +$Y` en la divisa de la cuenta.
- "K filas descartadas" → `Collapsible` con tabla pequeña (fila original, motivo). Si K = 0 no se muestra.
- Si `meta.encoding === 'windows-1252'` o el delimitador fue `;`, línea discreta "Archivo leído como Latin-1 · separador ;" (da confianza y ayuda a depurar).
- Botón Importar (igual que hoy) con `importing`.

### Cierre
- Toast de éxito: "N transacciones importadas en {cuenta}" (+ "· M pendientes vinculados" si aplica).
- Zona de subida con drag & drop real: `onDragOver`/`onDrop` en el `div` de `border-dashed` (hoy l.1179) llamando al mismo `processFile`; estado visual `border-primary` mientras se arrastra.
- Quitar `console.log` de debug, `parseCSVLine`, `getCategoriesForRow`, `TransactionImporter.tsx`; actualizar `Changelog.tsx:63`.

---

## Orden de ejecución y commits (un commit por tema)

1. `vitest` + `src/lib/dates.ts` + reemplazos de `toISOString` → commit "Guardar fechas sin desfase de zona horaria".
2. `bankStatementParser.ts` + tests + `addTransactionsBatch` relanza → commit "Parser de estados de cuenta robusto y testeado".
3. `importCategorizer.ts` + `findMatchingRuleDetailed` + tests → commit "Categorización explicable: reglas antes que historial parcial".
4. Partir el componente en `src/components/import/*` (sin cambiar comportamiento visible aún) → commit "Dividir el importador en componentes".
5. Badges de fuente + filtro Dudosas + `CreateRuleFromRowDialog` → commit "Ver por qué se sugiere cada categoría y crear reglas desde el preview".
6. `ImportBulkAssign` + `ImportRowEditor` + `ImportSummaryBar` + toast + drag&drop + limpieza → commit "Preview editable con asignación en bloque y resumen".

No se hace `push` salvo que el usuario lo pida (dispara el deploy a savium.manoloto.com).

## Verificación

- `npm run test` (vitest) en verde; `npm run lint` y `npm run build` en verde.
- Arrancar `npm run dev` en el Browser pane y probar con fixtures en `$TMPDIR`:
  - CSV con `;` y `1.234,56` (ES) → montos y fechas correctas, línea "separador ;" en el resumen.
  - CSV Latin-1 con acentos → descripción legible.
  - XLSX con `Importe` y `Saldo` → toma `Importe`.
  - Archivo con una fila sin fecha → aparece en "descartadas".
  - Fila con descripción idéntica a una ya categorizada → badge Historial; descripción que solo coincide con una regla → badge Regla; sin nada → amarillo.
  - Buscar "uber" → asignar a filtradas → crear regla → la regla aparece en `/reglas` y las filas quedan con badge Regla.
  - Editar fecha/monto/tipo de una fila → la importación guarda lo editado (comprobar en la tabla de transacciones).
  - Simular fallo de insert (p. ej. `subcategoriaId` inválido en devtools) → toast de error y el preview sigue abierto.
  - Importación correcta → toast de éxito con el conteo.
- Revisar que `ReglasClasificacion.tsx` sigue funcionando (usa `findMatchingRule` sin cambios).
