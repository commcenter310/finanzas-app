-- Rendimiento y seguridad (noviembre 2026). Idempotente; va en una sola
-- transacción: si algo falla, no se aplica nada. No modifica datos.
-- Responde a los avisos de Supabase (Database → Advisors).

BEGIN;

-- ── 1. Índices ───────────────────────────────────────────────────────────────
-- Las tablas solo tenían su llave primaria: cada consulta de la app
-- (por usuario + mes/fecha) recorría la tabla completa.
CREATE INDEX IF NOT EXISTS transacciones_user_fecha_idx   ON public.transacciones (user_id, fecha DESC);
CREATE INDEX IF NOT EXISTS transacciones_categoria_idx    ON public.transacciones (categoria_id);
CREATE INDEX IF NOT EXISTS transacciones_metodo_pago_idx  ON public.transacciones (metodo_pago_id);
CREATE INDEX IF NOT EXISTS transacciones_ahorro_idx       ON public.transacciones (ahorro_id)       WHERE ahorro_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS transacciones_abono_deuda_idx  ON public.transacciones (abono_deuda_id)  WHERE abono_deuda_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS transacciones_pago_credito_idx ON public.transacciones (pago_credito_id) WHERE pago_credito_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ingresos_user_mes_idx          ON public.ingresos (user_id, anio, mes);
CREATE INDEX IF NOT EXISTS ingresos_user_fecha_idx        ON public.ingresos (user_id, fecha_recepcion);
CREATE INDEX IF NOT EXISTS gastos_fijos_user_mes_idx      ON public.gastos_fijos (user_id, anio, mes);
CREATE INDEX IF NOT EXISTS gastos_fijos_categoria_idx     ON public.gastos_fijos (categoria_id);
CREATE INDEX IF NOT EXISTS gastos_fijos_metodo_pago_idx   ON public.gastos_fijos (metodo_pago_id);
CREATE INDEX IF NOT EXISTS gastos_fijos_transaccion_idx   ON public.gastos_fijos (transaccion_id)   WHERE transaccion_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS presupuestos_categoria_idx     ON public.presupuestos (categoria_id);
CREATE INDEX IF NOT EXISTS apartados_user_mes_idx         ON public.apartados (user_id, anio, mes);
CREATE INDEX IF NOT EXISTS deudas_user_idx                ON public.deudas (user_id);
CREATE INDEX IF NOT EXISTS abonos_deuda_deuda_idx         ON public.abonos_deuda (deuda_id);
CREATE INDEX IF NOT EXISTS creditos_user_idx              ON public.creditos (user_id);
CREATE INDEX IF NOT EXISTS pagos_credito_credito_idx      ON public.pagos_credito (credito_id);
CREATE INDEX IF NOT EXISTS pagos_credito_user_idx         ON public.pagos_credito (user_id);
CREATE INDEX IF NOT EXISTS ahorros_user_idx               ON public.ahorros (user_id);
CREATE INDEX IF NOT EXISTS nominas_user_idx               ON public.nominas (user_id);
CREATE INDEX IF NOT EXISTS metodos_pago_credito_idx       ON public.metodos_pago (credito_id)       WHERE credito_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS whatsapp_log_transaccion_idx   ON public.whatsapp_log (transaccion_id)   WHERE transaccion_id IS NOT NULL;

-- ── 2. Políticas RLS ─────────────────────────────────────────────────────────
-- auth.uid() se evaluaba una vez POR FILA; con (SELECT auth.uid()) Postgres lo
-- calcula una sola vez por consulta. La regla es la misma: cada quien ve solo
-- lo suyo. Además se limitan a usuarios con sesión (antes aplicaban a todos
-- los roles, aunque sin sesión no devolvían nada).
ALTER POLICY "own" ON public.profiles TO authenticated USING ((SELECT auth.uid()) = id);
ALTER POLICY "own" ON public.categorias TO authenticated USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "own" ON public.metodos_pago TO authenticated USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "own" ON public.creditos TO authenticated USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "own" ON public.ingresos TO authenticated USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "own" ON public.gastos_fijos TO authenticated USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "own" ON public.presupuestos TO authenticated USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "own" ON public.transacciones TO authenticated USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "own" ON public.deudas TO authenticated USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "own" ON public.ahorros TO authenticated USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "own" ON public.pagos_credito TO authenticated USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "own" ON public.nominas TO authenticated USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "own" ON public.apartados TO authenticated USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "own" ON public.abonos_deuda TO authenticated
  USING (deuda_id IN (SELECT id FROM public.deudas WHERE user_id = (SELECT auth.uid())));
ALTER POLICY "own" ON public.whatsapp_log TO authenticated
  USING (telefono IN (SELECT telefono FROM public.profiles WHERE id = (SELECT auth.uid())));

-- ── 3. Funciones de alta de usuario ──────────────────────────────────────────
-- Son disparadores (no se llaman desde la app): se fija su search_path y se
-- quita el permiso de invocarlas por la API.
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.crear_datos_default() SET search_path = public;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crear_datos_default() FROM PUBLIC, anon, authenticated;

COMMIT;
