// Alerta de emergencia silenciosa: la llama la app iOS del titular (triple toque en «Patrimonio neto»).
// Avisa a sus lectores con una notificación urgente (APNs) y un correo (SMTP 465). La app del titular no
// muestra nada; esta función siempre responde rápido y sin detalles.
// Los textos sensibles (mensaje e instrucciones para comprobar la alerta) son secretos, no código:
// el repositorio es público.
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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

  // Idempotente: los reintentos de la app llevan el mismo id y no vuelven a avisar.
  const { data: alerta, error: errAlta } = await admin.from("alertas_emergencia")
    .insert({ user_id: user.id, id_cliente: p.id, latitud: lat, longitud: lon, precision_m: precision })
    .select("id").single();
  if (errAlta) return json({ ok: true, repetida: errAlta.code === "23505" });

  const { data: lectores } = await admin.from("lectores").select("lector_id").eq("propietario_id", user.id);
  const ids = (lectores ?? []).map((l) => l.lector_id as string);
  if (ids.length === 0) return json({ ok: true });

  const { data: perfil } = await admin.from("profiles").select("nombre").eq("user_id", user.id).maybeSingle();
  const nombre = capitalizar(perfil?.nombre ?? "") || "Savium";
  const cuando = new Date(p.momento ?? Date.now());
  const hora = cuando.toLocaleString("es-MX", { timeZone: "America/Mexico_City", dateStyle: "medium", timeStyle: "short" });
  const mensaje = env("ALERTA_MENSAJE") || "Necesito ayuda.";
  const mapa = lat !== null && lon !== null ? `https://maps.google.com/?q=${lat},${lon}` : null;

  // Notificaciones y correo a la vez; un fallo en uno no frena al otro.
  const [n, c] = await Promise.allSettled([
    notificar(admin, ids, nombre, mensaje, hora, lat, lon),
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

// MARK: APNs

async function notificar(admin: ReturnType<typeof createClient>, ids: string[], nombre: string, mensaje: string,
                         hora: string, lat: number | null, lon: number | null): Promise<number> {
  const { data: dispositivos } = await admin.from("dispositivos").select("token, entorno").in("user_id", ids);
  if (!dispositivos?.length || !env("APNS_CLAVE_P8")) return 0;
  const jwt = await jwtAPNs();
  const cuerpo = JSON.stringify({
    aps: {
      alert: { title: `Alerta de ${nombre}`, body: `${mensaje} (${hora})` },
      sound: "default",
      "interruption-level": "time-sensitive",
    },
    ...(lat !== null && lon !== null ? { latitud: lat, longitud: lon } : {}),
  });
  let enviadas = 0;
  await Promise.all(dispositivos.map(async (d) => {
    const host = d.entorno === "produccion" ? "api.push.apple.com" : "api.sandbox.push.apple.com";
    const r = await fetch(`https://${host}/3/device/${d.token}`, {
      method: "POST",
      headers: {
        authorization: `bearer ${jwt}`,
        "apns-topic": "com.manoloto.savium",
        "apns-push-type": "alert",
        "apns-priority": "10",
      },
      body: cuerpo,
    }).catch(() => null);
    if (r?.ok) enviadas++;
    else if (r && (r.status === 410 || r.status === 400)) {
      const motivo = await r.json().catch(() => ({}));
      if (r.status === 410 || motivo?.reason === "BadDeviceToken") await admin.from("dispositivos").delete().eq("token", d.token);
      console.error("APNs", r.status, motivo?.reason);
    } else console.error("APNs", r?.status);
  }));
  return enviadas;
}

/** JWT ES256 firmado con la clave .p8 de APNs (válido 1 h; se crea en cada alerta). */
async function jwtAPNs(): Promise<string> {
  const b64url = (b: ArrayBuffer | Uint8Array) =>
    btoa(String.fromCharCode(...new Uint8Array(b instanceof Uint8Array ? b : new Uint8Array(b))))
      .replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const texto = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const pem = env("APNS_CLAVE_P8").replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const clave = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const datos = `${texto({ alg: "ES256", kid: env("APNS_KEY_ID") })}.${texto({ iss: env("APNS_TEAM_ID"), iat: Math.floor(Date.now() / 1000) })}`;
  const firma = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, clave, new TextEncoder().encode(datos));
  return `${datos}.${b64url(firma)}`;
}

// MARK: Correo

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
  const instrucciones = env("ALERTA_INSTRUCCIONES");
  const cuerpo = [`Alerta de ${nombre} – ${hora}`, "", `«${mensaje}»`, "", ubicacion, "", instrucciones, "",
    "No respondas a este correo."].join("\n");
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
    return "enviado";
  } catch (e) {
    console.error("SMTP", String(e));
    return `error: ${String(e).slice(0, 200)}`;
  } finally {
    try { await cliente.close(); } catch { /* ya cerrada */ }
  }
}
