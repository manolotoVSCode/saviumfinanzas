// Repite la notificación de las alertas que el lector aún no ha visto: cada minuto, hasta 10 veces, durante
// 15 minutos. La llama pg_cron (sin usuario). No necesita autenticación: solo reenvía lo que toque según la base
// (reservar_repeticiones_alerta es atómica y limita a una repetición por minuto), así que llamarla de más no
// produce avisos de más.
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { horaMexico, notificar } from "../_shared/apns.ts";

const env = (k: string) => Deno.env.get(k) ?? "";

Deno.serve(async () => {
  const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const { data: alertas, error } = await admin.rpc("reservar_repeticiones_alerta");
  if (error) {
    console.error("reservar", error.message);
    return new Response("error", { status: 500 });
  }
  for (const a of alertas ?? []) {
    const { data: lectores } = await admin.from("lectores").select("lector_id").eq("propietario_id", a.user_id);
    const ids = (lectores ?? []).map((l) => l.lector_id as string);
    if (ids.length === 0) continue;
    const hora = horaMexico(new Date(a.creada));
    await notificar(admin, ids, {
      alertaId: a.id,
      titulo: `Alerta de ${a.nombre ?? "Savium"} (aviso ${a.repeticiones + 1} de 11)`,
      cuerpo: `${a.mensaje ?? "Necesito ayuda."} (${hora})`,
      latitud: a.latitud,
      longitud: a.longitud,
    });
  }
  return new Response("ok");
});
