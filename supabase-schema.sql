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
  frecuencia_pago TEXT NOT NULL DEFAULT 'mensual' CHECK (frecuencia_pago IN ('mensual','quincenal')),
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
RETURNS VOID LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.creditos
  SET saldo_utilizado = GREATEST(0, COALESCE(saldo_utilizado, 0) + COALESCE(p_delta, 0))
  WHERE id = p_credito_id AND user_id = auth.uid();
$$;

-- Variante para funciones serverless con service_role (WhatsApp).
-- Exige el user_id esperado para no ajustar una tarjeta de otro usuario por error.
CREATE OR REPLACE FUNCTION update_saldo_credito_admin(p_user_id UUID, p_credito_id INTEGER, p_delta NUMERIC)
RETURNS VOID LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.creditos
  SET saldo_utilizado = GREATEST(0, COALESCE(saldo_utilizado, 0) + COALESCE(p_delta, 0))
  WHERE id = p_credito_id
    AND user_id = p_user_id
    AND auth.role() = 'service_role';
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
-- gastos_fijos.metodo_pago_id: con qué se paga; si es tarjeta, al marcarlo pagado
-- la transacción lleva el método (alimenta ciclo de corte) y ajusta el saldo TDC
ALTER TABLE public.gastos_fijos ADD COLUMN IF NOT EXISTS metodo_pago_id INTEGER REFERENCES public.metodos_pago(id) ON DELETE SET NULL;

-- metodos_pago: vínculo con crédito (registrar gasto con tarjeta actualiza su saldo)
ALTER TABLE public.metodos_pago ADD COLUMN IF NOT EXISTS credito_id INTEGER REFERENCES public.creditos(id) ON DELETE SET NULL;

-- transacciones.origen: el CHECK original solo permitía web/whatsapp; hoy también
-- se generan transacciones desde gastos fijos, pagos de deuda y depósitos de ahorro
ALTER TABLE public.transacciones DROP CONSTRAINT IF EXISTS transacciones_origen_check;
ALTER TABLE public.transacciones ADD CONSTRAINT transacciones_origen_check
  CHECK (origen IN ('web','whatsapp','gastos_fijos','deuda','ahorro'));

-- transacciones.msi_meses: compras a meses sin intereses con tarjeta de crédito.
-- NULL = contado. N = el monto se factura en N mensualidades de monto/N,
-- empezando en el primer corte posterior a la compra (ver calcularEstadoTarjeta).
ALTER TABLE public.transacciones
  ADD COLUMN IF NOT EXISTS msi_meses INTEGER CHECK (msi_meses BETWEEN 2 AND 60);

-- Onboarding: los usuarios nuevos ven un wizard de bienvenida la primera vez.
-- Los usuarios existentes (ya tienen nombre configurado) no lo ven.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completado BOOLEAN DEFAULT false;
UPDATE public.profiles SET onboarding_completado = true WHERE nombre IS NOT NULL;

-- ============================================
-- PAGOS ATÓMICOS E IDEMPOTENTES
-- Migración aislada para instalaciones existentes: supabase-pagos-atomicos.sql
-- ============================================

ALTER TABLE public.abonos_deuda ADD COLUMN IF NOT EXISTS operacion_id UUID;
ALTER TABLE public.pagos_credito ADD COLUMN IF NOT EXISTS operacion_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS abonos_deuda_operacion_id_uidx
  ON public.abonos_deuda (operacion_id) WHERE operacion_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS pagos_credito_operacion_id_uidx
  ON public.pagos_credito (operacion_id) WHERE operacion_id IS NOT NULL;

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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deuda public.deudas%ROWTYPE;
  v_solicitado NUMERIC(12,2);
  v_aplicado NUMERIC(12,2);
  v_nuevo NUMERIC(12,2);
  v_categoria_id INTEGER;
  v_monto_existente NUMERIC(12,2);
  v_saldo_existente NUMERIC(12,2);
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'PAGO_NO_AUTORIZADO'; END IF;
  IF p_operacion_id IS NULL THEN RAISE EXCEPTION 'PAGO_OPERACION_INVALIDA'; END IF;

  SELECT a.monto, d.saldo_actual INTO v_monto_existente, v_saldo_existente
  FROM public.abonos_deuda a
  JOIN public.deudas d ON d.id = a.deuda_id
  WHERE a.operacion_id = p_operacion_id AND d.user_id = auth.uid();
  IF FOUND THEN
    RETURN QUERY SELECT v_monto_existente, NULL::NUMERIC, v_saldo_existente, false, true;
    RETURN;
  END IF;

  v_solicitado := ROUND(COALESCE(p_monto, 0), 2);
  IF v_solicitado <= 0 THEN RAISE EXCEPTION 'PAGO_MONTO_INVALIDO'; END IF;

  SELECT * INTO v_deuda FROM public.deudas
  WHERE id = p_deuda_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PAGO_NO_ENCONTRADO'; END IF;
  IF COALESCE(v_deuda.saldo_actual, 0) <= 0 THEN RAISE EXCEPTION 'PAGO_SIN_SALDO'; END IF;

  v_aplicado := LEAST(v_solicitado, v_deuda.saldo_actual);
  v_nuevo := GREATEST(0, v_deuda.saldo_actual - v_aplicado);

  INSERT INTO public.categorias (user_id, nombre, tipo_gasto, clasificacion, icono, activa)
  VALUES (auth.uid(), 'Deudas', 'variable', 'necesidad', '💳', true)
  ON CONFLICT (user_id, nombre) DO UPDATE SET activa = true
  RETURNING id INTO v_categoria_id;

  INSERT INTO public.abonos_deuda (deuda_id, monto, fecha, notas, operacion_id)
  VALUES (p_deuda_id, v_aplicado, CURRENT_DATE, NULLIF(p_notas, ''), p_operacion_id);

  UPDATE public.deudas SET saldo_actual = v_nuevo, liquidada = (v_nuevo = 0)
  WHERE id = p_deuda_id;

  INSERT INTO public.transacciones
    (user_id, descripcion, monto, clasificacion, categoria_id, fecha, origen)
  VALUES
    (auth.uid(), 'Pago deuda: ' || v_deuda.nombre, v_aplicado,
     'necesidad', v_categoria_id, CURRENT_DATE, 'deuda');

  RETURN QUERY SELECT v_aplicado, v_deuda.saldo_actual, v_nuevo,
    (v_aplicado < v_solicitado), false;
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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_credito public.creditos%ROWTYPE;
  v_solicitado NUMERIC(12,2);
  v_aplicado NUMERIC(12,2);
  v_nuevo NUMERIC(12,2);
  v_categoria_id INTEGER;
  v_monto_existente NUMERIC(12,2);
  v_saldo_existente NUMERIC(12,2);
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'PAGO_NO_AUTORIZADO'; END IF;
  IF p_operacion_id IS NULL THEN RAISE EXCEPTION 'PAGO_OPERACION_INVALIDA'; END IF;

  SELECT p.monto, c.saldo_utilizado INTO v_monto_existente, v_saldo_existente
  FROM public.pagos_credito p
  JOIN public.creditos c ON c.id = p.credito_id
  WHERE p.operacion_id = p_operacion_id AND c.user_id = auth.uid();
  IF FOUND THEN
    RETURN QUERY SELECT v_monto_existente, NULL::NUMERIC, v_saldo_existente, false, true;
    RETURN;
  END IF;

  v_solicitado := ROUND(COALESCE(p_monto, 0), 2);
  IF v_solicitado <= 0 THEN RAISE EXCEPTION 'PAGO_MONTO_INVALIDO'; END IF;

  SELECT * INTO v_credito FROM public.creditos
  WHERE id = p_credito_id AND user_id = auth.uid() AND activo = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PAGO_NO_ENCONTRADO'; END IF;
  IF COALESCE(v_credito.saldo_utilizado, 0) <= 0 THEN RAISE EXCEPTION 'PAGO_SIN_SALDO'; END IF;

  v_aplicado := LEAST(v_solicitado, v_credito.saldo_utilizado);
  v_nuevo := GREATEST(0, v_credito.saldo_utilizado - v_aplicado);

  INSERT INTO public.categorias (user_id, nombre, tipo_gasto, clasificacion, icono, activa)
  VALUES (auth.uid(), 'Deudas', 'variable', 'necesidad', '💳', true)
  ON CONFLICT (user_id, nombre) DO UPDATE SET activa = true
  RETURNING id INTO v_categoria_id;

  INSERT INTO public.pagos_credito
    (credito_id, user_id, monto, fecha, notas, operacion_id)
  VALUES
    (p_credito_id, auth.uid(), v_aplicado, CURRENT_DATE,
     NULLIF(p_notas, ''), p_operacion_id);

  UPDATE public.creditos SET saldo_utilizado = v_nuevo WHERE id = p_credito_id;

  INSERT INTO public.transacciones
    (user_id, descripcion, monto, clasificacion, categoria_id, fecha, origen)
  VALUES
    (auth.uid(), 'Pago tarjeta: ' || v_credito.nombre, v_aplicado,
     'necesidad', v_categoria_id, CURRENT_DATE, 'deuda');

  RETURN QUERY SELECT v_aplicado, v_credito.saldo_utilizado, v_nuevo,
    (v_aplicado < v_solicitado), false;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_pago_deuda(INTEGER, NUMERIC, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_pago_credito(INTEGER, NUMERIC, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_pago_deuda(INTEGER, NUMERIC, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_pago_credito(INTEGER, NUMERIC, TEXT, UUID) TO authenticated;

-- ============================================
-- OPERACIONES FINANCIERAS ATÓMICAS E IDEMPOTENTES
-- Migración aislada para instalaciones existentes: supabase-operaciones-atomicas.sql
-- ============================================

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
