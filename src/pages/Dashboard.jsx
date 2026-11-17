import { Suspense } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { useDashboard } from '../hooks/useDashboard'
import { useMes } from '../context/MesContext'
import ErrorState from '../components/ui/ErrorState'
import { lazyWithRetry } from '../utils/lazyWithRetry'
import { buildDashboardInsights } from '../components/dashboard/insights'
import {
  CategoriasRiesgo,
  CierreMes,
  Disponible,
  PagosPendientes,
  PorAtender,
  Regla,
  UltimosMovimientos,
} from '../components/dashboard/BloquesInicio'

const DonaCategorias = lazyWithRetry(() => import('../components/dashboard/DonaCategorias'))

const PASOS_INICIALES = [
  { label: 'Configura tu nómina',      desc: 'Para ver tu ingreso esperado y proyecciones', to: '/perfil' },
  { label: 'Registra tus ingresos',    desc: 'Cuánto dinero recibes este mes',              to: '/ingresos' },
  { label: 'Registra tu primer gasto', desc: 'Empieza a llevar el control',                 to: '/control-gastos' },
  { label: 'Define tu presupuesto',    desc: 'Pon límites por categoría',                   to: '/gastos-variables' },
]

// Avisos que Inicio ya muestra de otra forma: el disponible es la cifra
// grande y los pagos fijos y las categorías tienen su propio bloque.
const AVISOS_OMITIDOS = ['disponible', 'fijos', 'categoria']

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

  const filasRegla = [
    { name: 'Necesidad', actual: necesidad, meta: totalIngresos * reglas.regla_necesidad, fill: 'var(--necesidad)' },
    { name: 'Deseo',     actual: deseo,     meta: totalIngresos * reglas.regla_deseo,     fill: 'var(--deseo)' },
    { name: 'Ahorro',    actual: ahorro,    meta: totalIngresos * reglas.regla_ahorro,    fill: 'var(--ahorro)' },
  ]

  // Usuario nuevo: sin nómina, sin ingresos, sin gastos → guía de inicio
  const sinNada = !loading && ingresoEsperado === null
    && totalIngresos === 0 && totalGastos === 0 && transacciones.length === 0

  const insights = !loading && !sinNada
    ? buildDashboardInsights({
        totalIngresos, ingresoEsperado, proyeccion, porAsignar, totalApartado,
        ahorro, reglas, categoriasEnRiesgo, gastosHormiga, fijosPendientes,
      }, { omitir: AVISOS_OMITIDOS })
    : []

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
      {sinNada && (
        <section className="card bloque mb-[var(--gap)]">
          <h2 className="titulo-seccion">Empecemos por lo básico</h2>
          <p className="text-[13px] mt-0.5 mb-3" style={{ color: 'var(--fg-3)' }}>
            Cuatro pasos para que los números de esta pantalla tengan sentido. Son un par de minutos.
          </p>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PASOS_INICIALES.map((p, i) => (
              <li key={p.to}>
                <Link to={p.to} className="flex items-center gap-3 px-3 py-2 rounded-[var(--r-md)] border border-[var(--border)] hover:bg-[var(--surface-2)]">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>{i + 1}. {p.label}</span>
                    <span className="block text-xs" style={{ color: 'var(--fg-3)' }}>{p.desc}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--fg-3)' }} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="inicio">
        {/* Columna principal */}
        <div className="inicio-col">
          <div className="orden-1">
            <Disponible
              totalIngresos={totalIngresos} totalGastos={totalGastos} porAsignar={porAsignar}
              totalApartado={totalApartado} ahorro={ahorro} cargando={loading}
              saldoAnterior={saldoAnterior} mesPrev={mesPrev} anioPrev={anioPrev}
            />
          </div>
          {!loading && (
            <div className="orden-3">
              <CierreMes mes={mes} totalIngresos={totalIngresos} ingresoEsperado={ingresoEsperado} proyeccion={proyeccion} />
            </div>
          )}
          <div className="orden-5"><Regla reglas={reglas} filas={filasRegla} /></div>
          <div className="orden-6"><UltimosMovimientos transacciones={transacciones} cargando={loading} /></div>
        </div>

        {/* Columna lateral (en móvil se intercala con la principal; ver .orden-*) */}
        <div className="inicio-col">
          <div className="orden-2"><PorAtender insights={insights} /></div>
          {!loading && <div className="orden-4"><PagosPendientes fijosPendientes={fijosPendientes} /></div>}
          {!loading && <div className="orden-7"><CategoriasRiesgo categorias={categoriasEnRiesgo} /></div>}
          <div className="orden-8">
            <Suspense fallback={datosDona.length > 0 ? <div className="card" style={{ minHeight: 170 }} aria-hidden="true" /> : null}>
              <DonaCategorias datos={datosDona} total={totalDona} />
            </Suspense>
          </div>
        </div>
      </div>
    </Layout>
  )
}
