import Layout from '../components/layout/Layout'
import { useAuth } from '../context/AuthContext'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery'
import { supabase } from '../lib/supabase'
import { MESES, formatMXN } from '../utils/constantes'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid, Cell
} from 'recharts'

export default function Tendencias() {
  const { user } = useAuth()

  const { data: tendencias, loading } = useSupabaseQuery(async () => {
    const resultados = []
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date()
      fecha.setMonth(fecha.getMonth() - i)
      const m = fecha.getMonth() + 1
      const a = fecha.getFullYear()
      const inicio = `${a}-${String(m).padStart(2,'0')}-01`
      const fin    = new Date(a, m, 0).toISOString().split('T')[0]

      const [{ data: ing }, { data: tx }, { data: fijos }] = await Promise.all([
        supabase.from('ingresos').select('monto_actual').eq('user_id', user.id).eq('mes', m).eq('anio', a),
        supabase.from('transacciones').select('monto, clasificacion').eq('user_id', user.id).gte('fecha', inicio).lte('fecha', fin),
        supabase.from('gastos_fijos').select('monto_actual').eq('user_id', user.id).eq('mes', m).eq('anio', a),
      ])

      const totalFijos = fijos?.reduce((s, g) => s + Number(g.monto_actual), 0) ?? 0
      const totalTx    = tx?.reduce((s, t) => s + Number(t.monto), 0) ?? 0

      resultados.push({
        mes:       MESES[m - 1].slice(0, 3),
        ingresos:  ing?.reduce((s, i) => s + Number(i.monto_actual), 0) ?? 0,
        gastos:    totalFijos + totalTx,
        necesidad: tx?.filter(t => t.clasificacion === 'necesidad').reduce((s, t) => s + Number(t.monto), 0) ?? 0,
        deseo:     tx?.filter(t => t.clasificacion === 'deseo').reduce((s, t) => s + Number(t.monto), 0) ?? 0,
        ahorro:    tx?.filter(t => t.clasificacion === 'ahorro').reduce((s, t) => s + Number(t.monto), 0) ?? 0,
      })
    }
    return resultados
  }, [user?.id])

  const mesConMasGastos = tendencias?.reduce((max, t) => t.gastos > (max?.gastos ?? 0) ? t : max, null)
  const promGastos = tendencias?.length ? tendencias.reduce((s, t) => s + t.gastos, 0) / tendencias.length : 0
  const promIngresos = tendencias?.length ? tendencias.reduce((s, t) => s + t.ingresos, 0) / tendencias.length : 0

  return (
    <Layout titulo="Tendencias">
      <div className="space-y-6">

        {/* Resumen */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Promedio Ingresos</p>
            <p className="text-xl font-bold font-mono text-emerald-600">{formatMXN(promIngresos)}</p>
            <p className="text-xs text-gray-400 mt-0.5">últimos 6 meses</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Promedio Gastos</p>
            <p className="text-xl font-bold font-mono text-primary-700">{formatMXN(promGastos)}</p>
            <p className="text-xs text-gray-400 mt-0.5">últimos 6 meses</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Mes con Más Gastos</p>
            <p className="text-xl font-bold font-mono text-amber-600">{mesConMasGastos?.mes ?? '—'}</p>
            <p className="text-xs text-gray-400 mt-0.5">{mesConMasGastos ? formatMXN(mesConMasGastos.gastos) : ''}</p>
          </div>
        </div>

        {/* Ingresos vs Gastos */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-4">Ingresos vs Gastos (6 meses)</h2>
          {loading
            ? <div className="h-56 bg-gray-50 animate-pulse rounded-lg" />
            : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={tendencias ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => formatMXN(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="gastos"   name="Gastos"   stroke="#1a3faa" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
        </div>

        {/* Distribución 50/30/20 */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-4">Distribución de Gastos por Tipo</h2>
          {loading
            ? <div className="h-56 bg-gray-50 animate-pulse rounded-lg" />
            : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={tendencias ?? []} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => formatMXN(v)} />
                  <Legend />
                  <Bar dataKey="necesidad" name="Necesidad" stackId="a" fill="#2563eb" radius={[0,0,0,0]} />
                  <Bar dataKey="deseo"     name="Deseo"     stackId="a" fill="#f59e0b" radius={[0,0,0,0]} />
                  <Bar dataKey="ahorro"    name="Ahorro"    stackId="a" fill="#10b981" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
        </div>

        {/* Tabla resumen */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="font-bold text-gray-900">Resumen por Mes</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                {['Mes','Ingresos','Gastos','Balance','Necesidad','Deseo','Ahorro'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(tendencias ?? []).map(t => {
                const balance = t.ingresos - t.gastos
                return (
                  <tr key={t.mes} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-800">{t.mes}</td>
                    <td className="px-4 py-3 font-mono text-emerald-600">{formatMXN(t.ingresos)}</td>
                    <td className="px-4 py-3 font-mono text-primary-700">{formatMXN(t.gastos)}</td>
                    <td className="px-4 py-3 font-mono font-bold">
                      <span className={balance >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                        {balance >= 0 ? '+' : ''}{formatMXN(balance)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-blue-600 text-sm">{formatMXN(t.necesidad)}</td>
                    <td className="px-4 py-3 font-mono text-amber-600 text-sm">{formatMXN(t.deseo)}</td>
                    <td className="px-4 py-3 font-mono text-emerald-600 text-sm">{formatMXN(t.ahorro)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

      </div>
    </Layout>
  )
}
