import { useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock } from 'lucide-react';
import { useEditorFamilia } from '@/hooks/useEditorFamilia';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useInvestments } from '@/hooks/useInvestments';
import { useInvestmentTypes } from '@/hooks/useInvestmentTypes';
import { useCriptomonedas } from '@/hooks/useCriptomonedas';
import { useSubscriptionServices } from '@/hooks/useSubscriptionServices';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useAppConfig } from '@/hooks/useAppConfig';
import { groupAnnualPayments, readInactiveAnnualIds } from '@/lib/finance/annualPayments';
import { formatFechaCorta, parseFechaLocal } from '@/lib/finance/fechas';
import {
  Contacto, Documento, Seguro, conDecision, conNota, esTablaInexistente, estadoRevision, estadoVencimientoSeguro,
  nuevoContacto, nuevoDocumento, nuevoSeguro, sinHuerfana,
} from '@/lib/finance/familia';
import {
  detalleCriptoFamilia, detalleInversionesFamilia, notasHuerfanas, pagosRecurrentesFamilia, resumenPatrimonioFamilia,
} from '@/lib/finance/familiaResumen';
import { CampoLista, ListaEditable } from '@/components/familia/ListaEditable';
import { IndicadorGuardado } from '@/components/familia/IndicadorGuardado';
import { PatrimonioFamilia } from '@/components/familia/PatrimonioFamilia';
import { PagosFamilia } from '@/components/familia/PagosFamilia';
import { NotasHuerfanas } from '@/components/familia/NotasHuerfanas';

const CAMPOS_CONTACTO: CampoLista<Contacto>[] = [
  { clave: 'nombre', etiqueta: 'Nombre', tipo: 'texto' },
  { clave: 'rol', etiqueta: 'Rol', tipo: 'texto', placeholder: 'Notario, contador, agente de seguros…' },
  { clave: 'telefono', etiqueta: 'Teléfono', tipo: 'texto' },
  { clave: 'email', etiqueta: 'Email', tipo: 'texto' },
  { clave: 'nota', etiqueta: 'Para qué llamarle', tipo: 'area' },
];
const CAMPOS_SEGURO: CampoLista<Seguro>[] = [
  { clave: 'tipo', etiqueta: 'Tipo', tipo: 'texto', placeholder: 'Vida, gastos médicos, auto, casa…' },
  { clave: 'aseguradora', etiqueta: 'Aseguradora', tipo: 'texto' },
  { clave: 'poliza', etiqueta: 'Nº de póliza', tipo: 'texto' },
  { clave: 'sumaAsegurada', etiqueta: 'Suma asegurada', tipo: 'numero' },
  { clave: 'divisa', etiqueta: 'Divisa', tipo: 'divisa' },
  { clave: 'beneficiarios', etiqueta: 'Beneficiarios', tipo: 'texto' },
  { clave: 'vencimiento', etiqueta: 'Vencimiento', tipo: 'fecha' },
  { clave: 'comoReclamar', etiqueta: 'Cómo reclamar (agente, teléfono, pasos)', tipo: 'area' },
];
const CAMPOS_DOCUMENTO: CampoLista<Documento>[] = [
  { clave: 'que', etiqueta: 'Qué', tipo: 'texto', placeholder: 'Testamento, escrituras, actas, pasaportes…' },
  { clave: 'donde', etiqueta: 'Dónde está', tipo: 'texto', placeholder: 'Caja fuerte, notaría, carpeta en Drive…' },
  { clave: 'nota', etiqueta: 'Nota', tipo: 'area' },
];

const VENCIMIENTO_CLASE = { vencida: 'text-destructive font-semibold', proxima: 'text-amber-600 font-semibold', vigente: 'text-muted-foreground', sin_fecha: 'text-muted-foreground' };

const Familia = () => {
  const editor = useEditorFamilia();
  const { doc } = editor;
  const { accounts, transactions, categories, loading: finLoading, error: finError } = useFinanceDataSupabase();
  const { investments, loading: invLoading, error: invError } = useInvestments();
  const { types } = useInvestmentTypes();
  const { criptomonedas, loading: criptoLoading, error: criptoError } = useCriptomonedas();
  const { subscriptions, loading: subsLoading, error: subsError } = useSubscriptionServices();
  const { convertCurrency } = useExchangeRates();
  const { config, formatCurrency } = useAppConfig();
  const [inactiveAnnual] = useState(readInactiveAnnualIds);

  const resumen = useMemo(
    () => resumenPatrimonioFamilia({ accounts, transactions, convert: convertCurrency, currency: config.currency }),
    [accounts, transactions, convertCurrency, config.currency]
  );
  const inversiones = useMemo(() => detalleInversionesFamilia(investments, types), [investments, types]);
  const cripto = useMemo(() => detalleCriptoFamilia(criptomonedas), [criptomonedas]);
  const annualGroups = useMemo(() => groupAnnualPayments(categories, transactions), [categories, transactions]);
  const pagos = useMemo(
    () => (doc ? pagosRecurrentesFamilia({
      subscriptions, annualGroups, transactions, inactiveAnnualIds: inactiveAnnual, baseCurrency: config.currency, decisiones: doc.pagos,
    }) : []),
    [doc, subscriptions, annualGroups, transactions, inactiveAnnual, config.currency]
  );
  const fuentesListas = !finLoading && !invLoading && !criptoLoading && !subsLoading && !finError && !invError && !criptoError && !subsError;
  const huerfanas = useMemo(
    () => (doc && fuentesListas ? notasHuerfanas(doc, {
      cuentas: accounts.map(a => a.id),
      inversiones: investments.map(i => i.id),
      criptos: criptomonedas.map(c => c.id),
      suscripciones: subscriptions.map(s => s.id),
      anuales: annualGroups.map(g => g.id),
    }) : []),
    [doc, fuentesListas, accounts, investments, criptomonedas, subscriptions, annualGroups]
  );

  const revision = estadoRevision(editor.fila?.revisadoAt ?? null);
  const migracionPendiente = !!editor.error && esTablaInexistente(editor.error);

  return (
    <Layout>
      <div className="animate-fade-in space-y-6 max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Para mi familia</h1>
          <p className="text-muted-foreground">Lo que necesitaríais saber si un día no estoy. Se guarda solo mientras escribes.</p>
        </div>

        <Card>
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Última revisión</p>
              <p className="font-semibold">
                {editor.fila?.revisadoAt ? formatFechaCorta(new Date(editor.fila.revisadoAt)) : 'Nunca'}
                {revision === 'vencida' && <Badge variant="destructive" className="ml-2">Toca revisarla</Badge>}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {doc && <IndicadorGuardado estado={editor.estado} onReintentar={editor.reintentar} onRecargar={editor.recargar} onGuardarLaMia={editor.guardarLaMia} />}
              <Button onClick={editor.marcarRevisado} disabled={!editor.fila || editor.estado !== 'guardado'}>Marcar como revisado</Button>
            </div>
          </CardContent>
        </Card>

        {migracionPendiente ? (
          <Card><CardContent className="p-6 text-center">Falta aplicar la migración <code>informacion_familia</code> en Supabase.</CardContent></Card>
        ) : editor.error ? (
          <Card>
            <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
              <p>No se pudo cargar la información para tu familia.</p>
              <Button variant="outline" onClick={editor.recargar}>Reintentar</Button>
            </CardContent>
          </Card>
        ) : !doc ? (
          <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Si estás leyendo esto</CardTitle>
                <CardDescription>Los primeros pasos, en orden: a quién llamar, qué no cancelar, qué hacer primero.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea rows={10} value={doc.carta} onChange={e => { const carta = e.target.value; editor.actualizar(d => ({ ...d, carta })); }} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Contactos clave</CardTitle></CardHeader>
              <CardContent>
                <ListaEditable
                  items={doc.contactos}
                  campos={CAMPOS_CONTACTO}
                  nuevo={nuevoContacto}
                  onChange={contactos => editor.actualizar(d => ({ ...d, contactos }))}
                  tituloDialogo="Contacto"
                  textoAnadir="Añadir contacto"
                  vacio="Aún no hay contactos."
                  renderItem={c => (
                    <div className="text-sm">
                      <p className="font-medium">{c.nombre || 'Sin nombre'} {c.rol && <span className="text-muted-foreground font-normal">· {c.rol}</span>}</p>
                      <p className="text-muted-foreground">{[c.telefono, c.email].filter(Boolean).join(' · ')}</p>
                      {c.nota && <p>{c.nota}</p>}
                    </div>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Seguros</CardTitle></CardHeader>
              <CardContent>
                <ListaEditable
                  items={doc.seguros}
                  campos={CAMPOS_SEGURO}
                  nuevo={nuevoSeguro}
                  onChange={seguros => editor.actualizar(d => ({ ...d, seguros }))}
                  tituloDialogo="Seguro"
                  textoAnadir="Añadir seguro"
                  vacio="Aún no hay seguros."
                  renderItem={s => {
                    const venc = estadoVencimientoSeguro(s.vencimiento);
                    return (
                      <div className="text-sm space-y-0.5">
                        <p className="font-medium">{s.tipo || 'Seguro'} {s.aseguradora && <span className="text-muted-foreground font-normal">· {s.aseguradora}</span>}</p>
                        <p className="text-muted-foreground">
                          {s.poliza && `Póliza ${s.poliza}`}{s.sumaAsegurada !== null && ` · Suma $${formatCurrency(s.sumaAsegurada)} ${s.divisa}`}
                        </p>
                        {s.beneficiarios && <p>Beneficiarios: {s.beneficiarios}</p>}
                        {s.vencimiento && <p className={VENCIMIENTO_CLASE[venc]}>{venc === 'vencida' ? 'Vencida' : 'Vence'} {formatFechaCorta(parseFechaLocal(s.vencimiento))}</p>}
                        {s.comoReclamar && <p className="whitespace-pre-line">{s.comoReclamar}</p>}
                      </div>
                    );
                  }}
                />
              </CardContent>
            </Card>
          </>
        )}

        <PatrimonioFamilia
          resumen={resumen}
          inversiones={inversiones}
          cripto={cripto}
          notas={doc?.notasPatrimonio ?? {}}
          onNota={doc ? (clave, texto) => editor.actualizar(d => conNota(d, clave, texto)) : undefined}
          currency={config.currency}
          formatCurrency={formatCurrency}
        />

        {doc && (
          <>
            <PagosFamilia pagos={pagos} onDecision={(clave, p) => editor.actualizar(d => conDecision(d, clave, p))} formatCurrency={formatCurrency} />

            <Card>
              <CardHeader><CardTitle>Documentos y accesos</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Alert>
                  <Lock className="h-4 w-4" />
                  <AlertDescription>No escribas contraseñas aquí; indica dónde están (gestor, caja fuerte) y quién tiene acceso.</AlertDescription>
                </Alert>
                <ListaEditable
                  items={doc.documentos}
                  campos={CAMPOS_DOCUMENTO}
                  nuevo={nuevoDocumento}
                  onChange={documentos => editor.actualizar(d => ({ ...d, documentos }))}
                  tituloDialogo="Documento"
                  textoAnadir="Añadir documento"
                  vacio="Aún no hay documentos."
                  renderItem={d => (
                    <div className="text-sm">
                      <p className="font-medium">{d.que || 'Sin título'}</p>
                      {d.donde && <p className="text-muted-foreground">{d.donde}</p>}
                      {d.nota && <p>{d.nota}</p>}
                    </div>
                  )}
                />
              </CardContent>
            </Card>

            {huerfanas.length > 0 && <NotasHuerfanas notas={huerfanas} onBorrar={h => editor.actualizar(d => sinHuerfana(d, h))} />}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Familia;
