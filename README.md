# Savium · Finanzas personales

Aplicación web de finanzas personales: cuentas, transacciones, categorías, inversiones, criptomonedas, pendientes (CxP/CxC), suscripciones, reglas de clasificación e importación de extractos bancarios.

## Stack

- [Vite](https://vitejs.dev) + [React 18](https://react.dev) + TypeScript
- [shadcn/ui](https://ui.shadcn.com) + [Tailwind CSS](https://tailwindcss.com)
- [Supabase](https://supabase.com) (Postgres, Auth, Edge Functions)
- [TanStack Query](https://tanstack.com/query) para datos remotos
- [Capacitor](https://capacitorjs.com) para empaquetar como app iOS/Android

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

El cliente de Supabase está en `src/integrations/supabase/client.ts`. Las variables de `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`) usan la clave *publishable* (anon), que es pública por diseño; la seguridad se apoya en las políticas RLS de la base de datos.

## Backend (Supabase)

- `supabase/migrations/` — esquema de la base de datos y políticas RLS.
- `supabase/functions/` — Edge Functions (Deno):
  - `admin-create-user` — alta de usuarios desde el panel de administración.
  - `analyze-subscriptions` — detección de suscripciones recurrentes.
  - `crypto-prices` — precios de criptomonedas.
  - `send-welcome-email` — email de bienvenida (requiere `RESEND_API_KEY`).
  - `keepalive` — ping diario para evitar que el proyecto se pause.

Los secretos de las funciones (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, etc.) se configuran en el dashboard de Supabase.

## Despliegue

Cada push a `main` ejecuta `.github/workflows/static.yml`, que compila el proyecto y lo publica en GitHub Pages. La app usa `HashRouter`, por lo que no necesita reglas de reescritura en el servidor.

## App móvil

```sh
npm run build
npx cap sync
npx cap open ios      # o android
```

## Notas de diseño

En `.lovable/memory/` se conservan las decisiones de negocio y de UI del proyecto (formato de números, lógica de reembolsos, reglas de visibilidad de inversiones, etc.). Consúltalas antes de modificar cálculos financieros.
