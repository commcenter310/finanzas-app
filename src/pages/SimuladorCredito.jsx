import { useState, useMemo } from 'react'
import Layout from '../components/layout/Layout'
import { formatMXN } from '../utils/constantes'
import { Calculator, TrendingDown, AlertTriangle } from 'lucide-react'

function simular(monto, tasaAnual, pagoMensual) {
  const tasaMensual = tasaAnual / 100 / 12
  if (tasaMensual <= 0) return { imposible: false, meses: 0, totalIntereses: 0, totalPagado: monto, tabla: [] }
  if (pagoMensual <= monto * tasaMensual) return { imposible: true }

  let saldo = monto
  let totalIntereses = 0
  const tabla = []

  while (saldo > 0.01 && tabla.length < 600) {
    const interes    = saldo * tasaMensual
    const amortizacion = Math.min(pagoMensual - interes, saldo)
    saldo -= amortizacion
    totalIntereses += interes
    tabla.push({
      mes:          tabla.length + 1,
      pago:         amortizacion + interes,
      interes:      interes,
      amortizacion: amortizacion,
      saldo:        Math.max(saldo, 0),
    })
  }

  const fechaFin = new Date()
  fechaFin.setMonth(fechaFin.getMonth() + tabla.length)

  return {
    imposible: false,
    meses:          tabla.length,
    totalIntereses,
    totalPagado:    monto + totalIntereses,
    tabla,
    fechaFin:       fechaFin.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }),
  }
}

const COMPARATIVOS = [0, 500, 1000, 2000]

export default function SimuladorCredito() {
  const [monto,    setMonto]    = useState('')
  const [tasa,     setTasa]     = useState('')
  const [pago,     setPago]     = useState('')
  const [verTabla, setVerTabla] = useState(false)

  const montoNum = Number(monto)
  const tasaNum  = Number(tasa)
  const pagoNum  = Number(pago)
  const listo    = montoNum > 0 && tasaNum > 0 && pagoNum > 0

  const resultado = useMemo(
    () => listo ? simular(montoNum, tasaNum, pagoNum) : null,
    [montoNum, tasaNum, pagoNum]
  )

  const comparativos = useMemo(() => {
    if (!listo) return []
    return COMPARATIVOS.map(extra => {
      const r = simular(montoNum, tasaNum, pagoNum + extra)
      return { extra, ...r }
    })
  }, [montoNum, tasaNum, pagoNum, listo])

  const pagoMinEstimado = montoNum > 0 ? (montoNum * 0.015).toFixed(0) : ''

  return (
    <Layout titulo="Simulador de Crédito">
      <div className="space-y-6">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Inputs */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-5 h-5 text-primary-700" />
              <h2 className="font-bold text-gray-900">Datos del Crédito</h2>
            </div>

            <div>
              <label className="label">Monto de la deuda ($)</label>
              <input type="number" className="input font-mono" placeholder="50,000"
                value={monto} onChange={e => setMonto(e.target.value)} />
            </div>
            <div>
              <label className="label">Tasa de interés anual (%)</label>
              <input type="number" step="0.1" className="input font-mono" placeholder="36"
                value={tasa} onChange={e => setTasa(e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">
                Referencia: NU ~36% · Liverpool ~85% · HSBC ~28%
              </p>
            </div>
            <div>
              <label className="label">Pago mensual que harás ($)</label>
              <input type="number" className="input font-mono" placeholder={pagoMinEstimado || '2,000'}
                value={pago} onChange={e => setPago(e.target.value)} />
              {pagoMinEstimado && (
                <p className="text-xs text-gray-400 mt-1">
                  Pago mínimo estimado (~1.5%): {formatMXN(Number(pagoMinEstimado))}
                </p>
              )}
            </div>
          </div>

          {/* Resultado principal */}
          <div className="card p-5 flex flex-col justify-center">
            {!listo && (
              <div className="text-center text-gray-300 py-8">
                <Calculator className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Ingresa los datos para ver la simulación</p>
              </div>
            )}

            {listo && resultado?.imposible && (
              <div className="text-center py-8">
                <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-red-400" />
                <p className="font-bold text-red-600 text-lg mb-1">Pago insuficiente</p>
                <p className="text-sm text-gray-500">
                  El pago mensual no cubre ni los intereses.<br />
                  Interés mensual: {formatMXN(montoNum * (tasaNum / 100 / 12))}
                </p>
                <p className="text-xs text-gray-400 mt-3">
                  Necesitas pagar más de {formatMXN(montoNum * (tasaNum / 100 / 12))} solo para no crecer la deuda.
                </p>
              </div>
            )}

            {listo && resultado && !resultado.imposible && (
              <div className="space-y-4">
                <h2 className="font-bold text-gray-900">Resultado</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-primary-50 rounded-xl p-4 border border-primary-100">
                    <p className="text-xs text-gray-400 mb-1">Tiempo para liquidar</p>
                    <p className="text-2xl font-bold font-mono text-primary-700">
                      {resultado.meses < 12
                        ? `${resultado.meses} meses`
                        : `${Math.floor(resultado.meses/12)}a ${resultado.meses % 12}m`}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">~{resultado.fechaFin}</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                    <p className="text-xs text-gray-400 mb-1">Intereses totales</p>
                    <p className="text-2xl font-bold font-mono text-amber-600">{formatMXN(resultado.totalIntereses)}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {((resultado.totalIntereses / montoNum) * 100).toFixed(0)}% del monto original
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                    <p className="text-xs text-gray-400 mb-1">Costo total</p>
                    <p className="text-2xl font-bold font-mono text-red-600">{formatMXN(resultado.totalPagado)}</p>
                    <p className="text-xs text-gray-400 mt-1">Capital + intereses</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs text-gray-400 mb-1">Pago mensual</p>
                    <p className="text-2xl font-bold font-mono text-gray-700">{formatMXN(pagoNum)}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {((pagoNum / montoNum) * 100).toFixed(1)}% del capital
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Comparativa de pagos */}
        {listo && resultado && !resultado.imposible && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-gray-900">¿Qué pasa si pago más?</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-gray-50">
                    {['Pago mensual','Meses','Intereses totales','Costo total','Ahorro vs. base'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {comparativos.map(({ extra, imposible, meses, totalIntereses, totalPagado }) => {
                    if (imposible) return null
                    const ahorro = comparativos[0].totalIntereses - totalIntereses
                    const esBase = extra === 0
                    return (
                      <tr key={extra} className={esBase ? 'bg-primary-50' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-3 font-mono font-bold text-gray-800">
                          {formatMXN(pagoNum + extra)}
                          {extra > 0 && <span className="text-emerald-600 text-xs ml-1">(+{formatMXN(extra)})</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-700">
                          {meses < 12 ? `${meses}m` : `${Math.floor(meses/12)}a ${meses%12}m`}
                        </td>
                        <td className="px-4 py-3 font-mono text-amber-600">{formatMXN(totalIntereses)}</td>
                        <td className="px-4 py-3 font-mono text-red-600">{formatMXN(totalPagado)}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-emerald-600">
                          {ahorro > 0 ? `+${formatMXN(ahorro)}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tabla de amortización */}
        {listo && resultado && !resultado.imposible && resultado.tabla.length > 0 && (
          <div className="card overflow-hidden">
            <button
              onClick={() => setVerTabla(v => !v)}
              className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              <span>Tabla de amortización ({resultado.tabla.length} pagos)</span>
              <span className="text-gray-400 text-xs">{verTabla ? 'Ocultar ▲' : 'Ver detalle ▼'}</span>
            </button>
            {verTabla && (
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-sm min-w-[380px]">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-gray-100">
                      {['#','Pago','Interés','Amortización','Saldo'].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {resultado.tabla.map(row => (
                      <tr key={row.mes} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-400 font-mono">{row.mes}</td>
                        <td className="px-4 py-2 font-mono text-gray-700">{formatMXN(row.pago)}</td>
                        <td className="px-4 py-2 font-mono text-amber-600">{formatMXN(row.interes)}</td>
                        <td className="px-4 py-2 font-mono text-emerald-600">{formatMXN(row.amortizacion)}</td>
                        <td className="px-4 py-2 font-mono text-gray-600">{formatMXN(row.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </Layout>
  )
}
