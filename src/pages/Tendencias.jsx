import Layout from '../components/layout/Layout'
import { useAuth } from '../context/AuthContext'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery'
import { supabase } from '../lib/supabase'
import { MESES, formatMXN } from '../utils/constantes'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid, Cell, ReferenceLine
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

  // Utilización de crédito por mes
  const { data: creditoTendencia, loading: loadingCredito } = useSupabaseQuery(async () => {
    // Obtener métodos de pago que sean tarjetas de crédito vinculadas
    const { data: metodos } = await supabase.from('metodos_pago')
      .select('id, nombre, credito_id').eq('user_id', user.id).eq('activo', true).not('credito_id', 'is', null)
    // Obtener límite total de crédito
    const { data: creditos } = await supabase.from('creditos')
      .select('id, nombre, limite_credito').eq('user_id', user.id).eq('activo', true)

    const totalLimite = creditos?.reduce((s, c) => s + Number(c.limite_credito ?? 0), 0) ?? 0
    if (!totalLimite || !metodos?.length) return []

    const metodoIds = metodos.map(m => m.id)
    const resultados = []

    for (let i = 5; i >= 0; i--) {
      const fecha = new Date()
      fecha.setMonth(fecha.getMonth() - i)
      const m = fecha.getMonth() + 1
      const a = fecha.getFullYear()
      const inicio = `${a}-${String(m).padStart(2,'0')}-01`
      const fin    = new Date(a, m, 0).toISOString().split('T')[0]

      const { data: tx } = await supabase.from('transacciones')
        .select('monto, metodo_pago_id').eq('user_id', user.id)
        .gte('fecha', inicio).lte('fecha', fin)
        .in('metodo_pago_id', metodoIds)

      const gastado = tx?.reduce((s, t) => s + Number(t.monto), 0) ?? 0
      const pct = totalLimite > 0 ? (gastado / totalLimite) * 100 : 0

      // Desglose por tarjeta
      const desglose = creditos.reduce((acc, c) => {
        const metodo = metodos.find(m => m.credito_id === c.id)
        if (!metodo) return acc
        const gastadoCard = tx?.filter(t => t.metodo_pago_id === metodo.id).reduce((s, t) => s + Number(t.monto), 0) ?? 0
        const pctCard = c.limite_credito > 0 ? (gastadoCard / Number(c.limite_credito)) * 100 : 0
        acc[c.nombre] = parseFloat(pctCard.toFixed(1))
        return acc
      }, {})

      resultados.push({
        mes:    MESES[m - 1].slice(0, 3),
        pctTotal: parseFloat(pct.toFixed(1)),
        gastado,
        ...desglose,
      })
    }
    return { datos: resultados, creditos: creditos ?? [], totalLimite }
  }, [user?.id])

  const nombresTarjetas = creditoTendencia?.creditos
    ?.filter(c => creditoTendencia.datos?.some(d => d[c.nombre] !== undefined))
    .map(c => c.nombre) ?? []

  const COLORES_TARJETA = ['#6A45DD','#F2913E','#0FA978','#EE4D63','#8A5BF0','#12B5C4']

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
            <p className="text-xl font-bold font-mono" style={{ color: 'var(--positive-fg)' }}>{formatMXN(promIngresos)}</p>
            <p className="text-xs text-gray-400 mt-0.5">últimos 6 meses</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Promedio Gastos</p>
            <p className="text-xl font-bold font-mono text-primary-700">{formatMXN(promGastos)}</p>
            <p className="text-xs text-gray-400 mt-0.5">últimos 6 meses</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Mes con Más Gastos</p>
            <p className="text-xl font-bold font-mono" style={{ color: 'var(--warning-fg)' }}>{mesConMasGastos?.mes ?? '—'}</p>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFEDF7" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => formatMXN(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#0FA978" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="gastos"   name="Gastos"   stroke="#6A45DD" strokeWidth={2.5} dot={{ r: 4 }} />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFEDF7" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => formatMXN(v)} />
                  <Legend />
                  <Bar dataKey="necesidad" name="Necesidad" stackId="a" fill="#2F6BEA" radius={[0,0,0,0]} />
                  <Bar dataKey="deseo"     name="Deseo"     stackId="a" fill="#F2913E" radius={[0,0,0,0]} />
                  <Bar dataKey="ahorro"    name="Ahorro"    stackId="a" fill="#0FA978" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
        </div>

        {/* Utilización de Crédito */}
        {(creditoTendencia?.datos?.length > 0 || loadingCredito) && (
          <div className="card p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-bold text-gray-900">Utilización de Tarjetas de Crédito</h2>
                <p className="text-xs text-gray-400 mt-0.5">% del límite total utilizado por mes · línea amarilla = 30% recomendado</p>
              </div>
              {creditoTendencia?.totalLimite > 0 && (
                <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded">
                  Límite total: {formatMXN(creditoTendencia.totalLimite)}
                </span>
              )}
            </div>
            {loadingCredito
              ? <div className="h-56 bg-gray-50 animate-pulse rounded-lg" />
              : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={creditoTendencia.datos}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EFEDF7" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} domain={[0, 'auto']} />
                    <Tooltip formatter={(v, name) => [`${v}%`, name === 'pctTotal' ? 'Utilización total' : name]} />
                    <Legend formatter={name => name === 'pctTotal' ? 'Total' : name} />
                    <ReferenceLine y={30} stroke="#F2913E" strokeDasharray="5 5"
                      label={{ value: '30% recomendado', position: 'insideTopRight', fontSize: 11, fill: '#F2913E' }} />
                    <Line type="monotone" dataKey="pctTotal" name="pctTotal" stroke="#6A45DD" strokeWidth={2.5} dot={{ r: 4 }} />
                    {nombresTarjetas.map((nombre, i) => (
                      <Line key={nombre} type="monotone" dataKey={nombre} stroke={COLORES_TARJETA[i % COLORES_TARJETA.length]}
                        strokeWidth={1.5} dot={{ r: 3 }} strokeDasharray="4 2" />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
          </div>
        )}

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
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--positive-fg)' }}>{formatMXN(t.ingresos)}</td>
                    <td className="px-4 py-3 font-mono text-primary-700">{formatMXN(t.gastos)}</td>
                    <td className="px-4 py-3 font-mono font-bold">
                      <span style={{ color: balance >= 0 ? 'var(--positive-fg)' : 'var(--negative-fg)' }}>
                        {balance >= 0 ? '+' : ''}{formatMXN(balance)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm" style={{ color: 'var(--necesidad-fg)' }}>{formatMXN(t.necesidad)}</td>
                    <td className="px-4 py-3 font-mono text-sm" style={{ color: 'var(--deseo-fg)' }}>{formatMXN(t.deseo)}</td>
                    <td className="px-4 py-3 font-mono text-sm" style={{ color: 'var(--ahorro-fg)' }}>{formatMXN(t.ahorro)}</td>
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
