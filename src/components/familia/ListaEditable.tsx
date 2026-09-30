import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Plus, Trash2 } from 'lucide-react';

export interface CampoLista<T> {
  clave: keyof T & string;
  etiqueta: string;
  tipo: 'texto' | 'area' | 'numero' | 'fecha' | 'divisa';
  placeholder?: string;
}

interface Props<T extends { id: string }> {
  items: T[];
  campos: CampoLista<T>[];
  nuevo: () => T;
  onChange: (items: T[]) => void;
  renderItem: (item: T) => React.ReactNode;
  tituloDialogo: string;
  textoAnadir: string;
  vacio: string;
}

const Campo = ({ tipo, id, valor, placeholder, onChange }: {
  tipo: CampoLista<unknown>['tipo']; id: string; valor: unknown; placeholder?: string; onChange: (v: unknown) => void;
}) => {
  switch (tipo) {
    case 'area':
      return <Textarea id={id} rows={3} value={String(valor ?? '')} placeholder={placeholder} onChange={e => onChange(e.target.value)} />;
    case 'numero':
      return <Input id={id} type="number" value={valor === null || valor === undefined ? '' : String(valor)} onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} />;
    case 'fecha':
      return <Input id={id} type="date" value={String(valor ?? '')} onChange={e => onChange(e.target.value || null)} />;
    case 'divisa':
      return (
        <Select value={String(valor ?? 'MXN')} onValueChange={onChange}>
          <SelectTrigger id={id}><SelectValue /></SelectTrigger>
          <SelectContent>{['MXN', 'USD', 'EUR'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
        </Select>
      );
    default:
      return <Input id={id} value={String(valor ?? '')} placeholder={placeholder} onChange={e => onChange(e.target.value)} />;
  }
};

/** Lista de elementos con alta/edición en diálogo y borrado con confirmación. */
export function ListaEditable<T extends { id: string }>({ items, campos, nuevo, onChange, renderItem, tituloDialogo, textoAnadir, vacio }: Props<T>) {
  const [editando, setEditando] = useState<T | null>(null);
  const esNuevo = editando !== null && !items.some(i => i.id === editando.id);

  const aceptar = () => {
    if (!editando) return;
    onChange(esNuevo ? [...items, editando] : items.map(i => (i.id === editando.id ? editando : i)));
    setEditando(null);
  };
  const borrar = (id: string) => {
    if (window.confirm('¿Borrar este elemento?')) onChange(items.filter(i => i.id !== id));
  };

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{vacio}</p>
      ) : items.map(item => (
        <div key={item.id} className="flex items-start gap-2 rounded-lg border p-3">
          <div className="flex-1 min-w-0">{renderItem(item)}</div>
          <Button variant="ghost" size="icon" title="Editar" onClick={() => setEditando(item)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" title="Borrar" onClick={() => borrar(item.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => setEditando(nuevo())}>
        <Plus className="h-4 w-4 mr-1" />{textoAnadir}
      </Button>

      <Dialog open={editando !== null} onOpenChange={o => { if (!o) setEditando(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{tituloDialogo}</DialogTitle></DialogHeader>
          {editando && (
            <div className="space-y-3">
              {campos.map(c => (
                <div key={c.clave} className="space-y-1">
                  <Label htmlFor={`campo-${c.clave}`}>{c.etiqueta}</Label>
                  <Campo
                    tipo={c.tipo}
                    id={`campo-${c.clave}`}
                    valor={editando[c.clave]}
                    placeholder={c.placeholder}
                    onChange={v => setEditando(e => (e ? ({ ...e, [c.clave]: v } as T) : e))}
                  />
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={aceptar}>Aceptar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
