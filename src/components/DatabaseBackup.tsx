import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Database, Upload } from 'lucide-react';
import { toFechaISO } from '@/lib/finance/fechas';
import {
  crearRespaldo, restaurarRespaldo, resumirRespaldo, validarRespaldo,
  type EscribirLote, type Fila, type LeerPagina, type Respaldo,
} from '@/lib/backup/respaldo';

const PALABRA_CONFIRMACION = 'RESTAURAR';

const contarFilas = (r: Respaldo) => resumirRespaldo(r).reduce((total, t) => total + t.filas, 0);

export const DatabaseBackup = () => {
  const [ocupado, setOcupado] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [aRestaurar, setARestaurar] = useState<Respaldo | null>(null);
  const [confirmacion, setConfirmacion] = useState('');
  const archivo = useRef<HTMLInputElement>(null);
  const { user, soloLectura } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const avisarError = (descripcion: string) =>
    toast({ title: 'Error', description: descripcion, variant: 'destructive' });

  const exportar = async () => {
    if (!user) return;
    setOcupado(true);
    setResultado(null);
    try {
      // Tablas distintas a las del tipo generado: la lista vive en lib/backup y su prueba la cruza con el esquema.
      const leer: LeerPagina = async (tabla, clave, desde, hasta) => {
        const { data, error } = await supabase
          .from(tabla as never)
          .select('*')
          .eq('user_id', user.id)
          .order(clave)
          .range(desde, hasta);
        if (error) throw new Error(error.message);
        return (data ?? []) as unknown as Fila[];
      };
      const respaldo = await crearRespaldo(leer, user.id);

      const blob = new Blob([JSON.stringify(respaldo)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `savium_respaldo_${toFechaISO(new Date())}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setResultado(`Copia descargada: ${contarFilas(respaldo).toLocaleString('es-MX')} filas de ${resumirRespaldo(respaldo).length} tablas.`);
    } catch (error) {
      console.error('Error creating backup:', error);
      avisarError(error instanceof Error ? error.message : 'No se pudo crear la copia de seguridad');
    } finally {
      setOcupado(false);
    }
  };

  const elegirArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const elegido = e.target.files?.[0];
    e.target.value = '';
    if (!elegido || !user) return;
    setResultado(null);
    try {
      const validacion = validarRespaldo(JSON.parse(await elegido.text()), user.id);
      if (validacion.ok === false) {
        avisarError(validacion.motivo);
        return;
      }
      setConfirmacion('');
      setARestaurar(validacion.respaldo);
    } catch {
      avisarError('El archivo no se pudo leer.');
    }
  };

  const restaurar = async () => {
    if (!aRestaurar) return;
    setOcupado(true);
    try {
      const escribir: EscribirLote = async (tabla, clave, filas) => {
        const { error } = await supabase.from(tabla as never).upsert(filas as never, { onConflict: clave });
        if (error) throw new Error(error.message);
      };
      const hechas = await restaurarRespaldo(aRestaurar, escribir);
      const total = hechas.reduce((suma, t) => suma + t.filas, 0);
      setResultado(`Restauración terminada: ${total.toLocaleString('es-MX')} filas de ${hechas.length} tablas.`);
      setARestaurar(null);
    } catch (error) {
      console.error('Error restoring backup:', error);
      avisarError(error instanceof Error ? error.message : 'No se pudo restaurar la copia');
    } finally {
      await queryClient.invalidateQueries();
      setOcupado(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Database className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Copia de Seguridad</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Descarga todos tus datos en un archivo. Si una tabla falla, no se descarga nada.
        El archivo no está cifrado: guárdalo en un lugar seguro.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="outline" onClick={exportar} disabled={ocupado || soloLectura}>
          <Download className="h-4 w-4 mr-2" />
          {ocupado ? 'Trabajando...' : 'Crear copia completa'}
        </Button>
        <Button variant="outline" onClick={() => archivo.current?.click()} disabled={ocupado || soloLectura}>
          <Upload className="h-4 w-4 mr-2" />
          Restaurar copia
        </Button>
      </div>
      <input ref={archivo} type="file" accept="application/json,.json" className="hidden" aria-label="Archivo de copia de seguridad" onChange={elegirArchivo} />

      {resultado && <p role="status" className="text-sm text-muted-foreground">{resultado}</p>}

      <AlertDialog open={aRestaurar !== null} onOpenChange={abierto => { if (!abierto && !ocupado) setARestaurar(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar copia</AlertDialogTitle>
            <AlertDialogDescription>
              Copia del {aRestaurar ? new Date(aRestaurar.creado).toLocaleString('es-MX') : ''}.
              Las filas del archivo sustituyen a las actuales con el mismo identificador.
              Lo que no esté en el archivo no se borra, y lo editado después de la copia se perderá.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {aRestaurar && (
            <ul className="max-h-48 overflow-y-auto text-sm space-y-1">
              {resumirRespaldo(aRestaurar).map(t => (
                <li key={t.tabla} className="flex justify-between gap-4">
                  <span className="font-mono">{t.tabla}</span>
                  <span>{t.filas.toLocaleString('es-MX')}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2">
            <label htmlFor="confirmar-restaurar" className="text-sm">
              Escribe {PALABRA_CONFIRMACION} para continuar
            </label>
            <Input
              id="confirmar-restaurar"
              autoComplete="off"
              value={confirmacion}
              onChange={e => setConfirmacion(e.target.value)}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={ocupado}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={ocupado || confirmacion !== PALABRA_CONFIRMACION}
              onClick={e => { e.preventDefault(); void restaurar(); }}
            >
              {ocupado ? 'Restaurando...' : 'Restaurar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
