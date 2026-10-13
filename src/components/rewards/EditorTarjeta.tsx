import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Codigo } from './Codigo';
import { completar, MOTIVOS, normalizar, validar } from '@/lib/rewards/codigos';
import {
  NOMBRE_TIPO_CODIGO, NOMBRE_TIPO_PROGRAMA, TIPOS_CODIGO, TIPOS_PROGRAMA,
  type Programa, type Tarjeta, type TipoCodigo,
} from '@/lib/rewards/tipos';
import { useGuardarTarjeta } from '@/lib/rewards/datos';

const COLORES = ['#4F8248', '#4F837F', '#5B7397', '#726A98', '#86698A', '#A56C7E', '#A87B5A', '#A46F62', '#968551', '#676E77'];
const OTRO = 'otro';
// Mismo aspecto que los Input de shadcn, para los <select> nativos (con <optgroup>).
const SELECT = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Alta y edición de una tarjeta propia de Savium Rewards. */
export function EditorTarjeta({ inicial, nueva, programas, pais, onCerrar }: {
  inicial: Tarjeta; nueva: boolean; programas: Programa[]; pais: string; onCerrar: () => void;
}) {
  const [t, setT] = useState<Tarjeta>(inicial);
  const [valor, setValor] = useState(inicial.codigo_valor ?? '');
  const [otro, setOtro] = useState(!nueva && !inicial.programa_id);
  const [todos, setTodos] = useState(false);
  const guardar = useGuardarTarjeta();
  const cambiar = (c: Partial<Tarjeta>) => setT(x => ({ ...x, ...c }));

  const programa = programas.find(p => p.id === t.programa_id);
  const motivo = validar(valor, t.codigo_tipo);
  const sugerido = motivo ? completar(valor, t.codigo_tipo) : null;
  const nombreValido = !!t.programa_id || !!t.nombre?.trim();
  const puedeGuardar = motivo === null && nombreValido && !guardar.isPending;
  const visibles = useMemo(() => programas.filter(p => p.activo && (todos || p.pais === pais || p.pais === 'INT')), [programas, todos, pais]);

  function elegirPrograma(id: string) {
    if (id === OTRO) {
      setOtro(true);
      return cambiar({ programa_id: null, color: t.color ?? COLORES[0] });
    }
    const p = programas.find(x => x.id === id);
    if (!p) return;
    setOtro(false);
    cambiar({ programa_id: p.id, nombre: null, color: null, unidad: null, ...(valor ? {} : { codigo_tipo: p.codigo_tipo }) });
  }

  async function enviar() {
    const limpio = (s: string | null) => (s?.trim() ? s.trim() : null);
    await guardar.mutateAsync({
      ...t,
      nombre: t.programa_id ? null : limpio(t.nombre), unidad: limpio(t.unidad), numero_socio: limpio(t.numero_socio),
      titular: limpio(t.titular), notas: limpio(t.notas),
      codigo_valor: t.codigo_tipo === 'ninguno' ? null : normalizar(valor, t.codigo_tipo),
    });
    onCerrar();
  }

  async function borrar() {
    if (!confirm('¿Borrar esta tarjeta? También desaparecerá de la cartera de tu familia.')) return;
    // Se borra la versión guardada, no lo que se estaba editando.
    await guardar.mutateAsync({ ...inicial, borrado: true });
    onCerrar();
  }

  return (
    <Dialog open onOpenChange={abierto => !abierto && onCerrar()}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>{nueva ? 'Nueva tarjeta' : 'Editar tarjeta'}</DialogTitle></DialogHeader>
        <div className="space-y-5">
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rw-programa">Programa</Label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={todos} onCheckedChange={setTodos} />Todos los países
              </label>
            </div>
            <select id="rw-programa" className={SELECT} value={t.programa_id ?? (otro ? OTRO : '')} onChange={e => elegirPrograma(e.target.value)}>
              <option value="" disabled>Elegir programa…</option>
              {TIPOS_PROGRAMA.map(tipo => (
                <optgroup key={tipo} label={NOMBRE_TIPO_PROGRAMA[tipo]}>
                  {visibles.filter(p => p.tipo === tipo).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </optgroup>
              ))}
              <option value={OTRO}>Otro programa</option>
            </select>
            {otro && (
              <>
                <Input placeholder="Nombre de la tarjeta" maxLength={60} value={t.nombre ?? ''} onChange={e => cambiar({ nombre: e.target.value })} />
                <div className="flex flex-wrap gap-2">
                  {COLORES.map(c => (
                    <button key={c} type="button" aria-label={`Color ${c}`} onClick={() => cambiar({ color: c })}
                      className={`h-8 w-8 rounded-full ${t.color === c ? 'ring-2 ring-primary ring-offset-2' : ''}`} style={{ background: c }} />
                  ))}
                </div>
              </>
            )}
            {!nombreValido && <p className="text-xs text-destructive">Elige un programa o escribe el nombre de la tarjeta.</p>}
          </section>

          <section className="space-y-2">
            <Label htmlFor="rw-tipo">Código</Label>
            <select id="rw-tipo" className={SELECT} value={t.codigo_tipo}
              onChange={e => { const tipo = e.target.value as TipoCodigo; cambiar({ codigo_tipo: tipo }); if (tipo === 'ninguno') setValor(''); }}>
              {TIPOS_CODIGO.map(c => <option key={c} value={c}>{NOMBRE_TIPO_CODIGO[c]}</option>)}
            </select>
            {t.codigo_tipo !== 'ninguno' && (
              <>
                <Input className="font-mono" placeholder="Contenido del código" maxLength={512} value={valor} onChange={e => setValor(e.target.value)} />
                {motivo && valor && <p className="text-xs text-destructive">{MOTIVOS[motivo]}</p>}
                {sugerido && <Button type="button" variant="link" className="h-auto p-0" onClick={() => setValor(sugerido)}>Usar {sugerido}</Button>}
                {!motivo && <Codigo valor={valor} tipo={t.codigo_tipo} />}
              </>
            )}
            <Input className="font-mono" placeholder="Número de socio" maxLength={64} value={t.numero_socio ?? ''} onChange={e => cambiar({ numero_socio: e.target.value })} />
          </section>

          <section className="space-y-3">
            <Input placeholder="Titular" maxLength={60} value={t.titular ?? ''} onChange={e => cambiar({ titular: e.target.value })} />
            <Textarea rows={3} placeholder="Notas" maxLength={1000} value={t.notas ?? ''} onChange={e => cambiar({ notas: e.target.value })} />
          </section>

          <label className="flex items-center justify-between gap-4 rounded-xl border p-4">
            <span>
              <span className="font-medium">Compartir con la familia</span>
              <span className="block text-xs text-muted-foreground">Tu familia podrá verla y enseñar su código. Solo tú puedes cambiarla.</span>
            </span>
            <Switch checked={t.compartida} onCheckedChange={v => cambiar({ compartida: v })} />
          </label>

          {guardar.error && <p className="text-sm text-destructive">No se pudo guardar: {guardar.error.message}</p>}
        </div>
        <DialogFooter className="gap-2">
          {!nueva && <Button variant="ghost" className="text-destructive" onClick={borrar}>Borrar</Button>}
          <Button disabled={!puedeGuardar} onClick={enviar}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
