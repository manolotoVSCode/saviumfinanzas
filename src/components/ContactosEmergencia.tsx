import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { hashCodigoEmergencia, validarCodigoEmergencia, validarEmail } from '@/lib/finance/codigoEmergencia';
import { ShieldAlert, Trash2, Plus } from 'lucide-react';

/**
 * Alerta de emergencia de la app iOS: quién recibe el correo (además de los lectores, que siempre lo reciben)
 * y el código de coacción. Vive solo en la web: en el iPhone no hay nada que encontrar.
 */
export const ContactosEmergencia = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [confirmacion, setConfirmacion] = useState('');

  const contactos = useQuery({
    queryKey: ['contactos_alerta', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('contactos_alerta').select('id, nombre, email').order('created_at');
      if (error) throw error;
      return data;
    },
  });

  const codigoGuardado = useQuery({
    queryKey: ['codigos_emergencia', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('codigos_emergencia').select('actualizado').maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const avisarError = (titulo: string) => (e: unknown) =>
    toast({ title: titulo, description: e instanceof Error ? e.message : String(e), variant: 'destructive' });

  const alta = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('contactos_alerta')
        .insert({ user_id: user!.id, nombre: nombre.trim() || null, email: email.trim().toLowerCase() });
      if (error) throw error;
    },
    onSuccess: () => {
      setNombre(''); setEmail('');
      qc.invalidateQueries({ queryKey: ['contactos_alerta'] });
      toast({ title: 'Contacto añadido' });
    },
    onError: avisarError('No se pudo añadir el contacto'),
  });

  const baja = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contactos_alerta').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contactos_alerta'] }),
    onError: avisarError('No se pudo quitar el contacto'),
  });

  const guardarCodigo = useMutation({
    mutationFn: async () => {
      const hash = await hashCodigoEmergencia(codigo, user!.id);
      const { error } = await supabase.from('codigos_emergencia')
        .upsert({ user_id: user!.id, hash, actualizado: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      setCodigo(''); setConfirmacion('');
      qc.invalidateQueries({ queryKey: ['codigos_emergencia'] });
      toast({ title: 'Código guardado', description: 'Tu iPhone lo tendrá la próxima vez que abras Savium con Face ID o tu contraseña.' });
    },
    onError: avisarError('No se pudo guardar el código'),
  });

  const quitarCodigo = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('codigos_emergencia').delete().eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['codigos_emergencia'] });
      toast({ title: 'Código quitado' });
    },
    onError: avisarError('No se pudo quitar el código'),
  });

  const errorCodigo = codigo || confirmacion ? validarCodigoEmergencia(codigo, confirmacion) : null;
  const actualizado = codigoGuardado.data?.actualizado;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          Contactos de emergencia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Si mandas la alerta desde la app del iPhone, tus lectores (tu familia con acceso de solo lectura) reciben
          la notificación y el correo. Estos contactos reciben además el correo, con tu ubicación e instrucciones.
        </p>

        <div className="space-y-3">
          {(contactos.data ?? []).length === 0 && !contactos.isLoading && (
            <p className="text-sm text-muted-foreground">No hay contactos extra.</p>
          )}
          {(contactos.data ?? []).map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
              <div className="min-w-0">
                {c.nombre && <p className="font-medium truncate">{c.nombre}</p>}
                <p className="text-sm text-muted-foreground truncate">{c.email}</p>
              </div>
              <Button variant="ghost" size="icon" aria-label={`Quitar ${c.email}`} onClick={() => baja.mutate(c.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <form
            className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]"
            onSubmit={(e) => { e.preventDefault(); if (validarEmail(email)) alta.mutate(); }}
          >
            <Input placeholder="Nombre (opcional)" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            <Input type="email" placeholder="correo@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" disabled={!validarEmail(email) || alta.isPending}>
              <Plus className="h-4 w-4 mr-1" /> Añadir
            </Button>
          </form>
        </div>

        <div className="space-y-3 border-t pt-4">
          <h3 className="font-semibold">Código de emergencia</h3>
          <p className="text-sm text-muted-foreground">
            Escrito en la pantalla de acceso de la app en lugar de tu contraseña, entra mostrando datos ficticios y
            manda la alerta en silencio. Solo se guarda cifrado. {codigoGuardado.isLoading ? '' : actualizado
              ? `Configurado el ${new Date(actualizado).toLocaleDateString('es-MX', { dateStyle: 'medium' })}.`
              : 'Ahora mismo no tienes ninguno.'}
          </p>
          <form
            className="grid gap-2 sm:grid-cols-2"
            onSubmit={(e) => { e.preventDefault(); if (!validarCodigoEmergencia(codigo, confirmacion)) guardarCodigo.mutate(); }}
          >
            <div className="space-y-1">
              <Label htmlFor="codigo-emergencia">{actualizado ? 'Nuevo código' : 'Código'}</Label>
              <Input id="codigo-emergencia" type="password" autoComplete="new-password" value={codigo}
                     onChange={(e) => setCodigo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="codigo-emergencia-2">Repite el código</Label>
              <Input id="codigo-emergencia-2" type="password" autoComplete="new-password" value={confirmacion}
                     onChange={(e) => setConfirmacion(e.target.value)} />
            </div>
            {errorCodigo && <p className="text-sm text-destructive sm:col-span-2">{errorCodigo}</p>}
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={!codigo || !!errorCodigo || guardarCodigo.isPending}>
                {actualizado ? 'Cambiar código' : 'Guardar código'}
              </Button>
              {actualizado && (
                <Button type="button" variant="outline" onClick={() => quitarCodigo.mutate()} disabled={quitarCodigo.isPending}>
                  Quitar código
                </Button>
              )}
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};
