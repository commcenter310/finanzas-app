-- Deshacer abonos a deudas, pagos de tarjeta y depósitos a ahorro.
-- Ejecutar en Supabase > SQL Editor DESPUÉS de supabase-pagos-atomicos.sql
-- (que enlaza cada pago nuevo con su movimiento). Es idempotente y va en una
-- sola transacción: si algo falla, no se aplica nada.
--
-- Cada función revierte TODO junto o nada: saldo de la cuenta, renglón del
-- historial y el movimiento de gasto que se creó al pagar/depositar.

BEGIN;

-- Por si este script corre antes que supabase-pagos-atomicos.sql
ALTER TABLE public.transacciones
  ADD COLUMN IF NOT EXISTS abono_deuda_id INTEGER
  REFERENCES public.abonos_deuda(id) ON DELETE SET NULL;
ALTER TABLE public.transacciones
  ADD COLUMN IF NOT EXISTS pago_credito_id INTEGER
  REFERENCES public.pagos_credito(id) ON DELETE SET NULL;

-- ── Abono a deuda ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.deshacer_pago_deuda(p_abono_id INTEGER)
RETURNS TABLE (monto_revertido NUMERIC, saldo_nuevo NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_abono public.abonos_deuda%ROWTYPE;
  v_deuda public.deudas%ROWTYPE;
  v_tx_id INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'PAGO_NO_AUTORIZADO'; END IF;

  SELECT d.* INTO v_deuda
  FROM public.abonos_deuda a
  JOIN public.deudas d ON d.id = a.deuda_id
  WHERE a.id = p_abono_id AND d.user_id = auth.uid()
  FOR UPDATE OF d;
  IF NOT FOUND THEN RAISE EXCEPTION 'PAGO_NO_ENCONTRADO'; END IF;

  SELECT * INTO v_abono FROM public.abonos_deuda WHERE id = p_abono_id FOR UPDATE;

  -- Movimiento enlazado; para abonos anteriores al enlace, el más reciente
  -- que coincide exactamente en monto, fecha y nombre de la deuda.
  SELECT t.id INTO v_tx_id
  FROM public.transacciones t
  WHERE t.user_id = auth.uid() AND t.abono_deuda_id = p_abono_id;
  IF v_tx_id IS NULL THEN
    SELECT t.id INTO v_tx_id
    FROM public.transacciones t
    WHERE t.user_id = auth.uid()
      AND t.origen = 'deuda'
      AND t.abono_deuda_id IS NULL AND t.pago_credito_id IS NULL
      AND t.monto = v_abono.monto
      AND t.fecha = v_abono.fecha
      AND t.descripcion = 'Pago deuda: ' || v_deuda.nombre
    ORDER BY t.id DESC
    LIMIT 1;
  END IF;
  -- Sin movimiento identificable no se toca nada (evita saldos a medias)
  IF v_tx_id IS NULL THEN RAISE EXCEPTION 'PAGO_MOVIMIENTO_NO_ENCONTRADO'; END IF;

  UPDATE public.deudas
  SET saldo_actual = COALESCE(saldo_actual, 0) + v_abono.monto,
      liquidada = false
  WHERE id = v_deuda.id;
  DELETE FROM public.transacciones WHERE id = v_tx_id;
  DELETE FROM public.abonos_deuda WHERE id = p_abono_id;

  RETURN QUERY SELECT v_abono.monto, COALESCE(v_deuda.saldo_actual, 0) + v_abono.monto;
END;
$$;

-- ── Pago de tarjeta de crédito ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.deshacer_pago_credito(p_pago_id INTEGER)
RETURNS TABLE (monto_revertido NUMERIC, saldo_nuevo NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pago public.pagos_credito%ROWTYPE;
  v_credito public.creditos%ROWTYPE;
  v_tx_id INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'PAGO_NO_AUTORIZADO'; END IF;

  SELECT c.* INTO v_credito
  FROM public.pagos_credito p
  JOIN public.creditos c ON c.id = p.credito_id
  WHERE p.id = p_pago_id AND c.user_id = auth.uid()
  FOR UPDATE OF c;
  IF NOT FOUND THEN RAISE EXCEPTION 'PAGO_NO_ENCONTRADO'; END IF;

  SELECT * INTO v_pago FROM public.pagos_credito WHERE id = p_pago_id FOR UPDATE;

  SELECT t.id INTO v_tx_id
  FROM public.transacciones t
  WHERE t.user_id = auth.uid() AND t.pago_credito_id = p_pago_id;
  IF v_tx_id IS NULL THEN
    SELECT t.id INTO v_tx_id
    FROM public.transacciones t
    WHERE t.user_id = auth.uid()
      AND t.origen = 'deuda'
      AND t.abono_deuda_id IS NULL AND t.pago_credito_id IS NULL
      AND t.monto = v_pago.monto
      AND t.fecha = v_pago.fecha
      AND t.descripcion = 'Pago tarjeta: ' || v_credito.nombre
    ORDER BY t.id DESC
    LIMIT 1;
  END IF;
  IF v_tx_id IS NULL THEN RAISE EXCEPTION 'PAGO_MOVIMIENTO_NO_ENCONTRADO'; END IF;

  UPDATE public.creditos
  SET saldo_utilizado = COALESCE(saldo_utilizado, 0) + v_pago.monto
  WHERE id = v_credito.id;
  DELETE FROM public.transacciones WHERE id = v_tx_id;
  DELETE FROM public.pagos_credito WHERE id = p_pago_id;

  RETURN QUERY SELECT v_pago.monto, COALESCE(v_credito.saldo_utilizado, 0) + v_pago.monto;
END;
$$;

-- ── Depósito a ahorro ───────────────────────────────────────────────────────
-- Recibe el id del movimiento (origen 'ahorro') que creó el depósito.
CREATE OR REPLACE FUNCTION public.deshacer_deposito_ahorro(p_transaccion_id INTEGER)
RETURNS TABLE (monto_revertido NUMERIC, ahorro_nuevo NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx public.transacciones%ROWTYPE;
  v_ahorro public.ahorros%ROWTYPE;
  v_credito_id INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'OPERACION_NO_AUTORIZADA'; END IF;

  SELECT * INTO v_tx
  FROM public.transacciones
  WHERE id = p_transaccion_id AND user_id = auth.uid()
    AND origen = 'ahorro' AND ahorro_id IS NOT NULL
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'OPERACION_NO_ENCONTRADA'; END IF;

  SELECT * INTO v_ahorro
  FROM public.ahorros
  WHERE id = v_tx.ahorro_id AND user_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'OPERACION_NO_ENCONTRADA'; END IF;

  -- Si se depositó con tarjeta, el depósito también había subido su saldo
  IF v_tx.metodo_pago_id IS NOT NULL THEN
    SELECT m.credito_id INTO v_credito_id
    FROM public.metodos_pago m
    WHERE m.id = v_tx.metodo_pago_id AND m.user_id = auth.uid();
  END IF;
  IF v_credito_id IS NOT NULL THEN
    UPDATE public.creditos
    SET saldo_utilizado = GREATEST(0, COALESCE(saldo_utilizado, 0) - v_tx.monto)
    WHERE id = v_credito_id AND user_id = auth.uid();
  END IF;

  UPDATE public.ahorros
  SET monto_actual = GREATEST(0, COALESCE(monto_actual, 0) - v_tx.monto)
  WHERE id = v_ahorro.id;
  DELETE FROM public.transacciones WHERE id = p_transaccion_id;

  RETURN QUERY SELECT v_tx.monto, GREATEST(0, COALESCE(v_ahorro.monto_actual, 0) - v_tx.monto);
END;
$$;

-- Solo usuarios con sesión (ver supabase-permisos.sql sobre anon)
REVOKE ALL ON FUNCTION public.deshacer_pago_deuda(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.deshacer_pago_credito(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.deshacer_deposito_ahorro(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deshacer_pago_deuda(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deshacer_pago_credito(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deshacer_deposito_ahorro(INTEGER) TO authenticated;

COMMIT;
