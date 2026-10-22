import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { eachDayOfInterval, format, formatDistanceToNow, parseISO, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Users, UsersRound, Receipt, Activity, Image as ImageIcon, ShieldAlert, AlertTriangle, Smartphone, MessageSquare, Check, Trash2, RotateCcw, Moon, Download, UserPlus } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import Layout from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { esAdmin } from '@/lib/admin';
import { formatNumber } from '@/lib/formatters';
import { CLAVE_COMENTARIOS_APPS } from '@/hooks/useComentariosApps';

/** Respuesta de la función share_panel (uso de la app Savium Share, sin nombres a propósito). */
interface PanelShare {
  generado: string;
  totales: {
    grupos: number;
    grupos_borrados: number;
    personas: number;
    movimientos: number;
    tickets: number;
    activos_7d: number;
    activos_30d: number;
  };
  grupos_por_dia: { dia: string; n: number }[];
  actividad_por_dia: { dia: string; movimientos: number; grupos: number }[];
  divisas: { divisa: string; grupos: number }[];
  categorias: { categoria: string; movimientos: number }[];
  tipos: { tipo: string; movimientos: number }[];
  repartos: { modo: string; movimientos: number }[];
  tamano_grupos: { personas: number; grupos: number }[];
  // share_panel_v2 (Savium Share 2.0)
  version_minima: string;
  dispositivos: { hoy: number; media_7d: number; media_30d: number };
  uso_por_dia: { dia: string; dispositivos: number }[];
  paises_grupos: { pais: string; grupos: number }[];
  paises_uso: { pais: string; dispositivos: number }[];
  idiomas: { idioma: string; dispositivos: number }[];
  versiones: { version: string; dispositivos: number }[];
  comentarios: Comentario[];
  comentarios_sin_leer: number;
  grupos_recientes: {
    emoji: string | null;
    divisa: string;
    creado: string;
    personas: number;
    movimientos: number;
    ultima_actividad: string | null;
  }[];
  // share_panel_v3 (cifras de hoy y descargas); ausentes si la base aún no tiene la v3.
  hoy?: { movimientos: number; grupos_nuevos: number; grupos_activos: number };
  grupos_dormidos?: { total: number; sin_movimientos: number };
  iphones?: { en_grupos: number; instalaciones_30d: number; sin_grupos: number };
  descargas?: {
    aperturas: { hoy: number; semana: number; total: number; desde: string | null };
    tienda: { ultimo_dia: string | null; ultimo: number; semana: number; total: number; redescargas: number };
    por_dia: { dia: string; tienda: number; aperturas: number }[];
  };
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

/** Llama a una función de administración de Savium Share (fuera de los tipos generados). */
async function rpcAdmin(nombre: string, params: Record<string, unknown>) {
  const { error } = await supabase.rpc(nombre as never, params as never);
  if (error) throw new Error(error.message);
}

// Mismos identificadores que las categorías de la app Savium Share.
const CATEGORIAS: Record<string, string> = {
  comida: 'Comida y bebida',
  supermercado: 'Supermercado',
  transporte: 'Transporte',
  alojamiento: 'Alojamiento',
  ocio: 'Ocio',
  compras: 'Compras',
  salud: 'Salud',
  servicios: 'Servicios',
  viaje: 'Viaje',
  regalos: 'Regalos',
  otros: 'Otros',
};

const TIPOS: Record<string, string> = {
  gasto: 'Gasto',
  ingreso: 'Ingreso',
  transferencia: 'Transferencia',
};

const REPARTOS: Record<string, string> = {
  iguales: 'A partes iguales',
  importes: 'Por importes',
  porcentajes: 'Por porcentajes',
  partes: 'Por partes',
};

const actividadConfig = {
  movimientos: { label: 'Movimientos', color: 'hsl(var(--grafica))' },
  grupos: { label: 'Grupos activos', color: 'hsl(var(--success))' },
};

const descargasConfig = {
  tienda: { label: 'App Store', color: 'hsl(var(--grafica))' },
  aperturas: { label: 'Primeras aperturas', color: 'hsl(var(--success))' },
};

const gruposConfig = {
  n: { label: 'Grupos nuevos', color: 'hsl(var(--grafica))' },
};

const categoriasConfig = {
  movimientos: { label: 'Movimientos', color: 'hsl(var(--grafica))' },
};

/** Error de Postgres «insufficient_privilege»: share_panel solo responde al administrador. */
class SinPermiso extends Error {}

const numero = (n: number) => formatNumber(n ?? 0, 0);

/** Rellena con 0 los días sin datos para que la serie diaria no salte huecos. */
function rellenarDias<T extends { dia: string }>(filas: T[], dias: number, vacio: Omit<T, 'dia'>): T[] {
  const porDia = new Map(filas.map(f => [f.dia.slice(0, 10), f]));
  const hoy = new Date();
  const ultimo = filas.reduce((max, f) => (f.dia.slice(0, 10) > max ? f.dia.slice(0, 10) : max), format(hoy, 'yyyy-MM-dd'));
  return eachDayOfInterval({ start: subDays(hoy, dias - 1), end: parseISO(ultimo) }).map(d => {
    const dia = format(d, 'yyyy-MM-dd');
    return porDia.get(dia) ?? ({ ...vacio, dia } as T);
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

const Aviso = ({ icon: Icon, texto }: { icon: React.ElementType; texto: string }) => (
  <Card>
    <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center gap-3">
      <Icon className="h-8 w-8" />
      <p>{texto}</p>
    </CardContent>
  </Card>
);

const SaviumShare = () => {
  const { user } = useAuth();
  const admin = esAdmin(user?.id);
  const [dias, setDias] = useState<number>(90);
  const [nuevaMinima, setNuevaMinima] = useState('');
  const [verLeidos, setVerLeidos] = useState(false);
  const queryClient = useQueryClient();
  const recargar = () => {
    queryClient.invalidateQueries({ queryKey: ['share_panel'] });
    queryClient.invalidateQueries({ queryKey: CLAVE_COMENTARIOS_APPS });
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['share_panel', dias],
    enabled: admin,
    retry: (intentos, err) => !(err instanceof SinPermiso) && intentos < 2,
    queryFn: async () => {
      // share_panel no está en los tipos generados de Supabase (vive en la base de Savium Share).
      // Mientras la base no tenga la v3 (PGRST202: no existe), se usa la v2 sin las cifras nuevas.
      let { data, error } = await supabase.rpc('share_panel_v3' as never, { p_dias: dias } as never);
      if (error?.code === 'PGRST202') ({ data, error } = await supabase.rpc('share_panel_v2' as never, { p_dias: dias } as never));
      if (error) {
        if (error.code === '42501') throw new SinPermiso(error.message);
        throw new Error(error.message);
      }
      return data as PanelShare;
    },
  });

  const actividad = useMemo(
    () => (data ? rellenarDias(data.actividad_por_dia ?? [], dias, { movimientos: 0, grupos: 0 }) : []),
    [data, dias],
  );
  const gruposNuevos = useMemo(
    () => (data ? rellenarDias(data.grupos_por_dia ?? [], dias, { n: 0 }) : []),
    [data, dias],
  );
  const descargasDia = useMemo(
    () => (data?.descargas ? rellenarDias(data.descargas.por_dia ?? [], dias, { tienda: 0, aperturas: 0 }) : []),
    [data, dias],
  );
  const uso = useMemo(
    () => (data ? rellenarDias(data.uso_por_dia ?? [], dias, { dispositivos: 0 }) : []),
    [data, dias],
  );
  const comentarios = useMemo(
    () => (data?.comentarios ?? []).filter(c => verLeidos || !c.leido),
    [data, verLeidos],
  );

  const marcar = async (c: Comentario) => {
    try { await rpcAdmin('share_admin_comentario', { p_id: c.id, p_leido: !c.leido }); recargar(); }
    catch (e) { toast({ title: 'No se pudo guardar', description: (e as Error).message, variant: 'destructive' }); }
  };
  const borrar = async (c: Comentario) => {
    if (!confirm('¿Borrar este comentario?')) return;
    try { await rpcAdmin('share_admin_borrar_comentario', { p_id: c.id }); recargar(); }
    catch (e) { toast({ title: 'No se pudo borrar', description: (e as Error).message, variant: 'destructive' }); }
  };
  const guardarMinima = async () => {
    const v = nuevaMinima.trim();
    if (!/^[0-9]{1,3}(\.[0-9]{1,3}){0,2}$/.test(v)) {
      toast({ title: 'Versión no válida', description: 'Usa el formato 2.0 o 2.0.1', variant: 'destructive' });
      return;
    }
    if (!confirm(`Todos los iPhone con una versión anterior a la ${v} quedarán bloqueados hasta actualizar. ¿Seguro?`)) return;
    try { await rpcAdmin('share_admin_version_minima', { p_version: v }); setNuevaMinima(''); recargar(); toast({ title: `Versión mínima: ${v}` }); }
    catch (e) { toast({ title: 'No se pudo guardar', description: (e as Error).message, variant: 'destructive' }); }
  };

  const categorias = useMemo(
    () =>
      (data?.categorias ?? [])
        .map(c => ({ etiqueta: CATEGORIAS[c.categoria] ?? c.categoria, movimientos: c.movimientos }))
        .sort((a, b) => b.movimientos - a.movimientos),
    [data],
  );

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
  const vacio = data && data.totales.grupos === 0 && data.totales.grupos_borrados === 0;

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <PageHeader
          title={
            <span className="flex items-center gap-3">
              <img src="/images/savium-share.png" alt="" className="h-10 w-10 rounded-[22%] shadow-sm" />
              Savium Share
            </span>
          }
          subtitle={
            data
              ? <>Uso de la app de gastos compartidos · actualizado {hace(data.generado)}</>
              : <>Uso de la app de gastos compartidos</>
          }
          actions={!sinPermiso && selector}
        />

        {sinPermiso ? (
          <Aviso icon={ShieldAlert} texto="Solo el administrador puede ver este panel" />
        ) : error ? (
          <Aviso icon={AlertTriangle} texto={`No se pudo cargar el panel: ${(error as Error).message}`} />
        ) : isLoading || !data ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-[1.25rem]" />)}
            </div>
            <Skeleton className="h-[340px] rounded-[1.25rem]" />
          </div>
        ) : vacio ? (
          <Aviso icon={UsersRound} texto="Todavía no hay grupos en Savium Share" />
        ) : (
          <>
            {/* AVISO DE COMENTARIOS */}
            {(data.comentarios_sin_leer ?? 0) > 0 && (
              <button
                onClick={() => document.getElementById('comentarios')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full flex items-center gap-3 rounded-[1.25rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-left text-sm hover:bg-destructive/15 transition-colors"
              >
                <MessageSquare className="h-5 w-5 text-destructive flex-shrink-0" />
                <span className="flex-1">
                  <strong>{numero(data.comentarios_sin_leer)} {data.comentarios_sin_leer === 1 ? 'comentario sin leer' : 'comentarios sin leer'}</strong>
                  {' '}en «Ayúdanos a mejorar»
                </span>
                <span className="text-muted-foreground">Ver</span>
              </button>
            )}

            {/* HOY */}
            {data.hoy && (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <Kpi
                  icon={Receipt}
                  titulo="Movimientos hoy"
                  valor={numero(data.hoy.movimientos)}
                  detalle="Creados o editados"
                />
                <Kpi
                  icon={UsersRound}
                  titulo="Grupos hoy"
                  valor={numero(data.hoy.grupos_nuevos)}
                  detalle={`Nuevos · ${numero(data.hoy.grupos_activos)} con movimientos`}
                />
                <Kpi
                  icon={Moon}
                  titulo="Grupos dormidos"
                  valor={numero(data.grupos_dormidos?.total ?? 0)}
                  detalle={`Sin movimientos en 7 días · ${numero(data.grupos_dormidos?.sin_movimientos ?? 0)} nunca usados`}
                />
                <Kpi
                  icon={UserPlus}
                  titulo="iPhone sin grupos"
                  valor={data.iphones?.instalaciones_30d ? numero(data.iphones.sin_grupos) : '—'}
                  detalle={data.iphones?.instalaciones_30d
                    ? `De ${numero(data.iphones.instalaciones_30d)} vistos en 30 días`
                    : `Desde la 4.1 · ${numero(data.iphones?.en_grupos ?? 0)} iPhone en grupos`}
                />
                <Kpi
                  icon={Download}
                  titulo="Descargas"
                  valor={data.descargas?.tienda.ultimo_dia ? numero(data.descargas.tienda.total) : numero(data.descargas?.aperturas.total ?? 0)}
                  detalle={data.descargas?.tienda.ultimo_dia
                    ? `App Store · ${numero(data.descargas.tienda.semana)} en 7 días`
                    : `Primeras aperturas · ${numero(data.descargas?.aperturas.hoy ?? 0)} hoy`}
                />
              </div>
            )}

            {/* CIFRAS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
              <Kpi
                icon={UsersRound}
                titulo="Grupos"
                valor={numero(data.totales.grupos)}
                detalle={data.totales.grupos_borrados ? `${numero(data.totales.grupos_borrados)} borrados` : undefined}
              />
              <Kpi icon={Users} titulo="Personas" valor={numero(data.totales.personas)} />
              <Kpi icon={Receipt} titulo="Movimientos" valor={numero(data.totales.movimientos)} />
              <Kpi
                icon={Activity}
                titulo="Grupos activos"
                valor={numero(data.totales.activos_7d)}
                detalle={`7 días · ${numero(data.totales.activos_30d)} en 30 días`}
              />
              <Kpi icon={ImageIcon} titulo="Tickets" valor={numero(data.totales.tickets)} />
              <Kpi
                icon={Smartphone}
                titulo="iPhone activos hoy"
                valor={numero(data.dispositivos?.hoy ?? 0)}
                detalle={`Media: ${data.dispositivos?.media_7d ?? 0} (7 días) · ${data.dispositivos?.media_30d ?? 0} (30 días)`}
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

            {/* DESCARGAS: App Store Connect (un día de retraso) y primeras aperturas de la app (desde la 4.1) */}
            {data.descargas && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Descargas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      {
                        titulo: 'App Store',
                        nota: data.descargas.tienda.ultimo_dia
                          ? `Oficial, hasta el ${format(parseISO(data.descargas.tienda.ultimo_dia), 'd MMM', { locale: es })} · ${numero(data.descargas.tienda.redescargas)} redescargas aparte`
                          : 'Falta configurar la clave de App Store Connect',
                        cifras: [
                          ['Último día', data.descargas.tienda.ultimo],
                          ['7 días', data.descargas.tienda.semana],
                          ['Total', data.descargas.tienda.total],
                        ],
                      },
                      {
                        titulo: 'Primeras aperturas',
                        nota: data.descargas.aperturas.desde
                          ? `En tiempo real, desde el ${format(parseISO(data.descargas.aperturas.desde), 'd MMM yyyy', { locale: es })}`
                          : 'Empiezan a contar con la versión 4.1 de la app',
                        cifras: [
                          ['Hoy', data.descargas.aperturas.hoy],
                          ['7 días', data.descargas.aperturas.semana],
                          ['Total', data.descargas.aperturas.total],
                        ],
                      },
                    ].map(b => (
                      <div key={b.titulo} className="rounded-xl border p-4 space-y-3">
                        <p className="text-sm font-medium">{b.titulo}</p>
                        <div className="grid grid-cols-3 gap-2">
                          {b.cifras.map(([etiqueta, n]) => (
                            <div key={etiqueta as string}>
                              <p className="text-xl font-bold tabular-nums">{numero(n as number)}</p>
                              <p className="text-xs text-muted-foreground">{etiqueta}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">{b.nota}</p>
                      </div>
                    ))}
                  </div>
                  <ChartContainer config={descargasConfig} className="h-[220px] w-full">
                    <BarChart data={descargasDia} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                      <XAxis dataKey="dia" tickFormatter={etiquetaDia} className="text-xs" tickLine={false} axisLine={false} minTickGap={24} />
                      <YAxis allowDecimals={false} className="text-xs" tickLine={false} axisLine={false} width={32} />
                      <ChartTooltip isAnimationActive={false} content={<ChartTooltipContent labelFormatter={(_, p) => etiquetaDia(p?.[0]?.payload?.dia ?? '')} />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="tienda" fill="hsl(var(--grafica))" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="aperturas" fill="hsl(var(--success))" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            {/* DÓNDE SE USA */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Desglose
                titulo="Grupos creados por país"
                filas={(data.paises_grupos ?? []).map(p => ({ etiqueta: pais(p.pais), valor: p.grupos }))}
              />
              <Desglose
                titulo="Uso por país (iPhone·día)"
                filas={(data.paises_uso ?? []).map(p => ({ etiqueta: pais(p.pais), valor: p.dispositivos }))}
              />
              <Desglose
                titulo="Idiomas"
                filas={(data.idiomas ?? []).map(i => ({ etiqueta: idioma(i.idioma), valor: i.dispositivos }))}
              />
              <Desglose
                titulo="Versiones (últimos 7 días)"
                filas={(data.versiones ?? []).map(v => ({ etiqueta: `v${v.version}`, valor: v.dispositivos }))}
              />
            </div>

            {/* ACTIVIDAD DIARIA */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actividad diaria</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={actividadConfig} className="h-[300px] w-full">
                  <AreaChart data={actividad} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="movimientosFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--grafica))" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="hsl(var(--grafica))" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="dia" tickFormatter={etiquetaDia} className="text-xs" tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis allowDecimals={false} className="text-xs" tickLine={false} axisLine={false} width={40} />
                    <ChartTooltip isAnimationActive={false} content={<ChartTooltipContent indicator="line" labelFormatter={(_, p) => etiquetaDia(p?.[0]?.payload?.dia ?? '')} />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Area type="monotone" dataKey="movimientos" stroke="hsl(var(--grafica))" strokeWidth={2} fill="url(#movimientosFill)" dot={false} />
                    <Area type="monotone" dataKey="grupos" stroke="hsl(var(--success))" strokeWidth={2} fill="transparent" dot={false} />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* GRUPOS NUEVOS */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Grupos nuevos por día</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={gruposConfig} className="h-[260px] w-full">
                    <BarChart data={gruposNuevos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                      <XAxis dataKey="dia" tickFormatter={etiquetaDia} className="text-xs" tickLine={false} axisLine={false} minTickGap={24} />
                      <YAxis allowDecimals={false} className="text-xs" tickLine={false} axisLine={false} width={32} />
                      <ChartTooltip isAnimationActive={false} content={<ChartTooltipContent labelFormatter={(_, p) => etiquetaDia(p?.[0]?.payload?.dia ?? '')} />} />
                      <Bar dataKey="n" fill="hsl(var(--grafica))" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* CATEGORÍAS */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Movimientos por categoría</CardTitle>
                </CardHeader>
                <CardContent>
                  {categorias.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin datos</p>
                  ) : (
                    <ChartContainer config={categoriasConfig} className="h-[260px] w-full">
                      <BarChart data={categorias} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} className="text-xs" tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="etiqueta" className="text-xs" tickLine={false} axisLine={false} width={120} interval={0} />
                        <ChartTooltip isAnimationActive={false} content={<ChartTooltipContent />} />
                        <Bar dataKey="movimientos" fill="hsl(var(--grafica))" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* DESGLOSES */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Desglose
                titulo="Divisas"
                filas={(data.divisas ?? []).map(d => ({ etiqueta: d.divisa, valor: d.grupos }))}
              />
              <Desglose
                titulo="Tipos de movimiento"
                filas={(data.tipos ?? []).map(t => ({ etiqueta: TIPOS[t.tipo] ?? t.tipo, valor: t.movimientos }))}
              />
              <Desglose
                titulo="Repartos"
                filas={(data.repartos ?? []).map(r => ({ etiqueta: REPARTOS[r.modo] ?? r.modo, valor: r.movimientos }))}
              />
              <Desglose
                titulo="Tamaño de grupos"
                filas={[...(data.tamano_grupos ?? [])]
                  .sort((a, b) => a.personas - b.personas)
                  .map(t => ({ etiqueta: `${t.personas} ${t.personas === 1 ? 'persona' : 'personas'}`, valor: t.grupos }))}
              />
            </div>

            {/* SUGERENCIAS («Ayúdanos a mejorar» en la app) */}
            <Card id="comentarios" className="scroll-mt-6">
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

            {/* ACTUALIZACIÓN OBLIGATORIA */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Versión mínima de la app</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Ahora: <strong className="text-foreground">v{data.version_minima ?? '1.0'}</strong>. Los iPhone con una versión anterior
                  muestran «Hay una nueva versión» y no dejan seguir hasta actualizar (desde la 2.0; la 1.0 no lo sabe hacer).
                  Súbela solo cuando la nueva versión ya esté publicada en la App Store.
                </p>
                <div className="flex gap-2 max-w-sm">
                  <Input placeholder="2.0" value={nuevaMinima} onChange={e => setNuevaMinima(e.target.value)} />
                  <Button onClick={guardarMinima} disabled={!nuevaMinima.trim()}>Guardar</Button>
                </div>
              </CardContent>
            </Card>

            {/* GRUPOS RECIENTES (sin nombres a propósito) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Grupos recientes</CardTitle>
              </CardHeader>
              <CardContent>
                {(data.grupos_recientes ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin datos</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Divisa</TableHead>
                        <TableHead className="text-right">Personas</TableHead>
                        <TableHead className="text-right">Movimientos</TableHead>
                        <TableHead>Creado</TableHead>
                        <TableHead>Última actividad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.grupos_recientes.map((g, i) => (
                        <TableRow key={`${g.creado}-${i}`}>
                          <TableCell className="text-xl">{g.emoji || '👥'}</TableCell>
                          <TableCell>{g.divisa}</TableCell>
                          <TableCell className="text-right tabular-nums">{numero(g.personas)}</TableCell>
                          <TableCell className="text-right tabular-nums">{numero(g.movimientos)}</TableCell>
                          <TableCell>{format(parseISO(g.creado), 'd MMM yyyy', { locale: es })}</TableCell>
                          <TableCell className="text-muted-foreground">{hace(g.ultima_actividad)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
};

export default SaviumShare;
