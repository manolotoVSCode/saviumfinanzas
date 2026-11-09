import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Apple, Smartphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { compararVersiones, VERSION_VALIDA, versionMasAlta } from '@/lib/versiones';

type Plataforma = 'ios' | 'android';

interface Props {
  /** Versiones vistas en los últimos 7 días (share_panel_v4 las trae con plataforma). */
  enUso: { version: string; plataforma?: Plataforma }[];
  /** version_minima del panel: la única que había antes de separarla por plataforma. */
  minimaComun?: string;
}

const BUNDLE_ID = 'com.savium.share';
const CLAVE_MINIMAS = ['share_versiones_minimas'];

interface AppStore { version: string; fecha: string | null; url: string | null }

/** Versión publicada en la App Store (API pública de búsqueda de Apple, admite CORS). */
const leerAppStore = async (): Promise<AppStore | null> => {
  const r = await fetch(`https://itunes.apple.com/lookup?bundleId=${BUNDLE_ID}&country=mx`);
  if (!r.ok) throw new Error(`App Store: ${r.status}`);
  const d = await r.json();
  const app = d.results?.[0];
  return app?.version ? { version: app.version, fecha: app.currentVersionReleaseDate ?? null, url: app.trackViewUrl ?? null } : null;
};

/**
 * Versión de Savium Share en cada tienda, la más alta en uso y la versión mínima de cada plataforma.
 * Google Play no tiene una consulta pública: mientras la app no esté publicada allí se dice así.
 */
export const VersionesApp = ({ enUso, minimaComun }: Props) => {
  const queryClient = useQueryClient();
  const [nueva, setNueva] = useState<Record<Plataforma, string>>({ ios: '', android: '' });

  const minimas = useQuery({
    queryKey: CLAVE_MINIMAS,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('share_admin_versiones_minimas' as never);
      // Sin la migración (PGRST202) hay una sola versión mínima para las dos.
      if (error?.code === 'PGRST202') return { separadas: false, ios: minimaComun ?? '1.0', android: minimaComun ?? '1.0' };
      if (error) throw new Error(error.message);
      const d = data as { ios: string | null; android: string | null };
      return { separadas: true, ios: d.ios ?? '1.0', android: d.android ?? '1.0' };
    },
  });

  const appStore = useQuery({ queryKey: ['share_app_store'], queryFn: leerAppStore, staleTime: 30 * 60_000, retry: 1 });

  const masAltaEnUso = (p: Plataforma) =>
    versionMasAlta(enUso.filter(v => (v.plataforma ?? 'ios') === p).map(v => v.version));

  const guardar = async (p: Plataforma) => {
    const v = nueva[p].trim();
    const nombre = p === 'ios' ? 'iPhone' : 'Android';
    if (!VERSION_VALIDA.test(v)) {
      toast({ title: 'Versión no válida', description: 'Usa el formato 4.4 o 4.4.2', variant: 'destructive' });
      return;
    }
    const tienda = p === 'ios' ? appStore.data?.version : undefined;
    if (tienda && compararVersiones(v, tienda) > 0) {
      toast({
        title: 'Esa versión aún no está en la App Store',
        description: `La App Store tiene la ${tienda}. Con una mínima más alta, nadie podría actualizar.`,
        variant: 'destructive',
      });
      return;
    }
    const aviso = p === 'android'
      ? `Los Android con una versión anterior a la ${v} quedarán bloqueados hasta actualizar. Comprueba antes en Play Console que la ${v} ya está publicada. ¿Seguro?`
      : `Los iPhone con una versión anterior a la ${v} quedarán bloqueados hasta actualizar. ¿Seguro?`;
    if (!confirm(aviso)) return;
    try {
      const { error } = await supabase.rpc('share_admin_version_minima_plataforma' as never, { p_plataforma: p, p_version: v } as never);
      if (error) throw new Error(error.message);
      setNueva(n => ({ ...n, [p]: '' }));
      await queryClient.invalidateQueries({ queryKey: CLAVE_MINIMAS });
      toast({ title: `Versión mínima de ${nombre}: ${v}` });
    } catch (e) {
      toast({ title: 'No se pudo guardar', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const tiendaIos = appStore.isLoading
    ? 'consultando…'
    : appStore.data
      ? <>
          <strong className="text-foreground">v{appStore.data.version}</strong>
          {appStore.data.fecha && ` desde el ${format(parseISO(appStore.data.fecha), "d 'de' MMM yyyy", { locale: es })}`}
        </>
      : 'no se pudo consultar';

  const filas: { p: Plataforma; nombre: string; icono: React.ElementType; tienda: string; enTienda: React.ReactNode }[] = [
    { p: 'ios', nombre: 'iPhone', icono: Apple, tienda: 'App Store', enTienda: tiendaIos },
    {
      p: 'android', nombre: 'Android', icono: Smartphone, tienda: 'Google Play',
      enTienda: 'sin dato público (aún no está publicada; míralo en Play Console)',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Versiones de la app</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Los teléfonos con una versión anterior a la mínima muestran «Hay una nueva versión» y no dejan seguir hasta
          actualizar (desde la 2.0; la 1.0 no lo sabe hacer). Sube la mínima de cada plataforma solo cuando esa versión ya
          esté publicada en su tienda.
        </p>
        {minimas.data && !minimas.data.separadas && (
          <p className="text-sm text-destructive">
            Falta aplicar la migración «share_version_minima_plataforma»: hasta entonces hay una sola mínima para las dos y no se puede cambiar por separado.
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {filas.map(({ p, nombre, icono: Icono, tienda, enTienda }) => {
            const uso = masAltaEnUso(p);
            return (
              <div key={p} className="space-y-3 rounded-lg border p-4">
                <p className="flex items-center gap-2 font-medium">
                  <Icono className="h-4 w-4" />
                  {nombre}
                </p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">{tienda}</dt>
                  <dd>{enTienda}</dd>
                  <dt className="text-muted-foreground">Más alta en uso</dt>
                  <dd>{uso ? <strong className="text-foreground">v{uso}</strong> : 'sin datos esta semana'}</dd>
                  <dt className="text-muted-foreground">Versión mínima</dt>
                  <dd><strong className="text-foreground">v{minimas.data?.[p] ?? '…'}</strong></dd>
                </dl>
                <div className="flex gap-2">
                  <Input
                    placeholder={p === 'ios' && appStore.data ? appStore.data.version : '4.4'}
                    value={nueva[p]}
                    aria-label={`Nueva versión mínima de ${nombre}`}
                    onChange={e => setNueva(n => ({ ...n, [p]: e.target.value }))}
                    disabled={!minimas.data?.separadas}
                  />
                  <Button onClick={() => guardar(p)} disabled={!nueva[p].trim() || !minimas.data?.separadas}>
                    Guardar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        {appStore.data?.url && (
          <p className="text-xs text-muted-foreground">
            <a className="underline" href={appStore.data.url} target="_blank" rel="noreferrer">Ver en la App Store</a>
          </p>
        )}
      </CardContent>
    </Card>
  );
};
