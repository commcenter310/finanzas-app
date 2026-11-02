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
REVOKE ALL ON FUNCTION public.registrar_pago_deuda(INTEGER, NUMERIC, TEXT, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.registrar_pago_credito(INTEGER, NUMERIC, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_pago_deuda(INTEGER, NUMERIC, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_pago_credito(INTEGER, NUMERIC, TEXT, UUID) TO authenticated;

-- Ajuste de saldo de tarjeta desde la app (solo afecta tarjetas del propio usuario)
REVOKE ALL ON FUNCTION public.update_saldo_credito(INTEGER, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_saldo_credito(INTEGER, NUMERIC) TO authenticated;

-- Variante del bot de WhatsApp: solo la service_role (serverless) la usa
REVOKE ALL ON FUNCTION public.update_saldo_credito_admin(UUID, INTEGER, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_saldo_credito_admin(UUID, INTEGER, NUMERIC) TO service_role;

COMMIT;
