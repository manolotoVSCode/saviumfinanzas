import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { eachDayOfInterval, format, formatDistanceToNow, parseISO, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Users, UsersRound, Receipt, Activity, Image as ImageIcon, ShieldAlert, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import Layout from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { esAdmin } from '@/lib/admin';
import { formatNumber } from '@/lib/formatters';

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
  grupos_recientes: {
    emoji: string | null;
    divisa: string;
    creado: string;
    personas: number;
    movimientos: number;
    ultima_actividad: string | null;
  }[];
}

const PERIODOS = [30, 90, 365] as const;

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

  const { data, isLoading, error } = useQuery({
    queryKey: ['share_panel', dias],
    enabled: admin,
    retry: (intentos, err) => !(err instanceof SinPermiso) && intentos < 2,
    queryFn: async () => {
      // share_panel no está en los tipos generados de Supabase (vive en la base de Savium Share).
      const { data, error } = await supabase.rpc('share_panel' as never, { p_dias: dias } as never);
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
          title="Savium Share"
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
            {/* CIFRAS */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
