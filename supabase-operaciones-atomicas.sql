-- Operaciones financieras atómicas e idempotentes.
-- Ejecutar una sola vez en Supabase > SQL Editor.

ALTER TABLE public.transacciones
  ADD COLUMN IF NOT EXISTS operacion_id UUID;

ALTER TABLE public.transacciones
  ADD COLUMN IF NOT EXISTS ahorro_id INTEGER
  REFERENCES public.ahorros(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS transacciones_operacion_id_uidx
  ON public.transacciones (operacion_id)
  WHERE operacion_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.registrar_transaccion_atomica(
  p_descripcion TEXT,
  p_monto NUMERIC,
  p_categoria_id INTEGER,
  p_clasificacion TEXT,
  p_metodo_pago_id INTEGER,
  p_fecha DATE,
  p_origen TEXT,
  p_msi_meses INTEGER,
  p_operacion_id UUID
)
RETURNS TABLE (transaccion_id INTEGER, duplicado BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaccion_id INTEGER;
  v_credito_id INTEGER;
  v_monto NUMERIC(12,2);
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'OPERACION_NO_AUTORIZADA'; END IF;
  IF p_operacion_id IS NULL THEN RAISE EXCEPTION 'OPERACION_ID_INVALIDA'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_operacion_id::TEXT, 0));

  SELECT t.id INTO v_transaccion_id
  FROM public.transacciones t
  WHERE t.user_id = auth.uid() AND t.operacion_id = p_operacion_id;
  IF FOUND THEN
    RETURN QUERY SELECT v_transaccion_id, true;
    RETURN;
  END IF;

  v_monto := ROUND(COALESCE(p_monto, 0), 2);
  IF NULLIF(BTRIM(COALESCE(p_descripcion, '')), '') IS NULL THEN
    RAISE EXCEPTION 'OPERACION_DESCRIPCION_INVALIDA';
  END IF;
  IF v_monto <= 0 THEN RAISE EXCEPTION 'OPERACION_MONTO_INVALIDO'; END IF;
  IF p_clasificacion NOT IN ('necesidad', 'deseo', 'ahorro') THEN
    RAISE EXCEPTION 'OPERACION_CLASIFICACION_INVALIDA';
  END IF;
  IF COALESCE(p_origen, 'web') NOT IN ('web', 'whatsapp') THEN
    RAISE EXCEPTION 'OPERACION_ORIGEN_INVALIDO';
  END IF;
  IF p_msi_meses IS NOT NULL AND (p_msi_meses < 2 OR p_msi_meses > 60) THEN
    RAISE EXCEPTION 'OPERACION_MSI_INVALIDO';
  END IF;
  IF p_categoria_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.categorias c
    WHERE c.id = p_categoria_id AND c.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'OPERACION_CATEGORIA_INVALIDA';
  END IF;

  IF p_metodo_pago_id IS NOT NULL THEN
    SELECT m.credito_id INTO v_credito_id
    FROM public.metodos_pago m
    WHERE m.id = p_metodo_pago_id
      AND m.user_id = auth.uid()
      AND m.activo = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'OPERACION_METODO_INVALIDO'; END IF;
  END IF;

  IF v_credito_id IS NOT NULL THEN
    PERFORM 1 FROM public.creditos c
    WHERE c.id = v_credito_id AND c.user_id = auth.uid() AND c.activo = true
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'OPERACION_CREDITO_INVALIDO'; END IF;
  END IF;

  INSERT INTO public.transacciones (
    user_id, descripcion, monto, categoria_id, clasificacion,
    metodo_pago_id, fecha, origen, msi_meses, operacion_id
  ) VALUES (
    auth.uid(), BTRIM(p_descripcion), v_monto, p_categoria_id, p_clasificacion,
    p_metodo_pago_id, COALESCE(p_fecha, CURRENT_DATE), COALESCE(p_origen, 'web'),
    CASE WHEN v_credito_id IS NULL THEN NULL ELSE p_msi_meses END,
    p_operacion_id
  ) RETURNING id INTO v_transaccion_id;

  IF v_credito_id IS NOT NULL THEN
    UPDATE public.creditos
    SET saldo_utilizado = COALESCE(saldo_utilizado, 0) + v_monto
    WHERE id = v_credito_id;
  END IF;

  RETURN QUERY SELECT v_transaccion_id, false;
END;
$$;

CREATE OR REPLACE FUNCTION public.actualizar_transaccion_atomica(
  p_transaccion_id INTEGER,
  p_descripcion TEXT,
  p_monto NUMERIC,
  p_categoria_id INTEGER,
  p_clasificacion TEXT,
  p_metodo_pago_id INTEGER,
  p_fecha DATE,
  p_msi_meses INTEGER
)
RETURNS TABLE (transaccion_id INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaccion public.transacciones%ROWTYPE;
  v_credito_anterior INTEGER;
  v_credito_nuevo INTEGER;
  v_monto NUMERIC(12,2);
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'OPERACION_NO_AUTORIZADA'; END IF;

  SELECT * INTO v_transaccion
  FROM public.transacciones t
  WHERE t.id = p_transaccion_id AND t.user_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'OPERACION_NO_ENCONTRADA'; END IF;
  IF v_transaccion.origen NOT IN ('web', 'whatsapp') THEN
    RAISE EXCEPTION 'OPERACION_PROTEGIDA';
  END IF;

  v_monto := ROUND(COALESCE(p_monto, 0), 2);
  IF NULLIF(BTRIM(COALESCE(p_descripcion, '')), '') IS NULL THEN
    RAISE EXCEPTION 'OPERACION_DESCRIPCION_INVALIDA';
  END IF;
  IF v_monto <= 0 THEN RAISE EXCEPTION 'OPERACION_MONTO_INVALIDO'; END IF;
  IF p_clasificacion NOT IN ('necesidad', 'deseo', 'ahorro') THEN
    RAISE EXCEPTION 'OPERACION_CLASIFICACION_INVALIDA';
  END IF;
  IF p_msi_meses IS NOT NULL AND (p_msi_meses < 2 OR p_msi_meses > 60) THEN
    RAISE EXCEPTION 'OPERACION_MSI_INVALIDO';
  END IF;
  IF p_categoria_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.categorias c
    WHERE c.id = p_categoria_id AND c.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'OPERACION_CATEGORIA_INVALIDA';
  END IF;

  IF v_transaccion.metodo_pago_id IS NOT NULL THEN
    SELECT m.credito_id INTO v_credito_anterior
    FROM public.metodos_pago m
    WHERE m.id = v_transaccion.metodo_pago_id AND m.user_id = auth.uid();
  END IF;

  IF p_metodo_pago_id IS NOT NULL THEN
    SELECT m.credito_id INTO v_credito_nuevo
    FROM public.metodos_pago m
    WHERE m.id = p_metodo_pago_id
      AND m.user_id = auth.uid()
      AND m.activo = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'OPERACION_METODO_INVALIDO'; END IF;
  END IF;

  IF v_credito_nuevo IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.creditos c
    WHERE c.id = v_credito_nuevo AND c.user_id = auth.uid() AND c.activo = true
  ) THEN
    RAISE EXCEPTION 'OPERACION_CREDITO_INVALIDO';
  END IF;

  IF v_credito_anterior IS NOT NULL OR v_credito_nuevo IS NOT NULL THEN
    PERFORM 1 FROM public.creditos c
    WHERE c.user_id = auth.uid()
      AND c.id IN (v_credito_anterior, v_credito_nuevo)
    ORDER BY c.id
    FOR UPDATE;
  END IF;

  IF v_credito_anterior IS NOT NULL AND v_credito_anterior = v_credito_nuevo THEN
    UPDATE public.creditos
    SET saldo_utilizado = GREATEST(
      0,
      COALESCE(saldo_utilizado, 0) + v_monto - v_transaccion.monto
    )
    WHERE id = v_credito_anterior AND user_id = auth.uid();
  ELSIF v_credito_anterior IS NOT NULL THEN
    UPDATE public.creditos
    SET saldo_utilizado = GREATEST(0, COALESCE(saldo_utilizado, 0) - v_transaccion.monto)
    WHERE id = v_credito_anterior AND user_id = auth.uid();
  END IF;
  IF v_credito_nuevo IS NOT NULL AND v_credito_nuevo IS DISTINCT FROM v_credito_anterior THEN
    UPDATE public.creditos
    SET saldo_utilizado = COALESCE(saldo_utilizado, 0) + v_monto
    WHERE id = v_credito_nuevo AND user_id = auth.uid();
  END IF;

  UPDATE public.transacciones
  SET descripcion = BTRIM(p_descripcion),
      monto = v_monto,
      categoria_id = p_categoria_id,
      clasificacion = p_clasificacion,
      metodo_pago_id = p_metodo_pago_id,
      fecha = COALESCE(p_fecha, v_transaccion.fecha),
      msi_meses = CASE WHEN v_credito_nuevo IS NULL THEN NULL ELSE p_msi_meses END
  WHERE id = p_transaccion_id;

  RETURN QUERY SELECT p_transaccion_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.eliminar_transaccion_atomica(
  p_transaccion_id INTEGER
)
RETURNS TABLE (eliminada BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaccion public.transacciones%ROWTYPE;
  v_credito_id INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'OPERACION_NO_AUTORIZADA'; END IF;

  SELECT * INTO v_transaccion
  FROM public.transacciones t
  WHERE t.id = p_transaccion_id AND t.user_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false;
    RETURN;
  END IF;
  IF v_transaccion.origen NOT IN ('web', 'whatsapp') THEN
    RAISE EXCEPTION 'OPERACION_PROTEGIDA';
  END IF;

  IF v_transaccion.metodo_pago_id IS NOT NULL THEN
    SELECT m.credito_id INTO v_credito_id
    FROM public.metodos_pago m
    WHERE m.id = v_transaccion.metodo_pago_id AND m.user_id = auth.uid();
  END IF;

  IF v_credito_id IS NOT NULL THEN
    PERFORM 1 FROM public.creditos c
    WHERE c.id = v_credito_id AND c.user_id = auth.uid()
    FOR UPDATE;
    UPDATE public.creditos
    SET saldo_utilizado = GREATEST(0, COALESCE(saldo_utilizado, 0) - v_transaccion.monto)
    WHERE id = v_credito_id AND user_id = auth.uid();
  END IF;

  DELETE FROM public.transacciones WHERE id = p_transaccion_id;
  RETURN QUERY SELECT true;
END;
$$;

CREATE OR REPLACE FUNCTION public.pagar_gasto_fijo_atomico(
  p_gasto_id INTEGER,
  p_monto NUMERIC,
  p_fecha DATE,
  p_operacion_id UUID
)
RETURNS TABLE (transaccion_id INTEGER, duplicado BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gasto public.gastos_fijos%ROWTYPE;
  v_transaccion_id INTEGER;
  v_credito_id INTEGER;
  v_monto NUMERIC(12,2);
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'OPERACION_NO_AUTORIZADA'; END IF;
  IF p_operacion_id IS NULL THEN RAISE EXCEPTION 'OPERACION_ID_INVALIDA'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_operacion_id::TEXT, 0));

  SELECT t.id INTO v_transaccion_id
  FROM public.transacciones t
  WHERE t.user_id = auth.uid() AND t.operacion_id = p_operacion_id;
  IF FOUND THEN
    RETURN QUERY SELECT v_transaccion_id, true;
    RETURN;
  END IF;

  SELECT * INTO v_gasto
  FROM public.gastos_fijos g
  WHERE g.id = p_gasto_id AND g.user_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'OPERACION_NO_ENCONTRADA'; END IF;
  IF v_gasto.pagado THEN
    RETURN QUERY SELECT v_gasto.transaccion_id, true;
    RETURN;
  END IF;

  v_monto := ROUND(COALESCE(p_monto, v_gasto.monto_previsto, 0), 2);
  IF v_monto <= 0 THEN RAISE EXCEPTION 'OPERACION_MONTO_INVALIDO'; END IF;

  IF v_gasto.metodo_pago_id IS NOT NULL THEN
    SELECT m.credito_id INTO v_credito_id
    FROM public.metodos_pago m
    WHERE m.id = v_gasto.metodo_pago_id AND m.user_id = auth.uid();
    IF NOT FOUND THEN RAISE EXCEPTION 'OPERACION_METODO_INVALIDO'; END IF;
  END IF;

  IF v_credito_id IS NOT NULL THEN
    PERFORM 1 FROM public.creditos c
    WHERE c.id = v_credito_id AND c.user_id = auth.uid() AND c.activo = true
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'OPERACION_CREDITO_INVALIDO'; END IF;
  END IF;

  INSERT INTO public.transacciones (
    user_id, descripcion, monto, categoria_id, clasificacion,
    metodo_pago_id, fecha, origen, operacion_id
  ) VALUES (
    auth.uid(), v_gasto.concepto, v_monto, v_gasto.categoria_id,
    v_gasto.clasificacion, v_gasto.metodo_pago_id,
    COALESCE(p_fecha, CURRENT_DATE), 'gastos_fijos', p_operacion_id
  ) RETURNING id INTO v_transaccion_id;

  IF v_credito_id IS NOT NULL THEN
    UPDATE public.creditos
    SET saldo_utilizado = COALESCE(saldo_utilizado, 0) + v_monto
    WHERE id = v_credito_id;
  END IF;

  UPDATE public.gastos_fijos
  SET pagado = true,
      monto_actual = v_monto,
      fecha_pago = COALESCE(p_fecha, CURRENT_DATE),
      transaccion_id = v_transaccion_id
  WHERE id = p_gasto_id;

  RETURN QUERY SELECT v_transaccion_id, false;
END;
$$;

CREATE OR REPLACE FUNCTION public.desmarcar_gasto_fijo_atomico(
  p_gasto_id INTEGER
)
RETURNS TABLE (desmarcado BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gasto public.gastos_fijos%ROWTYPE;
  v_transaccion public.transacciones%ROWTYPE;
  v_credito_id INTEGER;
  v_monto NUMERIC(12,2);
  v_metodo_pago_id INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'OPERACION_NO_AUTORIZADA'; END IF;

  SELECT * INTO v_gasto
  FROM public.gastos_fijos g
  WHERE g.id = p_gasto_id AND g.user_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'OPERACION_NO_ENCONTRADA'; END IF;
  IF NOT v_gasto.pagado THEN
    RETURN QUERY SELECT false;
    RETURN;
  END IF;

  v_monto := COALESCE(v_gasto.monto_actual, 0);
  v_metodo_pago_id := v_gasto.metodo_pago_id;

  IF v_gasto.transaccion_id IS NOT NULL THEN
    SELECT * INTO v_transaccion
    FROM public.transacciones t
    WHERE t.id = v_gasto.transaccion_id AND t.user_id = auth.uid()
    FOR UPDATE;
    IF FOUND THEN
      v_monto := v_transaccion.monto;
      v_metodo_pago_id := v_transaccion.metodo_pago_id;
    END IF;
  END IF;

  IF v_metodo_pago_id IS NOT NULL THEN
    SELECT m.credito_id INTO v_credito_id
    FROM public.metodos_pago m
    WHERE m.id = v_metodo_pago_id AND m.user_id = auth.uid();
  END IF;

  IF v_credito_id IS NOT NULL THEN
    PERFORM 1 FROM public.creditos c
    WHERE c.id = v_credito_id AND c.user_id = auth.uid()
    FOR UPDATE;
    UPDATE public.creditos
    SET saldo_utilizado = GREATEST(0, COALESCE(saldo_utilizado, 0) - v_monto)
    WHERE id = v_credito_id AND user_id = auth.uid();
  END IF;

  IF v_gasto.transaccion_id IS NOT NULL THEN
    DELETE FROM public.transacciones
    WHERE id = v_gasto.transaccion_id AND user_id = auth.uid();
  END IF;

  UPDATE public.gastos_fijos
  SET pagado = false, monto_actual = 0, fecha_pago = NULL, transaccion_id = NULL
  WHERE id = p_gasto_id;

  RETURN QUERY SELECT true;
END;
$$;

CREATE OR REPLACE FUNCTION public.depositar_ahorro_atomico(
  p_ahorro_id INTEGER,
  p_monto NUMERIC,
  p_metodo_pago_id INTEGER,
  p_fecha DATE,
  p_operacion_id UUID
)
RETURNS TABLE (transaccion_id INTEGER, duplicado BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ahorro public.ahorros%ROWTYPE;
  v_transaccion_id INTEGER;
  v_credito_id INTEGER;
  v_categoria_id INTEGER;
  v_monto NUMERIC(12,2);
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'OPERACION_NO_AUTORIZADA'; END IF;
  IF p_operacion_id IS NULL THEN RAISE EXCEPTION 'OPERACION_ID_INVALIDA'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_operacion_id::TEXT, 0));

  SELECT t.id INTO v_transaccion_id
  FROM public.transacciones t
  WHERE t.user_id = auth.uid() AND t.operacion_id = p_operacion_id;
  IF FOUND THEN
    RETURN QUERY SELECT v_transaccion_id, true;
    RETURN;
  END IF;

  v_monto := ROUND(COALESCE(p_monto, 0), 2);
  IF v_monto <= 0 THEN RAISE EXCEPTION 'OPERACION_MONTO_INVALIDO'; END IF;

  SELECT * INTO v_ahorro
  FROM public.ahorros a
  WHERE a.id = p_ahorro_id AND a.user_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'OPERACION_NO_ENCONTRADA'; END IF;

  IF p_metodo_pago_id IS NOT NULL THEN
    SELECT m.credito_id INTO v_credito_id
    FROM public.metodos_pago m
    WHERE m.id = p_metodo_pago_id
      AND m.user_id = auth.uid()
      AND m.activo = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'OPERACION_METODO_INVALIDO'; END IF;
  END IF;

  IF v_credito_id IS NOT NULL THEN
    PERFORM 1 FROM public.creditos c
    WHERE c.id = v_credito_id AND c.user_id = auth.uid() AND c.activo = true
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'OPERACION_CREDITO_INVALIDO'; END IF;
  END IF;

  INSERT INTO public.categorias (
    user_id, nombre, tipo_gasto, clasificacion, icono, activa
  ) VALUES (
    auth.uid(), 'Ahorro', 'variable', 'ahorro', '🐷', true
  )
  ON CONFLICT (user_id, nombre) DO UPDATE SET activa = true
  RETURNING id INTO v_categoria_id;

  INSERT INTO public.transacciones (
    user_id, descripcion, monto, categoria_id, clasificacion,
    metodo_pago_id, fecha, origen, operacion_id, ahorro_id
  ) VALUES (
    auth.uid(), 'Ahorro: ' || v_ahorro.concepto, v_monto,
    v_categoria_id, 'ahorro', p_metodo_pago_id,
    COALESCE(p_fecha, CURRENT_DATE), 'ahorro', p_operacion_id, p_ahorro_id
  ) RETURNING id INTO v_transaccion_id;

  UPDATE public.ahorros
  SET monto_actual = COALESCE(monto_actual, 0) + v_monto
  WHERE id = p_ahorro_id;

  IF v_credito_id IS NOT NULL THEN
    UPDATE public.creditos
    SET saldo_utilizado = COALESCE(saldo_utilizado, 0) + v_monto
    WHERE id = v_credito_id;
  END IF;

  RETURN QUERY SELECT v_transaccion_id, false;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_transaccion_atomica(TEXT, NUMERIC, INTEGER, TEXT, INTEGER, DATE, TEXT, INTEGER, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.actualizar_transaccion_atomica(INTEGER, TEXT, NUMERIC, INTEGER, TEXT, INTEGER, DATE, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.eliminar_transaccion_atomica(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pagar_gasto_fijo_atomico(INTEGER, NUMERIC, DATE, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.desmarcar_gasto_fijo_atomico(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.depositar_ahorro_atomico(INTEGER, NUMERIC, INTEGER, DATE, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.registrar_transaccion_atomica(TEXT, NUMERIC, INTEGER, TEXT, INTEGER, DATE, TEXT, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actualizar_transaccion_atomica(INTEGER, TEXT, NUMERIC, INTEGER, TEXT, INTEGER, DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eliminar_transaccion_atomica(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pagar_gasto_fijo_atomico(INTEGER, NUMERIC, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.desmarcar_gasto_fijo_atomico(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.depositar_ahorro_atomico(INTEGER, NUMERIC, INTEGER, DATE, UUID) TO authenticated;
