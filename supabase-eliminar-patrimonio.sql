-- Elimina las tablas de la antigua página Patrimonio (activos y
-- patrimonio_snapshots). La página se quitó de la app en el commit 1cf40e1 y
-- ningún código las usa. Ejecutar en Supabase > SQL Editor, POR PASOS.

-- ── PASO 1: revisar si hay datos que quieras conservar ──────────────────────
-- Ejecuta solo este bloque. Si ves filas que te interesan, cópialas o
-- descárgalas (botón "Export" del SQL Editor) antes del paso 2.

SELECT 'activos' AS tabla, count(*) AS filas FROM public.activos
UNION ALL
SELECT 'patrimonio_snapshots', count(*) FROM public.patrimonio_snapshots;

SELECT nombre, tipo, monto, activo, created_at
FROM public.activos
ORDER BY created_at;

SELECT anio, mes, total_activos, total_deudas, patrimonio_neto
FROM public.patrimonio_snapshots
ORDER BY anio, mes;

-- ── PASO 2: borrar las tablas (no se puede deshacer) ────────────────────────
-- Sin CASCADE a propósito: si algo más dependiera de ellas, Postgres se
-- niega y no borra nada.

BEGIN;
DROP TABLE IF EXISTS public.patrimonio_snapshots;
DROP TABLE IF EXISTS public.activos;
COMMIT;
