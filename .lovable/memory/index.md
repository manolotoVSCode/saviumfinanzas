# Project Memory

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
Admin email is manoloto@gmail.com — protected from deletion. SIN ASIGNAR category is locked.

## Memories
- [Sold Property Logic](mem://finance/bienes-raices-sold-property-handling) — Sets balance to 0, disables form, hides from reports
- [Real Estate Exclusion](mem://finance/compra-venta-inmuebles-exclusion) — Explanatory notes and logic for hiding 'Compra Venta Inmuebles'
- [Investment Balance](mem://finance/investment-balance-calculation) — saldoActual = saldoInicial + totalTransacciones for all types (ignores valorMercado)
- [Automatic Transactions](mem://finance/automatic-transaction-logic) — Inverts transaction type on transfer (expense creates income) and shows summary
- [Reimbursement Logic](mem://finance/reimbursement-logic) — Reimbursements are incomes > 0 in expense categories, subtracted to show net expense
- [Number Formatting](mem://ui/number-formatting) — Central utilities logic in src/lib/formatters.ts
- [Bank Importer Logic](mem://finance/bank-statement-importer-logic) — Excel/ISO/multilingual dates, blocking preview dialog, auto-closes
- [Payment Tracking](mem://finance/payment-tracking-expansion) — Groups annual payments by concept, predicts next payment by adding 1 year
- [Supabase Keep-Alive](mem://infra/supabase-keep-alive) — Daily edge function ping via pg_net to prevent project suspension
- [Investment Visibility](mem://finance/investment-visibility-rules) — Hides accounts with zero balance from the Investments tab
- [Subscription Detection](mem://finance/subscription-detection-logic) — Hardcoded pattern list (no AI), dynamic frequency calculation
- [Income Comparison Report](mem://features/income-comparison-report) — Excludes current month, excludes Real Estate sales
- [Security & Auth Config](mem://auth/security-config) — RBAC via user_roles, magic links, JWT for Edge Functions, 10MB limits, is_sample flag
- [Transactions Filter Logic](mem://ui/transactions-filter-logic) — Month filter dynamic, uses local dates
- [Investments Chart Data](mem://ui/investments-chart-data) — Pie chart uses 'Saldo Actual' converted to preferred currency
- [Classification Rules](mem://features/classification-rules) — Auto-classification rules engine with exact/contains matching and drill-down UI
- [Preferred Currency](mem://features/preferred-currency) — useAppConfig reads divisa_preferida, all calculations convert to it
