import Layout from '../components/layout/Layout'
import { useDashboard } from '../hooks/useDashboard'
import { useMes } from '../context/MesContext'
import { formatMXN, MESES } from '../utils/constantes'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

const COLORES_CATEGORIA = [
  '#1a3faa','#f59e0b','#10b981','#ef4444','#8b5cf6',
  '#06b6d4','#f97316','#84cc16','#ec4899','#6366f1'
]

function SkeletonCard() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-24 mb-3" />
      <div className="h-8 bg-gray-100 rounded w-32" />
    </div>
  )
}

export default function Dashboard() {
  const { mes, anio } = useMes()
  const {
    loading, totalIngresos, totalGastos, porAsignar,
    necesidad, deseo, ahorro, gastosPorCategoria, transacciones, reglas,
    totalPresupuestado, categoriasEnRiesgo, gastosHormiga,
  } = useDashboard()

  const datosDona = Object.entries(gastosPorCategoria)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  const datos5030 = [
    { name: 'Necesidad', actual: necesidad, meta: totalIngresos * reglas.regla_necesidad, fill: '#2563eb' },
    { name: 'Deseo',     actual: deseo,     meta: totalIngresos * reglas.regla_deseo,     fill: '#f59e0b' },
    { name: 'Ahorro',    actual: ahorro,    meta: totalIngresos * reglas.regla_ahorro,    fill: '#10b981' },
  ]

  const tarjetas = [
    { label: 'Ingreso Total',  value: totalIngresos, icon: TrendingUp,   color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { label: 'Total Gastado',  value: totalGastos,   icon: TrendingDown, color: 'text-primary-700', bg: 'bg-primary-50', border: 'border-primary-100' },
    { label: 'Por Asignar',    value: porAsignar,    icon: Wallet,       color: porAsignar >= 0 ? 'text-emerald-600' : 'text-red-600', bg: porAsignar >= 0 ? 'bg-emerald-50' : 'bg-red-50', border: porAsignar >= 0 ? 'border-emerald-100' : 'border-red-100' },
    { label: 'Ahorro del Mes', value: ahorro,        icon: PiggyBank,    color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100' },
  ]

  return (
    <Layout titulo="Dashboard">
      <div className="space-y-6">

        {/* Tarjetas principales */}
        <div className="grid grid-cols-4 gap-4">
          {loading
            ? Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
            : tarjetas.map(({ label, value, icon: Icon, color, bg, border }) => (
              <div key={label} className={`card p-5 border ${border}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                </div>
                <p className={`text-2xl font-bold font-mono ${color}`}>{formatMXN(value)}</p>
              </div>
            ))}
        </div>

        {/* Regla 50/30/20 */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Regla 50/30/20</h2>
            <span className="text-xs text-gray-400">
              {Math.round(reglas.regla_necesidad * 100)}% Necesidad /&nbsp;
              {Math.round(reglas.regla_deseo * 100)}% Deseo /&nbsp;
              {Math.round(reglas.regla_ahorro * 100)}% Ahorro
            </span>
          </div>
          <div className="space-y-3">
            {datos5030.map(({ name, actual, meta, fill }) => {
              const pct = meta > 0 ? Math.min((actual / meta) * 100, 100) : 0
              const sobre = actual > meta
              return (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{name}</span>
                    <span className="font-mono text-gray-500">
                      <span className={sobre ? 'text-red-600 font-bold' : ''}>{formatMXN(actual)}</span>
                      <span className="text-gray-300"> / </span>
                      {formatMXN(meta)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: sobre ? '#ef4444' : fill }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Salud del Presupuesto */}
        {!loading && categoriasEnRiesgo.length > 0 && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900">Presupuesto — Categorías en Riesgo</h2>
              <Link to="/gastos-variables" className="text-xs text-primary-700 font-semibold flex items-center gap-1 hover:gap-1.5 transition-all">
                Ver presupuesto <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {totalPresupuestado > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Total gastado vs presupuesto</span>
                  <span className="font-mono">
                    {formatMXN(gastosPorCategoria ? Object.values(gastosPorCategoria).reduce((s,v)=>s+v,0) : 0)} / {formatMXN(totalPresupuestado)}
                  </span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {categoriasEnRiesgo.map(cat => (
                <div key={cat.nombre} className="flex items-center gap-3">
                  <span className="text-base w-5 text-center flex-shrink-0">{cat.icono ?? '📦'}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{cat.nombre}</span>
                      <span className={`font-mono font-semibold ${cat.pct >= 100 ? 'text-red-600' : 'text-amber-600'}`}>
                        {cat.pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(cat.pct, 100)}%`, backgroundColor: cat.pct >= 100 ? '#ef4444' : '#f59e0b' }} />
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 font-mono w-20 text-right flex-shrink-0">
                    {formatMXN(cat.gastado)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gráficas */}
        <div className="grid grid-cols-2 gap-4">
          {/* Dona por categoría */}
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4">Gastos por Categoría</h2>
            {datosDona.length === 0
              ? <div className="flex items-center justify-center h-40 text-gray-300 text-sm">Sin gastos este mes</div>
              : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={datosDona} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                      dataKey="value" nameKey="name" paddingAngle={3}>
                      {datosDona.map((_, i) => <Cell key={i} fill={COLORES_CATEGORIA[i % COLORES_CATEGORIA.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatMXN(v)} />
                    <Legend iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              )}
          </div>

          {/* Barras presupuesto vs actual */}
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4">Presupuesto vs Actual</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={datos5030} barSize={24}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatMXN(v)} />
                <Bar dataKey="meta"   name="Meta"   fill="#e8edf8" radius={[4,4,0,0]} />
                <Bar dataKey="actual" name="Actual" fill="#1a3faa" radius={[4,4,0,0]}>
                  {datos5030.map((e, i) => <Cell key={i} fill={e.actual > e.meta ? '#ef4444' : e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gastos Hormiga */}
        {!loading && gastosHormiga.count > 0 && (
          <div className="card p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🐜</span>
              <div>
                <p className="font-bold text-gray-900 text-sm">Gastos Hormiga del Mes</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Transacciones ≤ {formatMXN(gastosHormiga.umbral)} · {gastosHormiga.count} movimientos pequeños
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold font-mono text-amber-600">{formatMXN(gastosHormiga.total)}</p>
              <p className="text-xs text-gray-400">acumulado este mes</p>
            </div>
          </div>
        )}

        {/* Últimos movimientos */}
        <div className="card">
          <div className="flex items-center justify-between p-5 border-b border-gray-50">
            <h2 className="font-bold text-gray-900">Últimos Movimientos</h2>
            <Link to="/control-gastos" className="text-sm text-primary-700 font-semibold flex items-center gap-1 hover:gap-2 transition-all">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {loading
            ? <div className="p-5 space-y-3">{Array(5).fill(0).map((_, i) => <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />)}</div>
            : transacciones.slice(0, 8).length === 0
              ? <div className="p-10 text-center text-gray-300 text-sm">Sin movimientos este mes</div>
              : (
                <div className="divide-y divide-gray-50">
                  {transacciones.slice(0, 8).map(t => (
                    <div key={t.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{t.categorias?.icono ?? '📦'}</span>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{t.descripcion}</p>
                          <p className="text-xs text-gray-400">{t.categorias?.nombre} · {t.fecha}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`badge-${t.clasificacion}`}>{t.clasificacion}</span>
                        <span className="font-mono font-bold text-sm text-primary-700">-{formatMXN(t.monto)}</span>
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
