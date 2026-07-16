-- Habilita deudas mensuales y quincenales (pagos los días 15 y 30).
-- Se puede ejecutar más de una vez sin alterar las deudas existentes.

ALTER TABLE public.deudas
  ADD COLUMN IF NOT EXISTS frecuencia_pago TEXT;

UPDATE public.deudas
SET frecuencia_pago = 'mensual'
WHERE frecuencia_pago IS NULL
   OR frecuencia_pago NOT IN ('mensual', 'quincenal');

ALTER TABLE public.deudas
  ALTER COLUMN frecuencia_pago SET DEFAULT 'mensual',
  ALTER COLUMN frecuencia_pago SET NOT NULL;

ALTER TABLE public.deudas
  DROP CONSTRAINT IF EXISTS deudas_frecuencia_pago_check;

ALTER TABLE public.deudas
  ADD CONSTRAINT deudas_frecuencia_pago_check
  CHECK (frecuencia_pago IN ('mensual', 'quincenal'));
