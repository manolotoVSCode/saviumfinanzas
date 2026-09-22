import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronsUpDown, History, ListChecks, Pencil, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Pending } from '@/hooks/usePendings';
import { ParsedRow } from '@/lib/import/toParsedRows';
import { Category, TransactionType } from '@/types/finance';
import { cn } from '@/lib/utils';

export type SortColumn = 'fecha' | 'descripcion' | 'tipo' | 'monto' | 'categoria';
export type SortDirection = 'asc' | 'desc';

interface Props {
  /** Filas ya filtradas y ordenadas. */
  rows: ParsedRow[];
  /** Todas las filas (checkbox de cabecera). */
  allRows: ParsedRow[];
  categories: Category[];
  isCreditCard: boolean;
  hasTarjetahabiente: boolean;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (c: SortColumn) => void;
  onToggleAll: (checked: boolean) => void;
  onToggleInclude: (id: string) => void;
  onToggleReembolso: (id: string) => void;
  onCategoryChange: (id: string, categoriaId: string) => void;
  onCreateRule: (row: ParsedRow) => void;
  pendingMatches: Map<string, Pending[]>;
  pendingLinks: Record<string, string>;
  onTogglePendingLink: (rowId: string, matches: Pending[]) => void;
}

const formatDate = (date: Date) => date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
const formatMoney = (amount: number) => new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

/** Icono + tooltip con la fuente de la sugerencia (o "Manual"). */
const FuenteIcono = ({ row }: { row: ParsedRow }) => {
  if (row.categoriaManual) {
    return (
      <Tooltip><TooltipTrigger asChild><Pencil className="h-3 w-3 text-muted-foreground shrink-0" /></TooltipTrigger><TooltipContent>Manual</TooltipContent></Tooltip>
    );
  }
  if (!row.suggestion) return null;
  const Icon = row.suggestion.source === 'regla' ? ListChecks : History;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Icon className={cn('h-3 w-3 shrink-0', row.suggestion.source === 'historial_parcial' ? 'text-muted-foreground opacity-60' : 'text-muted-foreground')} />
      </TooltipTrigger>
      <TooltipContent>{row.suggestion.detail}</TooltipContent>
    </Tooltip>
  );
};

export const ImportPreviewTable = ({
  rows, allRows, categories, isCreditCard, hasTarjetahabiente, sortColumn, sortDirection, onSort,
  onToggleAll, onToggleInclude, onToggleReembolso, onCategoryChange, onCreateRule, pendingMatches, pendingLinks, onTogglePendingLink,
}: Props) => {
  const [openCatRowId, setOpenCatRowId] = useState<string | null>(null);

  const categoriesByType = useMemo(() => ({
    gastoCategories: categories.filter(c => c.tipo === 'Gastos'),
    ingresoCategories: categories.filter(c => c.tipo === 'Ingreso'),
    reembolsoCategories: categories.filter(c => c.tipo === 'Reembolso'),
    aportacionCategories: categories.filter(c => c.tipo === 'Aportación'),
    retiroCategories: categories.filter(c => c.tipo === 'Retiro'),
  }), [categories]);

  const getGroupedCategoriesForRow = (row: ParsedRow) => {
    const groups: { tipo: TransactionType; categories: Category[] }[] = [];
    if (row.esReembolso) {
      if (categoriesByType.gastoCategories.length > 0) groups.push({ tipo: 'Gastos', categories: [...categoriesByType.gastoCategories] });
      if (categoriesByType.reembolsoCategories.length > 0) groups.push({ tipo: 'Reembolso', categories: [...categoriesByType.reembolsoCategories] });
    } else if (row.esGasto || row.tipo === 'Gastos' || row.tipo === 'Retiro') {
      if (categoriesByType.gastoCategories.length > 0) groups.push({ tipo: 'Gastos', categories: [...categoriesByType.gastoCategories] });
      if (categoriesByType.retiroCategories.length > 0) groups.push({ tipo: 'Retiro', categories: [...categoriesByType.retiroCategories] });
    } else {
      if (categoriesByType.ingresoCategories.length > 0) groups.push({ tipo: 'Ingreso', categories: [...categoriesByType.ingresoCategories] });
      if (categoriesByType.aportacionCategories.length > 0) groups.push({ tipo: 'Aportación', categories: [...categoriesByType.aportacionCategories] });
    }
    // La categoría seleccionada, primero
    const selectedGroupIdx = groups.findIndex(g => g.categories.some(c => c.id === row.categoriaId));
    if (selectedGroupIdx > 0) {
      const [selectedGroup] = groups.splice(selectedGroupIdx, 1);
      groups.unshift(selectedGroup);
    }
    const group = groups[0];
    if (group) {
      const idx = group.categories.findIndex(c => c.id === row.categoriaId);
      if (idx > 0) {
        const [cat] = group.categories.splice(idx, 1);
        group.categories.unshift(cat);
      }
    }
    return groups;
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const getTipoDisplay = (row: ParsedRow) => {
    if (row.esReembolso) return 'Reemb.';
    switch (row.tipo) {
      case 'Aportación': return 'Aport.';
      case 'Retiro': return 'Retiro';
      case 'Gastos': return 'Gasto';
      case 'Ingreso': return 'Ingreso';
      default: return row.esGasto ? 'Gasto' : 'Ingreso';
    }
  };

  return (
    <div className="overflow-auto max-h-[50vh]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 px-2">
              <Checkbox checked={allRows.every(r => r.incluir)} onCheckedChange={(checked) => onToggleAll(!!checked)} />
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-muted/50 select-none px-2" onClick={() => onSort('fecha')}>
              <span className="flex items-center text-xs">Fecha {getSortIcon('fecha')}</span>
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-muted/50 select-none px-2" onClick={() => onSort('descripcion')}>
              <span className="flex items-center text-xs">Descripción {getSortIcon('descripcion')}</span>
            </TableHead>
            {isCreditCard && hasTarjetahabiente && (
              <TableHead className="px-2"><span className="text-xs">Titular</span></TableHead>
            )}
            <TableHead className="text-right cursor-pointer hover:bg-muted/50 select-none px-2" onClick={() => onSort('monto')}>
              <span className="flex items-center justify-end text-xs">Monto {getSortIcon('monto')}</span>
            </TableHead>
            <TableHead className="w-14 text-center px-1"><span className="text-xs">Reemb.</span></TableHead>
            <TableHead className="cursor-pointer hover:bg-muted/50 select-none px-2" onClick={() => onSort('categoria')}>
              <span className="flex items-center text-xs">Categoría {getSortIcon('categoria')}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => {
            const category = categories.find(c => c.id === row.categoriaId);
            const isSinAsignar = !category || category.subcategoria === 'Sin Asignar';
            const isExpense = row.esGasto && !row.esReembolso;
            const matches = pendingMatches.get(row.id);
            const linkedId = pendingLinks[row.id];
            const selectedMatch = matches ? (linkedId ? matches.find(m => m.id === linkedId) : matches[0]) : undefined;

            return (
              <TableRow key={row.id} className={!row.incluir ? 'opacity-50' : ''}>
                <TableCell className="px-2">
                  <Checkbox checked={row.incluir} onCheckedChange={() => onToggleInclude(row.id)} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs px-2">{formatDate(row.fecha)}</TableCell>
                <TableCell className="max-w-[220px] text-xs px-2" title={row.descripcion}>
                  <div className="truncate">{row.descripcion}</div>
                  {matches && matches.length > 0 && (
                    <button type="button" onClick={() => onTogglePendingLink(row.id, matches)} className="mt-1 inline-flex items-center gap-1" title={selectedMatch?.concepto}>
                      <Badge variant={linkedId ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0 font-normal">
                        {linkedId ? '✓ ' : ''}Pendiente: {selectedMatch?.concepto}
                        {matches.length > 1 ? ` (+${matches.length - 1})` : ''}
                      </Badge>
                    </button>
                  )}
                </TableCell>
                {isCreditCard && hasTarjetahabiente && (
                  <TableCell className="text-xs px-2 max-w-[100px] truncate" title={row.tarjetahabiente || ''}>{row.tarjetahabiente || '-'}</TableCell>
                )}
                <TableCell className={`text-right text-xs font-medium px-2 ${isExpense ? 'text-destructive' : 'text-green-600'}`}>
                  <span className="flex items-center justify-end gap-1">
                    <span className="text-[10px] opacity-60">{getTipoDisplay(row)}</span>
                    {isExpense ? '-' : '+'}{formatMoney(row.monto)}
                  </span>
                </TableCell>
                <TableCell className="text-center px-1">
                  {(!row.esGasto || row.esReembolso) ? (
                    <Checkbox checked={row.esReembolso} onCheckedChange={() => onToggleReembolso(row.id)} />
                  ) : null}
                </TableCell>
                <TableCell className="px-2">
                  <div className="flex items-center gap-1">
                    <Popover modal={true} open={openCatRowId === row.id} onOpenChange={(isOpen) => setOpenCatRowId(isOpen ? row.id : null)}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          size="sm"
                          title={category ? `${category.categoria} - ${category.subcategoria}` : 'Sin Asignar'}
                          className={cn('w-48 justify-between text-left font-normal text-xs h-7', isSinAsignar && 'border-yellow-500')}
                        >
                          <span className="truncate">{category ? `${category.categoria} - ${category.subcategoria}` : 'Sin Asignar'}</span>
                          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-72 p-0 bg-background pointer-events-auto z-[100]"
                        align="start"
                        side="bottom"
                        sideOffset={4}
                        onWheel={(e) => e.stopPropagation()}
                        onInteractOutside={(e) => e.stopPropagation()}
                      >
                        <Command className="overflow-visible">
                          <CommandInput placeholder="Buscar categoría..." />
                          <CommandList className="max-h-60 overflow-y-auto overscroll-contain">
                            <CommandEmpty>No se encontraron categorías.</CommandEmpty>
                            {getGroupedCategoriesForRow(row).map(group => (
                              <CommandGroup key={group.tipo} heading={group.tipo}>
                                {group.categories.map(cat => (
                                  <CommandItem
                                    key={cat.id}
                                    value={`${cat.categoria} ${cat.subcategoria}`}
                                    onSelect={() => { setOpenCatRowId(null); onCategoryChange(row.id, cat.id); }}
                                    className="whitespace-normal"
                                  >
                                    <Check className={cn('mr-2 h-4 w-4 shrink-0', row.categoriaId === cat.id ? 'opacity-100' : 'opacity-0')} />
                                    <span className="break-words text-xs">{cat.categoria} - {cat.subcategoria}</span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            ))}
                          </CommandList>
                        </Command>
                        {/* Fuera del CommandList: cmdk oculta los ítems que no coinciden con lo escrito en el buscador */}
                        <div className="border-t p-1">
                          <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" onClick={() => { setOpenCatRowId(null); onCreateRule(row); }}>
                            <Plus className="mr-2 h-4 w-4 shrink-0" />
                            Crear regla para filas como esta…
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FuenteIcono row={row} />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
