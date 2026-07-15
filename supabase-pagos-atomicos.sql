-- Pagos de deudas y tarjetas: atomicidad e idempotencia.
-- Ejecutar una sola vez en Supabase > SQL Editor.

ALTER TABLE public.abonos_deuda
  ADD COLUMN IF NOT EXISTS operacion_id UUID;

ALTER TABLE public.pagos_credito
  ADD COLUMN IF NOT EXISTS operacion_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS abonos_deuda_operacion_id_uidx
  ON public.abonos_deuda (operacion_id)
  WHERE operacion_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pagos_credito_operacion_id_uidx
  ON public.pagos_credito (operacion_id)
  WHERE operacion_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.registrar_pago_deuda(
  p_deuda_id INTEGER,
  p_monto NUMERIC,
  p_notas TEXT,
  p_operacion_id UUID
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
    p_deuda_id, v_aplicado, CURRENT_DATE, NULLIF(p_notas, ''), p_operacion_id
  );

  UPDATE public.deudas
  SET saldo_actual = v_nuevo,
      liquidada = (v_nuevo = 0)
  WHERE id = p_deuda_id;

  INSERT INTO public.transacciones (
    user_id, descripcion, monto, clasificacion, categoria_id, fecha, origen
  ) VALUES (
    auth.uid(), 'Pago deuda: ' || v_deuda.nombre, v_aplicado,
    'necesidad', v_categoria_id, CURRENT_DATE, 'deuda'
  );

  RETURN QUERY SELECT
    v_aplicado,
    v_deuda.saldo_actual,
    v_nuevo,
    (v_aplicado < v_solicitado),
    false;
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_pago_credito(
  p_credito_id INTEGER,
  p_monto NUMERIC,
  p_notas TEXT,
  p_operacion_id UUID
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
    p_credito_id, auth.uid(), v_aplicado, CURRENT_DATE,
    NULLIF(p_notas, ''), p_operacion_id
  );

  UPDATE public.creditos
  SET saldo_utilizado = v_nuevo
  WHERE id = p_credito_id;

  INSERT INTO public.transacciones (
    user_id, descripcion, monto, clasificacion, categoria_id, fecha, origen
  ) VALUES (
    auth.uid(), 'Pago tarjeta: ' || v_credito.nombre, v_aplicado,
    'necesidad', v_categoria_id, CURRENT_DATE, 'deuda'
  );

  RETURN QUERY SELECT
    v_aplicado,
    v_credito.saldo_utilizado,
    v_nuevo,
    (v_aplicado < v_solicitado),
    false;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_pago_deuda(INTEGER, NUMERIC, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_pago_credito(INTEGER, NUMERIC, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_pago_deuda(INTEGER, NUMERIC, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_pago_credito(INTEGER, NUMERIC, TEXT, UUID) TO authenticated;
