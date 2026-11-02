import Layout from '../components/layout/Layout'
import { useAuth } from '../context/AuthContext'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery'
import { supabase } from '../lib/supabase'
import { MESES, formatMXN } from '../utils/constantes'
import { finMesISO, inicioMesISO, ultimosMeses } from '../utils/fecha'
import { calcularTotalGastos, sumarPorClasificacion } from '../utils/calculos'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid, ReferenceLine
} from 'recharts'
import {
  ChartLegend,
  ChartTooltip,
} from '../components/ui/Chart'
import {
  chartAxisProps,
  chartGridProps,
  formatCompactCurrency,
} from '../utils/chart'

export default function Tendencias() {
  const { user } = useAuth()
  const uid = user?.id
  const hoy = new Date()
  const periodoKey = `${hoy.getFullYear()}-${hoy.getMonth() + 1}`

  const { data: tendencias, loading } = useSupabaseQuery(async () => {
    const meses = ultimosMeses(6)
    // Los 6 meses se consultan en paralelo
    return Promise.all(meses.map(async ({ mes: m, anio: a }, idx) => {
      const [{ data: ing }, { data: tx }, { data: fijos }] = await Promise.all([
        supabase.from('ingresos').select('monto_actual').eq('user_id', user.id).eq('mes', m).eq('anio', a),
        supabase.from('transacciones').select('monto, clasificacion, origen').eq('user_id', user.id)
          .gte('fecha', inicioMesISO(m, a)).lte('fecha', finMesISO(m, a)),
        supabase.from('gastos_fijos').select('monto_actual, clasificacion').eq('user_id', user.id).eq('mes', m).eq('anio', a),
      ])
      // Igual que el Dashboard: las transacciones auto-generadas al pagar un
      // gasto fijo no se suman otra vez (ya cuentan como gasto fijo)
      const txSinFijos = (tx ?? []).filter(t => t.origen !== 'gastos_fijos')
      const esActual = idx === meses.length - 1
      return {
        mes:      `${MESES[m - 1].slice(0, 3)}${esActual ? '*' : ''}`,
        esActual,
        ingresos: ing?.reduce((s, i) => s + Number(i.monto_actual), 0) ?? 0,
        gastos:   calcularTotalGastos(fijos, txSinFijos).totalGastos,
        ...sumarPorClasificacion(fijos, txSinFijos),
      }
    }))
  }, [uid, periodoKey], `tendencias:finanzas:${uid}:${periodoKey}`)

  // Utilización de crédito por mes
  const { data: creditoTendencia, loading: loadingCredito } = useSupabaseQuery(async () => {
    // Métodos de pago vinculados a una tarjeta y límite total de crédito
    const [{ data: metodos }, { data: creditos }] = await Promise.all([
      supabase.from('metodos_pago')
        .select('id, nombre, credito_id').eq('user_id', user.id).eq('activo', true).not('credito_id', 'is', null),
      supabase.from('creditos')
        .select('id, nombre, limite_credito').eq('user_id', user.id).eq('activo', true),
    ])

    const totalLimite = creditos?.reduce((s, c) => s + Number(c.limite_credito ?? 0), 0) ?? 0
    if (!totalLimite || !metodos?.length) return null

    // Una sola consulta para los 6 meses; se agrupa por mes en memoria
    const meses = ultimosMeses(6)
    const primero = meses[0]
    const ultimo = meses[meses.length - 1]
    const { data: txRango } = await supabase.from('transacciones')
      .select('monto, metodo_pago_id, fecha').eq('user_id', user.id)
      .gte('fecha', inicioMesISO(primero.mes, primero.anio))
      .lte('fecha', finMesISO(ultimo.mes, ultimo.anio))
      .in('metodo_pago_id', metodos.map(m => m.id))

    const datos = meses.map(({ mes: m, anio: a }) => {
      const inicio = inicioMesISO(m, a)
      const fin = finMesISO(m, a)
      const tx = (txRango ?? []).filter(t => t.fecha >= inicio && t.fecha <= fin)
      const gastado = tx.reduce((s, t) => s + Number(t.monto), 0)

      // Desglose por tarjeta
      const desglose = {}
      for (const c of creditos) {
        const metodo = metodos.find(mp => mp.credito_id === c.id)
        if (!metodo) continue
        const gastadoCard = tx.filter(t => t.metodo_pago_id === metodo.id).reduce((s, t) => s + Number(t.monto), 0)
        const pctCard = c.limite_credito > 0 ? (gastadoCard / Number(c.limite_credito)) * 100 : 0
        desglose[c.nombre] = parseFloat(pctCard.toFixed(1))
      }

      return {
        mes: MESES[m - 1].slice(0, 3),
        pctTotal: parseFloat(((gastado / totalLimite) * 100).toFixed(1)),
        gastado,
        ...desglose,
      }
    })
    return { datos, creditos, totalLimite }
  }, [uid, periodoKey], `tendencias:creditos:${uid}:${periodoKey}`)

  const nombresTarjetas = creditoTendencia?.creditos
    ?.filter(c => creditoTendencia.datos?.some(d => d[c.nombre] !== undefined))
    .map(c => c.nombre) ?? []

  const COLORES_TARJETA = ['var(--chart-1)','var(--chart-2)','var(--chart-3)','var(--chart-4)','var(--chart-5)','var(--chart-6)']

  const mesConMasGastos = tendencias?.reduce((max, t) => t.gastos > (max?.gastos ?? 0) ? t : max, null)
  const promGastos = tendencias?.length ? tendencias.reduce((s, t) => s + t.gastos, 0) / tendencias.length : 0
  const promIngresos = tendencias?.length ? tendencias.reduce((s, t) => s + t.ingresos, 0) / tendencias.length : 0

  return (
    <Layout titulo="Tendencias">
      <div className="space-y-6">

        {/* Resumen */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Promedio Ingresos</p>
            <p className="text-lg lg:text-xl font-bold font-mono break-all" style={{ color: 'var(--positive-fg)' }}>{formatMXN(promIngresos)}</p>
            <p className="text-xs text-gray-400 mt-0.5">últimos 6 meses</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Promedio Gastos</p>
            <p className="text-lg lg:text-xl font-bold font-mono text-primary-700 break-all">{formatMXN(promGastos)}</p>
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Ingresos vs Gastos (6 meses)</h2>
            <span className="text-xs" style={{ color: 'var(--fg-4)' }}>* mes en curso (parcial)</span>
          </div>
          {loading
            ? <div className="h-56 bg-gray-50 animate-pulse rounded-lg" />
            : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={tendencias ?? []} margin={{ top: 8, right: 16, bottom: 0, left: -6 }}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="mes" {...chartAxisProps} />
                  <YAxis {...chartAxisProps} width={52} tickFormatter={formatCompactCurrency} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend content={<ChartLegend />} />
                  <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="var(--positive)" strokeWidth={3}
                    dot={{ r: 3, strokeWidth: 2, fill: 'var(--surface)' }} activeDot={{ r: 5, strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="gastos"   name="Gastos"   stroke="var(--negative)" strokeWidth={3}
                    dot={{ r: 3, strokeWidth: 2, fill: 'var(--surface)' }} activeDot={{ r: 5, strokeWidth: 0 }} />
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
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={tendencias ?? []} barSize={30} barCategoryGap="30%" margin={{ top: 8, right: 16, bottom: 0, left: -6 }}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="mes" {...chartAxisProps} />
                  <YAxis {...chartAxisProps} width={52} tickFormatter={formatCompactCurrency} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend content={<ChartLegend />} />
                  <Bar dataKey="necesidad" name="Necesidad" stackId="a" fill="var(--necesidad)" radius={[0,0,0,0]} />
                  <Bar dataKey="deseo"     name="Deseo"     stackId="a" fill="var(--deseo)" radius={[0,0,0,0]} />
                  <Bar dataKey="ahorro"    name="Ahorro"    stackId="a" fill="var(--ahorro)" radius={[6,6,0,0]} />
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
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={creditoTendencia.datos} margin={{ top: 8, right: 16, bottom: 0, left: -6 }}>
                    <CartesianGrid {...chartGridProps} />
                    <XAxis dataKey="mes" {...chartAxisProps} />
                    <YAxis {...chartAxisProps} width={42} tickFormatter={v => `${v}%`} domain={[0, dataMax => Math.max(35, Math.ceil(dataMax / 10) * 10)]} />
                    <Tooltip
                      content={<ChartTooltip
                        nameMap={{ pctTotal: 'Total' }}
                        valueFormatter={v => `${Number(v).toFixed(1)}%`}
                      />}
                    />
                    <Legend content={<ChartLegend nameMap={{ pctTotal: 'Total' }} />} />
                    <ReferenceLine y={30} stroke="var(--warning)" strokeDasharray="6 6" strokeWidth={2}
                      label={{ value: '30%', position: 'insideTopRight', fontSize: 11, fontWeight: 700, fill: 'var(--warning)' }} />
                    <Line type="monotone" dataKey="pctTotal" name="pctTotal" stroke="var(--primary-600)" strokeWidth={3}
                      dot={{ r: 3, strokeWidth: 2, fill: 'var(--surface)' }} activeDot={{ r: 5, strokeWidth: 0 }} />
                    {nombresTarjetas.map((nombre, i) => (
                      <Line key={nombre} type="monotone" dataKey={nombre} stroke={COLORES_TARJETA[i % COLORES_TARJETA.length]}
                        strokeWidth={1.8} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} strokeDasharray="5 4" />
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
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

      </div>
    </Layout>
  )
}
