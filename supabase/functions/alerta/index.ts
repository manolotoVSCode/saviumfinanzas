// Alerta de emergencia silenciosa: la llama la app iOS del titular (triple toque en «Patrimonio neto»).
// Avisa a sus lectores con una notificación urgente (APNs) y un correo (SMTP 465). La app del titular no
// muestra nada; esta función siempre responde rápido y sin detalles. Si el lector no la ve, «alerta-repetir»
// (cada minuto, por pg_cron) la vuelve a enviar hasta 10 veces.
// Los textos sensibles (mensaje, instrucciones, teléfono) son secretos, no código: el repositorio es público.
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { horaMexico, notificar } from "../_shared/apns.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } });

interface Peticion { id: string; latitud?: number; longitud?: number; precision?: number; momento?: string }

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false }, 405);
  const auth = req.headers.get("Authorization") ?? "";
  const comoUsuario = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user } } = await comoUsuario.auth.getUser();
  if (!user) return json({ ok: false }, 401);

  let p: Peticion;
  try { p = await req.json(); } catch { return json({ ok: false }, 400); }
  if (typeof p.id !== "string" || p.id.length < 8 || p.id.length > 64) return json({ ok: false }, 400);
  const lat = typeof p.latitud === "number" ? p.latitud : null;
  const lon = typeof p.longitud === "number" ? p.longitud : null;
  const precision = typeof p.precision === "number" ? Math.round(p.precision) : null;

  const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const { data: perfil } = await admin.from("profiles").select("nombre").eq("user_id", user.id).maybeSingle();
  const nombre = capitalizar(perfil?.nombre ?? "") || "Savium";
  const mensaje = env("ALERTA_MENSAJE") || "Necesito ayuda.";

  // Idempotente: los reintentos de la app llevan el mismo id y no vuelven a avisar.
  const { data: alerta, error: errAlta } = await admin.from("alertas_emergencia")
    .insert({
      user_id: user.id, id_cliente: p.id, latitud: lat, longitud: lon, precision_m: precision,
      nombre, mensaje, telefono: env("ALERTA_TELEFONO") || null,
    })
    .select("id, creada").single();
  if (errAlta) return json({ ok: true, repetida: errAlta.code === "23505" });

  const { data: lectores } = await admin.from("lectores").select("lector_id").eq("propietario_id", user.id);
  const ids = (lectores ?? []).map((l) => l.lector_id as string);
  if (ids.length === 0) return json({ ok: true });

  const hora = horaMexico(new Date(p.momento ?? alerta.creada));
  const mapa = lat !== null && lon !== null ? `https://maps.google.com/?q=${lat},${lon}` : null;

  // Notificaciones y correo a la vez; un fallo en uno no frena al otro.
  const [n, c] = await Promise.allSettled([
    notificar(admin, ids, { alertaId: alerta.id, titulo: `Alerta de ${nombre}`, cuerpo: `${mensaje} (${hora})`, latitud: lat, longitud: lon }),
    enviarCorreos(admin, ids, nombre, mensaje, hora, mapa, precision),
  ]);
  const enviadas = n.status === "fulfilled" ? n.value : 0;
  const correo = c.status === "fulfilled" ? c.value : `error: ${String(c.reason).slice(0, 200)}`;
  if (n.status === "rejected") console.error("APNs", String(n.reason));
  await admin.from("alertas_emergencia").update({ notificaciones: enviadas, correo }).eq("id", alerta.id);
  return json({ ok: true });
});

function capitalizar(s: string) {
  return s.trim().toLowerCase().split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

async function enviarCorreos(admin: ReturnType<typeof createClient>, ids: string[], nombre: string, mensaje: string,
                             hora: string, mapa: string | null, precision: number | null): Promise<string> {
  if (!env("ALERTA_SMTP_HOST")) return "sin configurar";
  const destinos: string[] = [];
  for (const id of ids) {
    const { data } = await admin.auth.admin.getUserById(id);
    if (data.user?.email) destinos.push(data.user.email);
  }
  if (destinos.length === 0) return "sin destinatarios";
  const ubicacion = mapa
    ? `Ubicación: ${mapa}${precision !== null ? ` (precisión ± ${precision} m)` : ""}`
    : "Ubicación: no disponible.";
  const telefono = env("ALERTA_TELEFONO") ? `Teléfono: ${env("ALERTA_TELEFONO")}` : "";
  const cuerpo = [`Alerta de ${nombre} – ${hora}`, "", `«${mensaje}»`, "", ubicacion, telefono, "",
    env("ALERTA_INSTRUCCIONES"), "", "No respondas a este correo."].join("\n");
  // iCloud por el puerto 465 a veces no responde: hasta 3 intentos, cada uno con una conexión nueva.
  let ultimoError = "";
  for (let intento = 1; intento <= 3; intento++) {
    const cliente = new SMTPClient({
      connection: {
        hostname: env("ALERTA_SMTP_HOST"),
        port: Number(env("ALERTA_SMTP_PUERTO") || "465"),
        tls: true,
        auth: { username: env("ALERTA_SMTP_USUARIO"), password: env("ALERTA_SMTP_CLAVE") },
      },
    });
    try {
      await cliente.send({
        from: env("ALERTA_REMITENTE") || env("ALERTA_SMTP_USUARIO"),
        to: destinos,
        // Si la cuenta que envía es del titular, una respuesta llegaría a su iPhone: las respuestas van a quien la recibe.
        replyTo: destinos[0],
        subject: `Alerta de ${nombre} – ${hora}`,
        content: cuerpo,
      });
      return intento === 1 ? "enviado" : `enviado (intento ${intento})`;
    } catch (e) {
      ultimoError = String(e).slice(0, 160);
      console.error("SMTP", intento, ultimoError);
    } finally {
      try { await cliente.close(); } catch { /* ya cerrada */ }
    }
  }
  return `error tras 3 intentos: ${ultimoError}`;
}
