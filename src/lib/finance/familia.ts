import { diasHasta, toFechaISO } from './fechas';

export type Divisa = 'MXN' | 'USD' | 'EUR';
const DIVISAS: readonly Divisa[] = ['MXN', 'USD', 'EUR'];

export interface Contacto { id: string; nombre: string; rol: string; telefono: string; email: string; nota: string }
export interface Seguro {
  id: string; tipo: string; aseguradora: string; poliza: string;
  sumaAsegurada: number | null; divisa: Divisa;
  beneficiarios: string;
  /** YYYY-MM-DD local. */
  vencimiento: string | null;
  /** Agente, teléfono y pasos para reclamar. */
  comoReclamar: string;
}
export interface Documento { id: string; que: string; donde: string; nota: string }
export interface DecisionPago { decision: 'mantener' | 'cancelar' | null; nota: string }

export interface InfoFamilia {
  /** "Si estás leyendo esto": pasos en orden. */
  carta: string;
  contactos: Contacto[];
  seguros: Seguro[];
  documentos: Documento[];
  /** Clave `cuenta:<id>` | `inversion:<id>` | `cripto:<id>`. */
  notasPatrimonio: Record<string, string>;
  /** Clave `sub:<id>` | `anual:<groupId>`. */
  pagos: Record<string, DecisionPago>;
  /** Lo que normalizar no supo interpretar; se reescribe tal cual al guardar. */
  extra: Record<string, unknown>;
}

export type EstadoRevision = 'sin_datos' | 'al_dia' | 'vencida';
export type EstadoVencimiento = 'sin_fecha' | 'vigente' | 'proxima' | 'vencida';
export interface NotaHuerfana { origen: 'nota' | 'pago'; clave: string; texto: string }

export const DIAS_REVISION = 180;
export const DIAS_AVISO_VENCIMIENTO = 30;

const CAMPOS = new Set(['carta', 'contactos', 'seguros', 'documentos', 'notasPatrimonio', 'pagos']);
const CAMPOS_CONTACTO = new Set(['id', 'nombre', 'rol', 'telefono', 'email', 'nota']);
const CAMPOS_SEGURO = new Set(['id', 'tipo', 'aseguradora', 'poliza', 'sumaAsegurada', 'divisa', 'beneficiarios', 'vencimiento', 'comoReclamar']);
const CAMPOS_DOCUMENTO = new Set(['id', 'que', 'donde', 'nota']);
const CAMPOS_DECISION_PAGO = new Set(['decision', 'nota']);
const IRREPARABLES = '_irreparables';
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

const nuevoId = () => crypto.randomUUID();
const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const esEscalar = (v: unknown): v is string | number | boolean => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
const texto = (v: unknown): string =>
  typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : '';
const numero = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

export const infoFamiliaVacia = (): InfoFamilia => ({
  carta: '', contactos: [], seguros: [], documentos: [], notasPatrimonio: {}, pagos: {}, extra: {},
});

export const nuevoContacto = (): Contacto => ({ id: nuevoId(), nombre: '', rol: '', telefono: '', email: '', nota: '' });
export const nuevoSeguro = (): Seguro => ({
  id: nuevoId(), tipo: '', aseguradora: '', poliza: '', sumaAsegurada: null, divisa: 'MXN',
  beneficiarios: '', vencimiento: null, comoReclamar: '',
});
export const nuevoDocumento = (): Documento => ({ id: nuevoId(), que: '', donde: '', nota: '' });

type ApartarFn = (campo: string, valor: unknown) => void;

const repararContacto = (o: Record<string, unknown>, apartar: ApartarFn): Contacto => {
  const id = texto(o.id) || nuevoId();

  // Track unknown keys
  for (const k of Object.keys(o)) {
    if (!CAMPOS_CONTACTO.has(k)) {
      apartar('contactos', { id, campo: k, valor: o[k] });
    }
  }

  // Track lossy repairs for text fields
  for (const campo of ['nombre', 'rol', 'telefono', 'email', 'nota']) {
    if (o[campo] !== undefined && !esEscalar(o[campo])) {
      apartar('contactos', { id, campo, valor: o[campo] });
    }
  }

  return { id, nombre: texto(o.nombre), rol: texto(o.rol), telefono: texto(o.telefono), email: texto(o.email), nota: texto(o.nota) };
};

const repararSeguro = (o: Record<string, unknown>, apartar: ApartarFn): Seguro => {
  const id = texto(o.id) || nuevoId();

  // Track unknown keys
  for (const k of Object.keys(o)) {
    if (!CAMPOS_SEGURO.has(k)) {
      apartar('seguros', { id, campo: k, valor: o[k] });
    }
  }

  // Track lossy repairs for text fields
  for (const campo of ['tipo', 'aseguradora', 'poliza', 'beneficiarios', 'comoReclamar']) {
    if (o[campo] !== undefined && !esEscalar(o[campo])) {
      apartar('seguros', { id, campo, valor: o[campo] });
    }
  }

  // Track unparseable sumaAsegurada
  if (o.sumaAsegurada !== undefined && o.sumaAsegurada !== null && numero(o.sumaAsegurada) === null) {
    apartar('seguros', { id, campo: 'sumaAsegurada', valor: o.sumaAsegurada });
  }

  // Track invalid divisa
  if (o.divisa !== undefined && !DIVISAS.includes(o.divisa as Divisa)) {
    apartar('seguros', { id, campo: 'divisa', valor: o.divisa });
  }

  // Track invalid vencimiento format
  if (o.vencimiento !== undefined && o.vencimiento !== null && !(typeof o.vencimiento === 'string' && FECHA_ISO.test(o.vencimiento))) {
    apartar('seguros', { id, campo: 'vencimiento', valor: o.vencimiento });
  }

  return {
    id, tipo: texto(o.tipo), aseguradora: texto(o.aseguradora), poliza: texto(o.poliza),
    sumaAsegurada: numero(o.sumaAsegurada),
    divisa: DIVISAS.includes(o.divisa as Divisa) ? (o.divisa as Divisa) : 'MXN',
    beneficiarios: texto(o.beneficiarios),
    vencimiento: typeof o.vencimiento === 'string' && FECHA_ISO.test(o.vencimiento) ? o.vencimiento : null,
    comoReclamar: texto(o.comoReclamar),
  };
};

const repararDocumento = (o: Record<string, unknown>, apartar: ApartarFn): Documento => {
  const id = texto(o.id) || nuevoId();

  // Track unknown keys
  for (const k of Object.keys(o)) {
    if (!CAMPOS_DOCUMENTO.has(k)) {
      apartar('documentos', { id, campo: k, valor: o[k] });
    }
  }

  // Track lossy repairs for text fields
  for (const campo of ['que', 'donde', 'nota']) {
    if (o[campo] !== undefined && !esEscalar(o[campo])) {
      apartar('documentos', { id, campo, valor: o[campo] });
    }
  }

  return { id, que: texto(o.que), donde: texto(o.donde), nota: texto(o.nota) };
};

/**
 * Convierte lo que venga de la BD en un documento válido. Repara en vez de
 * descartar; lo irreparable va a `extra._irreparables[campo]` y las claves
 * desconocidas a `extra`, y serializarInfoFamilia lo reescribe tal cual.
 */
export const normalizarInfoFamilia = (raw: unknown): InfoFamilia => {
  const info = infoFamiliaVacia();
  if (raw === null || raw === undefined) return info;
  if (!esObjeto(raw)) {
    info.extra[IRREPARABLES] = { raiz: [raw] };
    return info;
  }

  const irreparables: Record<string, unknown[]> = {};
  if (esObjeto(raw[IRREPARABLES])) {
    for (const [k, v] of Object.entries(raw[IRREPARABLES] as Record<string, unknown>)) {
      irreparables[k] = Array.isArray(v) ? [...v] : [v];
    }
  } else if (raw[IRREPARABLES] !== undefined) {
    // Preserve non-object _irreparables
    (irreparables[IRREPARABLES] ??= []).push(raw[IRREPARABLES]);
  }
  const apartar = (campo: string, valor: unknown) => { (irreparables[campo] ??= []).push(valor); };

  for (const [k, v] of Object.entries(raw)) {
    if (!CAMPOS.has(k) && k !== IRREPARABLES) info.extra[k] = v;
  }

  if (raw.carta !== undefined) {
    if (typeof raw.carta === 'string') info.carta = raw.carta;
    else apartar('carta', raw.carta);
  }

  const lista = <T>(campo: string, reparar: (o: Record<string, unknown>, apartar: ApartarFn) => T): T[] => {
    const v = raw[campo];
    if (v === undefined) return [];
    if (!Array.isArray(v)) { apartar(campo, v); return []; }
    const out: T[] = [];
    for (const el of v) {
      if (esObjeto(el)) out.push(reparar(el, apartar));
      else apartar(campo, el);
    }
    return out;
  };
  info.contactos = lista('contactos', repararContacto);
  info.seguros = lista('seguros', repararSeguro);
  info.documentos = lista('documentos', repararDocumento);

  if (raw.notasPatrimonio !== undefined) {
    if (!esObjeto(raw.notasPatrimonio)) apartar('notasPatrimonio', raw.notasPatrimonio);
    else for (const [clave, valor] of Object.entries(raw.notasPatrimonio)) {
      if (typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean') info.notasPatrimonio[clave] = String(valor);
      else apartar('notasPatrimonio', { clave, valor });
    }
  }

  if (raw.pagos !== undefined) {
    if (!esObjeto(raw.pagos)) apartar('pagos', raw.pagos);
    else for (const [clave, valor] of Object.entries(raw.pagos)) {
      if (!esObjeto(valor)) { apartar('pagos', { clave, valor }); continue; }

      // Track unknown keys in pagos entry
      for (const k of Object.keys(valor)) {
        if (!CAMPOS_DECISION_PAGO.has(k)) {
          apartar('pagos', { clave, campo: k, valor: valor[k] });
        }
      }

      // Track lossy repairs in pagos entry
      const decision = valor.decision === 'mantener' || valor.decision === 'cancelar' ? valor.decision : null;
      if (valor.decision !== undefined && valor.decision !== null && valor.decision !== 'mantener' && valor.decision !== 'cancelar') {
        apartar('pagos', { clave, campo: 'decision', valor: valor.decision });
      }

      if (valor.nota !== undefined && !esEscalar(valor.nota)) {
        apartar('pagos', { clave, campo: 'nota', valor: valor.nota });
      }

      info.pagos[clave] = { decision, nota: texto(valor.nota) };
    }
  }

  if (Object.keys(irreparables).length > 0) info.extra[IRREPARABLES] = irreparables;
  return info;
};

/** Inverso de normalizarInfoFamilia: funde `extra` de vuelta en la raíz. */
export const serializarInfoFamilia = (info: InfoFamilia): Record<string, unknown> => ({
  ...info.extra,
  carta: info.carta,
  contactos: info.contactos,
  seguros: info.seguros,
  documentos: info.documentos,
  notasPatrimonio: info.notasPatrimonio,
  pagos: info.pagos,
});

/** Nota para la familia de una partida; texto vacío la borra. */
export const conNota = (d: InfoFamilia, clave: string, textoNota: string): InfoFamilia => {
  const notasPatrimonio = { ...d.notasPatrimonio };
  if (textoNota) notasPatrimonio[clave] = textoNota;
  else delete notasPatrimonio[clave];
  return { ...d, notasPatrimonio };
};

/** Decisión sobre un pago; sin decisión ni nota se borra. */
export const conDecision = (d: InfoFamilia, clave: string, p: DecisionPago): InfoFamilia => {
  const pagos = { ...d.pagos };
  if (p.decision || p.nota) pagos[clave] = p;
  else delete pagos[clave];
  return { ...d, pagos };
};

export const sinHuerfana = (d: InfoFamilia, h: NotaHuerfana): InfoFamilia => {
  if (h.origen === 'nota') return conNota(d, h.clave, '');
  const pagos = { ...d.pagos };
  delete pagos[h.clave];
  return { ...d, pagos };
};

/** Días naturales locales desde la revisión (misma cuenta que diasHasta: el cambio de horario no desplaza). */
export const diasDesdeRevision = (revisadoAt: string, now: Date = new Date()): number =>
  0 - diasHasta(toFechaISO(new Date(revisadoAt)), now);

export const estadoRevision = (revisadoAt: string | null, now: Date = new Date()): EstadoRevision => {
  if (!revisadoAt) return 'sin_datos';
  return diasDesdeRevision(revisadoAt, now) <= DIAS_REVISION ? 'al_dia' : 'vencida';
};

export const estadoVencimientoSeguro = (vencimiento: string | null, now: Date = new Date()): EstadoVencimiento => {
  if (!vencimiento) return 'sin_fecha';
  const dias = diasHasta(vencimiento, now);
  if (dias < 0) return 'vencida';
  return dias <= DIAS_AVISO_VENCIMIENTO ? 'proxima' : 'vigente';
};

/** Migración sin aplicar: Postgres 42P01 (undefined_table) o PostgREST PGRST205 (tabla fuera del schema cache). */
export const esTablaInexistente = (error: unknown): boolean => {
  const code = esObjeto(error) ? error.code : undefined;
  return code === '42P01' || code === 'PGRST205';
};
