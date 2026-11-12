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

-- ── 4. Fecha local en pagos de deuda y tarjeta ───────────────────────────────
-- p_fecha: fecha LOCAL del pago que manda la app. El servidor corre en UTC:
-- con la fecha del servidor, un pago hecho en México después de las 5 pm
-- quedaba fechado al día siguiente. Se elimina la firma anterior (sin
-- p_fecha) para que PostgREST no vea dos funciones con el mismo nombre.
DROP FUNCTION IF EXISTS public.registrar_pago_deuda(INTEGER, NUMERIC, TEXT, UUID);
CREATE OR REPLACE FUNCTION public.registrar_pago_deuda(
  p_deuda_id INTEGER,
  p_monto NUMERIC,
  p_notas TEXT,
  p_operacion_id UUID,
  p_fecha DATE DEFAULT NULL
)
RETURNS TABLE (
  monto_aplicado NUMERIC,
  saldo_anterior NUMERIC,
  saldo_nuevo NUMERIC,
  recortado BOOLEAN,
  duplicado BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deuda public.deudas%ROWTYPE;
  v_abono_id INTEGER;
  v_solicitado NUMERIC(12,2);
  v_aplicado NUMERIC(12,2);
  v_nuevo NUMERIC(12,2);
  v_categoria_id INTEGER;
  v_monto_existente NUMERIC(12,2);
  v_saldo_existente NUMERIC(12,2);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'PAGO_NO_AUTORIZADO';
  END IF;
  IF p_operacion_id IS NULL THEN
    RAISE EXCEPTION 'PAGO_OPERACION_INVALIDA';
  END IF;

  SELECT a.monto, d.saldo_actual
    INTO v_monto_existente, v_saldo_existente
  FROM public.abonos_deuda a
  JOIN public.deudas d ON d.id = a.deuda_id
  WHERE a.operacion_id = p_operacion_id
    AND d.user_id = auth.uid();

  IF FOUND THEN
    RETURN QUERY SELECT v_monto_existente, NULL::NUMERIC, v_saldo_existente, false, true;
    RETURN;
  END IF;

  v_solicitado := ROUND(COALESCE(p_monto, 0), 2);
  IF v_solicitado <= 0 THEN
    RAISE EXCEPTION 'PAGO_MONTO_INVALIDO';
  END IF;

  SELECT * INTO v_deuda
  FROM public.deudas
  WHERE id = p_deuda_id
    AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAGO_NO_ENCONTRADO';
  END IF;
  IF COALESCE(v_deuda.saldo_actual, 0) <= 0 THEN
    RAISE EXCEPTION 'PAGO_SIN_SALDO';
  END IF;

  v_aplicado := LEAST(v_solicitado, v_deuda.saldo_actual);
  v_nuevo := GREATEST(0, v_deuda.saldo_actual - v_aplicado);

  INSERT INTO public.categorias (
    user_id, nombre, tipo_gasto, clasificacion, icono, activa
  ) VALUES (
    auth.uid(), 'Deudas', 'variable', 'necesidad', '💳', true
  )
  ON CONFLICT (user_id, nombre)
  DO UPDATE SET activa = true
  RETURNING id INTO v_categoria_id;

  INSERT INTO public.abonos_deuda (
    deuda_id, monto, fecha, notas, operacion_id
  ) VALUES (
    p_deuda_id, v_aplicado, COALESCE(p_fecha, CURRENT_DATE), NULLIF(p_notas, ''), p_operacion_id
  ) RETURNING id INTO v_abono_id;

  UPDATE public.deudas
  SET saldo_actual = v_nuevo,
      liquidada = (v_nuevo = 0)
  WHERE id = p_deuda_id;

  INSERT INTO public.transacciones (
    user_id, descripcion, monto, clasificacion, categoria_id, fecha, origen, abono_deuda_id
  ) VALUES (
    auth.uid(), 'Pago deuda: ' || v_deuda.nombre, v_aplicado,
    'necesidad', v_categoria_id, COALESCE(p_fecha, CURRENT_DATE), 'deuda', v_abono_id
  );

  RETURN QUERY SELECT
    v_aplicado,
    v_deuda.saldo_actual,
    v_nuevo,
    (v_aplicado < v_solicitado),
    false;
END;
$$;

-- p_fecha: fecha LOCAL del pago que manda la app. El servidor corre en UTC:
-- con la fecha del servidor, un pago hecho en México después de las 5 pm
-- quedaba fechado al día siguiente. Se elimina la firma anterior (sin
-- p_fecha) para que PostgREST no vea dos funciones con el mismo nombre.
DROP FUNCTION IF EXISTS public.registrar_pago_credito(INTEGER, NUMERIC, TEXT, UUID);
CREATE OR REPLACE FUNCTION public.registrar_pago_credito(
  p_credito_id INTEGER,
  p_monto NUMERIC,
  p_notas TEXT,
  p_operacion_id UUID,
  p_fecha DATE DEFAULT NULL
)
RETURNS TABLE (
  monto_aplicado NUMERIC,
  saldo_anterior NUMERIC,
  saldo_nuevo NUMERIC,
  recortado BOOLEAN,
  duplicado BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credito public.creditos%ROWTYPE;
  v_pago_id INTEGER;
  v_solicitado NUMERIC(12,2);
  v_aplicado NUMERIC(12,2);
  v_nuevo NUMERIC(12,2);
  v_categoria_id INTEGER;
  v_monto_existente NUMERIC(12,2);
  v_saldo_existente NUMERIC(12,2);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'PAGO_NO_AUTORIZADO';
  END IF;
  IF p_operacion_id IS NULL THEN
    RAISE EXCEPTION 'PAGO_OPERACION_INVALIDA';
  END IF;

  SELECT p.monto, c.saldo_utilizado
    INTO v_monto_existente, v_saldo_existente
  FROM public.pagos_credito p
  JOIN public.creditos c ON c.id = p.credito_id
  WHERE p.operacion_id = p_operacion_id
    AND c.user_id = auth.uid();

  IF FOUND THEN
    RETURN QUERY SELECT v_monto_existente, NULL::NUMERIC, v_saldo_existente, false, true;
    RETURN;
  END IF;

  v_solicitado := ROUND(COALESCE(p_monto, 0), 2);
  IF v_solicitado <= 0 THEN
    RAISE EXCEPTION 'PAGO_MONTO_INVALIDO';
  END IF;

  SELECT * INTO v_credito
  FROM public.creditos
  WHERE id = p_credito_id
    AND user_id = auth.uid()
    AND activo = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAGO_NO_ENCONTRADO';
  END IF;
  IF COALESCE(v_credito.saldo_utilizado, 0) <= 0 THEN
    RAISE EXCEPTION 'PAGO_SIN_SALDO';
  END IF;

  v_aplicado := LEAST(v_solicitado, v_credito.saldo_utilizado);
  v_nuevo := GREATEST(0, v_credito.saldo_utilizado - v_aplicado);

  INSERT INTO public.categorias (
    user_id, nombre, tipo_gasto, clasificacion, icono, activa
  ) VALUES (
    auth.uid(), 'Deudas', 'variable', 'necesidad', '💳', true
  )
  ON CONFLICT (user_id, nombre)
  DO UPDATE SET activa = true
  RETURNING id INTO v_categoria_id;

  INSERT INTO public.pagos_credito (
    credito_id, user_id, monto, fecha, notas, operacion_id
  ) VALUES (
    p_credito_id, auth.uid(), v_aplicado, COALESCE(p_fecha, CURRENT_DATE),
    NULLIF(p_notas, ''), p_operacion_id
  ) RETURNING id INTO v_pago_id;

  UPDATE public.creditos
  SET saldo_utilizado = v_nuevo
  WHERE id = p_credito_id;

  INSERT INTO public.transacciones (
    user_id, descripcion, monto, clasificacion, categoria_id, fecha, origen, pago_credito_id
  ) VALUES (
    auth.uid(), 'Pago tarjeta: ' || v_credito.nombre, v_aplicado,
    'necesidad', v_categoria_id, COALESCE(p_fecha, CURRENT_DATE), 'deuda', v_pago_id
  );

  RETURN QUERY SELECT
    v_aplicado,
    v_credito.saldo_utilizado,
    v_nuevo,
    (v_aplicado < v_solicitado),
    false;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_pago_deuda(INTEGER, NUMERIC, TEXT, UUID, DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.registrar_pago_credito(INTEGER, NUMERIC, TEXT, UUID, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_pago_deuda(INTEGER, NUMERIC, TEXT, UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_pago_credito(INTEGER, NUMERIC, TEXT, UUID, DATE) TO authenticated;

COMMIT;
