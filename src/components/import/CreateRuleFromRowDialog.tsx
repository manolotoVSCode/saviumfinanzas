import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { matchesClassificationRule, normalizeRuleText } from '@/lib/classificationRules';
import { ParsedRow } from '@/lib/import/toParsedRows';
import { Category, TransactionType } from '@/types/finance';
import { cn } from '@/lib/utils';

export interface NewRule {
  name: string;
  keyword: string;
  match_type: 'contains';
  category_id: string;
  cuenta_id: string | null;
  priority: number;
  active: boolean;
  amount_min: null;
  amount_max: null;
}

const TIPOS: TransactionType[] = ['Gastos', 'Ingreso', 'Reembolso', 'Aportación', 'Retiro'];

interface Props {
  /** Fila desde la que se crea; null = diálogo cerrado. */
  row: ParsedRow | null;
  onClose: () => void;
  categories: Category[];
  accountId: string;
  accountName: string;
  /** Todas las filas del preview, para "coincide con N filas". */
  rows: ParsedRow[];
  /** Guarda la regla (addRule del hook); devuelve el error si lo hay. */
  onSave: (rule: NewRule) => Promise<unknown>;
  /** Aplica la regla a las filas no manuales; devuelve cuántas cambió. */
  onApplied: (rule: NewRule) => number;
}

/** Regla prellenada con las 2 primeras palabras de la descripción; vista previa en vivo de coincidencias. */
export const CreateRuleFromRowDialog = ({ row, onClose, categories, accountId, accountName, rows, onSave, onApplied }: Props) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [soloCuenta, setSoloCuenta] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!row) return;
    // Misma normalización que usan las reglas al comparar (normalizeRuleText: puntuación → espacio),
    // no la del historial (normalizeDescription: puntuación eliminada); si no, 'NETFLIX.COM' nunca coincidiría.
    const dosPalabras = normalizeRuleText(row.descripcion).split(' ').filter(Boolean).slice(0, 2).join(' ');
    setName(dosPalabras);
    setKeyword(dosPalabras);
    setCategoryId(row.categoriaId);
    setSoloCuenta(false);
  }, [row]);

  const coincidencias = useMemo(
    () => (keyword.trim() ? rows.filter(r => matchesClassificationRule(r.descripcion, keyword, 'contains')).length : 0),
    [rows, keyword],
  );

  const grupos = useMemo(
    () => TIPOS.map(tipo => ({ tipo, categories: categories.filter(c => c.tipo === tipo) })).filter(g => g.categories.length > 0),
    [categories],
  );
  const categoria = categories.find(c => c.id === categoryId);

  const guardar = async () => {
    if (!name.trim() || !keyword.trim() || !categoryId) return;
    setSaving(true);
    const rule: NewRule = {
      name: name.trim(),
      keyword: keyword.trim(),
      match_type: 'contains',
      category_id: categoryId,
      cuenta_id: soloCuenta ? accountId : null,
      priority: 0,
      active: true,
      amount_min: null,
      amount_max: null,
    };
    const error = await onSave(rule);
    setSaving(false);
    // addRule devuelve null si insertó, el error de Supabase si falló y undefined si no hay sesión:
    // solo null es éxito.
    if (error !== null) {
      toast({ title: 'Error', description: 'No se pudo crear la regla', variant: 'destructive' });
      return;
    }
    const n = onApplied(rule);
    toast({ title: 'Regla creada', description: `Aplicada a ${n} fila${n !== 1 ? 's' : ''}` });
    onClose();
  };

  return (
    <Dialog open={!!row} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crear regla para filas como esta</DialogTitle>
          <DialogDescription>
            Las descripciones que contengan la palabra clave se clasificarán con esta categoría, ahora y en futuras importaciones.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rule-name">Nombre</Label>
            <Input id="rule-name" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rule-keyword">Palabra clave (contiene)</Label>
            <Input id="rule-keyword" value={keyword} onChange={e => setKeyword(e.target.value)} />
            <p className="text-xs text-muted-foreground">Coincide con {coincidencias} fila{coincidencias !== 1 ? 's' : ''} de este archivo</p>
          </div>
          <div className="space-y-2">
            <Label>Categoría</Label>
            <Popover modal={true} open={catOpen} onOpenChange={setCatOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                  <span className="truncate">{categoria ? `${categoria.categoria} - ${categoria.subcategoria}` : 'Selecciona una categoría'}</span>
                  <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 bg-background z-[110]" align="start">
                <Command>
                  <CommandInput placeholder="Buscar categoría..." />
                  <CommandList className="max-h-60 overflow-y-auto">
                    <CommandEmpty>No se encontraron categorías.</CommandEmpty>
                    {grupos.map(g => (
                      <CommandGroup key={g.tipo} heading={g.tipo}>
                        {g.categories.map(c => (
                          <CommandItem key={c.id} value={`${c.categoria} ${c.subcategoria}`} onSelect={() => { setCategoryId(c.id); setCatOpen(false); }}>
                            <Check className={cn('mr-2 h-4 w-4 shrink-0', categoryId === c.id ? 'opacity-100' : 'opacity-0')} />
                            <span className="text-xs">{c.categoria} - {c.subcategoria}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="rule-account" checked={soloCuenta} onCheckedChange={c => setSoloCuenta(!!c)} />
            <Label htmlFor="rule-account" className="text-sm font-normal">Solo para la cuenta {accountName}</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} disabled={saving || !name.trim() || !keyword.trim() || !categoryId}>
            {saving ? 'Guardando...' : 'Crear regla'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
