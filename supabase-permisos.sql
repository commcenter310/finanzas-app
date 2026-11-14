-- Permisos de las funciones RPC. Se puede ejecutar las veces que sea
-- (Supabase > SQL Editor); no toca datos.
--
-- Por qué existe: en Supabase, `REVOKE ... FROM PUBLIC` NO quita el permiso
-- de ejecución al rol `anon` (visitante sin sesión), porque Supabase se lo
-- otorga directamente con privilegios por defecto. Hay que revocarlo de
-- `anon` por nombre. Las funciones ya rechazan llamadas sin usuario
-- (auth.uid() IS NULL), así que esto es defensa en profundidad: que un
-- visitante anónimo ni siquiera pueda invocarlas.

BEGIN;

-- Pagos de deudas y tarjetas (supabase-pagos-atomicos.sql)
-- Se recorre la firma que exista en la base: la de 5 parámetros (con p_fecha)
-- o la anterior de 4, si supabase-pagos-atomicos.sql aún no se ha vuelto a ejecutar.
DO $$
DECLARE
  f regprocedure;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('registrar_pago_deuda', 'registrar_pago_credito')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END;
$$;

-- Ajuste de saldo de tarjeta desde la app (solo afecta tarjetas del propio usuario)
REVOKE ALL ON FUNCTION public.update_saldo_credito(INTEGER, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_saldo_credito(INTEGER, NUMERIC) TO authenticated;

-- Variante del bot de WhatsApp: solo la service_role (serverless) la usa
REVOKE ALL ON FUNCTION public.update_saldo_credito_admin(UUID, INTEGER, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_saldo_credito_admin(UUID, INTEGER, NUMERIC) TO service_role;

COMMIT;
