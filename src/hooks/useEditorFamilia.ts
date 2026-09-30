import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { InfoFamilia, infoFamiliaVacia } from '@/lib/finance/familia';
import { FilaFamilia, useInformacionFamilia } from './useInformacionFamilia';

export type EstadoGuardado = 'guardado' | 'pendiente' | 'guardando' | 'error' | 'conflicto';

const RETRASO_MS = 1500;
const motivo = (error: unknown) => (error instanceof Error ? error.message : String(error ?? ''));

/**
 * Estado local único de «Para mi familia» con guardado automático:
 * se hidrata de la caché una sola vez, guarda 1,5 s después del último cambio,
 * al salir de la página y al cerrar la pestaña; los conflictos no sobrescriben.
 */
export const useEditorFamilia = () => {
  const remoto = useInformacionFamilia();
  const { toast } = useToast();
  const [doc, setDoc] = useState<InfoFamilia | null>(null);
  const [estado, setEstadoState] = useState<EstadoGuardado>('guardado');
  const [cambios, setCambios] = useState(0);

  const docRef = useRef<InfoFamilia | null>(null);
  const baseRef = useRef<string | null>(null);
  const estadoRef = useRef<EstadoGuardado>('guardado');
  const enVueloRef = useRef(false);
  const repetirRef = useRef(false);

  const setEstado = useCallback((e: EstadoGuardado) => {
    estadoRef.current = e;
    setEstadoState(e);
  }, []);

  const hidratar = useCallback((fila: FilaFamilia | null) => {
    const d = fila?.contenido ?? infoFamiliaVacia();
    docRef.current = d;
    setDoc(d);
    baseRef.current = fila?.updatedAt ?? null;
    repetirRef.current = false;
    setEstado('guardado');
  }, [setEstado]);

  // Una sola hidratación: después, la caché (que cambia con cada guardado) no pisa el estado local.
  useEffect(() => {
    if (docRef.current === null && !remoto.cargando && !remoto.error) hidratar(remoto.fila);
  }, [remoto.cargando, remoto.error, remoto.fila, hidratar]);

  const guardarAhora = async (forzar = false): Promise<void> => {
    const enviado = docRef.current;
    if (!enviado) return;
    // En conflicto solo «guardar la mía» (forzar) puede escribir; un temporizador ya armado no.
    if (estadoRef.current === 'conflicto' && !forzar) return;
    if (enVueloRef.current) { repetirRef.current = true; return; }
    enVueloRef.current = true;
    setEstado('guardando');
    const r = await remoto.guardar(enviado, baseRef.current, forzar);
    enVueloRef.current = false;
    if (r.tipo === 'ok') {
      baseRef.current = r.fila.updatedAt;
      if (repetirRef.current) {
        // El temporizador ya saltó durante el guardado: guardar lo nuevo ya.
        repetirRef.current = false;
        void guardarAhoraRef.current();
      } else if (docRef.current !== enviado) {
        // Hubo cambios durante el guardado y su temporizador sigue armado: él se encargará.
        setEstado('pendiente');
      } else {
        setEstado('guardado');
      }
    } else if (r.tipo === 'conflicto') {
      repetirRef.current = false;
      setEstado('conflicto');
    } else {
      repetirRef.current = false;
      setEstado('error');
      toast({ title: 'No se pudo guardar', description: motivo(r.error) || 'Error desconocido', variant: 'destructive' });
    }
  };
  const guardarAhoraRef = useRef(guardarAhora);
  guardarAhoraRef.current = guardarAhora;

  const actualizar = useCallback((fn: (d: InfoFamilia) => InfoFamilia) => {
    const d = docRef.current;
    if (!d) return;
    const nuevo = fn(d);
    docRef.current = nuevo;
    setDoc(nuevo);
    if (estadoRef.current !== 'conflicto') setEstado('pendiente');
    setCambios(c => c + 1);
  }, [setEstado]);

  // Debounce: cada cambio reinicia el temporizador.
  useEffect(() => {
    if (cambios === 0 || estadoRef.current === 'conflicto') return;
    const t = setTimeout(() => void guardarAhoraRef.current(), RETRASO_MS);
    return () => clearTimeout(t);
  }, [cambios]);

  // HashRouter no permite bloquear la navegación: se guarda al desmontar; al cerrar la pestaña, además se avisa.
  useEffect(() => {
    const antesDeCerrar = (e: BeforeUnloadEvent) => {
      if (!['pendiente', 'guardando', 'error'].includes(estadoRef.current)) return;
      if (estadoRef.current === 'pendiente') void guardarAhoraRef.current();
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', antesDeCerrar);
    return () => {
      window.removeEventListener('beforeunload', antesDeCerrar);
      if (estadoRef.current === 'pendiente') void guardarAhoraRef.current();
    };
  }, []);

  const recargar = async () => {
    try {
      hidratar(await remoto.recargar());
    } catch (error) {
      toast({ title: 'No se pudo cargar', description: motivo(error), variant: 'destructive' });
    }
  };

  const marcarRevisado = async () => {
    try {
      const fila = await remoto.marcarRevisado();
      // El trigger movió updated_at; en conflicto no se avanza la base para no ocultarlo.
      if (estadoRef.current !== 'conflicto') baseRef.current = fila.updatedAt;
      toast({ title: 'Marcado como revisado' });
    } catch (error) {
      toast({ title: 'No se pudo marcar como revisado', description: motivo(error), variant: 'destructive' });
    }
  };

  return {
    doc,
    estado,
    fila: remoto.fila,
    error: remoto.error,
    actualizar,
    recargar,
    guardarLaMia: () => void guardarAhoraRef.current(true),
    reintentar: () => void guardarAhoraRef.current(),
    marcarRevisado,
  };
};
