import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { ArrowUpDown, Wallet, Tag, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GlobalSearch = ({ open, onOpenChange }: GlobalSearchProps) => {
  const navigate = useNavigate();
  const { transactions, accounts, categories } = useFinanceDataSupabase();
  const { formatCurrency } = useAppConfig();
  const [search, setSearch] = useState('');

  // Reset search when closing
  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const results = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return { transactions: [], accounts: [], categories: [] };

    const filteredTransactions = (transactions || [])
      .filter(t => t.comentario.toLowerCase().includes(q))
      .slice(0, 8);

    const filteredAccounts = (accounts || [])
      .filter(a => a.nombre.toLowerCase().includes(q))
      .slice(0, 5);

    const filteredCategories = (categories || [])
      .filter(c =>
        c.subcategoria.toLowerCase().includes(q) ||
        c.categoria.toLowerCase().includes(q)
      )
      .slice(0, 5);

    return {
      transactions: filteredTransactions,
      accounts: filteredAccounts,
      categories: filteredCategories,
    };
  }, [search, transactions, accounts, categories]);

  const hasResults = results.transactions.length > 0 || results.accounts.length > 0 || results.categories.length > 0;

  const handleSelectTransaction = (transactionId: string) => {
    onOpenChange(false);
    navigate('/transacciones');
  };

  const handleSelectAccount = (accountId: string) => {
    onOpenChange(false);
    navigate('/cuentas');
  };

  const handleSelectCategory = (categoryId: string) => {
    onOpenChange(false);
    navigate('/categorias');
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar transacciones, cuentas, categorías..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No se encontraron resultados.</CommandEmpty>

        {results.transactions.length > 0 && (
          <CommandGroup heading="Transacciones">
            {results.transactions.map(t => (
              <CommandItem
                key={t.id}
                onSelect={() => handleSelectTransaction(t.id)}
                className="cursor-pointer"
              >
                <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="truncate block">{t.comentario}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(t.fecha).toLocaleDateString('es-ES')} · {t.gasto > 0 ? `-$${formatCurrency(t.gasto)}` : `+$${formatCurrency(t.ingreso)}`}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.accounts.length > 0 && (
          <CommandGroup heading="Cuentas">
            {results.accounts.map(a => (
              <CommandItem
                key={a.id}
                onSelect={() => handleSelectAccount(a.id)}
                className="cursor-pointer"
              >
                <Wallet className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="truncate block">{a.nombre}</span>
                  <span className="text-xs text-muted-foreground">
                    {a.tipo} · ${formatCurrency(a.saldoActual)} {a.divisa}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.categories.length > 0 && (
          <CommandGroup heading="Categorías">
            {results.categories.map(c => (
              <CommandItem
                key={c.id}
                onSelect={() => handleSelectCategory(c.id)}
                className="cursor-pointer"
              >
                <Tag className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="truncate block">{c.subcategoria}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.categoria} · {c.tipo || 'Sin tipo'}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
};

export const GlobalSearchTrigger = ({ onClick }: { onClick: () => void }) => (
  <Button
    variant="outline"
    size="sm"
    onClick={onClick}
    className="w-full justify-start gap-2 text-muted-foreground text-sm"
  >
    <Search className="h-4 w-4" />
    <span className="flex-1 text-left">Buscar...</span>
    <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
      <span className="text-xs">⌘</span>K
    </kbd>
  </Button>
);
