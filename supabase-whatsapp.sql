-- Bot de WhatsApp: escrituras atómicas, mensajes sin duplicar y verificación
-- del número. Supabase > SQL Editor. Se puede ejecutar las veces que sea: solo
-- agrega columnas, índices, funciones y un disparador; no borra ni cambia datos.
-- Requiere supabase-operaciones-atomicas.sql y supabase-pagos-atomicos.sql.

BEGIN;

-- ── 1. Mensajes sin duplicar ─────────────────────────────────────────────────
-- Meta reenvía un mensaje si el bot tarda en contestar. El id del mensaje
-- (wamid) se guarda en el log con índice único: el segundo intento choca y se
-- descarta sin registrar el gasto dos veces.
ALTER TABLE public.whatsapp_log ADD COLUMN IF NOT EXISTS wamid TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_log_wamid_uidx
  ON public.whatsapp_log (wamid) WHERE wamid IS NOT NULL;
CREATE INDEX IF NOT EXISTS whatsapp_log_telefono_idx
  ON public.whatsapp_log (telefono, created_at DESC);

-- ── 2. Operaciones del bot ───────────────────────────────────────────────────
-- El bot entra con la service_role (sin usuario). En vez de repetir aquí la
-- lógica de dinero, esta función se "pone" como el usuario dueño del teléfono
-- durante la transacción y llama a las mismas RPC atómicas que usa la app:
-- un solo lugar decide cómo se registra, corrige o borra un movimiento.
CREATE OR REPLACE FUNCTION public.whatsapp_ejecutar(
  p_user_id UUID,
  p_operacion TEXT,
  p_args JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a JSONB := COALESCE(p_args, '{}'::jsonb);
  v JSONB;
  v_con_fecha BOOLEAN;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'OPERACION_NO_AUTORIZADA';
  END IF;
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'OPERACION_NO_AUTORIZADA';
  END IF;

  -- Solo dentro de esta transacción: auth.uid() devuelve al usuario del teléfono.
  PERFORM set_config('request.jwt.claim.sub', p_user_id::TEXT, true);

  IF p_operacion = 'registrar_gasto' THEN
    SELECT to_jsonb(r) INTO v
    FROM public.registrar_transaccion_atomica(
      a->>'descripcion',
      (a->>'monto')::NUMERIC,
      (a->>'categoria_id')::INTEGER,
      a->>'clasificacion',
      (a->>'metodo_pago_id')::INTEGER,
      (a->>'fecha')::DATE,
      'whatsapp',
      (a->>'msi_meses')::INTEGER,
      (a->>'operacion_id')::UUID
    ) r;
    UPDATE public.transacciones
    SET mensaje_original = a->>'mensaje_original'
    WHERE id = (v->>'transaccion_id')::INTEGER
      AND user_id = p_user_id
      AND a->>'mensaje_original' IS NOT NULL
      AND NOT (v->>'duplicado')::BOOLEAN;

  ELSIF p_operacion = 'actualizar_gasto' THEN
    -- (función de una sola columna: `r` sería el valor suelto, no una fila)
    SELECT jsonb_build_object('transaccion_id', r.transaccion_id) INTO v
    FROM public.actualizar_transaccion_atomica(
      (a->>'transaccion_id')::INTEGER,
      a->>'descripcion',
      (a->>'monto')::NUMERIC,
      (a->>'categoria_id')::INTEGER,
      a->>'clasificacion',
      (a->>'metodo_pago_id')::INTEGER,
      (a->>'fecha')::DATE,
      (a->>'msi_meses')::INTEGER
    ) r;

  ELSIF p_operacion = 'eliminar_gasto' THEN
    SELECT jsonb_build_object('eliminada', r.eliminada) INTO v
    FROM public.eliminar_transaccion_atomica((a->>'transaccion_id')::INTEGER) r;

  ELSIF p_operacion = 'pagar_gasto_fijo' THEN
    SELECT to_jsonb(r) INTO v
    FROM public.pagar_gasto_fijo_atomico(
      (a->>'gasto_id')::INTEGER,
      (a->>'monto')::NUMERIC,
      (a->>'fecha')::DATE,
      (a->>'operacion_id')::UUID
    ) r;

  ELSIF p_operacion IN ('pagar_deuda', 'pagar_credito') THEN
    -- registrar_pago_* acepta la fecha local solo en su versión de 5
    -- parámetros (supabase-pagos-atomicos.sql); con la anterior se usa la
    -- fecha del servidor.
    v_con_fecha := to_regprocedure(
      format('public.registrar_%s(integer,numeric,text,uuid,date)',
             CASE p_operacion WHEN 'pagar_deuda' THEN 'pago_deuda' ELSE 'pago_credito' END)
    ) IS NOT NULL;
    EXECUTE format(
      'SELECT to_jsonb(r) FROM public.registrar_%s($1, $2, $3, $4%s) r',
      CASE p_operacion WHEN 'pagar_deuda' THEN 'pago_deuda' ELSE 'pago_credito' END,
      CASE WHEN v_con_fecha THEN ', $5' ELSE '' END
    )
    INTO v
    USING
      (a->>'id')::INTEGER,
      (a->>'monto')::NUMERIC,
      a->>'notas',
      (a->>'operacion_id')::UUID,
      (a->>'fecha')::DATE;

  ELSE
    RAISE EXCEPTION 'OPERACION_DESCONOCIDA';
  END IF;

  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.whatsapp_ejecutar(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_ejecutar(UUID, TEXT, JSONB) TO service_role;

-- ── 3. Verificación del número ───────────────────────────────────────────────
-- Cualquiera podía escribir un número ajeno en su perfil y recibir en su
-- cuenta los gastos que esa persona mandara. Ahora el bot solo atiende números
-- verificados: manda un código por WhatsApp y el dueño de la cuenta lo escribe
-- en la app (demuestra que controla la cuenta Y el teléfono).

-- El usuario no puede marcarse verificado por su cuenta, y cambiar de número
-- quita la verificación.
CREATE OR REPLACE FUNCTION public.proteger_whatsapp_verificado()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.telefono IS DISTINCT FROM OLD.telefono THEN
    NEW.whatsapp_verificado := false;
  ELSIF NEW.whatsapp_verificado IS DISTINCT FROM OLD.whatsapp_verificado
        AND current_user IN ('authenticated', 'anon') THEN
    NEW.whatsapp_verificado := OLD.whatsapp_verificado;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.proteger_whatsapp_verificado() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE TRIGGER profiles_whatsapp_verificado
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.proteger_whatsapp_verificado();

-- La app llama a esta función con el código que el bot mandó por WhatsApp.
-- Devuelve un estado en texto (no lanza error) para que los intentos fallidos
-- queden contados: 'ok', 'incorrecto', 'vencido', 'bloqueado', 'sin_codigo',
-- 'sin_telefono'.
CREATE OR REPLACE FUNCTION public.verificar_whatsapp(p_codigo TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_telefono TEXT;
  v_datos JSONB;
  v_intentos INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'OPERACION_NO_AUTORIZADA'; END IF;

  SELECT telefono INTO v_telefono FROM public.profiles WHERE id = auth.uid();
  IF v_telefono IS NULL THEN RETURN 'sin_telefono'; END IF;

  SELECT e.datos INTO v_datos
  FROM public.whatsapp_estado e
  WHERE e.telefono = v_telefono AND e.estado = 'esperando_verificacion'
  FOR UPDATE;
  IF NOT FOUND THEN RETURN 'sin_codigo'; END IF;

  IF (v_datos->>'expira')::TIMESTAMPTZ < now() THEN
    DELETE FROM public.whatsapp_estado WHERE telefono = v_telefono;
    RETURN 'vencido';
  END IF;

  v_intentos := COALESCE((v_datos->>'intentos')::INTEGER, 0);
  IF v_intentos >= 5 THEN
    DELETE FROM public.whatsapp_estado WHERE telefono = v_telefono;
    RETURN 'bloqueado';
  END IF;

  IF BTRIM(COALESCE(p_codigo, '')) = v_datos->>'codigo' THEN
    UPDATE public.profiles SET whatsapp_verificado = true WHERE id = auth.uid();
    DELETE FROM public.whatsapp_estado WHERE telefono = v_telefono;
    RETURN 'ok';
  END IF;

  UPDATE public.whatsapp_estado
  SET datos = jsonb_set(v_datos, '{intentos}', to_jsonb(v_intentos + 1))
  WHERE telefono = v_telefono;
  RETURN 'incorrecto';
END;
$$;

REVOKE ALL ON FUNCTION public.verificar_whatsapp(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verificar_whatsapp(TEXT) TO authenticated;

COMMIT;
