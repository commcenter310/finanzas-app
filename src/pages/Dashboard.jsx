import { Suspense } from 'react'
import Layout from '../components/layout/Layout'
import { useDashboard } from '../hooks/useDashboard'
import { useMes } from '../context/MesContext'
import { formatMXN, MESES } from '../utils/constantes'
import { ArrowRight, MessageSquare, Plus, Receipt } from 'lucide-react'
import { Link } from 'react-router-dom'
import ErrorState from '../components/ui/ErrorState'
import EmptyState from '../components/ui/EmptyState'
import { lazyWithRetry } from '../utils/lazyWithRetry'
import DashboardOverview, { OverviewSkeleton } from '../components/dashboard/DashboardOverview'
import { buildDashboardInsights } from '../components/dashboard/insights'
import { calcularIngresoPendiente } from '../utils/calculos'
import { fechaCorta } from '../utils/fecha'
import { plural } from '../utils/texto'

const DashboardCharts = lazyWithRetry(() => import('../components/dashboard/DashboardCharts'))

// Reserva el alto de las gráficas mientras se descargan (evita saltos)
function ChartsPlaceholder() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-hidden="true">
      <div className="card p-4" style={{ minHeight: 330 }} />
      <div className="card p-4" style={{ minHeight: 330 }} />
    </div>
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
    { label: 'Configura tu nómina',     desc: 'Para ver tu ingreso esperado y proyecciones', to: '/perfil'          },
    { label: 'Registra tus ingresos',    desc: 'Cuánto dinero recibes este mes',              to: '/ingresos'        },
    { label: 'Registra tu primer gasto', desc: 'Empieza a llevar el control',                 to: '/control-gastos'  },
    { label: 'Define tu presupuesto',    desc: 'Pon límites por categoría',                   to: '/gastos-variables' },
  ]

  // Solo mostramos el error de pantalla completa si no hay nada que mostrar.
  // Con cache (SWR), si hay datos previos los dejamos visibles aunque falle el refetch.
  const hayDatos = transacciones.length > 0 || totalIngresos > 0 || totalGastos > 0
  if (error && !loading && !hayDatos) {
    return (
      <Layout titulo="Inicio">
        <ErrorState onRetry={refetch} mensaje={error} />
      </Layout>
    )
  }

  return (
    <Layout titulo="Inicio">
      <div className="space-y-3">

        {/* ── Bienvenida / primeros pasos (usuario nuevo) ── */}
        {sinNada && (
          <div className="card p-4">
            <h2 className="titulo-seccion mb-1">
              Empecemos por lo básico
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--fg-3)' }}>
              Cuatro pasos para que los números de esta pantalla tengan sentido. Son un par de minutos.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pasosOnboarding.map((p, i) => (
                <Link key={p.to} to={p.to}
                  className="flex items-center gap-3 p-3 rounded-[var(--r-md)] border border-[var(--border)] hover:bg-[var(--surface-2)]">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>
                      {i + 1}. {p.label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>{p.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--fg-3)' }} />
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
          <div className="card px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>
                {saldoAnterior >= 0 ? 'Sobrante de' : 'Déficit de'} {MESES[mesPrev - 1].toLowerCase()} {anioPrev}
              </p>
              <p className="text-sm" style={{ color: 'var(--fg-3)' }}>
                {saldoAnterior >= 0
                  ? 'Ya está sumado a tu disponible de este mes.'
                  : 'El mes pasado se gastó más de lo que entró.'}
              </p>
            </div>
            <p
              className="text-xl font-semibold font-display tabular flex-shrink-0"
              style={{ color: saldoAnterior >= 0 ? 'var(--positive-fg)' : 'var(--negative-fg)' }}
            >
              {saldoAnterior >= 0 ? '+' : ''}{formatMXN(saldoAnterior)}
            </p>
          </div>
        )}

        {/* ── Proyección del mes (ingreso esperado + saldo proyectado) ── */}
        {!loading && ((ingresoEsperado != null && ingresoEsperado > 0) || (proyeccion.esMesActual && proyeccion.saldoProyectado !== null)) && (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="titulo-seccion">
                Cierre de {MESES[mes - 1].toLowerCase()}
              </h2>
              <Link to="/plan-quincena"
                className="enlace-seccion">
                Ver plan <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Ingreso registrado vs esperado */}
            {ingresoEsperado != null && ingresoEsperado > 0 && (() => {
              const pct = Math.min((totalIngresos / ingresoEsperado) * 100, 100)
              const faltante = calcularIngresoPendiente(ingresoEsperado, totalIngresos)
              const completo = faltante === 0
              return (
                <div className="mb-4">
                  <div className="flex flex-wrap justify-between gap-x-2 text-sm mb-1.5">
                    <span style={{ color: 'var(--fg-2)' }}>
                      Ingreso registrado
                    </span>
                    <span className="tabular" style={{ color: 'var(--fg-3)', fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
                      <span style={{ color: 'var(--fg-1)', fontWeight: 600 }}>{formatMXN(totalIngresos)}</span>
                      <span style={{ color: 'var(--fg-4)' }}> / ~</span>
                      {formatMXN(ingresoEsperado)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
                    <div className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: 'var(--fg-1)',
                        transition: 'width var(--dur-slow) var(--ease-out)',
                      }} />
                  </div>
                  {!completo && (
                    <p className="text-[13px] mt-2" style={{ color: 'var(--fg-3)' }}>
                      Faltan {formatMXN(faltante)} por registrar según tu nómina.{' '}
                      <Link to="/ingresos" className="underline underline-offset-2" style={{ color: 'var(--primary-700)' }}>
                        Registrar quincena
                      </Link>
                    </p>
                  )}
                </div>
              )
            })()}

            {/* Saldo proyectado a fin de mes */}
            {proyeccion.esMesActual && proyeccion.saldoProyectado !== null && (
              <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 pt-4 border-t border-[var(--divider)]">
                <div className="min-w-0">
                  <p className="text-sm" style={{ color: 'var(--fg-2)' }}>
                    A este ritmo cierras {MESES[mes - 1].toLowerCase()} con
                  </p>
                  <p className="text-[13px] mt-0.5" style={{ color: 'var(--fg-3)' }}>
                    Gasto proyectado {formatMXN(proyeccion.gastoProyectado)} · día {proyeccion.diaActual} de {proyeccion.diasMes}
                  </p>
                </div>
                <p className="text-2xl font-semibold font-display tabular flex-shrink-0"
                  style={{ color: proyeccion.saldoProyectado >= 0 ? 'var(--fg-1)' : 'var(--negative)' }}>
                  {proyeccion.saldoProyectado >= 0 ? '+' : ''}{formatMXN(proyeccion.saldoProyectado)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Facturas pendientes ── */}
        {!loading && fijosPendientes.length > 0 && (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="titulo-seccion">
                {plural(fijosPendientes.length, 'pago fijo pendiente', 'pagos fijos pendientes')}
              </h2>
              <Link to="/gastos-fijos" className="enlace-seccion">
                Ver todas <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-[var(--divider)]">
              {fijosPendientes.slice(0, 4).map(g => {
                const hoyDia = new Date().getDate()
                const vencido = g.dia_cobro && g.dia_cobro < hoyDia
                const proximo = g.dia_cobro && (g.dia_cobro - hoyDia) <= 3 && !vencido
                return (
                  <div key={g.id} className="flex items-center justify-between text-sm py-2">
                    <div className="flex items-baseline gap-3 min-w-0">
                      <span style={{ color: 'var(--fg-1)' }}>{g.concepto}</span>
                      {g.dia_cobro && (
                        <span className="text-[13px] tabular"
                          style={{ color: vencido ? 'var(--negative-fg)' : proximo ? 'var(--warning-fg)' : 'var(--fg-3)' }}>
                          {vencido ? `venció el día ${g.dia_cobro}` : `día ${g.dia_cobro}`}
                        </span>
                      )}
                    </div>
                    <span className="tabular font-medium" style={{ color: 'var(--fg-1)' }}>
                      {formatMXN(g.monto_previsto)}
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
        <div className="card p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-5">
            <h2 className="titulo-seccion">
              Regla {Math.round(reglas.regla_necesidad * 100)}/{Math.round(reglas.regla_deseo * 100)}/{Math.round(reglas.regla_ahorro * 100)}
            </h2>
            <span className="text-[13px]" style={{ color: 'var(--fg-3)' }}>
              gastado / meta según tu ingreso
            </span>
          </div>
          <div className="space-y-3">
            {datos5030.map(({ name, actual, meta, fill }) => {
              const pct   = meta > 0 ? Math.min((actual / meta) * 100, 100) : 0
              const sobre = actual > meta
              return (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="flex items-center gap-2" style={{ color: 'var(--fg-1)' }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: fill }} />{name}
                    </span>
                    <span className="tabular" style={{ color: 'var(--fg-3)', fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
                      <span style={{ color: sobre ? 'var(--negative-fg)' : 'var(--fg-1)', fontWeight: 600 }}>
                        {formatMXN(actual)}
                      </span>
                      <span style={{ color: 'var(--fg-4)' }}> / </span>
                      {formatMXN(meta)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
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
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="titulo-seccion">
                Categorías cerca del límite
              </h2>
              <Link
                to="/gastos-variables"
                className="enlace-seccion"
              >
                Ver presupuesto <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {categoriasEnRiesgo.map(cat => (
                <div key={cat.nombre} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span style={{ color: 'var(--fg-1)' }}>{cat.nombre}</span>
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
                    className="text-sm tabular w-24 text-right flex-shrink-0"
                    style={{ color: 'var(--fg-3)', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatMXN(cat.gastado)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Charts (se cargan aparte; ver DashboardCharts) ── */}
        <Suspense fallback={<ChartsPlaceholder />}>
          <DashboardCharts datosDona={datosDona} totalDona={totalDona} datos5030={datos5030} />
        </Suspense>

        {/* ── Gastos Hormiga ── */}
        {!loading && gastosHormiga.count > 0 && (
          <div className="card px-5 py-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>Gastos hormiga</p>
              <p className="text-sm" style={{ color: 'var(--fg-3)' }}>
                {plural(gastosHormiga.count, 'gusto', 'gustos')} de hasta {formatMXN(gastosHormiga.umbral)} en lo que va del mes
              </p>
            </div>
            <p className="text-xl font-semibold font-display tabular flex-shrink-0" style={{ color: 'var(--fg-1)' }}>
              {formatMXN(gastosHormiga.total)}
            </p>
          </div>
        )}

        {/* ── Últimos Movimientos ── */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--divider)]">
            <h2 className="titulo-seccion">
              Últimos movimientos
            </h2>
            <Link
              to="/control-gastos"
              className="enlace-seccion"
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
                    description="Cuando registres un gasto aparecerá aquí."
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
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--fg-1)' }}>
                              {t.descripcion}
                            </p>
                            {t.origen === 'whatsapp' && <MessageSquare className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--fg-4)' }} aria-label="Registrado por WhatsApp" />}
                          </div>
                          <p className="text-[13px] mt-0.5" style={{ color: 'var(--fg-3)' }}>
                            {t.origen === 'gastos_fijos' ? 'Gasto fijo' : t.origen === 'deuda' ? 'Pago deuda' : (t.categorias?.nombre ?? '—')} · {fechaCorta(t.fecha)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                        <span className={`badge-${t.clasificacion} hidden sm:inline-flex`}>{t.clasificacion}</span>
                        <span
                          className="font-medium text-sm tabular w-24 text-right"
                          style={{ color: 'var(--fg-1)' }}
                        >
                          {formatMXN(t.monto)}
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
