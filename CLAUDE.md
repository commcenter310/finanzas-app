# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server (http://localhost:5173)
npm run build     # Production build → dist/
npm run lint      # ESLint check
npm run preview   # Preview production build locally
```

No test suite exists. Verify changes with `npm run build` before committing.

## Architecture

**Stack:** React 19 + Vite 8 + Tailwind 3 + Supabase (auth + DB) + Recharts. Deployed on Vercel.

### Two separate apps in one repo

1. **Frontend SPA** (`src/`) — React app, all routes protected by Supabase auth.
2. **WhatsApp webhook** (`api/webhook.js`) — Vercel serverless function. Receives Meta webhook POSTs, parses text messages, calls Groq LLM to categorize spending, then writes transactions to Supabase using the service role key (`api/lib/supabase-admin.js`). The frontend uses the anon key (`src/lib/supabase.js`).

`vercel.json` rewrites all non-`/api/` paths to `index.html` for SPA routing.

### Global state: two contexts

- **`AuthContext`** — Supabase session + user profile (reglas 50/30/20, umbral_hormiga, etc.). Wraps entire app.
- **`MesContext`** — Active month/year (`mes`, `anio`) used as the primary filter across every page. Wraps only authenticated routes. All hooks consume `useMes()` to scope their queries.

### Data fetching pattern

Every data hook uses `useSupabaseQuery(queryFn, deps)` — a thin wrapper that re-runs `queryFn` whenever `deps` change, returning `{ data, loading, error, refetch }`. Hooks call `refetch()` after mutations instead of updating local state.

### Income / balance logic (important)

Income has **two distinct concepts** so a payday late in a month can fund the next:
- **When the money arrived** (`fecha_recepcion`) — the **Ingresos page** (`useIngresos`) filters by this date range, so you always find an income in the month you received it.
- **Which month it applies to** (`mes`/`anio`) — the **Dashboard** (`useDashboard`) filters income by these fields. A nómina received May 30 can be marked `mes=6` so it counts toward June's balance. The Ingresos form auto-suggests next month when `fecha_recepcion` day ≥ 25, and the `MesPicker` lets you override.

- **`transacciones`** — filtered by `fecha` date range.
- **`gastos_fijos`** — filtered by `mes`/`anio` fields.
- **`porAsignar`** in `useDashboard` = `saldoArrastrado + totalIngresos − totalGastos`, where `saldoArrastrado` is the positive remainder from the previous month. Returns `null` (not 0) when there are no ingresos and no previous-month data, so the UI can show "Sin ingresos aún" instead of a misleading negative number.
- **`ingresoEsperado` / `proyeccion`** in `useDashboard` — if the user configured nóminas, the Dashboard compares registered vs expected income (`calcNomina`) and projects the end-of-month balance by extrapolating variable spending at the current pace.

### Data fetching cache

`useSupabaseQuery(queryFn, deps, cacheKey?)` accepts an optional `cacheKey`. When given, it uses a module-level stale-while-revalidate cache that survives unmount: navigating away and back paints cached data instantly and revalidates in the background (no skeleton). The `cacheKey` **must** include the same variables as `deps` (e.g. `dash:tx:${uid}:${mes}:${anio}`). Hooks without a `cacheKey` behave as before (no cache). Adopted in `useDashboard`, `useTransacciones`, `useIngresos`.

### Classification system

All spending is tagged `necesidad | deseo | ahorro` — drives the 50/30/20 rule display in Dashboard. Color tokens are `--necesidad`, `--deseo`, `--ahorro` in CSS.

`gastosHormiga` in `useDashboard` only counts transactions classified as `deseo` below the `umbral_hormiga` threshold — a cheap medicine (necesidad) is not an "ant expense", a coffee (deseo) is.

### Créditos ↔ Deudas integration

`useDeudas` returns a **unified list** of manual debts (`deudas` table) + credit cards from `creditos` that have `saldo_utilizado > 0`. Credit cards are mapped to the same "debt shape" with a synthetic ID `credito_${id}` and a `tipo: 'credito'` flag the UI uses to branch.

- `abonarCredito(creditoId, monto)` reduces `creditos.saldo_utilizado` AND inserts a row into `pagos_credito` (in parallel via `Promise.all`).
- The credit card payment history reuses the `abonos_deuda` field name, mapped from `pagos_credito`, so the UI renders both with one code path.
- `pagos_credito` is the credit-card mirror of `abonos_deuda` (manual debts).

### Design tokens

`src/finni-tokens.css` defines all CSS custom properties (colors, surfaces, shadows). Tailwind is configured to use these tokens. Use `var(--token-name)` in inline styles; use Tailwind utility classes for spacing/layout.

### WhatsApp bot flow

`api/lib/whatsapp.js` → `processMessage()`:
1. Looks up user by phone number from `profiles.telefono`.
2. Maintains conversational state in `whatsapp_estado` table (upsert per phone).
3. Calls Groq (`api/lib/groq.js`) to extract amount + category from free-text.
4. Writes a row to `transacciones` with `origen = 'whatsapp'`.

### Key files

| File | Purpose |
|---|---|
| `src/hooks/useDashboard.js` | Central calculations: porAsignar, saldoAnterior, 50/30/20, categorías en riesgo, gastos hormiga (deseo only) |
| `src/hooks/useIngresos.js` | Income CRUD; filters by `fecha_recepcion` range |
| `src/hooks/useGastosFijos.js` | Fixed expenses; auto-copies `es_recurrente=true` rows when navigating to an empty month |
| `src/hooks/useDeudas.js` | Unifies manual debts + credit cards with balance into one list; `abonarCredito` writes to `pagos_credito` |
| `src/utils/constantes.js` | `formatMXN`, `MESES`, `CLASIFICACIONES`, default categories/payment methods |
| `supabase-schema.sql` | Full DB schema — reference before adding tables or columns. Note `pagos_credito` (credit-card payment history) and `abonos_deuda` (manual debt payments) |

### Making code changes

When editing very large files (>100 KB, e.g. anything embedding base64 data), avoid the Read/Edit tools — use a small Node.js `.mjs` script to do string replacements, then delete the script. The `$` character in `String.prototype.replace()` replacement strings is special; pass a function `() => newStr` instead of the string directly to avoid accidental substitution.
