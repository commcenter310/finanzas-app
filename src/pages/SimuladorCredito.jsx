import { useState, useMemo } from 'react'
import Layout from '../components/layout/Layout'
import { useDeudas } from '../hooks/useDeudas'
import { formatMXN } from '../utils/constantes'
import FilterSelect from '../components/ui/FilterSelect'
import { Calculator, TrendingDown, AlertTriangle } from 'lucide-react'

// Simula la amortización de un crédito.
// periodosPorAnio: 12 = pago mensual · 24 = pago quincenal (muchos préstamos bancarios)
function simular(monto, tasaAnual, pagoPeriodo, periodosPorAnio = 12) {
  const tasaPeriodo = tasaAnual / 100 / periodosPorAnio
  if (tasaPeriodo <= 0) return { imposible: false, periodos: 0, totalIntereses: 0, totalPagado: monto, tabla: [] }
  if (pagoPeriodo <= monto * tasaPeriodo) return { imposible: true }

  let saldo = monto
  let totalIntereses = 0
  const tabla = []

  // Cap alto porque en quincenal hay el doble de periodos
  while (saldo > 0.01 && tabla.length < 1200) {
    const interes      = saldo * tasaPeriodo
    const amortizacion = Math.min(pagoPeriodo - interes, saldo)
    saldo -= amortizacion
    totalIntereses += interes
    tabla.push({
      n:            tabla.length + 1,
      pago:         amortizacion + interes,
      interes,
      amortizacion,
      saldo:        Math.max(saldo, 0),
    })
  }

  const fechaFin = new Date()
  if (periodosPorAnio === 24) fechaFin.setDate(fechaFin.getDate() + tabla.length * 15)
  else                        fechaFin.setMonth(fechaFin.getMonth() + tabla.length)

  return {
    imposible: false,
    periodos:       tabla.length,
    totalIntereses,
    totalPagado:    monto + totalIntereses,
    tabla,
    fechaFin:       fechaFin.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }),
  }
}

// Texto humano de la duración. En quincenal muestra el equivalente en meses.
function duracionLabel(periodos, esQuincenal) {
  if (esQuincenal) {
    const meses = periodos / 2
    const mesesStr = Number.isInteger(meses) ? `${meses}` : meses.toFixed(1)
    return { grande: `${periodos} quincenas`, chico: `≈ ${mesesStr} meses` }
  }
  const grande = periodos < 12 ? `${periodos} meses` : `${Math.floor(periodos / 12)}a ${periodos % 12}m`
  return { grande, chico: null }
}

const COMPARATIVOS = [0, 500, 1000, 2000]

export default function SimuladorCredito() {
  const { deudas } = useDeudas()
  const [monto,      setMonto]      = useState('')
  const [tasa,       setTasa]       = useState('')
  const [pago,       setPago]       = useState('')
  const [frecuencia, setFrecuencia] = useState('mensual') // 'mensual' | 'quincenal'
  const [verTabla,   setVerTabla]   = useState(false)
  const [deudaSel,   setDeudaSel]   = useState('')

  // Pre-llenar con una deuda o tarjeta real (saldo, tasa y pago si los tiene)
  const cargarDeuda = (id) => {
    setDeudaSel(id)
    const d = deudas.find(x => String(x.id) === String(id))
    if (!d) return
    setMonto(String(d.saldo_actual ?? ''))
    setTasa(d.tasa_interes != null ? String(d.tasa_interes) : '')
    setPago(d.pago_mensual != null ? String(d.pago_mensual) : '')
  }

  const esQuincenal     = frecuencia === 'quincenal'
  const periodosPorAnio = esQuincenal ? 24 : 12
  const unidad          = esQuincenal ? 'quincena' : 'mes'
  const unidadPlural    = esQuincenal ? 'quincenas' : 'meses'
  const unidadAbrev     = esQuincenal ? 'q' : 'm'

  const montoNum = Number(monto)
  const tasaNum  = Number(tasa)
  const pagoNum  = Number(pago)
  const listo    = montoNum > 0 && tasaNum > 0 && pagoNum > 0

  const resultado = useMemo(
    () => listo ? simular(montoNum, tasaNum, pagoNum, periodosPorAnio) : null,
    [montoNum, tasaNum, pagoNum, periodosPorAnio, listo]
  )

  const comparativos = useMemo(() => {
    if (!listo) return []
    return COMPARATIVOS.map(extra => {
      const r = simular(montoNum, tasaNum, pagoNum + extra, periodosPorAnio)
      return { extra, ...r }
    })
  }, [montoNum, tasaNum, pagoNum, periodosPorAnio, listo])

  // Interés por periodo del primer pago — referencia de pago mínimo para no crecer la deuda
  const interesPeriodo = montoNum > 0 && tasaNum > 0 ? montoNum * (tasaNum / 100 / periodosPorAnio) : 0
  const pagoMinEstimado = montoNum > 0 ? (montoNum * (esQuincenal ? 0.0075 : 0.015)).toFixed(0) : ''

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

            {/* Cargar una deuda o tarjeta real */}
            {deudas.length > 0 && (
              <div>
                <label className="label">Cargar una deuda mía <span className="text-fg-4 font-normal">(opcional)</span></label>
                <FilterSelect
                  value={deudaSel}
                  onChange={cargarDeuda}
                  options={deudas.map(d => ({
                    value: d.id,
                    label: `${d.tipo === 'credito' ? '💳 ' : ''}${d.nombre} — ${formatMXN(d.saldo_actual)}`,
                  }))}
                  placeholder="Elegir deuda o tarjeta..."
                />
                <p className="text-xs text-gray-400 mt-1">
                  Pre-llena saldo, tasa y pago con tus datos reales.
                </p>
              </div>
            )}

            {/* Frecuencia de pago */}
            <div>
              <label className="label">Frecuencia de pago</label>
              <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                {[
                  { v: 'mensual',   t: 'Mensual'   },
                  { v: 'quincenal', t: 'Quincenal' },
                ].map(op => {
                  const active = frecuencia === op.v
                  return (
                    <button key={op.v} type="button"
                      onClick={() => setFrecuencia(op.v)}
                      className="flex-1 py-2 text-sm font-semibold transition-colors"
                      style={{
                        background: active ? 'var(--primary)' : 'var(--surface-2)',
                        color:      active ? 'var(--fg-on-primary)' : 'var(--fg-3)',
                      }}>
                      {op.t}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Muchos préstamos bancarios se pagan por quincena (2 pagos al mes).
              </p>
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
              {tasaNum > 100 && (
                <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--negative-fg)' }}>
                  ⚠️ Tasa muy alta. Considera liquidar antes o buscar otra opción.
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Referencia: NU ~36% · Liverpool ~85% · HSBC ~28%
              </p>
            </div>
            <div>
              <label className="label">Pago {esQuincenal ? 'quincenal' : 'mensual'} que harás ($)</label>
              <input type="number" className="input font-mono" placeholder={pagoMinEstimado || '2,000'}
                value={pago} onChange={e => setPago(e.target.value)} />
              {pagoMinEstimado && (
                <p className="text-xs text-gray-400 mt-1">
                  Pago mínimo estimado: {formatMXN(Number(pagoMinEstimado))} por {unidad}
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
                <AlertTriangle className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--negative)' }} />
                <p className="font-bold text-lg mb-1" style={{ color: 'var(--negative-fg)' }}>Pago insuficiente</p>
                <p className="text-sm text-gray-500">
                  El pago por {unidad} no cubre ni los intereses.<br />
                  Interés por {unidad}: {formatMXN(interesPeriodo)}
                </p>
                <p className="text-xs text-gray-400 mt-3">
                  Necesitas pagar más de {formatMXN(interesPeriodo)} cada {unidad} solo para no crecer la deuda.
                </p>
              </div>
            )}

            {listo && resultado && !resultado.imposible && (() => {
              const dur = duracionLabel(resultado.periodos, esQuincenal)
              return (
                <div className="space-y-4">
                  <h2 className="font-bold text-gray-900">Resultado</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-primary-50 rounded-xl p-4 border border-primary-100">
                      <p className="text-xs text-gray-400 mb-1">Tiempo para liquidar</p>
                      <p className="text-2xl font-bold font-mono text-primary-700">{dur.grande}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {dur.chico ? `${dur.chico} · ` : ''}~{resultado.fechaFin}
                      </p>
                    </div>
                    <div className="rounded-xl p-4 border" style={{ background: 'var(--warning-bg)', borderColor: 'var(--warning-bg)' }}>
                      <p className="text-xs text-gray-400 mb-1">Intereses totales</p>
                      <p className="text-2xl font-bold font-mono" style={{ color: 'var(--warning-fg)' }}>{formatMXN(resultado.totalIntereses)}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {((resultado.totalIntereses / montoNum) * 100).toFixed(0)}% del monto original
                      </p>
                    </div>
                    <div className="rounded-xl p-4 border" style={{ background: 'var(--negative-bg)', borderColor: 'var(--negative-bg)' }}>
                      <p className="text-xs text-gray-400 mb-1">Costo total</p>
                      <p className="text-2xl font-bold font-mono" style={{ color: 'var(--negative-fg)' }}>{formatMXN(resultado.totalPagado)}</p>
                      <p className="text-xs text-gray-400 mt-1">Capital + intereses</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <p className="text-xs text-gray-400 mb-1">Pago por {unidad}</p>
                      <p className="text-2xl font-bold font-mono text-gray-700">{formatMXN(pagoNum)}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {((pagoNum / montoNum) * 100).toFixed(1)}% del capital
                      </p>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>

        {/* Comparativa de pagos */}
        {listo && resultado && !resultado.imposible && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-5 h-5" style={{ color: 'var(--ahorro-fg)' }} />
              <h2 className="font-bold text-gray-900">¿Qué pasa si pago más?</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-gray-50">
                    {[`Pago por ${unidad}`, unidadPlural.charAt(0).toUpperCase() + unidadPlural.slice(1), 'Intereses totales', 'Costo total', 'Ahorro vs. base'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {comparativos.map(({ extra, imposible, periodos, totalIntereses, totalPagado }) => {
                    if (imposible) return null
                    const ahorro = comparativos[0].totalIntereses - totalIntereses
                    const esBase = extra === 0
                    const dur = duracionLabel(periodos, esQuincenal)
                    return (
                      <tr key={extra} className={esBase ? 'bg-primary-50' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-3 font-mono font-bold text-gray-800">
                          {formatMXN(pagoNum + extra)}
                          {extra > 0 && <span className="text-emerald-600 text-xs ml-1">(+{formatMXN(extra)})</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-700">
                          {esQuincenal ? `${periodos}${unidadAbrev} (${dur.chico?.replace('≈ ', '~')})` : dur.grande}
                        </td>
                        <td className="px-4 py-3 font-mono" style={{ color: 'var(--warning-fg)' }}>{formatMXN(totalIntereses)}</td>
                        <td className="px-4 py-3 font-mono" style={{ color: 'var(--negative-fg)' }}>{formatMXN(totalPagado)}</td>
                        <td className="px-4 py-3 font-mono font-semibold" style={{ color: 'var(--ahorro-fg)' }}>
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
              <span>Tabla de amortización ({resultado.tabla.length} pagos {esQuincenal ? 'quincenales' : 'mensuales'})</span>
              <span className="text-gray-400 text-xs">{verTabla ? 'Ocultar ▲' : 'Ver detalle ▼'}</span>
            </button>
            {verTabla && (
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-sm min-w-[380px]">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="border-b border-gray-100">
                      {['#','Pago','Interés','Amortización','Saldo'].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {resultado.tabla.map(row => (
                      <tr key={row.n} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-400 font-mono">{row.n}</td>
                        <td className="px-4 py-2 font-mono text-gray-700">{formatMXN(row.pago)}</td>
                        <td className="px-4 py-2 font-mono" style={{ color: 'var(--warning-fg)' }}>{formatMXN(row.interes)}</td>
                        <td className="px-4 py-2 font-mono" style={{ color: 'var(--ahorro-fg)' }}>{formatMXN(row.amortizacion)}</td>
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
