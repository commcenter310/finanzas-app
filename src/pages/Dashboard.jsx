import Layout from '../components/layout/Layout'
import { useDashboard } from '../hooks/useDashboard'
import { useMes } from '../context/MesContext'
import { formatMXN, MESES } from '../utils/constantes'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'
import {
  AlertTriangle, ArrowRight, ArrowUpRight, CalendarClock, Gauge, MessageSquare,
  PiggyBank, Plus, Receipt, Sparkles, Target, TrendingDown, TrendingUp, Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import ErrorState from '../components/ui/ErrorState'
import EmptyState from '../components/ui/EmptyState'
import {
  ChartEmptyState,
  ChartLegend,
  ChartTooltip,
} from '../components/ui/Chart'
import {
  chartAxisProps,
  chartGridProps,
  formatCompactCurrency,
} from '../utils/chart'

// Finni chart palette — usa la secuencia de tokens (se recolorea con el tema)
const COLORES_CATEGORIA = [
  'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)',
  'var(--chart-5)', 'var(--chart-6)', 'var(--chart-7)', 'var(--chart-8)',
]

function OverviewSkeleton() {
  return (
    <div className="dashboard-overview">
      <div className="dashboard-balance animate-pulse">
        <div className="h-3 rounded w-28" style={{ background: 'rgba(255,255,255,.14)' }} />
        <div className="h-12 rounded w-52 mt-7" style={{ background: 'rgba(255,255,255,.14)' }} />
        <div className="h-20 rounded mt-10" style={{ background: 'rgba(255,255,255,.08)' }} />
      </div>
      <div className="dashboard-focus-panel animate-pulse">
        <div className="h-4 rounded w-32" style={{ background: 'var(--surface-3)' }} />
        <div className="h-28 rounded mt-5" style={{ background: 'var(--surface-2)' }} />
        <div className="h-16 rounded mt-3" style={{ background: 'var(--surface-2)' }} />
      </div>
    </div>
  )
}

function OverviewMetric({ icon: Icon, label, value, tone }) {
  return (
    <div className="dashboard-balance-metric">
      <Icon className="w-4 h-4" style={{ color: tone }} strokeWidth={2.1} />
      <div className="min-w-0">
        <p>{label}</p>
        <strong>{formatMXN(value)}</strong>
      </div>
    </div>
  )
}

const INSIGHT_STYLE = {
  danger:  { accent: 'var(--negative)', bg: 'var(--negative-bg)', fg: 'var(--negative-fg)' },
  warning: { accent: 'var(--warning)',  bg: 'var(--warning-bg)',  fg: 'var(--warning-fg)'  },
  success: { accent: 'var(--positive)', bg: 'var(--positive-bg)', fg: 'var(--positive-fg)' },
  info:    { accent: 'var(--primary)',  bg: 'var(--primary-50)',  fg: 'var(--primary-700)' },
}

function buildDashboardInsights({
  totalIngresos,
  ingresoEsperado,
  proyeccion,
  porAsignar,
  totalApartado,
  ahorro,
  reglas,
  categoriasEnRiesgo,
  gastosHormiga,
  fijosPendientes,
}) {
  const insights = []
  const disponibleReal = porAsignar == null ? null : porAsignar - totalApartado
  const saldoProyectado = proyeccion?.saldoProyectado
  const ingresoFaltante = ingresoEsperado != null ? Math.max(0, ingresoEsperado - totalIngresos) : 0
  const totalFijosPendientes = fijosPendientes.reduce((s, g) => s + Number(g.monto_previsto ?? 0), 0)
  const topCategoria = categoriasEnRiesgo[0]
  const objetivoAhorro = totalIngresos > 0 ? totalIngresos * reglas.regla_ahorro : 0
  const ahorroFaltante = Math.max(0, objetivoAhorro - ahorro)

  if (proyeccion?.esMesActual && saldoProyectado != null && saldoProyectado < 0) {
    insights.push({
      kind: 'danger',
      icon: AlertTriangle,
      title: 'Riesgo de cierre negativo',
      value: formatMXN(Math.abs(saldoProyectado)),
      body: 'A este ritmo el mes cierra abajo. Revisa gastos variables o mueve pagos no urgentes.',
      to: '/control-gastos',
      action: 'Revisar gastos',
    })
  } else if (disponibleReal != null) {
    insights.push({
      kind: disponibleReal >= 0 ? 'success' : 'danger',
      icon: Wallet,
      title: disponibleReal >= 0 ? 'Disponible real' : 'Disponible comprometido',
      value: formatMXN(disponibleReal),
      body: totalApartado > 0
        ? 'Ya descuenta lo apartado en tu plan de quincena.'
        : 'Usalo como limite antes de registrar nuevos gastos.',
      to: '/plan-quincena',
      action: 'Ver plan',
    })
  }

  if (fijosPendientes.length > 0) {
    insights.push({
      kind: 'warning',
      icon: CalendarClock,
      title: `${fijosPendientes.length} pago${fijosPendientes.length !== 1 ? 's' : ''} pendiente${fijosPendientes.length !== 1 ? 's' : ''}`,
      value: formatMXN(totalFijosPendientes),
      body: 'Liquidarlos primero evita que el disponible se vea mejor de lo que realmente esta.',
      to: '/gastos-fijos',
      action: 'Ver pendientes',
    })
  }

  if (topCategoria) {
    insights.push({
      kind: topCategoria.pct >= 100 ? 'danger' : 'warning',
      icon: Target,
      title: topCategoria.pct >= 100 ? 'Categoria excedida' : 'Categoria en riesgo',
      value: topCategoria.nombre,
      body: `Lleva ${topCategoria.pct.toFixed(0)}% usado (${formatMXN(topCategoria.gastado)} de ${formatMXN(topCategoria.monto_limite)}).`,
      to: '/gastos-variables',
      action: 'Ajustar presupuesto',
    })
  }

  if (ingresoFaltante > 0.5) {
    insights.push({
      kind: 'info',
      icon: TrendingUp,
      title: 'Ingreso por registrar',
      value: formatMXN(ingresoFaltante),
      body: 'Capturalo cuando llegue para que la proyeccion y el disponible sean mas precisos.',
      to: '/ingresos',
      action: 'Capturar ingreso',
    })
  }

  if (objetivoAhorro > 0 && ahorroFaltante > objetivoAhorro * 0.2) {
    insights.push({
      kind: 'info',
      icon: PiggyBank,
      title: 'Ahorro bajo la meta',
      value: formatMXN(ahorroFaltante),
      body: `Falta eso para llegar al ${Math.round(reglas.regla_ahorro * 100)}% de tu regla.`,
      to: '/ahorros',
      action: 'Ver ahorros',
    })
  }

  if (gastosHormiga.count >= 3) {
    insights.push({
      kind: 'warning',
      icon: Sparkles,
      title: 'Gastos pequenos acumulados',
      value: formatMXN(gastosHormiga.total),
      body: `${gastosHormiga.count} movimientos menores a ${formatMXN(gastosHormiga.umbral)} ya pesan en el mes.`,
      to: '/control-gastos',
      action: 'Filtrar gastos',
    })
  }

  if (insights.length === 0 && totalIngresos > 0) {
    insights.push({
      kind: 'success',
      icon: Target,
      title: 'Mes bajo control',
      value: 'Sin alertas fuertes',
      body: 'Tus principales indicadores no muestran urgencias por ahora.',
      to: '/tendencias',
      action: 'Ver tendencias',
    })
  }

  return insights.slice(0, 4)
}

function InsightCard({ insight, featured = false }) {
  const Icon = insight.icon
  const style = INSIGHT_STYLE[insight.kind] ?? INSIGHT_STYLE.info

  return (
    <Link
      to={insight.to}
      className={`dashboard-insight ${featured ? 'is-featured' : ''}`}
      style={{ '--insight-accent': style.accent, '--insight-bg': style.bg, '--insight-fg': style.fg }}
    >
      <span className="dashboard-insight-icon"><Icon /></span>
      <span className="dashboard-insight-copy">
        <span className="dashboard-insight-title">{insight.title}</span>
        <strong>{insight.value}</strong>
        {featured && <span className="dashboard-insight-body">{insight.body}</span>}
      </span>
      <span className="dashboard-insight-action">
        <span>{featured ? insight.action : ''}</span>
        <ArrowUpRight />
      </span>
    </Link>
  )
}

function DashboardOverview({ totalIngresos, totalGastos, porAsignar, totalApartado, ahorro, insights }) {
  const disponibleReal = porAsignar == null ? null : porAsignar - totalApartado
  const consumoPct = totalIngresos > 0 ? Math.min((totalGastos / totalIngresos) * 100, 100) : 0
  const positivo = disponibleReal == null || disponibleReal >= 0

  return (
    <section className="dashboard-overview">
      <div className="dashboard-balance">
        <div className="dashboard-balance-topline">
          <span className="dashboard-balance-status"><Gauge /> Pulso del mes</span>
          <Link to="/tendencias">Ver análisis <ArrowUpRight /></Link>
        </div>

        <div className="dashboard-balance-main">
          <p>Disponible para decidir</p>
          <strong className={!positivo ? 'is-negative' : ''}>
            {disponibleReal == null ? 'Sin ingresos aún' : formatMXN(disponibleReal)}
          </strong>
          <span>
            {totalApartado > 0
              ? `${formatMXN(totalApartado)} ya están protegidos en tu plan.`
              : 'Lo que queda después de tus gastos y compromisos registrados.'}
          </span>
        </div>

        <div className="dashboard-balance-progress">
          <div className="flex items-center justify-between gap-3">
            <span>Ingreso utilizado</span>
            <strong>{totalIngresos > 0 ? `${Math.round(consumoPct)}%` : '--'}</strong>
          </div>
          <div className="dashboard-balance-track">
            <span style={{ width: `${consumoPct}%` }} />
          </div>
        </div>

        <div className="dashboard-balance-metrics">
          <OverviewMetric icon={TrendingUp} label="Ingreso" value={totalIngresos} tone="#79E6BD" />
          <OverviewMetric icon={TrendingDown} label="Gastado" value={totalGastos} tone="#FF9CA8" />
          <OverviewMetric icon={PiggyBank} label="Ahorro" value={ahorro} tone="#8DC7FF" />
        </div>
      </div>

      <div className="dashboard-focus-panel">
        <div className="dashboard-section-heading">
          <div>
            <p>Ahora</p>
            <h2>Tu siguiente mejor movimiento</h2>
          </div>
          <span>{insights.length} prioridad{insights.length !== 1 ? 'es' : ''}</span>
        </div>

        {insights.length > 0 ? (
          <div className="dashboard-insight-list">
            <InsightCard insight={insights[0]} featured />
            {insights.slice(1, 4).map(insight => (
              <InsightCard key={`${insight.title}-${insight.value}`} insight={insight} />
            ))}
          </div>
        ) : (
          <div className="dashboard-focus-empty">
            <Target />
            <div>
              <strong>Todo en orden</strong>
              <p>No hay prioridades urgentes para este mes.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

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
  const totalDona = datosDona.reduce((sum, item) => sum + Number(item.value), 0)

  // Finni classification fills
  const datos5030 = [
    { name: 'Necesidad', actual: necesidad, meta: totalIngresos * reglas.regla_necesidad, fill: 'var(--necesidad)' },
    { name: 'Deseo',     actual: deseo,     meta: totalIngresos * reglas.regla_deseo,     fill: 'var(--deseo)' },
    { name: 'Ahorro',    actual: ahorro,    meta: totalIngresos * reglas.regla_ahorro,    fill: 'var(--ahorro)' },
  ]

  const insights = !loading
    ? buildDashboardInsights({
        totalIngresos,
        ingresoEsperado,
        proyeccion,
        porAsignar,
        totalApartado,
        ahorro,
        reglas,
        categoriasEnRiesgo,
        gastosHormiga,
        fijosPendientes,
      })
    : []

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
                  className="flex items-center gap-3 p-3 rounded-[var(--r-md)] bg-surface transition-all hover:shadow-md">
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

        {loading ? (
          <OverviewSkeleton />
        ) : (
          <DashboardOverview
            totalIngresos={totalIngresos}
            totalGastos={totalGastos}
            porAsignar={porAsignar}
            totalApartado={totalApartado}
            ahorro={ahorro}
            insights={sinNada ? [] : insights}
          />
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
                className="text-[11px] font-bold uppercase tracking-normal mb-0.5"
                style={{ color: saldoAnterior >= 0 ? 'var(--positive-fg)' : 'var(--warning-fg)', letterSpacing: 0 }}
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
              <h2 className="font-bold" style={{ color: 'var(--fg-1)', fontSize: 17, letterSpacing: 0 }}>
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
            <h2 className="font-bold" style={{ color: 'var(--fg-1)', fontSize: 17, letterSpacing: 0 }}>
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
              <h2 className="font-bold" style={{ color: 'var(--fg-1)', fontSize: 17, letterSpacing: 0 }}>
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
            <h2 className="font-bold mb-4" style={{ color: 'var(--fg-1)', fontSize: 17, letterSpacing: 0 }}>
              Gastos por Categoría
            </h2>
            {datosDona.length === 0
              ? (
                <ChartEmptyState>Sin gastos este mes</ChartEmptyState>
              )
              : (
                <>
                  <ResponsiveContainer width="100%" height={228}>
                    <PieChart margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                      <Pie
                        data={datosDona}
                        cx="50%" cy="50%"
                        innerRadius={58} outerRadius={88}
                        dataKey="value" nameKey="name"
                        paddingAngle={3}
                        cornerRadius={5}
                        stroke="var(--surface)"
                        strokeWidth={3}
                      >
                        {datosDona.map((_, i) => (
                          <Cell key={i} fill={COLORES_CATEGORIA[i % COLORES_CATEGORIA.length]} />
                        ))}
                      </Pie>
                      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle"
                        style={{ fill: 'var(--fg-3)', fontSize: 11, fontWeight: 700 }}>
                        Total
                      </text>
                      <text x="50%" y="57%" textAnchor="middle" dominantBaseline="middle"
                        style={{ fill: 'var(--fg-1)', fontSize: 16, fontWeight: 800 }}>
                        {formatCompactCurrency(totalDona)}
                      </text>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <ChartLegend
                    payload={datosDona.map((item, i) => ({
                      value: item.name,
                      color: COLORES_CATEGORIA[i % COLORES_CATEGORIA.length],
                    }))}
                  />
                </>
              )}
          </div>

          {/* Barras presupuesto vs actual */}
          <div className="card p-5">
            <h2 className="font-bold mb-4" style={{ color: 'var(--fg-1)', fontSize: 17, letterSpacing: 0 }}>
              Presupuesto vs Actual
            </h2>
            <ResponsiveContainer width="100%" height={248}>
              <BarChart data={datos5030} barSize={20} barGap={7} barCategoryGap="26%" margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="name" {...chartAxisProps} />
                <YAxis {...chartAxisProps} width={52} tickFormatter={formatCompactCurrency} />
                <Tooltip content={<ChartTooltip nameMap={{ meta: 'Meta', actual: 'Actual' }} />} />
                <Legend content={<ChartLegend nameMap={{ meta: 'Meta', actual: 'Actual' }} />} />
                <Bar dataKey="meta"   name="Meta"   fill="var(--surface-3)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="actual" name="Actual" fill="var(--primary-600)" radius={[6, 6, 0, 0]}>
                  {datos5030.map((e, i) => (
                    <Cell key={i} fill={e.actual > e.meta ? 'var(--negative)' : e.fill} />
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
            <h2 className="font-bold" style={{ color: 'var(--fg-1)', fontSize: 17, letterSpacing: 0 }}>
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
                <div className="p-4">
                  <EmptyState
                    icon={Receipt}
                    title="Sin movimientos este mes"
                    description="Captura un gasto para que el dashboard empiece a mostrar patrones y alertas."
                    className="min-h-[210px]"
                    action={
                      <Link to="/control-gastos" className="btn-primary text-sm">
                        <Plus className="w-4 h-4" /> Registrar gasto
                      </Link>
                    }
                  />
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

    </Layout>
  )
}
