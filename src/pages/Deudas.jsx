import { useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { useDeudas } from '../hooks/useDeudas'
import { formatMXN } from '../utils/constantes'
import { Plus, ChevronDown, ChevronUp, Trash2, CreditCard, ExternalLink } from 'lucide-react'
import ConfirmModal from '../components/ui/ConfirmModal'
import DatePicker   from '../components/ui/DatePicker'

const FORM_VACIO = { nombre:'', saldo_original:'', saldo_actual:'', pago_mensual:'', tasa_interes:'', fecha_proximo_pago:'', notas:'' }

export default function Deudas() {
  const { deudas, loading, saving, totalDeuda, totalPagoMensual, snowball, avalanche, agregar, abonar, abonarCredito, eliminar } = useDeudas()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [expandida, setExpandida] = useState(null)
  const [montoAbono, setMontoAbono] = useState({})
  const [tab, setTab] = useState('deudas')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const handleAgregar = async () => {
    if (!form.nombre || !form.saldo_actual) return
    await agregar({
      ...form,
      saldo_original: form.saldo_original || form.saldo_actual,
      saldo_actual:   Number(form.saldo_actual),
      pago_mensual:   Number(form.pago_mensual)  || null,
      tasa_interes:   Number(form.tasa_interes)  || null,
    })
    setForm(FORM_VACIO); setMostrarForm(false)
  }

  const handleAbonar = async (deudaId) => {
    const monto = montoAbono[deudaId]
    if (!monto || Number(monto) <= 0) return
    const deuda = deudas.find(d => d.id === deudaId)
    if (deuda && Number(monto) > Number(deuda.saldo_actual)) {
      alert(`El pago ($${Number(monto).toLocaleString('es-MX')}) no puede ser mayor al saldo actual ($${Number(deuda.saldo_actual).toLocaleString('es-MX')})`)
      return
    }
    // Si es tarjeta de crédito, actualiza saldo_utilizado en creditos
    if (deuda?.tipo === 'credito') {
      await abonarCredito(deuda.credito_id, monto)
    } else {
      await abonar(deudaId, monto)
    }
    setMontoAbono(m => ({ ...m, [deudaId]: '' }))
  }

  return (
    <Layout titulo="Deudas">
      <div className="space-y-4">

        {/* Tarjetas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
          <div className="card p-4" style={{ background: 'var(--negative-bg)', borderColor: 'var(--negative-bg)' }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] mb-2" style={{ color: 'var(--negative-fg)' }}>Total Deuda</p>
            <p className="text-2xl font-bold tabular" style={{ color: 'var(--negative-fg)', fontVariantNumeric: 'tabular-nums' }}>{formatMXN(totalDeuda)}</p>
          </div>
          <div className="card p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] mb-2" style={{ color: 'var(--fg-3)' }}>Pago Mensual</p>
            <p className="text-2xl font-bold tabular" style={{ color: 'var(--primary-700)', fontVariantNumeric: 'tabular-nums' }}>{formatMXN(totalPagoMensual)}</p>
          </div>
          <div className="card p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] mb-2" style={{ color: 'var(--fg-3)' }}>Número de Deudas</p>
            <p className="text-2xl font-bold tabular" style={{ color: 'var(--fg-1)', fontVariantNumeric: 'tabular-nums' }}>{deudas.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {[['deudas','Mis Deudas'],['calculadora','Calculadora']].map(([k,l]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all
                  ${tab === k ? 'bg-primary-700 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
                {l}
              </button>
            ))}
          </div>
          {tab === 'deudas' && (
            <button onClick={() => setMostrarForm(v => !v)} className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Agregar Deuda
            </button>
          )}
        </div>

        {tab === 'deudas' && (
          <>
            {mostrarForm && (
              <div className="card p-5 border-2" style={{ borderColor: 'var(--negative-bg)' }}>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                  <div className="col-span-2">
                    <label className="label">Nombre</label>
                    <input className="input" placeholder="Ej: Mercado Pago, DIDI..."
                      value={form.nombre} onChange={e => setF('nombre', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Saldo Actual ($)</label>
                    <input type="number" className="input font-mono"
                      value={form.saldo_actual} onChange={e => setF('saldo_actual', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Saldo Original ($)</label>
                    <input type="number" className="input font-mono"
                      value={form.saldo_original} onChange={e => setF('saldo_original', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Pago Mensual ($)</label>
                    <input type="number" className="input font-mono"
                      value={form.pago_mensual} onChange={e => setF('pago_mensual', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Tasa Interés (%)</label>
                    <input type="number" className="input font-mono" placeholder="0"
                      value={form.tasa_interes} onChange={e => setF('tasa_interes', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Próximo Pago</label>
                    <DatePicker
                      value={form.fecha_proximo_pago}
                      onChange={v => setF('fecha_proximo_pago', v)}
                    />
                  </div>
                  <div>
                    <label className="label">Notas</label>
                    <input className="input text-sm"
                      value={form.notas} onChange={e => setF('notas', e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn-primary px-6" onClick={handleAgregar} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button className="btn-ghost" onClick={() => setMostrarForm(false)}>Cancelar</button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {loading
                ? Array(3).fill(0).map((_,i) => <div key={i} className="card h-20 animate-pulse bg-gray-50" />)
                : deudas.length === 0
                  ? <div className="card p-16 text-center text-gray-300 text-sm">Sin deudas registradas 🎉</div>
                  : deudas.map(d => {
                    const esTarjeta = d.tipo === 'credito'
                    const pct = d.saldo_original > 0
                      ? ((Number(d.saldo_original) - Number(d.saldo_actual)) / Number(d.saldo_original)) * 100 : 0
                    const expandido = expandida === d.id
                    return (
                      <div key={d.id}
                        className="card overflow-hidden"
                        style={esTarjeta ? { borderLeft: '3px solid var(--primary-200)' } : {}}
                      >
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-gray-900">{d.nombre}</p>
                                {/* Chip que indica que viene de Créditos */}
                                {esTarjeta && (
                                  <span
                                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                                    style={{ background: 'var(--primary-50)', color: 'var(--primary-700)' }}
                                  >
                                    <CreditCard className="w-3 h-3" />
                                    Tarjeta
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                                {d.pago_mensual > 0 && <span>Pago: {formatMXN(d.pago_mensual)}/mes</span>}
                                {d.tasa_interes > 0 && <span>Tasa: {d.tasa_interes}%</span>}
                                {d.fecha_proximo_pago && <span>Próximo: {d.fecha_proximo_pago}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="text-right">
                                <p className="font-bold font-mono text-lg" style={{ color: 'var(--negative-fg)' }}>{formatMXN(d.saldo_actual)}</p>
                                {d.saldo_original > 0 && <p className="text-xs text-gray-400">de {formatMXN(d.saldo_original)}</p>}
                              </div>
                              {/* Tarjeta: link a Créditos | Deuda manual: botón eliminar */}
                              {esTarjeta ? (
                                <Link
                                  to="/creditos"
                                  className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                                  title="Administrar en Créditos"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                              ) : (
                                <button onClick={() => setConfirmDelete(d.id)}
                                  className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-gray-300">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {d.saldo_original > 0 && (
                            <div className="mb-3">
                              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--negative-bg)' }}>
                                <div className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(esTarjeta ? (d.saldo_actual / d.saldo_original) * 100 : pct, 100)}%`,
                                    background: esTarjeta ? 'var(--negative)' : 'var(--ahorro)',
                                  }}
                                />
                              </div>
                              <p className="text-xs mt-1" style={{ color: 'var(--fg-4)' }}>
                                {esTarjeta
                                  ? `${((d.saldo_actual / d.saldo_original) * 100).toFixed(0)}% del límite utilizado`
                                  : `${pct.toFixed(0)}% pagado`
                                }
                              </p>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              className="input text-sm py-1.5 font-mono w-full sm:w-36"
                              placeholder={esTarjeta ? 'Monto pago' : 'Monto abono'}
                              value={montoAbono[d.id] ?? ''}
                              onChange={e => setMontoAbono(m => ({ ...m, [d.id]: e.target.value }))}
                            />
                            <button onClick={() => handleAbonar(d.id)} className="btn-secondary text-sm py-1.5 px-3">
                              {esTarjeta ? 'Pagar' : 'Abonar'}
                            </button>
                            <button onClick={() => setExpandida(expandido ? null : d.id)}
                              className="btn-ghost text-sm flex items-center gap-1 ml-auto">
                              Historial {expandido ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {expandido && d.abonos_deuda?.length > 0 && (
                          <div className="border-t border-gray-50 bg-gray-50 px-4 py-3">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                              {esTarjeta ? 'Historial de Pagos' : 'Historial de Abonos'}
                            </p>
                            <div className="space-y-1.5">
                              {[...d.abonos_deuda].sort((a,b) => b.fecha.localeCompare(a.fecha)).map(a => (
                                <div key={a.id} className="flex justify-between text-sm">
                                  <span className="text-gray-500 font-mono">{a.fecha}</span>
                                  <span className="font-semibold" style={{ color: 'var(--ahorro-fg)' }}>-{formatMXN(a.monto)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {expandido && d.abonos_deuda?.length === 0 && (
                          <div className="border-t border-gray-50 bg-gray-50 px-4 py-3 text-sm text-gray-300 text-center">
                            {esTarjeta ? 'Sin pagos registrados' : 'Sin abonos registrados'}
                          </div>
                        )}
                      </div>
                    )
                  })}
            </div>
          </>
        )}

        {tab === 'calculadora' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: '❄️ Método Snowball', subtitle: 'Paga primero la deuda más pequeña (motivación)', lista: snowball, headerStyle: { background: 'var(--primary-50)' } },
              { title: '🏔️ Método Avalanche', subtitle: 'Paga primero la deuda con mayor tasa (ahorra más)', lista: avalanche, headerStyle: { background: 'var(--warning-bg)' } },
            ].map(({ title, subtitle, lista, headerStyle }) => (
              <div key={title} className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100" style={headerStyle}>
                  <h3 className="font-bold text-gray-900">{title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
                </div>
                {lista.length === 0
                  ? <div className="p-8 text-center text-gray-300 text-sm">Sin deudas registradas</div>
                  : <div className="divide-y divide-gray-50">
                    {lista.map((d, i) => (
                      <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                        <span className="w-6 h-6 rounded-full bg-primary-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-semibold text-sm text-gray-800">{d.nombre}</p>
                            {d.tipo === 'credito' && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ background: 'var(--primary-50)', color: 'var(--primary-700)' }}>
                                💳
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">
                            {formatMXN(d.saldo_actual)}{d.tasa_interes ? ` · ${d.tasa_interes}% anual` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>}
              </div>
            ))}
          </div>
        )}

      </div>
      <ConfirmModal
        open={!!confirmDelete}
        titulo="¿Eliminar deuda?"
        descripcion="Esta acción no se puede deshacer."
        onConfirm={() => { eliminar(confirmDelete); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
      />
    </Layout>
  )
}
