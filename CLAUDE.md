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

- **`ingresos`** — filtered by `fecha_recepcion` date range (not `mes`/`anio`). When inserting, `mes`/`anio` are derived from `fecha_recepcion` for backward compatibility.
- **`transacciones`** — filtered by `fecha` date range (same pattern).
- **`gastos_fijos`** — filtered by `mes`/`anio` fields.
- **`porAsignar`** in `useDashboard` = `saldoArrastrado + totalIngresos − totalGastos`, where `saldoArrastrado` is the positive remainder from the previous month. Returns `null` (not 0) when there are no ingresos and no previous-month data, so the UI can show "Sin ingresos aún" instead of a misleading negative number.

### Classification system

All spending is tagged `necesidad | deseo | ahorro` — drives the 50/30/20 rule display in Dashboard. Color tokens are `--necesidad`, `--deseo`, `--ahorro` in CSS.

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
| `src/hooks/useDashboard.js` | Central calculations: porAsignar, saldoAnterior, 50/30/20, categorías en riesgo, gastos hormiga |
| `src/hooks/useIngresos.js` | Income CRUD; filters by `fecha_recepcion` range |
| `src/hooks/useGastosFijos.js` | Fixed expenses; auto-copies `es_recurrente=true` rows when navigating to an empty month |
| `src/utils/constantes.js` | `formatMXN`, `MESES`, `CLASIFICACIONES`, default categories/payment methods |
| `supabase-schema.sql` | Full DB schema — reference before adding tables or columns |

### Making code changes

When editing files >100 KB (e.g. `HuskyMascot.jsx` which contains a base64 sprite), avoid the Read/Edit tools — use a small Node.js `.mjs` script to do string replacements, then delete the script. The `$` character in `String.prototype.replace()` replacement strings is special; pass a function `() => newStr` instead of the string directly to avoid accidental substitution.
