# Savium · Finanzas personales

Aplicación web de finanzas personales de un solo usuario: cuentas, transacciones, categorías, inversiones, criptomonedas, pendientes (CxP/CxC), suscripciones, reglas de clasificación e importación de extractos bancarios.

## Stack

- [Vite](https://vitejs.dev) + [React 18](https://react.dev) + TypeScript
- [shadcn/ui](https://ui.shadcn.com) + [Tailwind CSS](https://tailwindcss.com)
- [Supabase](https://supabase.com) (Postgres, Auth, Edge Functions)
- [TanStack Query](https://tanstack.com/query) para datos remotos

## Desarrollo local

Requisitos: Node.js 20+ y npm.

```sh
npm install
npm run dev
```

La app arranca en `http://localhost:8080`.

Otros scripts:

| Comando           | Descripción                          |
| ----------------- | ------------------------------------ |
| `npm run build`   | Build de producción en `dist/`       |
| `npm run preview` | Sirve el build de producción         |
| `npm run lint`    | ESLint sobre todo el proyecto        |

## Configuración

El cliente de Supabase (`src/integrations/supabase/client.ts`) lee `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` de `.env`. Ese archivo se versiona a propósito: la clave *publishable* (anon) es pública por diseño y el build de GitHub Pages la necesita; la seguridad se apoya en las políticas RLS de la base de datos. Para sobrescribir valores en local usa `.env.local` (ignorado por git).

## Backend (Supabase)

- `supabase/migrations/` — esquema de la base de datos y políticas RLS.
- `supabase/functions/` — Edge Functions (Deno):
  - `analyze-subscriptions` — detección de suscripciones recurrentes.
  - `crypto-prices` — precios de criptomonedas.
  - `keepalive` — ping diario para evitar que el proyecto se pause.

Los secretos de las funciones se configuran en el dashboard de Supabase.

## Despliegue

Cada push a `main` ejecuta `.github/workflows/static.yml`, que compila el proyecto y lo publica en GitHub Pages. La app usa `HashRouter`, por lo que no necesita reglas de reescritura en el servidor.

## Notas de diseño

En `docs/` se conservan las decisiones de negocio y de UI del proyecto (formato de números, lógica de reembolsos, reglas de visibilidad de inversiones, etc.). Consúltalas antes de modificar cálculos financieros.
