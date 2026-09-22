import Papa from 'papaparse';

export type DateHint = 'auto' | 'DMY' | 'MDY';

export interface RawMovement {
  /** Índice de la fila entre las filas de datos (tras cabecera y preámbulo), para "ver fila original". */
  sourceRow: number;
  /** Fecha local (medianoche). */
  fecha: Date;
  descripcion: string;
  /** Importe con el signo del archivo. Con columnas Cargo/Abono es el valor absoluto y `cargoAbono` dice cuál era. */
  montoOriginal: number;
  cargoAbono?: 'cargo' | 'abono';
  tarjetahabiente?: string;
}

export type SkipReason = 'sin_fecha' | 'monto_cero' | 'monto_invalido';

export interface SkippedRow {
  sourceRow: number;
  reason: SkipReason;
  cells: string[];
}

export interface ParseMeta {
  delimiter?: string;
  encoding: 'utf-8' | 'windows-1252';
  ambiguousDate: boolean;
}

export interface ParseResult {
  movements: RawMovement[];
  skipped: SkippedRow[];
  meta: ParseMeta;
}

export function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;

  // Remove currency symbols & codes, then quotes/spaces from the VALUE.
  // (El código de moneda se quita ANTES de quitar comillas/espacios: hoy
  // '129,00 EUR' se convierte en '129,00EUR' —sin \b entre 0 y E— y no
  // matchea \b(MXN|USD|EUR|GBP)\b, dejando "EUR" pegado y rompiendo el parseo.)
  let cleaned = amountStr
    .replace(/\b(MXN|USD|EUR|GBP)\b/gi, '')
    .replace(/["'\s]/g, '')
    .replace(/[$€£¥]/g, '');

  const sign = /^-/.test(cleaned) || /-$/.test(cleaned) ? -1 : 1;
  const unsigned = cleaned.replace(/^[-+]|[-+]$/g, '');

  // Unambiguous European: 1.234,56 / 1.234.567,89 / 1234,56
  const europeanUnambiguous = /^\d{1,3}(\.\d{3})+(,\d{1,2})?$|^\d+,\d{1,2}$/.test(unsigned);
  // Unambiguous American: 1,234.56 / 1,234,567.89 / 1234.56
  const americanUnambiguous = /^\d{1,3}(,\d{3})+(\.\d{1,2})?$|^\d+\.\d{1,2}$/.test(unsigned);

  if (europeanUnambiguous && !americanUnambiguous) {
    cleaned = unsigned.replace(/\./g, '').replace(',', '.');
  } else if (americanUnambiguous && !europeanUnambiguous) {
    cleaned = unsigned.replace(/,/g, '');
  } else {
    // Ambiguous fallback (matches previous behaviour)
    const hasCommaDecimal = /,\d{1,2}$/.test(unsigned);
    cleaned = hasCommaDecimal
      ? unsigned.replace(/\./g, '').replace(',', '.')
      : unsigned.replace(/,/g, '');
  }

  const n = parseFloat(cleaned);
  if (isNaN(n)) return 0;
  return sign * n;
}

export function parseDate(dateStr: string, formatHint: DateHint = 'auto'): Date | null {
  if (!dateStr) return null;

  const cleaned = dateStr.trim();

  // Numeric DD/MM/YYYY or MM/DD/YYYY (also '-' or '.')
  const numeric = cleaned.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (numeric) {
    const a = parseInt(numeric[1]);
    const b = parseInt(numeric[2]);
    const y = parseInt(numeric[3]);
    let day: number, month: number;
    if (a > 12 && b <= 12) { day = a; month = b; }
    else if (b > 12 && a <= 12) { day = b; month = a; }
    else if (formatHint === 'MDY') { month = a; day = b; }
    else { day = a; month = b; } // default DMY (MX/ES)
    return new Date(y, month - 1, day);
  }

  // DD Mon YYYY
  const ddMonYYYY = cleaned.match(/^(\d{1,2})\s+([A-Za-zÁÉÍÓÚáéíóú]{3})\s+(\d{4})$/);
  if (ddMonYYYY) {
    const monthKey = ddMonYYYY[2].toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
    const months: Record<string, number> = {
      jan: 0, ene: 0, feb: 1, mar: 2, apr: 3, abr: 3,
      may: 4, jun: 5, jul: 6, aug: 7, ago: 7, sep: 8,
      oct: 9, nov: 10, dec: 11, dic: 11,
    };
    const month = months[monthKey];
    if (month !== undefined) {
      return new Date(parseInt(ddMonYYYY[3]), month, parseInt(ddMonYYYY[1]));
    }
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const yyyymmdd = cleaned.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (yyyymmdd) {
    return new Date(parseInt(yyyymmdd[1]), parseInt(yyyymmdd[2]) - 1, parseInt(yyyymmdd[3]));
  }

  const fallback = new Date(cleaned);
  return isNaN(fallback.getTime()) ? null : fallback;
}

// True if any DD/MM/YYYY-style date in dateCol has both first parts ≤ 12 (ambiguous)
export function detectDateAmbiguity(rows: string[][], dateCol: number): boolean {
  for (const row of rows) {
    const cell = row?.[dateCol];
    if (!cell) continue;
    const m = String(cell).trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-]\d{4}$/);
    if (!m) continue;
    if (parseInt(m[1]) <= 12 && parseInt(m[2]) <= 12) return true;
  }
  return false;
}

// Some banks (e.g. BBVA México) add title/metadata rows before the real header
// ("Cuenta: 123", "DETALLE DE MOVIMIENTOS", empty row, then FECHA | DESCRIPCIÓN | CARGO | ABONO | SALDO).
// Drop everything above the header row so column detection works.
export function stripPreamble(rows: string[][]): string[][] {
  const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const limit = Math.min(rows.length, 15);
  for (let i = 0; i < limit; i++) {
    const cells = rows[i].map(norm);
    const hasDate = cells.some(c => c === 'fecha' || c === 'date' || c.startsWith('fecha '));
    const hasOther = cells.some(c =>
      ['descripcion', 'description', 'concepto', 'detalle', 'importe', 'amount', 'monto', 'cargo', 'abono', 'debe', 'haber', 'credito', 'debito', 'retiro', 'deposito'].includes(c)
    );
    if (hasDate && hasOther) {
      return i === 0 ? rows : rows.slice(i);
    }
  }
  return rows;
}

export function detectFormat(lines: string[][]): { dateCol: number; descCol: number; amountCol: number; hasHeader: boolean } {
  let dateCol = 0;
  let descCol = 1;
  let descFromHeader = false;
  let amountCol = -1;
  let hasHeader = false;

  if (lines.length === 0) return { dateCol, descCol, amountCol, hasHeader };

  const firstRow = lines[0];
  const firstRowText = firstRow.join(' ').toLowerCase();

  // Check if first row is a header
  if (firstRowText.includes('fecha') || firstRowText.includes('date') ||
      firstRowText.includes('descripción') || firstRowText.includes('description') ||
      firstRowText.includes('importe') || firstRowText.includes('amount')) {
    hasHeader = true;

    // Use header names to find columns. Track date candidates to disambiguate
    // when the file has both "Fecha operación" and "Fecha valor".
    const dateOperacionCandidates: number[] = [];
    const dateValorCandidates: number[] = [];
    const dateGenericCandidates: number[] = [];

    for (let i = 0; i < firstRow.length; i++) {
      const header = firstRow[i].toLowerCase().trim();
      // Strip accents AND parenthetical units like "(€)", "(MXN)", "(USD)" from header names
      const normalizedHeader = header
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/\s*\([^)]*\)\s*/g, '')
        .trim();

      // --- Date column candidates ---
      if (
        normalizedHeader === 'fecha operacion' ||
        normalizedHeader === 'fecha mov' ||
        normalizedHeader === 'fecha mov.' ||
        normalizedHeader.includes('fecha operacion') ||
        normalizedHeader.includes('fecha mov')
      ) {
        dateOperacionCandidates.push(i);
      } else if (
        normalizedHeader === 'f. valor' ||
        normalizedHeader === 'f valor' ||
        normalizedHeader === 'fecha valor' ||
        normalizedHeader.includes('fecha valor') ||
        normalizedHeader.includes('f. valor')
      ) {
        dateValorCandidates.push(i);
      } else if (
        normalizedHeader === 'fecha' ||
        normalizedHeader === 'date'
      ) {
        dateGenericCandidates.push(i);
      }

      // --- Amount column (single) ---
      if (
        normalizedHeader === 'importe' ||
        normalizedHeader === 'amount' ||
        normalizedHeader === 'monto' ||
        normalizedHeader === 'cantidad' ||
        normalizedHeader === 'valor' ||
        normalizedHeader.includes('importe')
      ) {
        amountCol = i;
      }

      // --- Description column ---
      if (
        normalizedHeader === 'descripcion' ||
        normalizedHeader === 'description' ||
        normalizedHeader === 'concepto' ||
        normalizedHeader === 'detalle' ||
        normalizedHeader === 'comentario' ||
        normalizedHeader === 'referencia' ||
        normalizedHeader.includes('descripcion') ||
        normalizedHeader.includes('concepto')
      ) {
        descCol = i;
        descFromHeader = true;
      }
    }

    // Date priority: operación/mov > generic "fecha" > f. valor (only used as fallback)
    if (dateOperacionCandidates.length > 0) {
      dateCol = dateOperacionCandidates[0];
    } else if (dateGenericCandidates.length > 0) {
      dateCol = dateGenericCandidates[0];
    } else if (dateValorCandidates.length > 0) {
      dateCol = dateValorCandidates[0];
    }
  }

  // If no header or columns not found, detect from data
  const dataRows = hasHeader ? lines.slice(1) : lines;

  if (dataRows.length > 0) {
    // Detect date column from first data row with valid date
    for (const row of dataRows.slice(0, 3)) {
      for (let i = 0; i < row.length; i++) {
        if (parseDate(row[i])) {
          dateCol = i;
          break;
        }
      }
      if (dateCol >= 0) break;
    }

    // Detect amount column - prefer columns with decimal values
    if (amountCol === -1) {
      const amountCandidates: { col: number; hasDecimal: boolean; count: number }[] = [];
      const headerNames = hasHeader
        ? lines[0].map(h => (h || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim())
        : [];
      const isBalanceCol = (i: number) =>
        ['saldo', 'balance', 'saldo disponible', 'saldo contable', 'disponible'].includes(headerNames[i] || '');

      for (let colIdx = 0; colIdx < (dataRows[0]?.length || 0); colIdx++) {
        if (colIdx === dateCol) continue;
        if (isBalanceCol(colIdx)) continue; // never use the running balance as amount

        let validCount = 0;
        let hasDecimal = false;

        for (const row of dataRows.slice(0, 5)) {
          const cell = row[colIdx];
          if (!cell) continue;

          const amount = parseAmount(cell);
          if (amount !== 0 && !isNaN(amount)) {
            validCount++;
            if (cell.includes('.') || cell.includes(',')) {
              hasDecimal = true;
            }
          }
        }

        if (validCount > 0) {
          amountCandidates.push({ col: colIdx, hasDecimal, count: validCount });
        }
      }

      // Prefer columns with decimals (actual amounts vs account numbers)
      amountCandidates.sort((a, b) => {
        if (a.hasDecimal !== b.hasDecimal) return b.hasDecimal ? 1 : -1;
        return b.count - a.count;
      });

      if (amountCandidates.length > 0) {
        amountCol = amountCandidates[0].col;
      }
    }

    // Find description column (longest text that's not date or amount)
    if (!descFromHeader) {
      const firstDataRow = dataRows[0];
      if (firstDataRow) {
        let maxLen = 0;
        for (let i = 0; i < firstDataRow.length; i++) {
          if (i !== dateCol && i !== amountCol) {
            const len = firstDataRow[i].length;
            if (len > maxLen) {
              maxLen = len;
              descCol = i;
            }
          }
        }
      }
    }
  }

  return { dateCol, descCol, amountCol, hasHeader };
}

export function excelSerialToDate(serial: number): Date | null {
  // Excel serial date: days since 1900-01-01 (with the 1900 leap year bug)
  if (serial < 1 || serial > 2958465) return null; // valid range ~1900-9999
  const utcDays = serial - 25569; // difference between Excel epoch and Unix epoch
  const ms = utcDays * 86400 * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return d;
}

const CARGO_HEADERS = ['cargo', 'debe', 'débito', 'debito', 'retiro', 'egreso', 'importe cargo'];
const ABONO_HEADERS = ['abono', 'haber', 'crédito', 'credito', 'deposito', 'depósito', 'ingreso', 'importe abono'];
const TARJETAHABIENTE_HEADERS = [
  'tarjetahabiente', 'titular', 'nombre titular', 'cardholder', 'nombre tarjetahabiente', 'nombre del tarjetahabiente',
  'tarjeta habiente', 'titular de la tarjeta', 'titular tarjeta', 'card member', 'card member name', 'member name',
  'nombre del titular', 'titulartarjeta',
];

const sinAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/** Motivo de descarte de un importe que parseAmount dejó en 0. */
const motivoMonto = (raw: string): SkipReason => (raw.trim() === '' || /\d/.test(raw) ? 'monto_cero' : 'monto_invalido');

/**
 * Núcleo compartido CSV/Excel: recibe las celdas como texto, quita el preámbulo,
 * detecta columnas y produce movimientos + descartes con motivo.
 */
export function parseRows(rawRows: string[][], hint: DateHint = 'auto'): { movements: RawMovement[]; skipped: SkippedRow[]; ambiguousDate: boolean } {
  const rows = stripPreamble(
    rawRows
      .map((row) => (row || []).map((cell) => (cell ?? '').toString().trim()))
      .filter((row) => row.some((c) => c.length > 0)),
  );
  if (rows.length === 0) return { movements: [], skipped: [], ambiguousDate: false };

  // Muestra limpia para detectar columnas: cabecera + filas con fecha e importe (evita metadatos)
  const candidatas = rows.filter((row) =>
    row.some((cell) => parseDate(cell)) &&
    row.some((cell) => { const a = parseAmount(cell); return a !== 0 && !isNaN(a); }));
  const muestra = [rows[0], ...candidatas.slice(0, 25)];
  const { dateCol, descCol, amountCol, hasHeader } = detectFormat(muestra);

  const headerLower = (hasHeader ? rows[0] : []).map((h) => (h || '').toLowerCase().trim());
  const cargoCol = headerLower.findIndex((h) => CARGO_HEADERS.includes(h));
  const abonoCol = headerLower.findIndex((h) => ABONO_HEADERS.includes(h));
  const tarjetahabienteCol = headerLower.findIndex((h) => TARJETAHABIENTE_HEADERS.includes(sinAcentos(h)));
  const usaCargoAbono = hasHeader && (cargoCol >= 0 || abonoCol >= 0);

  const dataRows = hasHeader ? rows.slice(1) : rows;
  const movements: RawMovement[] = [];
  const skipped: SkippedRow[] = [];

  dataRows.forEach((row, i) => {
    const fecha = parseDate(row[dateCol] ?? '', hint);
    if (!fecha) {
      skipped.push({ sourceRow: i, reason: 'sin_fecha', cells: row });
      return;
    }
    const descripcion = row[descCol] ?? '';

    let montoOriginal = 0;
    let cargoAbono: RawMovement['cargoAbono'];
    let raw = '';
    if (usaCargoAbono) {
      const cargo = cargoCol >= 0 ? parseAmount(row[cargoCol] ?? '') : 0;
      const abono = abonoCol >= 0 ? parseAmount(row[abonoCol] ?? '') : 0;
      if (cargo !== 0) { montoOriginal = Math.abs(cargo); cargoAbono = 'cargo'; }
      else if (abono !== 0) { montoOriginal = Math.abs(abono); cargoAbono = 'abono'; }
      raw = `${row[cargoCol] ?? ''}${row[abonoCol] ?? ''}`;
    } else if (amountCol >= 0) {
      // La columna de importe detectada (por cabecera o por datos) gana siempre a la heurística.
      raw = row[amountCol] ?? '';
      montoOriginal = parseAmount(raw);
    } else {
      // Sin columna de importe: primer numérico de derecha a izquierda
      for (let j = row.length - 1; j >= 0; j--) {
        const v = parseAmount(row[j] ?? '');
        if (v !== 0 && !isNaN(v)) { montoOriginal = v; raw = row[j]; break; }
      }
    }

    if (montoOriginal === 0) {
      skipped.push({ sourceRow: i, reason: motivoMonto(raw), cells: row });
      return;
    }

    const titular = tarjetahabienteCol >= 0 ? (row[tarjetahabienteCol] ?? '').trim() : '';
    movements.push({
      sourceRow: i,
      fecha,
      descripcion,
      montoOriginal,
      ...(cargoAbono ? { cargoAbono } : {}),
      ...(titular ? { tarjetahabiente: titular } : {}),
    });
  });

  return { movements, skipped, ambiguousDate: detectDateAmbiguity(dataRows, dateCol) };
}

/** Quita el BOM; UTF-8 estricto y, si los bytes no son válidos, Windows-1252 (Latin-1). */
export function decodeBytes(bytes: Uint8Array): { text: string; encoding: ParseMeta['encoding'] } {
  const sinBom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? bytes.subarray(3) : bytes;
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(sinBom), encoding: 'utf-8' };
  } catch {
    return { text: new TextDecoder('windows-1252').decode(sinBom), encoding: 'windows-1252' };
  }
}

/** CSV con Papa (campos multilínea entre comillas) y separador autodetectado (, ; tab |). */
export function parseCsvText(text: string, hint: DateHint = 'auto'): { movements: RawMovement[]; skipped: SkippedRow[]; ambiguousDate: boolean; delimiter: string } {
  const parsed = Papa.parse<string[]>(text, {
    quoteChar: '"',
    escapeChar: '"',
    skipEmptyLines: 'greedy',
    delimitersToGuess: [',', ';', '\t', '|'],
  });
  if (parsed.errors?.length) {
    console.warn('CSV parse errors (showing first 3):', parsed.errors.slice(0, 3));
  }
  const rows = (parsed.data || []).map((row) => (row || []).map((cell) => (cell ?? '').toString()));
  return { ...parseRows(rows, hint), delimiter: parsed.meta.delimiter };
}

const celdaATexto = (cell: unknown): string => {
  if (cell === null || cell === undefined) return '';
  if (cell instanceof Date) {
    const dd = String(cell.getDate()).padStart(2, '0');
    const mm = String(cell.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${cell.getFullYear()}`;
  }
  if (typeof cell === 'number') {
    if (cell > 32874 && cell < 51500 && Number.isInteger(cell)) {
      const d = excelSerialToDate(cell);
      if (d) {
        const dd = String(d.getUTCDate()).padStart(2, '0');
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        return `${dd}/${mm}/${d.getUTCFullYear()}`;
      }
    }
    return cell.toString();
  }
  return String(cell);
};

/** Excel: primera hoja; xlsx pesa ~400 KB y se carga solo aquí. */
export async function parseExcelBytes(data: ArrayBuffer | Uint8Array, hint: DateHint = 'auto'): Promise<{ movements: RawMovement[]; skipped: SkippedRow[]; ambiguousDate: boolean }> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false, dateNF: 'dd/mm/yyyy' }) as unknown[][];
  const rows: string[][] = jsonData
    .filter((row) => row != null && Array.isArray(row) && row.length > 0)
    .map((row) => Array.from({ length: row.length }, (_, i) => celdaATexto(row[i])));
  return parseRows(rows, hint);
}

export const esExcel = (filename: string): boolean => /\.xlsx?$/i.test(filename);

/** Punto de entrada: bytes + nombre → movimientos, descartes y metadatos. */
export async function parseBankStatement(bytes: ArrayBuffer, filename: string, hint: DateHint = 'auto'): Promise<ParseResult> {
  if (esExcel(filename)) {
    const r = await parseExcelBytes(bytes, hint);
    return { movements: r.movements, skipped: r.skipped, meta: { encoding: 'utf-8', ambiguousDate: r.ambiguousDate } };
  }
  const { text, encoding } = decodeBytes(new Uint8Array(bytes));
  const r = parseCsvText(text, hint);
  return { movements: r.movements, skipped: r.skipped, meta: { delimiter: r.delimiter, encoding, ambiguousDate: r.ambiguousDate } };
}
