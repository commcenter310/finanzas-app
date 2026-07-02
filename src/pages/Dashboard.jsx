import Layout from '../components/layout/Layout'
import { useDashboard } from '../hooks/useDashboard'
import { useMes } from '../context/MesContext'
import { formatMXN, MESES } from '../utils/constantes'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowRight, Plus, Receipt, MessageSquare } from 'lucide-react'
import { Link } from 'react-router-dom'
import ErrorState from '../components/ui/ErrorState'

// Finni chart palette
const COLORES_CATEGORIA = [
  '#6A45DD', // iris
  '#2F6BEA', // zafiro
  '#0FA978', // jade
  '#F2913E', // mandarina
  '#EE4D63', // rosa
  '#12B5C4', // aqua
  '#F472B6', // magenta
  '#38BDF8', // cielo
  '#8A5BF0', // violeta
  '#0FA978', // jade alt
]

function SkeletonCard() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="h-4 rounded-lg w-24 mb-3" style={{ background: 'var(--surface-3)' }} />
      <div className="h-8 rounded-lg w-32" style={{ background: 'var(--surface-3)' }} />
    </div>
  )
}

// Stat card matching Finni spec
const STAT_CONFIG = (totalIngresos, totalGastos, porAsignar, ahorro) => [
  {
    label:      'Ingreso Total',
    value:      totalIngresos,
    icon:       TrendingUp,
    valueColor: 'var(--fg-1)',
    iconBg:     'var(--positive-bg)',
    iconColor:  'var(--positive-fg)',
  },
  {
    label:      'Total Gastado',
    value:      totalGastos,
    icon:       TrendingDown,
    valueColor: 'var(--negative-fg)',
    iconBg:     'var(--negative-bg)',
    iconColor:  'var(--negative-fg)',
  },
  {
    label:      'Por Asignar',
    value:      porAsignar,
    icon:       Wallet,
    sinDatos:   porAsignar === null,
    valueColor: porAsignar === null ? 'var(--fg-3)' : porAsignar >= 0 ? 'var(--primary-600)' : 'var(--negative-fg)',
    iconBg:     porAsignar === null ? 'var(--surface-3)' : porAsignar >= 0 ? 'var(--primary-50)'  : 'var(--negative-bg)',
    iconColor:  porAsignar === null ? 'var(--fg-3)' : porAsignar >= 0 ? 'var(--primary-700)' : 'var(--negative-fg)',
  },
  {
    label:      'Ahorro del Mes',
    value:      ahorro,
    icon:       PiggyBank,
    valueColor: 'var(--ahorro-fg)',
    iconBg:     'var(--ahorro-bg)',
    iconColor:  'var(--ahorro-fg)',
  },
]

export default function Dashboard() {
  const { mes } = useMes()
  const {
    loading, error, refetch, totalIngresos, ingresoEsperado, proyeccion, totalGastos, porAsignar,
    totalApartado,
    necesidad, deseo, ahorro, gastosPorCategoria, transacciones, reglas,
    categoriasEnRiesgo, gastosHormiga,
    saldoAnterior, mesPrev, anioPrev, fijosPendientes,
  } = useDashboard()

  const datosDona = Object.entries(gastosPorCategoria)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  // Finni classification fills
  const datos5030 = [
    { name: 'Necesidad', actual: necesidad, meta: totalIngresos * reglas.regla_necesidad, fill: '#2F6BEA' },
    { name: 'Deseo',     actual: deseo,     meta: totalIngresos * reglas.regla_deseo,     fill: '#F2913E' },
    { name: 'Ahorro',    actual: ahorro,    meta: totalIngresos * reglas.regla_ahorro,    fill: '#0FA978' },
  ]

  const tarjetas = STAT_CONFIG(totalIngresos, totalGastos, porAsignar, ahorro)

  // Usuario nuevo: sin nómina, sin ingresos, sin gastos → mostramos guía de inicio
  const sinNada = !loading && ingresoEsperado === null
    && totalIngresos === 0 && totalGastos === 0 && transacciones.length === 0
  const pasosOnboarding = [
    { emoji: '💰', label: 'Configura tu nómina',     desc: 'Para ver tu ingreso esperado y proyecciones', to: '/perfil'          },
    { emoji: '📥', label: 'Registra tus ingresos',    desc: 'Cuánto dinero recibes este mes',              to: '/ingresos'        },
    { emoji: '🧾', label: 'Registra tu primer gasto', desc: 'Empieza a llevar el control',                 to: '/control-gastos'  },
    { emoji: '📊', label: 'Define tu presupuesto',    desc: 'Pon límites por categoría',                   to: '/gastos-variables' },
  ]

  // Solo mostramos el error de pantalla completa si no hay nada que mostrar.
  // Con cache (SWR), si hay datos previos los dejamos visibles aunque falle el refetch.
  const hayDatos = transacciones.length > 0 || totalIngresos > 0 || totalGastos > 0
  if (error && !loading && !hayDatos) {
    return (
      <Layout titulo="Dashboard">
        <ErrorState onRetry={refetch} mensaje={error} />
      </Layout>
    )
  }

  return (
    <Layout titulo="Dashboard">
      <div className="space-y-5">

        {/* ── Bienvenida / primeros pasos (usuario nuevo) ── */}
        {sinNada && (
          <div className="card p-6" style={{ background: 'var(--primary-50)', borderColor: 'var(--primary-100)' }}>
            <h2 className="font-bold mb-1" style={{ color: 'var(--fg-1)', fontSize: 18 }}>
              👋 ¡Bienvenido a Finni Apoyo!
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--fg-3)' }}>
              Configura lo básico para sacarle todo el provecho. Te toma menos de 2 minutos.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pasosOnboarding.map((p, i) => (
                <Link key={p.to} to={p.to}
                  className="flex items-center gap-3 p-3 rounded-[var(--r-md)] bg-white transition-all hover:shadow-md">
                  <span className="text-2xl flex-shrink-0">{p.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold" style={{ color: 'var(--fg-1)' }}>
                      {i + 1}. {p.label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>{p.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--primary-600)' }} />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {loading
            ? Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
            : tarjetas.map(({ label, value, icon: Icon, valueColor, iconBg, iconColor, sinDatos }) => (
              <div key={label} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <p
                    className="text-[11px] font-bold uppercase tracking-[0.06em]"
                    style={{ color: 'var(--fg-3)' }}
                  >
                    {label}
                  </p>
                  <div
                    className="w-9 h-9 rounded-[11px] flex items-center justify-center flex-shrink-0"
                    style={{ background: iconBg }}
                  >
                    <Icon className="w-[17px] h-[17px]" style={{ color: iconColor }} strokeWidth={2} />
                  </div>
                </div>
                {sinDatos
                  ? <p className="text-sm font-semibold" style={{ color: 'var(--fg-3)' }}>Sin ingresos aún</p>
                  : <p
                      className="text-xl sm:text-[26px] font-bold tabular leading-none break-all"
                      style={{ color: valueColor, fontVariantNumeric: 'tabular-nums' }}
                    >
                      {formatMXN(value)}
                    </p>
                }
              </div>
            ))}
        </div>

        {/* ── Dinero ya apartado en Plan de Quincena (informativo) ── */}
        {!loading && totalApartado > 0 && porAsignar !== null && (
          <div
            className="card px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
            style={{ background: 'var(--primary-50)', borderLeft: '3px solid var(--primary)' }}
          >
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] mb-0.5" style={{ color: 'var(--primary-700)' }}>
                🔒 Ya apartaste {formatMXN(totalApartado)} este mes
              </p>
              <p className="text-sm" style={{ color: 'var(--fg-2)' }}>
                Tu disponible real (Por Asignar menos lo apartado).{' '}
                <Link to="/plan-quincena" className="font-semibold" style={{ color: 'var(--primary-600)' }}>
                  Ver plan →
                </Link>
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p
                className="text-xl font-bold tabular"
                style={{
                  color: (porAsignar - totalApartado) >= 0 ? 'var(--primary-700)' : 'var(--negative-fg)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatMXN(porAsignar - totalApartado)}
              </p>
            </div>
          </div>
        )}

        {/* ── Saldo arrastrado del mes anterior (ya incluido en Por Asignar) ── */}
        {saldoAnterior !== null && Math.abs(saldoAnterior) > 0.5 && (
          <div
            className="card px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
            style={{
              background: saldoAnterior >= 0 ? 'var(--positive-bg)' : 'var(--warning-bg)',
              borderLeft: `3px solid ${saldoAnterior >= 0 ? 'var(--positive)' : 'var(--warning)'}`,
            }}
          >
            <div className="min-w-0">
              <p
                className="text-[11px] font-bold uppercase tracking-[0.06em] mb-0.5"
                style={{ color: saldoAnterior >= 0 ? 'var(--positive-fg)' : 'var(--warning-fg)' }}
              >
                {saldoAnterior >= 0 ? '✓ Saldo de' : '⚠ Déficit de'} {MESES[mesPrev - 1]} {anioPrev}
              </p>
              <p className="text-sm" style={{ color: 'var(--fg-2)' }}>
                {saldoAnterior >= 0
                  ? 'Ya incluido en tu saldo Por Asignar de este mes.'
                  : 'El mes pasado se gastó más de lo que entró.'}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p
                className="text-xl font-bold tabular"
                style={{
                  color: saldoAnterior >= 0 ? 'var(--positive-fg)' : 'var(--warning-fg)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {saldoAnterior >= 0 ? '+' : ''}{formatMXN(saldoAnterior)}
              </p>
            </div>
          </div>
        )}

        {/* ── Proyección del mes (ingreso esperado + saldo proyectado) ── */}
        {!loading && ((ingresoEsperado != null && ingresoEsperado > 0) || (proyeccion.esMesActual && proyeccion.saldoProyectado !== null)) && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold" style={{ color: 'var(--fg-1)', fontSize: 17, letterSpacing: '-0.01em' }}>
                Proyección de {MESES[mes - 1]}
              </h2>
              <Link to="/plan-quincena"
                className="text-xs font-semibold flex items-center gap-1 hover:gap-1.5 transition-all"
                style={{ color: 'var(--primary-600)' }}>
                Ver plan <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Ingreso registrado vs esperado */}
            {ingresoEsperado != null && ingresoEsperado > 0 && (() => {
              const pct = Math.min((totalIngresos / ingresoEsperado) * 100, 100)
              const completo = totalIngresos >= ingresoEsperado - 0.5
              const faltante = Math.max(0, ingresoEsperado - totalIngresos)
              return (
                <div className="mb-4">
                  <div className="flex flex-wrap justify-between gap-x-2 text-sm mb-1.5">
                    <span className="font-semibold" style={{ color: 'var(--fg-1)' }}>
                      Ingreso registrado
                    </span>
                    <span className="tabular" style={{ color: 'var(--fg-3)', fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>
                      <span style={{ color: 'var(--positive-fg)', fontWeight: 700 }}>{formatMXN(totalIngresos)}</span>
                      <span style={{ color: 'var(--fg-4)' }}> / ~</span>
                      {formatMXN(ingresoEsperado)}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
                    <div className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: completo ? 'var(--positive)' : 'var(--primary)',
                        transition: 'width var(--dur-slow) var(--ease-out)',
                      }} />
                  </div>
                  {!completo && faltante > 0.5 && (
                    <p className="text-xs mt-1.5" style={{ color: 'var(--fg-3)' }}>
                      Faltan {formatMXN(faltante)} por registrar según tu nómina.{' '}
                      <Link to="/ingresos" className="font-semibold" style={{ color: 'var(--primary-600)' }}>
                        ¿Capturar quincena?
                      </Link>
                    </p>
                  )}
                </div>
              )
            })()}

            {/* Saldo proyectado a fin de mes */}
            {proyeccion.esMesActual && proyeccion.saldoProyectado !== null && (
              <div
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 rounded-[var(--r-md)]"
                style={{
                  background: proyeccion.saldoProyectado >= 0 ? 'var(--positive-bg)' : 'var(--negative-bg)',
                }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>
                    A este ritmo terminarás {MESES[mes - 1]} con
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>
                    Gasto proyectado: {formatMXN(proyeccion.gastoProyectado)} · día {proyeccion.diaActual} de {proyeccion.diasMes}
                  </p>
                </div>
                <p className="text-xl font-bold tabular flex-shrink-0"
                  style={{
                    color: proyeccion.saldoProyectado >= 0 ? 'var(--positive-fg)' : 'var(--negative-fg)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                  {proyeccion.saldoProyectado >= 0 ? '+' : ''}{formatMXN(proyeccion.saldoProyectado)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Facturas pendientes ── */}
        {!loading && fijosPendientes.length > 0 && (
          <div className="card p-4" style={{ borderLeft: '3px solid var(--warning)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4" style={{ color: 'var(--warning-fg)' }} />
                <p className="font-bold text-sm" style={{ color: 'var(--fg-1)' }}>
                  {fijosPendientes.length} factura{fijosPendientes.length !== 1 ? 's' : ''} pendiente{fijosPendientes.length !== 1 ? 's' : ''} de pago
                </p>
              </div>
              <Link to="/gastos-fijos"
                className="text-xs font-semibold flex items-center gap-1"
                style={{ color: 'var(--primary-600)' }}>
                Ver todas <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-1.5">
              {fijosPendientes.slice(0, 4).map(g => {
                const hoyDia = new Date().getDate()
                const vencido = g.dia_cobro && g.dia_cobro < hoyDia
                const proximo = g.dia_cobro && (g.dia_cobro - hoyDia) <= 3 && !vencido
                return (
                  <div key={g.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium" style={{ color: 'var(--fg-1)' }}>{g.concepto}</span>
                      {g.dia_cobro && (
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                          style={{
                            background: vencido ? 'var(--negative-bg)' : proximo ? 'var(--warning-bg)' : 'var(--surface-3)',
                            color: vencido ? 'var(--negative-fg)' : proximo ? 'var(--warning-fg)' : 'var(--fg-3)',
                            fontWeight: (vencido || proximo) ? 700 : 400,
                          }}>
                          Día {g.dia_cobro}{vencido ? ' · vencido' : proximo ? ' · próximo' : ''}
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-semibold" style={{ color: 'var(--negative-fg)' }}>
                      -{formatMXN(g.monto_previsto)}
                    </span>
                  </div>
                )
              })}
              {fijosPendientes.length > 4 && (
                <p className="text-xs" style={{ color: 'var(--fg-4)' }}>
                  +{fijosPendientes.length - 4} más…
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Regla 50/30/20 ── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold" style={{ color: 'var(--fg-1)', fontSize: 17, letterSpacing: '-0.01em' }}>
              Regla 50/30/20
            </h2>
            <span className="text-xs" style={{ color: 'var(--fg-3)' }}>
              {Math.round(reglas.regla_necesidad * 100)}% Necesidad /&nbsp;
              {Math.round(reglas.regla_deseo * 100)}% Deseo /&nbsp;
              {Math.round(reglas.regla_ahorro * 100)}% Ahorro
            </span>
          </div>
          <div className="space-y-4">
            {datos5030.map(({ name, actual, meta, fill }) => {
              const pct   = meta > 0 ? Math.min((actual / meta) * 100, 100) : 0
              const sobre = actual > meta
              return (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-semibold" style={{ color: 'var(--fg-1)' }}>{name}</span>
                    <span className="tabular" style={{ color: 'var(--fg-3)', fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>
                      <span style={{ color: sobre ? 'var(--negative-fg)' : 'var(--fg-2)', fontWeight: sobre ? 700 : 400 }}>
                        {formatMXN(actual)}
                      </span>
                      <span style={{ color: 'var(--fg-4)' }}> / </span>
                      {formatMXN(meta)}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: sobre ? 'var(--negative)' : fill,
                        transition: `width var(--dur-slow) var(--ease-out)`,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Categorías en Riesgo ── */}
        {!loading && categoriasEnRiesgo.length > 0 && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold" style={{ color: 'var(--fg-1)', fontSize: 17, letterSpacing: '-0.01em' }}>
                Presupuesto — Categorías en Riesgo
              </h2>
              <Link
                to="/gastos-variables"
                className="text-xs font-semibold flex items-center gap-1 hover:gap-1.5 transition-all"
                style={{ color: 'var(--primary-600)' }}
              >
                Ver presupuesto <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {categoriasEnRiesgo.map(cat => (
                <div key={cat.nombre} className="flex items-center gap-3">
                  <span className="text-base w-5 text-center flex-shrink-0">{cat.icono ?? '📦'}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold" style={{ color: 'var(--fg-2)' }}>{cat.nombre}</span>
                      <span
                        className="tabular font-semibold"
                        style={{ color: cat.pct >= 100 ? 'var(--negative-fg)' : 'var(--warning-fg)', fontVariantNumeric: 'tabular-nums' }}
                      >
                        {cat.pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(cat.pct, 100)}%`,
                          background: cat.pct >= 100 ? 'var(--negative)' : 'var(--warning)',
                          transition: 'width 500ms ease',
                        }}
                      />
                    </div>
                  </div>
                  <span
                    className="text-xs tabular w-20 text-right flex-shrink-0"
                    style={{ color: 'var(--fg-4)', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatMXN(cat.gastado)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Charts ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Donut categorías */}
          <div className="card p-5">
            <h2 className="font-bold mb-4" style={{ color: 'var(--fg-1)', fontSize: 17, letterSpacing: '-0.01em' }}>
              Gastos por Categoría
            </h2>
            {datosDona.length === 0
              ? (
                <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--fg-4)' }}>
                  Sin gastos este mes
                </div>
              )
              : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={datosDona}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={85}
                      dataKey="value" nameKey="name"
                      paddingAngle={3}
                    >
                      {datosDona.map((_, i) => (
                        <Cell key={i} fill={COLORES_CATEGORIA[i % COLORES_CATEGORIA.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatMXN(v)} />
                    <Legend iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              )}
          </div>

          {/* Barras presupuesto vs actual */}
          <div className="card p-5">
            <h2 className="font-bold mb-4" style={{ color: 'var(--fg-1)', fontSize: 17, letterSpacing: '-0.01em' }}>
              Presupuesto vs Actual
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={datos5030} barSize={24}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--fg-3)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'var(--fg-4)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => formatMXN(v)}
                  contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
                />
                <Bar dataKey="meta"   name="Meta"   fill="#EFEDF8" radius={[6, 6, 0, 0]} />
                <Bar dataKey="actual" name="Actual" fill="#6A45DD" radius={[6, 6, 0, 0]}>
                  {datos5030.map((e, i) => (
                    <Cell key={i} fill={e.actual > e.meta ? '#EE4D63' : e.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Gastos Hormiga ── */}
        {!loading && gastosHormiga.count > 0 && (
          <div
            className="card p-5 flex items-center justify-between gap-4"
            style={{ background: 'var(--warning-bg)', borderColor: 'var(--deseo-bg)' }}
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl flex-shrink-0">🐜</span>
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--fg-1)' }}>
                  Gastos Hormiga del Mes
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>
                  Transacciones ≤ {formatMXN(gastosHormiga.umbral)} · {gastosHormiga.count} movimientos pequeños
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p
                className="text-xl font-bold tabular"
                style={{ color: 'var(--warning-fg)', fontVariantNumeric: 'tabular-nums' }}
              >
                {formatMXN(gastosHormiga.total)}
              </p>
              <p className="text-xs" style={{ color: 'var(--fg-4)' }}>acumulado este mes</p>
            </div>
          </div>
        )}

        {/* ── Últimos Movimientos ── */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--divider)]">
            <h2 className="font-bold" style={{ color: 'var(--fg-1)', fontSize: 17, letterSpacing: '-0.01em' }}>
              Últimos Movimientos
            </h2>
            <Link
              to="/control-gastos"
              className="text-sm font-semibold flex items-center gap-1 hover:gap-1.5 transition-all"
              style={{ color: 'var(--primary-600)' }}
            >
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading
            ? (
              <div className="p-5 space-y-3">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="h-10 rounded-[var(--r-sm)] animate-pulse" style={{ background: 'var(--surface-3)' }} />
                ))}
              </div>
            )
            : transacciones.slice(0, 8).length === 0
              ? (
                <div className="p-10 text-center text-sm" style={{ color: 'var(--fg-4)' }}>
                  Sin movimientos este mes
                </div>
              )
              : (
                <div>
                  {transacciones.slice(0, 8).map(t => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between px-5 py-3 border-b border-[var(--divider)] last:border-0 transition-colors cursor-default"
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '' }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg flex-shrink-0">
                          {t.origen === 'gastos_fijos' ? '🧾' : t.origen === 'deuda' ? '💳' : (t.categorias?.icono ?? '📦')}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--fg-1)' }}>
                              {t.descripcion}
                            </p>
                            {t.origen === 'whatsapp' && <MessageSquare className="w-3 h-3 flex-shrink-0 text-gray-300" />}
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>
                            {t.origen === 'gastos_fijos' ? 'Gasto fijo' : t.origen === 'deuda' ? 'Pago deuda' : (t.categorias?.nombre ?? '—')} · {t.fecha}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <span className={`badge-${t.clasificacion}`}>{t.clasificacion}</span>
                        <span
                          className="font-bold text-sm tabular"
                          style={{ color: 'var(--primary-700)', fontVariantNumeric: 'tabular-nums' }}
                        >
                          -{formatMXN(t.monto)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
        </div>

      </div>

      {/* FAB — solo mobile */}
      <Link
        to="/control-gastos"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center lg:hidden"
        style={{ background: 'var(--grad-primary)', boxShadow: 'var(--shadow-primary)' }}
        aria-label="Registrar gasto"
      >
        <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
      </Link>

    </Layout>
  )
}
