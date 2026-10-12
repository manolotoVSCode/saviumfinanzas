# Alerta de emergencia silenciosa (app iOS)

Decidido con el usuario el 2026-10-12.

## Qué hace

El titular toca tres veces seguidas «Patrimonio neto» en Inicio. Sin que su app muestre nada (ni vibración,
ni aviso, ni historial), se avisa a sus lectores (hoy, su esposa):

- **Notificación urgente** (time-sensitive) en el iPhone del lector, con hora y ubicación; al tocarla abre Mapas.
- **Correo** al lector con el mensaje, la hora, la ubicación (enlace a Google Maps y precisión) e
  instrucciones para comprobar si la alerta es real.

## Decisiones

- **Nada en la app del titular**: ni botón de «falsa alarma» ni historial. Una falsa alarma se aclara por
  teléfono con una pregunta pactada fuera de la app. El texto del correo con esas instrucciones es un
  secreto de Supabase (`ALERTA_INSTRUCCIONES`), no está en el repositorio (que es público).
- **Envía el servidor** (Edge Function `alerta`), no el iPhone: no queda nada en los correos enviados del titular.
- **Correo** por SMTP con TLS directo (puerto 465; Supabase bloquea 25 y 587) desde una cuenta que no está
  en el iPhone del titular. Primero se prueba con iCloud; si no acepta 465, Gmail con contraseña de aplicación.
  Solo cambian los secretos.
- **Ubicación** «al usar la app», pedida una vez al titular que tiene lectores. Si no hay permiso o tarda
  más de 5 s, la alerta sale sin ubicación.
- **Sin conexión**: la alerta queda guardada en el iPhone y se reintenta al volver a la app.
- **Notificaciones**: solo se piden al lector (el titular nunca ve ese permiso). Los tokens se guardan por
  usuario con su entorno APNs (desarrollo o producción).
- **Apple**: la función se explica solo en las notas privadas para el revisor (directriz 2.3.1).
- **Fuera de alcance**: seguir enviando la ubicación tras la alerta (exige ubicación en segundo plano).

## Piezas

- Migración `dispositivos` (token APNs por usuario, RLS propia) y `alertas_emergencia` (registro de envíos,
  sin acceso desde la app; solo la Edge Function con service role).
- Edge Function `alerta` (verify_jwt): identifica al titular, busca sus lectores, sus tokens y correos,
  registra la alerta, envía APNs (JWT ES256 con la clave .p8) y el correo.
- App: gesto triple en «Patrimonio neto», `AlertaEmergencia` (ubicación + envío + reintento),
  registro de notificaciones del lector, al tocar la notificación abre Mapas.

## Secretos (los pone el usuario en Supabase → Edge Functions → Secrets)

`APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_CLAVE_P8`, `ALERTA_SMTP_HOST`, `ALERTA_SMTP_PUERTO`,
`ALERTA_SMTP_USUARIO`, `ALERTA_SMTP_CLAVE`, `ALERTA_REMITENTE`, `ALERTA_MENSAJE`, `ALERTA_INSTRUCCIONES`.
