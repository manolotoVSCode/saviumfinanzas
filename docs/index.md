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
Single-user app: no user management, sample data, onboarding tour or terms page (removed 2026-09-14). SIN ASIGNAR category is locked.

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
- [Investments Module](finance/investments-module.md) — Editable investment types catalog, separate inversiones table, valuations & payouts
