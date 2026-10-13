import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Gift, Plus, Search, UserPlus, Users, CreditCard, Share2, Home } from 'lucide-react';
import Layout from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { formatNumber } from '@/lib/formatters';
import {
  funcion, useFamilias, useGuardarPrograma, useMiembros, usePerfilRewards, useProgramas, useTarjetas, useUso, type Perfil,
} from '@/lib/rewards/datos';
import {
  NOMBRE_TIPO_CODIGO, NOMBRE_TIPO_PROGRAMA, TIPOS_CODIGO, TIPOS_PROGRAMA, titulo, type Programa, type Tarjeta,
} from '@/lib/rewards/tipos';
import { TarjetaRewards } from '@/components/rewards/TarjetaRewards';
import { DetalleTarjeta } from '@/components/rewards/DetalleTarjeta';
import { EditorTarjeta } from '@/components/rewards/EditorTarjeta';

const SELECT = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';
const numero = (n: number) => formatNumber(n ?? 0, 0);
const hace = (fecha: string | null) => (fecha ? formatDistanceToNow(parseISO(fecha), { addSuffix: true, locale: es }) : '—');

/** Panel web de Savium Rewards dentro de Finanzas: mis tarjetas, las de la familia y la administración. */
const SaviumRewards = () => {
  const { user } = useAuth();
  const perfil = usePerfilRewards(user?.id);
  const p = perfil.data;

  return (
    <Layout>
      <PageHeader
        title={<span className="flex items-center gap-3"><Gift className="h-8 w-8 text-primary" />Savium Rewards</span>}
        subtitle={p?.familia ?? 'Cartera familiar de tarjetas de fidelidad'}
      />
      {perfil.isLoading && <Skeleton className="h-40 w-full" />}
      {perfil.error && <p className="text-destructive">No se pudo cargar Savium Rewards: {(perfil.error as Error).message}</p>}
      {p && !p.miembro && !p.admin && (
        <Card><CardContent className="p-10 text-center text-muted-foreground">Tu cuenta no pertenece a ninguna familia de Savium Rewards.</CardContent></Card>
      )}
      {p && user && (p.miembro || p.admin) && (
        <Tabs defaultValue={p.miembro ? 'tarjetas' : 'miembros'}>
          <TabsList>
            {p.miembro && <TabsTrigger value="tarjetas">Tarjetas</TabsTrigger>}
            {p.admin && <TabsTrigger value="miembros">Miembros</TabsTrigger>}
            {p.admin && <TabsTrigger value="uso">Uso</TabsTrigger>}
            {p.admin && <TabsTrigger value="catalogo">Catálogo</TabsTrigger>}
          </TabsList>
          {p.miembro && <TabsContent value="tarjetas" className="mt-6"><Tarjetas usuario={user.id} perfil={p} /></TabsContent>}
          {p.admin && <TabsContent value="miembros" className="mt-6"><Miembros usuario={user.id} perfil={p} /></TabsContent>}
          {p.admin && <TabsContent value="uso" className="mt-6"><PanelUso /></TabsContent>}
          {p.admin && <TabsContent value="catalogo" className="mt-6"><Catalogo /></TabsContent>}
        </Tabs>
      )}
    </Layout>
  );
};

// MARK: Tarjetas

function Tarjetas({ usuario, perfil }: { usuario: string; perfil: Perfil }) {
  const tarjetas = useTarjetas();
  const programas = useProgramas();
  const miembros = useMiembros(perfil.miembro?.familia_id);
  const [busqueda, setBusqueda] = useState('');
  const [abierta, setAbierta] = useState<Tarjeta | null>(null);
  const [editando, setEditando] = useState<{ t: Tarjeta; nueva: boolean } | null>(null);

  const mapa = useMemo(() => new Map((programas.data ?? []).map(p => [p.id, p])), [programas.data]);
  const dueno = (t: Tarjeta) => (t.user_id === usuario ? undefined : miembros.data?.find(m => m.user_id === t.user_id)?.nombre);
  const todas = tarjetas.data ?? [];
  const q = busqueda.trim().toLowerCase();
  const filtro = (t: Tarjeta) => !q || [titulo(t, mapa.get(t.programa_id ?? '')), t.numero_socio ?? '', t.titular ?? '', dueno(t) ?? '']
    .some(s => s.toLowerCase().includes(q));
  const mias = todas.filter(t => t.user_id === usuario);
  const familia = todas.filter(t => t.user_id !== usuario);

  function nueva() {
    const orden = Math.max(-1, ...mias.map(t => t.orden)) + 1;
    setEditando({ nueva: true, t: {
      id: crypto.randomUUID(), user_id: usuario, programa_id: null, nombre: null, color: null, unidad: null,
      numero_socio: null, codigo_valor: null, codigo_tipo: 'ninguno', titular: null, saldo: null, saldo_fecha: null,
      caducidad: null, notas: null, compartida: false, orden, actualizado: new Date().toISOString(), borrado: false,
    } });
  }

  const rejilla = (lista: Tarjeta[]) => (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {lista.filter(filtro).map(t => (
        <TarjetaRewards key={t.id} tarjeta={t} programa={mapa.get(t.programa_id ?? '')} dueno={dueno(t)} onClick={() => setAbierta(t)} />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="ml-auto flex gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar tarjeta" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <Button onClick={nueva}><Plus className="mr-1 h-4 w-4" />Añadir</Button>
        </div>
      </div>

      {tarjetas.isLoading && <Skeleton className="h-40 w-full" />}
      {tarjetas.error && <p className="text-destructive">No se pudieron cargar las tarjetas: {(tarjetas.error as Error).message}</p>}
      {mias.length > 0 && <section><h2 className="mb-3 text-xl font-bold">Mías</h2>{rejilla(mias)}</section>}
      {familia.length > 0 && <section><h2 className="mb-3 text-xl font-bold">De la familia</h2>{rejilla(familia)}</section>}
      {!tarjetas.isLoading && todas.length === 0 && (
        <Card><CardContent className="p-10 text-center">
          <p className="text-lg font-semibold">Tu cartera está vacía</p>
          <p className="text-muted-foreground">Añade tus tarjetas de fidelidad para no tener que llevarlas encima.</p>
        </CardContent></Card>
      )}

      {abierta && (
        <DetalleTarjeta tarjeta={abierta} programa={mapa.get(abierta.programa_id ?? '')} dueno={dueno(abierta)} onCerrar={() => setAbierta(null)}
          onEditar={abierta.user_id === usuario ? () => { setEditando({ t: abierta, nueva: false }); setAbierta(null); } : undefined} />
      )}
      {editando && (
        <EditorTarjeta inicial={editando.t} nueva={editando.nueva} programas={programas.data ?? []} pais={perfil.miembro?.pais ?? 'MX'}
          onCerrar={() => setEditando(null)} />
      )}
    </div>
  );
}

// MARK: Miembros

function Miembros({ usuario, perfil }: { usuario: string; perfil: Perfil }) {
  const uso = useUso(true);
  const familias = useFamilias(true);
  const cliente = useQueryClient();
  const [invitando, setInvitando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refrescar = () => cliente.invalidateQueries({ queryKey: ['rewards'] });

  async function accion(cuerpo: Record<string, unknown>, aviso?: string) {
    if (aviso && !confirm(aviso)) return;
    setError(null);
    try { await funcion('rewards-cuenta', cuerpo); refrescar(); }
    catch (e) { const m = (e as Error).message; setError(m === 'es_administrador' ? 'No se puede cambiar ni quitar a un administrador desde aquí.' : m); }
  }

  async function nuevaFamilia() {
    const nombre = prompt('Nombre de la nueva familia (p. ej. «Revisión App Store»):')?.trim();
    if (!nombre) return;
    try { await funcion('rewards-cuenta', { accion: 'nueva_familia', nombre }); refrescar(); }
    catch (e) { setError((e as Error).message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button onClick={() => setInvitando(true)}><UserPlus className="mr-1 h-4 w-4" />Invitar</Button>
        <Button variant="secondary" onClick={nuevaFamilia}>Nueva familia</Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead><TableHead>Correo</TableHead><TableHead>Familia</TableHead><TableHead>Rol</TableHead>
              <TableHead className="text-right">Tarjetas</TableHead><TableHead>Última sincronización</TableHead><TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {uso.data?.miembros.map(m => (
              <TableRow key={m.user_id}>
                <TableCell className="font-medium">{m.nombre}</TableCell>
                <TableCell>{m.email}</TableCell>
                <TableCell>{m.familia}</TableCell>
                <TableCell>
                  {m.user_id === usuario ? 'Tú' : (
                    <select className="rounded-md bg-transparent text-sm" value={m.rol}
                      onChange={e => accion({ accion: 'rol', user_id: m.user_id, rol: e.target.value })}>
                      <option value="miembro">Miembro</option><option value="admin">Responsable</option>
                    </select>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{m.tarjetas}</TableCell>
                <TableCell>{hace(m.ultima_sincronizacion)}</TableCell>
                <TableCell className="text-right">
                  {m.user_id !== usuario && (
                    <Button variant="ghost" size="sm" className="text-destructive"
                      onClick={() => accion({ accion: 'quitar', user_id: m.user_id }, `¿Quitar a ${m.nombre} de la familia? Dejará de ver las tarjetas compartidas.`)}>
                      Quitar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {uso.isLoading && <Skeleton className="m-4 h-10" />}
      </Card>
      {invitando && (
        <Invitar familias={familias.data ?? []} familiaPorDefecto={perfil.miembro?.familia_id}
          onCerrar={() => { setInvitando(false); refrescar(); }} />
      )}
    </div>
  );
}

function Invitar({ familias, familiaPorDefecto, onCerrar }: {
  familias: { id: string; nombre: string }[]; familiaPorDefecto?: string; onCerrar: () => void;
}) {
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [familia, setFamilia] = useState(familiaPorDefecto ?? familias[0]?.id ?? '');
  const [pais, setPais] = useState('MX');
  const [rol, setRol] = useState('miembro');
  const [estado, setEstado] = useState<{ ok?: boolean; error?: string; ocupado?: boolean }>({});

  async function enviar() {
    setEstado({ ocupado: true });
    try {
      await funcion('rewards-invitar', { email: email.trim(), nombre: nombre.trim(), familia_id: familia || undefined, pais, rol });
      setEstado({ ok: true });
    } catch (e) {
      const m = (e as Error).message;
      setEstado({ error: m === 'otra_familia' ? 'Ese correo ya pertenece a otra familia.' : m });
    }
  }

  return (
    <Dialog open onOpenChange={abierto => !abierto && onCerrar()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Invitar a alguien</DialogTitle></DialogHeader>
        {estado.ok ? (
          <p>Listo. <strong>{nombre}</strong> ya puede entrar en la app Savium Rewards con <strong>{email.trim()}</strong>: al intentarlo recibirá un código en su correo.</p>
        ) : (
          <div className="space-y-3">
            <Input type="email" placeholder="Correo" value={email} onChange={e => setEmail(e.target.value)} />
            <Input placeholder="Nombre" maxLength={40} value={nombre} onChange={e => setNombre(e.target.value)} />
            <div className="grid grid-cols-3 gap-2">
              <select className={SELECT} value={familia} onChange={e => setFamilia(e.target.value)} aria-label="Familia">
                {familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
              <select className={SELECT} value={pais} onChange={e => setPais(e.target.value)} aria-label="País">
                <option value="MX">México</option><option value="ES">España</option>
              </select>
              <select className={SELECT} value={rol} onChange={e => setRol(e.target.value)} aria-label="Rol">
                <option value="miembro">Miembro</option><option value="admin">Responsable</option>
              </select>
            </div>
            {estado.error && <p className="text-sm text-destructive">{estado.error}</p>}
          </div>
        )}
        <DialogFooter>
          {estado.ok
            ? <Button onClick={onCerrar}>Hecho</Button>
            : <Button disabled={estado.ocupado || !email.includes('@') || !nombre.trim()} onClick={enviar}>Invitar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// MARK: Uso

const Kpi = ({ icon: Icon, titulo, valor }: { icon: React.ElementType; titulo: string; valor: number }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Icon className="h-4 w-4" />{titulo}</CardTitle>
    </CardHeader>
    <CardContent><p className="text-2xl font-bold tabular-nums">{numero(valor)}</p></CardContent>
  </Card>
);

function PanelUso() {
  const uso = useUso(true);
  if (uso.isLoading) return <Skeleton className="h-40 w-full" />;
  if (uso.error || !uso.data) return <p className="text-destructive">No se pudo cargar el uso.</p>;
  const { totales, por_programa } = uso.data;
  const maximo = Math.max(1, ...por_programa.map(p => p.tarjetas));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={Home} titulo="Familias" valor={totales.familias} />
        <Kpi icon={Users} titulo="Miembros" valor={totales.miembros} />
        <Kpi icon={CreditCard} titulo="Tarjetas" valor={totales.tarjetas} />
        <Kpi icon={Share2} titulo="Compartidas" valor={totales.compartidas} />
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Tarjetas por programa</CardTitle></CardHeader>
        <CardContent className="space-y-2.5">
          {por_programa.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay tarjetas.</p>}
          {por_programa.map(p => (
            <div key={p.programa} className="grid grid-cols-[minmax(0,14rem)_1fr_3rem] items-center gap-3 text-sm">
              <span className="truncate">{p.programa}</span>
              <span className="h-2 rounded-full bg-primary" style={{ width: `${(p.tarjetas / maximo) * 100}%` }} />
              <span className="text-right tabular-nums">{p.tarjetas}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">Actualizado {hace(uso.data.generado)}. Solo conteos: nadie más puede ver el contenido de las tarjetas privadas.</p>
    </div>
  );
}

// MARK: Catálogo

function Catalogo() {
  const programas = useProgramas();
  const guardar = useGuardarPrograma();
  const [editando, setEditando] = useState<Partial<Programa> | null>(null);
  const [filtro, setFiltro] = useState('');
  const cambiar = (c: Partial<Programa>) => setEditando(e => ({ ...e, ...c }));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input className="max-w-xs" placeholder="Buscar" value={filtro} onChange={e => setFiltro(e.target.value)} />
        <Button onClick={() => setEditando({ tipo: 'comercio', pais: 'MX', color: '#4F8248', unidad: 'puntos', codigo_tipo: 'code128', activo: true })}>
          <Plus className="mr-1 h-4 w-4" />Añadir programa
        </Button>
      </div>
      <Card className="divide-y">
        {(programas.data ?? []).filter(p => p.nombre.toLowerCase().includes(filtro.toLowerCase())).map(p => (
          <button key={p.id} type="button" onClick={() => setEditando(p)}
            className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-foreground/5 ${p.activo ? '' : 'opacity-40'}`}>
            <span className="h-4 w-4 rounded-full" style={{ background: p.color }} />
            <span className="flex-1 font-medium">{p.nombre}</span>
            <span className="text-muted-foreground">{NOMBRE_TIPO_PROGRAMA[p.tipo]} · {p.pais} · {p.unidad} · {NOMBRE_TIPO_CODIGO[p.codigo_tipo]}</span>
          </button>
        ))}
      </Card>
      {editando && (
        <Dialog open onOpenChange={abierto => !abierto && setEditando(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editando.id ? 'Editar programa' : 'Nuevo programa'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Nombre" maxLength={60} value={editando.nombre ?? ''} onChange={e => cambiar({ nombre: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <select className={SELECT} value={editando.tipo} onChange={e => cambiar({ tipo: e.target.value as Programa['tipo'] })}>
                  {TIPOS_PROGRAMA.map(t => <option key={t} value={t}>{NOMBRE_TIPO_PROGRAMA[t]}</option>)}
                </select>
                <select className={SELECT} value={editando.pais} onChange={e => cambiar({ pais: e.target.value as Programa['pais'] })}>
                  <option value="MX">México</option><option value="ES">España</option><option value="INT">Internacional</option>
                </select>
                <Input placeholder="Unidad" maxLength={20} value={editando.unidad ?? ''} onChange={e => cambiar({ unidad: e.target.value })} />
                <select className={SELECT} value={editando.codigo_tipo} onChange={e => cambiar({ codigo_tipo: e.target.value as Programa['codigo_tipo'] })}>
                  {TIPOS_CODIGO.map(c => <option key={c} value={c}>{NOMBRE_TIPO_CODIGO[c]}</option>)}
                </select>
                <label className="flex items-center gap-2 text-sm">
                  <input type="color" value={editando.color ?? '#4F8248'} onChange={e => cambiar({ color: e.target.value.toUpperCase() })} />Color
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={editando.activo ?? true} onCheckedChange={v => cambiar({ activo: v })} />Activo
                </label>
              </div>
              {guardar.error && <p className="text-sm text-destructive">{(guardar.error as Error).message}</p>}
            </div>
            <DialogFooter>
              <Button disabled={guardar.isPending || !editando.nombre?.trim() || !editando.unidad?.trim()}
                onClick={async () => { await guardar.mutateAsync(editando as Programa); setEditando(null); }}>
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default SaviumRewards;
