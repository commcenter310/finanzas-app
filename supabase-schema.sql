-- ============================================
-- FINANZAS PERSONALES — Schema Completo
-- Ejecutar en Supabase → SQL Editor → New query
-- ============================================

-- Perfiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT,
  telefono TEXT UNIQUE,
  whatsapp_verificado BOOLEAN DEFAULT false,
  regla_necesidad NUMERIC(3,2) DEFAULT 0.50,
  regla_deseo     NUMERIC(3,2) DEFAULT 0.30,
  regla_ahorro    NUMERIC(3,2) DEFAULT 0.20,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Categorías de gasto
CREATE TABLE IF NOT EXISTS public.categorias (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  tipo_gasto TEXT NOT NULL CHECK (tipo_gasto IN ('fijo','variable')),
  clasificacion TEXT NOT NULL CHECK (clasificacion IN ('necesidad','deseo','ahorro')),
  icono TEXT DEFAULT '📦',
  color TEXT DEFAULT '#1a3faa',
  activa BOOLEAN DEFAULT true,
  es_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, nombre)
);

-- Métodos de pago
CREATE TABLE IF NOT EXISTS public.metodos_pago (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('debito','credito','efectivo','digital')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, nombre)
);

-- Créditos activos (tarjetas)
CREATE TABLE IF NOT EXISTS public.creditos (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  fecha_corte INTEGER CHECK (fecha_corte BETWEEN 1 AND 31),
  fecha_pago INTEGER CHECK (fecha_pago BETWEEN 1 AND 31),
  mejor_fecha_inicio INTEGER,
  mejor_fecha_fin INTEGER,
  limite_credito NUMERIC(12,2),
  saldo_utilizado NUMERIC(12,2) DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ingresos mensuales
CREATE TABLE IF NOT EXISTS public.ingresos (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  concepto TEXT NOT NULL,
  monto_presupuesto NUMERIC(12,2) DEFAULT 0,
  monto_actual NUMERIC(12,2) DEFAULT 0,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio INTEGER NOT NULL,
  fecha_recepcion DATE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Gastos fijos (facturas)
CREATE TABLE IF NOT EXISTS public.gastos_fijos (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  concepto TEXT NOT NULL,
  categoria_id INTEGER REFERENCES public.categorias(id),
  monto_previsto NUMERIC(12,2) DEFAULT 0,
  monto_actual NUMERIC(12,2) DEFAULT 0,
  clasificacion TEXT CHECK (clasificacion IN ('necesidad','deseo','ahorro')),
  pagado BOOLEAN DEFAULT false,
  fecha_pago DATE,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio INTEGER NOT NULL,
  es_recurrente BOOLEAN DEFAULT false,
  dia_cobro INTEGER CHECK (dia_cobro BETWEEN 1 AND 31),
  created_at TIMESTAMPTZ DEFAULT now()
);
-- Nota: gastos_fijos.transaccion_id se agrega vía ALTER al final del archivo
-- (la tabla transacciones se crea después de esta)

-- Presupuestos por categoría variable
CREATE TABLE IF NOT EXISTS public.presupuestos (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  categoria_id INTEGER REFERENCES public.categorias(id),
  monto_limite NUMERIC(12,2) NOT NULL DEFAULT 0,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, categoria_id, mes, anio)
);

-- Transacciones (log de gastos)
CREATE TABLE IF NOT EXISTS public.transacciones (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  monto NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  categoria_id INTEGER REFERENCES public.categorias(id),
  clasificacion TEXT CHECK (clasificacion IN ('necesidad','deseo','ahorro')),
  metodo_pago_id INTEGER REFERENCES public.metodos_pago(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  -- 'gastos_fijos', 'deuda' y 'ahorro' son transacciones auto-generadas por esos módulos
  origen TEXT DEFAULT 'web' CHECK (origen IN ('web','whatsapp','gastos_fijos','deuda','ahorro')),
  mensaje_original TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Deudas
CREATE TABLE IF NOT EXISTS public.deudas (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  saldo_original NUMERIC(12,2),
  saldo_actual NUMERIC(12,2) NOT NULL,
  pago_mensual NUMERIC(12,2),
  tasa_interes NUMERIC(5,2),
  fecha_proximo_pago DATE,
  notas TEXT,
  liquidada BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Abonos a deudas
CREATE TABLE IF NOT EXISTS public.abonos_deuda (
  id SERIAL PRIMARY KEY,
  deuda_id INTEGER REFERENCES public.deudas(id) ON DELETE CASCADE,
  monto NUMERIC(12,2) NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ahorros / Metas
CREATE TABLE IF NOT EXISTS public.ahorros (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  concepto TEXT NOT NULL,
  monto_meta NUMERIC(12,2) DEFAULT 0,
  monto_actual NUMERIC(12,2) DEFAULT 0,
  clasificacion TEXT CHECK (clasificacion IN ('necesidad','deseo','ahorro')),
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp Log
CREATE TABLE IF NOT EXISTS public.whatsapp_log (
  id SERIAL PRIMARY KEY,
  telefono TEXT NOT NULL,
  mensaje_entrante TEXT NOT NULL,
  respuesta_bot TEXT,
  transaccion_id INTEGER REFERENCES public.transacciones(id) ON DELETE SET NULL,
  procesado BOOLEAN DEFAULT false,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metodos_pago    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creditos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingresos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos_fijos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuestos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacciones   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deudas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abonos_deuda    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ahorros         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_log    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own" ON public.profiles       FOR ALL USING (auth.uid() = id);
CREATE POLICY "own" ON public.categorias      FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own" ON public.metodos_pago    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own" ON public.creditos        FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own" ON public.ingresos        FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own" ON public.gastos_fijos    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own" ON public.presupuestos    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own" ON public.transacciones   FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own" ON public.deudas          FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own" ON public.abonos_deuda    FOR ALL
  USING (deuda_id IN (SELECT id FROM public.deudas WHERE user_id = auth.uid()));
CREATE POLICY "own" ON public.ahorros         FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own" ON public.whatsapp_log    FOR SELECT
  USING (telefono IN (SELECT telefono FROM public.profiles WHERE id = auth.uid()));

-- ============================================
-- TRIGGERS: auto-crear perfil + datos default al registrarse
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.crear_datos_default()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.categorias (user_id, nombre, tipo_gasto, clasificacion, icono, es_default) VALUES
    (NEW.id,'Mercado','variable','necesidad','🛒',true),
    (NEW.id,'Transporte','variable','necesidad','🚗',true),
    (NEW.id,'Salud','variable','necesidad','🏥',true),
    (NEW.id,'Cuidado Personal','variable','necesidad','💇',true),
    (NEW.id,'Hogar','variable','necesidad','🏠',true),
    (NEW.id,'Educación','variable','necesidad','📚',true),
    (NEW.id,'Créditos','variable','necesidad','💳',true),
    (NEW.id,'Restaurante','variable','deseo','🍽️',true),
    (NEW.id,'Entretenimiento','variable','deseo','🎬',true),
    (NEW.id,'Ropa','variable','deseo','👕',true),
    (NEW.id,'Mascotas','variable','deseo','🐾',true),
    (NEW.id,'Regalos','variable','deseo','🎁',true),
    (NEW.id,'Miscelánea','variable','deseo','📦',true),
    (NEW.id,'Gimnasio','variable','deseo','💪',true),
    (NEW.id,'Café','variable','deseo','☕',true),
    (NEW.id,'Vacaciones','variable','ahorro','✈️',true);

  INSERT INTO public.metodos_pago (user_id, nombre, tipo) VALUES
    (NEW.id,'Efectivo','efectivo'),
    (NEW.id,'Santander','debito'),
    (NEW.id,'BBVA','debito'),
    (NEW.id,'Liverpool','credito'),
    (NEW.id,'NU','credito'),
    (NEW.id,'Stori','credito'),
    (NEW.id,'Simplicity','credito');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.crear_datos_default();


-- ============================================
-- FEATURE: Vinculación método de pago ↔ crédito
-- Ejecutar en Supabase → SQL Editor
-- ============================================

ALTER TABLE metodos_pago
  ADD COLUMN IF NOT EXISTS credito_id INTEGER REFERENCES creditos(id) ON DELETE SET NULL;

-- Estado conversacional del bot de WhatsApp
-- Usado por la máquina de estados para el flujo de método de pago y confirmación de "deshacer"
CREATE TABLE IF NOT EXISTS public.whatsapp_estado (
  telefono   TEXT PRIMARY KEY,
  estado     TEXT NOT NULL,
  datos      JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.whatsapp_estado ENABLE ROW LEVEL SECURITY;
-- Solo service_role (el bot usa supabaseAdmin) puede leer/escribir esta tabla

-- Historial de pagos a tarjetas de crédito (espejo de abonos_deuda para TDCs)
CREATE TABLE IF NOT EXISTS public.pagos_credito (
  id          SERIAL PRIMARY KEY,
  credito_id  INTEGER REFERENCES public.creditos(id) ON DELETE CASCADE,
  user_id     UUID    REFERENCES public.profiles(id) ON DELETE CASCADE,
  monto       NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  fecha       DATE NOT NULL DEFAULT CURRENT_DATE,
  notas       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pagos_credito ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own" ON public.pagos_credito
  FOR ALL USING (auth.uid() = user_id);

-- RPC atómica para ajustar saldo_utilizado sin race conditions.
-- SECURITY DEFINER brinca el RLS, así que el WHERE debe validar que el
-- crédito pertenezca a quien llama (sin esto, cualquier usuario autenticado
-- podría alterar saldos ajenos pasando otro id).
CREATE OR REPLACE FUNCTION update_saldo_credito(p_credito_id INTEGER, p_delta NUMERIC)
RETURNS VOID LANGUAGE SQL SECURITY DEFINER AS $$
  UPDATE creditos
  SET saldo_utilizado = GREATEST(0, saldo_utilizado + p_delta)
  WHERE id = p_credito_id AND user_id = auth.uid();
$$;

-- ============================================
-- TABLAS AGREGADAS DESPUÉS DEL SCHEMA ORIGINAL
-- Reconstruidas a partir del código que las usa
-- (useNominas, usePlanQuincena, usePatrimonio)
-- ============================================

-- Nóminas / fuentes de ingreso recurrentes (Perfil → sección Nóminas)
CREATE TABLE IF NOT EXISTS public.nominas (
  id                     SERIAL PRIMARY KEY,
  user_id                UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  nombre                 TEXT NOT NULL,
  es_principal           BOOLEAN DEFAULT false,
  tipo                   TEXT NOT NULL CHECK (tipo IN ('sueldo','honorarios','otro')),
  frecuencia             TEXT NOT NULL CHECK (frecuencia IN ('semanal','quincenal','mensual')),
  monto_neto             NUMERIC(12,2) NOT NULL,
  sueldo_base_mensual    NUMERIC(12,2),
  -- Prestaciones (solo aplican a tipo 'sueldo')
  tiene_aguinaldo        BOOLEAN DEFAULT false,
  dias_aguinaldo         NUMERIC(6,2),
  mes_aguinaldo          INTEGER CHECK (mes_aguinaldo BETWEEN 1 AND 12),
  tiene_prima_vacacional BOOLEAN DEFAULT false,
  dias_prima_vacacional  NUMERIC(6,2),
  veces_prima_al_anio    INTEGER DEFAULT 1,
  meses_prima            TEXT,           -- CSV "7,12" (ver serializeMesesPrima)
  tiene_utilidades       BOOLEAN DEFAULT false,
  monto_utilidades       NUMERIC(12,2),
  mes_utilidades         INTEGER CHECK (mes_utilidades BETWEEN 1 AND 12),
  created_at             TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.nominas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own" ON public.nominas;
CREATE POLICY "own" ON public.nominas FOR ALL USING (auth.uid() = user_id);

-- Apartados del Plan de Quincena (dinero reservado para compromisos)
CREATE TABLE IF NOT EXISTS public.apartados (
  id             SERIAL PRIMARY KEY,
  user_id        UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  concepto       TEXT NOT NULL,
  monto          NUMERIC(12,2) NOT NULL,
  tipo           TEXT NOT NULL CHECK (tipo IN ('gasto_fijo','deuda','ahorro','otro')),
  origen_id      INTEGER,               -- id del gasto_fijo/deuda/ahorro origen (sin FK: apunta a tablas distintas)
  mes            INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio           INTEGER NOT NULL,
  quincena       INTEGER NOT NULL CHECK (quincena IN (1,2)),
  apartado       BOOLEAN DEFAULT true,
  fecha_apartado DATE,
  created_at     TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.apartados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own" ON public.apartados;
CREATE POLICY "own" ON public.apartados FOR ALL USING (auth.uid() = user_id);

-- Activos (página Patrimonio)
CREATE TABLE IF NOT EXISTS public.activos (
  id         SERIAL PRIMARY KEY,
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  nombre     TEXT NOT NULL,
  tipo       TEXT NOT NULL CHECK (tipo IN ('inmueble','vehiculo','inversion','cuenta','otro')),
  monto      NUMERIC(14,2) NOT NULL DEFAULT 0,
  activo     BOOLEAN DEFAULT true,       -- soft-delete
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.activos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own" ON public.activos;
CREATE POLICY "own" ON public.activos FOR ALL USING (auth.uid() = user_id);

-- Snapshots mensuales de patrimonio neto (histórico para la gráfica)
CREATE TABLE IF NOT EXISTS public.patrimonio_snapshots (
  id              SERIAL PRIMARY KEY,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  mes             INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio            INTEGER NOT NULL,
  total_activos   NUMERIC(14,2) DEFAULT 0,
  total_deudas    NUMERIC(14,2) DEFAULT 0,
  patrimonio_neto NUMERIC(14,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, mes, anio)             -- requerido por el upsert onConflict del hook
);
ALTER TABLE public.patrimonio_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own" ON public.patrimonio_snapshots;
CREATE POLICY "own" ON public.patrimonio_snapshots FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- MIGRACIONES SOBRE TABLAS ORIGINALES (idempotentes)
-- Para bases creadas con versiones anteriores de este archivo
-- ============================================

-- gastos_fijos: día de cobro + vínculo con la transacción auto-generada al pagar
ALTER TABLE public.gastos_fijos ADD COLUMN IF NOT EXISTS dia_cobro INTEGER CHECK (dia_cobro BETWEEN 1 AND 31);
ALTER TABLE public.gastos_fijos ADD COLUMN IF NOT EXISTS transaccion_id INTEGER REFERENCES public.transacciones(id) ON DELETE SET NULL;

-- metodos_pago: vínculo con crédito (registrar gasto con tarjeta actualiza su saldo)
ALTER TABLE public.metodos_pago ADD COLUMN IF NOT EXISTS credito_id INTEGER REFERENCES public.creditos(id) ON DELETE SET NULL;

-- transacciones.origen: el CHECK original solo permitía web/whatsapp; hoy también
-- se generan transacciones desde gastos fijos, pagos de deuda y depósitos de ahorro
ALTER TABLE public.transacciones DROP CONSTRAINT IF EXISTS transacciones_origen_check;
ALTER TABLE public.transacciones ADD CONSTRAINT transacciones_origen_check
  CHECK (origen IN ('web','whatsapp','gastos_fijos','deuda','ahorro'));

-- Onboarding: los usuarios nuevos ven un wizard de bienvenida la primera vez.
-- Los usuarios existentes (ya tienen nombre configurado) no lo ven.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completado BOOLEAN DEFAULT false;
UPDATE public.profiles SET onboarding_completado = true WHERE nombre IS NOT NULL;
