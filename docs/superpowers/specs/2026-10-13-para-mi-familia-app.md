# «Para mi familia» en la app iOS (lectores)

Anotado con el usuario el 2026-10-13. La parte web (mover la sección a Configuración, sin portada) ya está
hecha en la web 9.2. Esto es lo que queda para la app.

## Qué quiere el usuario

- Su esposa (lectora, solo lectura) tiene un botón **«Para mi familia»**:
  - al final de **Inicio**,
  - al final de **Patrimonio**,
  - y en **Ajustes**.
- Al pulsarlo debe **poner la fecha de fallecimiento** del titular como requisito (para no abrirlo sin motivo).
- Entonces:
  - recibe un **PDF por correo** con toda la información de «Para mi familia»,
  - y el mismo PDF **se descarga/abre en su iPhone** (iOS no permite descargas silenciosas: se abre la vista del
    PDF con Compartir / Guardar en Archivos).
- El titular no ve este botón (no es lector).

## Propuesta técnica

- **Sin acceso directo del lector a `informacion_familia`**: hoy su RLS es solo del titular y se queda así. El
  lector obtiene el contenido solo a través de una Edge Function `familia-pdf`, así cada apertura pasa por la
  fecha y queda registrada.
- `familia-pdf` (verify_jwt): comprueba que quien llama es lector de algún titular, exige `fecha_fallecimiento`
  (no futura), registra la apertura (tabla nueva `aperturas_familia`: lector, titular, fecha indicada, momento),
  genera el PDF y lo envía por correo (mismo SMTP que la alerta, con adjunto) y lo devuelve a la app.
- **Contenido del PDF**: lo guardado (carta, contactos, seguros, documentos y accesos, notas por cuenta y
  decisiones por pago) y lo que la web calcula en vivo (patrimonio por grupos al cierre del mes, criptos,
  pagos recurrentes con su decisión). El cálculo vivo está en `src/lib/finance/familiaResumen.ts`: hay que
  portarlo al servidor o al PDF (a decidir al implementar).
- Generación del PDF: en el servidor (p. ej. `pdf-lib` por npm en Deno) para que correo y app tengan el mismo.

## Por decidir con el usuario

1. ¿Avisar al titular (correo a su Gmail) cada vez que alguien lo abre? Recomendado: si fue sin motivo, lo sabe.
2. ¿Pedir la fecha cada vez, o solo la primera (y después reabrir el último PDF guardado en el iPhone)?
3. Destinatarios del correo: solo el lector que lo abre, o también los contactos de emergencia.
