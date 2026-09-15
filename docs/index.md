# Decisiones de negocio y de UI


## Core
Number format: 1,234.56 (comma for thousands, dot for decimals).
No success toasts — display error notifications only.
'Salud Financiera' module & reimbursement summary card are disabled. Do not re-add.
'Compra Venta Inmuebles' category is excluded from dashboard and financial calculations.
Filter dates by local components (year/month), not ISO UTC, to prevent timezone bugs.
Supabase keep-alive daily cron 'keepalive-edge-ping' via pg_net prevents project pause.
Dark mode disabled — user rejected it. Do not re-add.
Desktop: sidebar nav. Mobile: bottom bar nav.
All currency conversions use user's divisa_preferida (from profile), never hardcoded MXN.
Single-user app: no user management, sample data, onboarding tour, terms, "about" or language selector (removed 2026-09-14; Spanish only). SIN ASIGNAR category is locked.
No budgets: the user explicitly does not want budgeting features. CxP covers upcoming large expenses.
Data layer: useFinanceDataSupabase is backed by TanStack Query (one shared cache per session, keys prefixed by user id, 5-min staleTime). Pure calculations live in src/lib/finance and are covered by vitest (`npm test`).
App version shown in the sidebar = first entry of src/components/Changelog.tsx; add a changelog entry (and bump) with every push that changes behavior.
PWA via vite-plugin-pwa: precache app shell only, autoUpdate, disabled in dev.

## Memories
- **Sold Property Logic** — Sets balance to 0, disables form, hides from reports
- **Real Estate Exclusion** — Explanatory notes and logic for hiding 'Compra Venta Inmuebles'
- **Investment Balance** — saldoActual = saldoInicial + totalTransacciones for all types (ignores valorMercado)
- **Automatic Transactions** — Inverts transaction type on transfer (expense creates income) and shows summary
- **Reimbursement Logic** — Reimbursements are incomes > 0 in expense categories, subtracted to show net expense
- **Number Formatting** — Central utilities logic in src/lib/formatters.ts
- **Bank Importer Logic** — Excel/ISO/multilingual dates, blocking preview dialog, auto-closes
- **Payment Tracking** — Groups annual payments by concept, predicts next payment by adding 1 year
- **Supabase Keep-Alive** — Daily edge function ping via pg_net to prevent project suspension
- **Investment Visibility** — Hides accounts with zero balance from the Investments tab
- **Subscription Detection** — Hardcoded pattern list (no AI), dynamic frequency calculation
- **Income Comparison Report** — Excludes current month, excludes Real Estate sales
- **Security & Auth Config** — magic links, JWT for Edge Functions, 10MB limits
- **Transactions Filter Logic** — Month filter dynamic, uses local dates
- **Investments Chart Data** — Pie chart uses 'Saldo Actual' converted to preferred currency
- **Classification Rules** — Auto-classification rules engine with exact/contains matching and drill-down UI
- **Preferred Currency** — useAppConfig reads divisa_preferida, all calculations convert to it
- **Net Worth History** — Informes › Patrimonio Neto reconstructs monthly activos/pasivos/patrimonio from saldoInicial + transactions (src/lib/finance/netWorthHistory.ts); same account classification as the dashboard, current FX rates. Not shown on the dashboard by user request. Table financial_health_history is unused.
- [Investments Module](finance/investments-module.md) — Editable investment types catalog, separate inversiones table, valuations & payouts
