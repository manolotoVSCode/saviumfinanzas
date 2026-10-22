import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { eachDayOfInterval, format, formatDistanceToNow, parseISO, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Smartphone, Baby, CheckCheck, Target, MessageSquare, ShieldAlert, AlertTriangle, PiggyBank, Lock, Check, Trash2, RotateCcw } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import Layout from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { esAdmin } from '@/lib/admin';
import { formatNumber } from '@/lib/formatters';

/**
 * Cifras que manda la app una vez al día por iPhone (Uso.metricas en SaviumPiggyBank). Las de «foto»
 * (familias, ninos…) suman el estado de cada iPhone que contó ese día; las demás, lo que pasó desde su envío anterior.
 */
type Metrica =
  | 'familias' | 'ninos' | 'ninos_domingo' | 'ninos_interes' | 'metas_activas' | 'tareas' | 'con_pin'
  | 'movimientos' | 'tareas_aprobadas' | 'metas_cumplidas' | 'domingos' | 'modo_nino' | 'familia_ejemplo';

/** Respuesta de la función piggy_panel (uso de la app Savium Piggy Bank, sin nombres ni montos a propósito). */
interface PanelPiggy {
  generado: string;
  dispositivos: { hoy: number; media_7d: number; media_30d: number; periodo: number };
  totales: Partial<Record<Metrica, number>>;
  uso_por_dia: { dia: string; dispositivos: number }[];
  actividad_por_dia: ({ dia: string } & Partial<Record<Metrica, number>>)[];
  paises: { pais: string; dispositivos: number }[];
  idiomas: { idioma: string; dispositivos: number }[];
  divisas: { divisa: string; dispositivos: number }[];
  versiones: { version: string; dispositivos: number }[];
  comentarios: Comentario[];
  comentarios_sin_leer: number;
}

interface Comentario {
  id: string;
  creado: string;
  tipo: 'idea' | 'error' | 'otro';
  texto: string;
  contacto: string | null;
  pais: string | null;
  idioma: string | null;
  version_app: string | null;
  leido: boolean;
}

const PERIODOS = [30, 90, 365] as const;

const TIPOS_COMENTARIO: Record<string, string> = { idea: 'Idea', error: 'Error', otro: 'Otro' };

const nombresPais = new Intl.DisplayNames(['es'], { type: 'region' });
const nombresIdioma = new Intl.DisplayNames(['es'], { type: 'language' });

/** «MX» → «🇲🇽 México». La app manda la región del iPhone, no la ubicación. */
const pais = (codigo: string | null) => {
  if (!codigo || codigo === '--') return 'Sin país';
  const bandera = String.fromCodePoint(...[...codigo].map(c => 0x1f1a5 + c.charCodeAt(0)));
  try { return `${bandera} ${nombresPais.of(codigo)}`; } catch { return codigo; }
};

const idioma = (codigo: string) => {
  if (codigo === '--') return 'Sin idioma';
  try { const n = nombresIdioma.of(codigo) ?? codigo; return n.charAt(0).toUpperCase() + n.slice(1); } catch { return codigo; }
};

const usoConfig = {
  dispositivos: { label: 'iPhone activos', color: 'hsl(var(--grafica))' },
};

const actividadConfig = {
  tareas_aprobadas: { label: 'Tareas aprobadas', color: 'hsl(var(--grafica))' },
  domingos: { label: 'Domingos pagados', color: 'hsl(var(--success))' },
  metas_cumplidas: { label: 'Metas cumplidas', color: 'hsl(var(--warning, 38 92% 50%))' },
};

const modoNinoConfig = {
  modo_nino: { label: 'Entradas al modo niño', color: 'hsl(var(--grafica))' },
};

/** Llama a una función de administración de Savium Piggy Bank (fuera de los tipos generados). */
async function rpcAdmin(nombre: string, params: Record<string, unknown>) {
  const { error } = await supabase.rpc(nombre as never, params as never);
  if (error) throw new Error(error.message);
}

/** Error de Postgres «insufficient_privilege»: piggy_panel solo responde al administrador. */
class SinPermiso extends Error {}

const numero = (n: number) => formatNumber(n ?? 0, 0);
const decimal = (n: number) => formatNumber(n ?? 0, 1);
const porcentaje = (parte: number, total: number) => (total > 0 ? `${Math.round((parte / total) * 100)}%` : '—');

/** Rellena con 0 los días sin datos para que la serie diaria no salte huecos. */
function rellenarDias<T extends { dia: string }>(filas: T[], dias: number, vacio: Omit<T, 'dia'>): T[] {
  const porDia = new Map(filas.map(f => [f.dia.slice(0, 10), f]));
  const hoy = new Date();
  const ultimo = filas.reduce((max, f) => (f.dia.slice(0, 10) > max ? f.dia.slice(0, 10) : max), format(hoy, 'yyyy-MM-dd'));
  return eachDayOfInterval({ start: subDays(hoy, dias - 1), end: parseISO(ultimo) }).map(d => {
    const dia = format(d, 'yyyy-MM-dd');
    return { ...vacio, ...porDia.get(dia), dia } as T;
  });
}

const etiquetaDia = (dia: string) => format(parseISO(dia), 'd MMM', { locale: es });

const hace = (fecha: string | null) =>
  fecha ? formatDistanceToNow(parseISO(fecha), { addSuffix: true, locale: es }) : '—';

/** Tarjeta de cifra, como las del Dashboard. */
const Kpi = ({ icon: Icon, titulo, valor, detalle }: { icon: React.ElementType; titulo: string; valor: string; detalle?: string }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {titulo}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-bold tabular-nums">{valor}</p>
      {detalle && <p className="text-xs text-muted-foreground mt-1">{detalle}</p>}
    </CardContent>
  </Card>
);

/** Desglose pequeño: etiqueta, barra proporcional y cifra. */
const Desglose = ({ titulo, filas }: { titulo: string; filas: { etiqueta: string; valor: number }[] }) => {
  const total = filas.reduce((s, f) => s + f.valor, 0);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {filas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos</p>
        ) : (
          filas.map(f => {
            const pct = total > 0 ? (f.valor / total) * 100 : 0;
            return (
              <div key={f.etiqueta} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{f.etiqueta}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {numero(f.valor)} · {pct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: 'hsl(var(--grafica))' }} />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

/** Una fila de «Cómo la usan»: qué es, la cifra y de dónde sale. */
const Fila = ({ titulo, valor, detalle }: { titulo: string; valor: string; detalle: string }) => (
  <div className="flex items-baseline justify-between gap-4 py-2 border-b last:border-0">
    <div>
      <p className="text-sm">{titulo}</p>
      <p className="text-xs text-muted-foreground">{detalle}</p>
    </div>
    <p className="text-lg font-semibold tabular-nums">{valor}</p>
  </div>
);

const Aviso = ({ icon: Icon, texto }: { icon: React.ElementType; texto: string }) => (
  <Card>
    <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center gap-3">
      <Icon className="h-8 w-8" />
      <p>{texto}</p>
    </CardContent>
  </Card>
);

const SaviumPiggyBank = () => {
  const { user } = useAuth();
  const admin = esAdmin(user?.id);
  const [dias, setDias] = useState<number>(90);
  const [verLeidos, setVerLeidos] = useState(false);
  const queryClient = useQueryClient();
  const recargar = () => queryClient.invalidateQueries({ queryKey: ['piggy_panel'] });

  const { data, isLoading, error } = useQuery({
    queryKey: ['piggy_panel', dias],
    enabled: admin,
    retry: (intentos, err) => !(err instanceof SinPermiso) && intentos < 2,
    queryFn: async () => {
      // piggy_panel no está en los tipos generados de Supabase (vive en las migraciones de SaviumPiggyBank).
      const { data, error } = await supabase.rpc('piggy_panel' as never, { p_dias: dias } as never);
      if (error) {
        if (error.code === '42501') throw new SinPermiso(error.message);
        throw new Error(error.message);
      }
      return data as PanelPiggy;
    },
  });

  const uso = useMemo(
    () => (data ? rellenarDias(data.uso_por_dia ?? [], dias, { dispositivos: 0 }) : []),
    [data, dias],
  );
  const actividad = useMemo(
    () => (data ? rellenarDias(data.actividad_por_dia ?? [], dias, { tareas_aprobadas: 0, domingos: 0, metas_cumplidas: 0, modo_nino: 0 }) : []),
    [data, dias],
  );
  const comentarios = useMemo(
    () => (data?.comentarios ?? []).filter(c => verLeidos || !c.leido),
    [data, verLeidos],
  );

  const marcar = async (c: Comentario) => {
    try { await rpcAdmin('piggy_admin_comentario', { p_id: c.id, p_leido: !c.leido }); recargar(); }
    catch (e) { toast({ title: 'No se pudo guardar', description: (e as Error).message, variant: 'destructive' }); }
  };
  const borrar = async (c: Comentario) => {
    if (!confirm('¿Borrar este comentario?')) return;
    try { await rpcAdmin('piggy_admin_borrar_comentario', { p_id: c.id }); recargar(); }
    catch (e) { toast({ title: 'No se pudo borrar', description: (e as Error).message, variant: 'destructive' }); }
  };

  const selector = (
    <ToggleGroup
      type="single"
      value={String(dias)}
      onValueChange={v => v && setDias(Number(v))}
      className="bg-muted rounded-lg p-1"
    >
      {PERIODOS.map(p => (
        <ToggleGroupItem key={p} value={String(p)} className="text-xs px-3 h-8">
          {p} días
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );

  const sinPermiso = !admin || error instanceof SinPermiso;
  const vacio = data && data.dispositivos.periodo === 0 && (data.comentarios ?? []).length === 0;
  const t = (m: Metrica) => data?.totales?.[m] ?? 0;
  // «Familias·día»: cada iPhone con niños cuenta una vez por cada día que abrió la app.
  const familiasDia = t('familias');

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <PageHeader
          title={
            <span className="flex items-center gap-3">
              <img src="/images/savium-piggybank.png" alt="" className="h-10 w-10 rounded-[22%] shadow-sm" />
              Savium Piggy Bank
            </span>
          }
          subtitle={
            data
              ? <>Uso de la alcancía familiar · actualizado {hace(data.generado)}</>
              : <>Uso de la alcancía familiar</>
          }
          actions={!sinPermiso && selector}
        />

        {sinPermiso ? (
          <Aviso icon={ShieldAlert} texto="Solo el administrador puede ver este panel" />
        ) : error ? (
          <Aviso icon={AlertTriangle} texto={`No se pudo cargar el panel: ${(error as Error).message}`} />
        ) : isLoading || !data ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-[1.25rem]" />)}
            </div>
            <Skeleton className="h-[340px] rounded-[1.25rem]" />
          </div>
        ) : vacio ? (
          <Aviso icon={PiggyBank} texto="Todavía no llegan datos de Piggy Bank (la app manda sus cifras una vez al día)" />
        ) : (
          <>
            {/* CIFRAS */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <Kpi
                icon={Smartphone}
                titulo="iPhone activos hoy"
                valor={numero(data.dispositivos.hoy)}
                detalle={`Media: ${data.dispositivos.media_7d} (7 días) · ${data.dispositivos.media_30d} (30 días)`}
              />
              <Kpi
                icon={Baby}
                titulo="Niños por familia"
                valor={familiasDia ? decimal(t('ninos') / familiasDia) : '—'}
                detalle={`${porcentaje(familiasDia, data.dispositivos.periodo)} de los iPhone tienen niños`}
              />
              <Kpi
                icon={CheckCheck}
                titulo="Tareas aprobadas"
                valor={numero(t('tareas_aprobadas'))}
                detalle={`${numero(t('movimientos'))} movimientos en ${dias} días`}
              />
              <Kpi icon={Target} titulo="Metas cumplidas" valor={numero(t('metas_cumplidas'))} detalle={`En ${dias} días`} />
              <Kpi
                icon={Lock}
                titulo="Entradas al modo niño"
                valor={numero(t('modo_nino'))}
                detalle={familiasDia ? `${decimal(t('modo_nino') / familiasDia)} por familia y día` : undefined}
              />
              <Kpi
                icon={MessageSquare}
                titulo="Sugerencias sin leer"
                valor={numero(data.comentarios_sin_leer ?? 0)}
                detalle={`${numero(data.comentarios?.length ?? 0)} en total`}
              />
            </div>

            {/* USO DIARIO (iPhone distintos que abrieron la app cada día, sin identificarlos) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">iPhone activos por día</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={usoConfig} className="h-[220px] w-full">
                  <BarChart data={uso} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="dia" tickFormatter={etiquetaDia} className="text-xs" tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis allowDecimals={false} className="text-xs" tickLine={false} axisLine={false} width={32} />
                    <ChartTooltip isAnimationActive={false} content={<ChartTooltipContent labelFormatter={(_, p) => etiquetaDia(p?.[0]?.payload?.dia ?? '')} />} />
                    <Bar dataKey="dispositivos" fill="hsl(var(--grafica))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-3">
              {/* ACTIVIDAD DIARIA */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Actividad diaria</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={actividadConfig} className="h-[280px] w-full">
                    <AreaChart data={actividad} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="tareasFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--grafica))" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="hsl(var(--grafica))" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                      <XAxis dataKey="dia" tickFormatter={etiquetaDia} className="text-xs" tickLine={false} axisLine={false} minTickGap={24} />
                      <YAxis allowDecimals={false} className="text-xs" tickLine={false} axisLine={false} width={40} />
                      <ChartTooltip isAnimationActive={false} content={<ChartTooltipContent indicator="line" labelFormatter={(_, p) => etiquetaDia(p?.[0]?.payload?.dia ?? '')} />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Area type="monotone" dataKey="tareas_aprobadas" stroke="var(--color-tareas_aprobadas)" strokeWidth={2} fill="url(#tareasFill)" dot={false} />
                      <Area type="monotone" dataKey="domingos" stroke="var(--color-domingos)" strokeWidth={2} fill="transparent" dot={false} />
                      <Area type="monotone" dataKey="metas_cumplidas" stroke="var(--color-metas_cumplidas)" strokeWidth={2} fill="transparent" dot={false} />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* CÓMO LA USAN (promedios sobre familias·día del periodo) */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Cómo la usan</CardTitle>
                </CardHeader>
                <CardContent>
                  {familiasDia === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin familias con niños en el periodo</p>
                  ) : (
                    <>
                      <Fila titulo="Niños con domingo automático" valor={porcentaje(t('ninos_domingo'), t('ninos'))} detalle="Del total de niños" />
                      <Fila titulo="Niños con interés de papá" valor={porcentaje(t('ninos_interes'), t('ninos'))} detalle="Del total de niños" />
                      <Fila titulo="Familias con PIN de adulto" valor={porcentaje(t('con_pin'), familiasDia)} detalle="El resto sale con Face ID o la multiplicación" />
                      <Fila titulo="Tareas por familia" valor={decimal(t('tareas') / familiasDia)} detalle="Tareas creadas, en promedio" />
                      <Fila titulo="Metas activas por familia" valor={decimal(t('metas_activas') / familiasDia)} detalle="Sin cumplir todavía" />
                      <Fila titulo="Familia de ejemplo cargada" valor={numero(t('familia_ejemplo'))} detalle={`Veces en ${dias} días`} />
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* MODO NIÑO */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Entradas al modo niño por día</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={modoNinoConfig} className="h-[200px] w-full">
                  <BarChart data={actividad} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="dia" tickFormatter={etiquetaDia} className="text-xs" tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis allowDecimals={false} className="text-xs" tickLine={false} axisLine={false} width={32} />
                    <ChartTooltip isAnimationActive={false} content={<ChartTooltipContent labelFormatter={(_, p) => etiquetaDia(p?.[0]?.payload?.dia ?? '')} />} />
                    <Bar dataKey="modo_nino" fill="hsl(var(--grafica))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* DÓNDE SE USA */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Desglose
                titulo="Uso por país (iPhone·día)"
                filas={(data.paises ?? []).map(p => ({ etiqueta: pais(p.pais), valor: p.dispositivos }))}
              />
              <Desglose
                titulo="Idiomas"
                filas={(data.idiomas ?? []).map(i => ({ etiqueta: idioma(i.idioma), valor: i.dispositivos }))}
              />
              <Desglose
                titulo="Monedas"
                filas={(data.divisas ?? []).map(d => ({ etiqueta: d.divisa === '--' ? 'Sin moneda' : d.divisa, valor: d.dispositivos }))}
              />
              <Desglose
                titulo="Versiones (últimos 7 días)"
                filas={(data.versiones ?? []).map(v => ({ etiqueta: `v${v.version}`, valor: v.dispositivos }))}
              />
            </div>

            {/* SUGERENCIAS («Ayúdanos a mejorar» en Ajustes de la app) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Ayúdanos a mejorar</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setVerLeidos(v => !v)}>
                  {verLeidos ? 'Ocultar leídos' : 'Ver también leídos'}
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {comentarios.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{verLeidos ? 'Todavía no hay sugerencias' : 'Nada pendiente de leer'}</p>
                ) : (
                  comentarios.map(c => (
                    <div key={c.id} className={`rounded-xl border p-4 space-y-2 ${c.leido ? 'opacity-60' : ''}`}>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant={c.tipo === 'error' ? 'destructive' : 'secondary'}>{TIPOS_COMENTARIO[c.tipo] ?? c.tipo}</Badge>
                        <span>{hace(c.creado)}</span>
                        <span>· {pais(c.pais)}</span>
                        {c.version_app && <span>· v{c.version_app}</span>}
                        <span className="ml-auto flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" title={c.leido ? 'Marcar como no leído' : 'Marcar como leído'} onClick={() => marcar(c)}>
                            {c.leido ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Borrar" onClick={() => borrar(c)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{c.texto}</p>
                      {c.contacto && (
                        <a className="text-sm text-primary underline" href={`mailto:${c.contacto}`}>{c.contacto}</a>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
};

export default SaviumPiggyBank;
