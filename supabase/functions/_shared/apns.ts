// Notificaciones de alerta por APNs (compartido por «alerta» y «alerta-repetir»).
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.49.1";

const env = (k: string) => Deno.env.get(k) ?? "";

export interface Aviso {
  alertaId: string;
  titulo: string;
  cuerpo: string;
  latitud: number | null;
  longitud: number | null;
}

/** Envía el aviso a todos los iPhone registrados de esos usuarios. Devuelve cuántos lo aceptó Apple. */
export async function notificar(admin: SupabaseClient, ids: string[], aviso: Aviso): Promise<number> {
  const { data: dispositivos } = await admin.from("dispositivos").select("token, entorno").in("user_id", ids);
  if (!dispositivos?.length || !env("APNS_CLAVE_P8")) return 0;
  const jwt = await jwtAPNs();
  const cuerpo = JSON.stringify({
    aps: {
      alert: { title: aviso.titulo, body: aviso.cuerpo },
      // Sonido de alarma propio (va en la app); si faltara, iOS usa el normal.
      sound: "alerta.wav",
      "interruption-level": "time-sensitive",
    },
    alerta: aviso.alertaId,
    ...(aviso.latitud !== null && aviso.longitud !== null ? { latitud: aviso.latitud, longitud: aviso.longitud } : {}),
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
        // Las repeticiones sustituyen a la anterior en la pantalla en vez de amontonarse.
        "apns-collapse-id": aviso.alertaId,
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

/** JWT ES256 firmado con la clave .p8 de APNs (se crea en cada envío). */
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

/** Hora de la alerta en México, p. ej. «12 oct 2026, 12:29 p.m.». */
export function horaMexico(fecha: Date): string {
  return fecha.toLocaleString("es-MX", { timeZone: "America/Mexico_City", dateStyle: "medium", timeStyle: "short" });
}
