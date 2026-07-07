import { useState } from 'react'
import Layout from '../components/layout/Layout'
import { usePlanQuincena } from '../hooks/usePlanQuincena'
import { useMes } from '../context/MesContext'
import { formatMXN, MESES, rangoQuincena } from '../utils/constantes'
import {
  PiggyBank, CheckCircle2, Circle, CalendarClock, Plus, Sparkles,
  Receipt, CreditCard, Wallet, TrendingUp, X,
} from 'lucide-react'
import ConfirmModal from '../components/ui/ConfirmModal'
import FilterSelect from '../components/ui/FilterSelect'
import ErrorState   from '../components/ui/ErrorState'
import { useToast } from '../components/ui/Toast'
import ProyeccionView from '../components/plan/ProyeccionView'

const TIPO_META = {
  gasto_fijo: { icon: Receipt,    emoji: '🧾', label: 'Gasto fijo' },
  deuda:      { icon: CreditCard, emoji: '💳', label: 'Deuda'      },
  ahorro:     { icon: PiggyBank,  emoji: '🐷', label: 'Ahorro'     },
  otro:       { icon: Wallet,     emoji: '📌', label: 'Otro'       },
}

const FORM_MANUAL = { concepto: '', monto: '', tipo: 'ahorro', origen_id: '' }

export default function PlanQuincena() {
  const { mes, anio } = useMes()
  const toast = useToast()
  const {
    modo, setModo, esMes, rango, loading, error, recargar, saving,
    ingresoEsperado, ingresoRecibido, usandoEstimado,
    compromisos, metasAhorro,
    totalCompromisos, totalApartado, libreSiApartasTodo, disponibleAhora, countApartados,
    apartar, quitarApartado, editarMonto, agregarManual, apartarTodo,
  } = usePlanQuincena()

  const [vista, setVista] = useState('plan')
  const [confirmQuitar, setConfirmQuitar] = useState(null)
  const [editId, setEditId] = useState(null)
  const [editValor, setEditValor] = useState('')
  const [mostrarManual, setMostrarManual] = useState(false)
  const [formManual, setFormManual] = useState(FORM_MANUAL)
  const setFM = (k, v) => setFormManual(f => ({ ...f, [k]: v }))

  const pendientes = compromisos.filter(c => !c.apartadoRow)
  const totalItems = compromisos.length

  const handleApartar = async (item) => {
    const { error } = await apartar(item)
    if (!error) toast(`Apartaste ${formatMXN(item.montoSugerido)} para ${item.concepto}`, 'success')
  }

  const handleApartarTodo = async () => {
    if (pendientes.length === 0) return
    const { error } = await apartarTodo()
    if (!error) toast(`Apartaste ${pendientes.length} compromiso(s)`, 'success')
  }

  const guardarEdicion = async (apartadoId) => {
    if (editValor) await editarMonto(apartadoId, editValor)
    setEditId(null); setEditValor('')
  }

  const handleAgregarManual = async () => {
    if (!formManual.concepto || !formManual.monto) return
    let concepto = formManual.concepto
    let origen_id = null
    if (formManual.tipo === 'ahorro' && formManual.origen_id) {
      const meta = metasAhorro.find(m => m.id === Number(formManual.origen_id))
      if (meta) { concepto = `Ahorro: ${meta.concepto}`; origen_id = meta.id }
    }
    const { error } = await agregarManual({ concepto, monto: formManual.monto, tipo: formManual.tipo, origen_id })
    if (!error) {
      toast('Apartado agregado ✓', 'success')
      setFormManual(FORM_MANUAL); setMostrarManual(false)
    }
  }

  if (error && !loading && compromisos.length === 0) {
    return (
      <Layout titulo="Plan de Quincena">
        <ErrorState onRetry={recargar} mensaje={error} />
      </Layout>
    )
  }

  return (
    <Layout titulo="Plan de Quincena">
      <div className="space-y-5">

        {/* Tabs: plan actual vs proyección */}
        <div className="flex gap-2">
          {[['plan', 'Plan actual'], ['proyeccion', 'Proyección 12 meses']].map(([k, label]) => (
            <button key={k} onClick={() => setVista(k)}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
              style={vista === k
                ? { background: 'var(--primary-700)', color: 'var(--fg-on-primary)' }
                : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg-2)' }}>
              {label}
            </button>
          ))}
        </div>

        {vista === 'proyeccion' ? <ProyeccionView /> : (
        <>

        {/* Selector de quincena */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            {[
              { k: 'q1',  label: '1ª Quincena', sub: () => { const r = rangoQuincena(mes, anio, 1); return `${r.diaInicio}–${r.diaFin} ${MESES[mes - 1].slice(0, 3)}` } },
              { k: 'q2',  label: '2ª Quincena', sub: () => { const r = rangoQuincena(mes, anio, 2); return `${r.diaInicio}–${r.diaFin} ${MESES[mes - 1].slice(0, 3)}` } },
              { k: 'mes', label: 'Mes completo', sub: () => MESES[mes - 1] },
            ].map(({ k, label, sub }) => {
              const active = modo === k
              return (
                <button key={k} onClick={() => setModo(k)}
                  className="px-4 py-2 text-sm font-semibold transition-colors leading-tight text-center"
                  style={{
                    background: active ? 'var(--primary-700)' : 'var(--surface-2)',
                    color: active ? 'var(--fg-on-primary)' : 'var(--fg-3)',
                  }}>
                  <div>{label}</div>
                  <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.85 }}>{sub()}</div>
                </button>
              )
            })}
          </div>
          {pendientes.length > 0 && (
            <button onClick={handleApartarTodo} disabled={saving}
              className="btn-primary flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4" /> Apartar todo ({pendientes.length})
            </button>
          )}
        </div>

        {/* Tarjetas de resultado */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--positive-fg)' }} />
              <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">
                {esMes ? 'Ingreso del mes' : 'Ingreso quincena'}
              </p>
            </div>
            <p className="text-xl font-bold font-mono text-gray-800">{formatMXN(ingresoEsperado)}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {usandoEstimado
                ? '≈ estimado de tu nómina'
                : ingresoRecibido > 0 ? `${formatMXN(ingresoRecibido)} recibido` : 'esperado'}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-1">A apartar</p>
            <p className="text-xl font-bold font-mono" style={{ color: 'var(--negative-fg)' }}>{formatMXN(totalCompromisos)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{totalItems} compromiso{totalItems !== 1 ? 's' : ''}</p>
          </div>
          <div className="card p-4" style={{ borderWidth: 2, borderColor: libreSiApartasTodo >= 0 ? 'var(--ahorro-bg)' : 'var(--negative-bg)' }}>
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-3.5 h-3.5" style={{ color: 'var(--primary-700)' }} />
              <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">Libre para gastar</p>
            </div>
            <p className="text-xl font-bold font-mono"
              style={{ color: libreSiApartasTodo >= 0 ? 'var(--ahorro-fg)' : 'var(--negative-fg)' }}>
              {formatMXN(libreSiApartasTodo)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">si apartas todo</p>
          </div>
          <div className="card p-4">
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Disponible ahora</p>
            <p className="text-xl font-bold font-mono text-primary-700">{formatMXN(disponibleAhora)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{formatMXN(totalApartado)} ya apartado</p>
          </div>
        </div>

        {/* Barra de progreso */}
        {totalItems > 0 && (
          <div className="card px-5 py-3">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-gray-700">Compromisos apartados</span>
              <span className="font-mono text-gray-500">{countApartados}/{totalItems}</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${totalItems > 0 ? (countApartados / totalItems) * 100 : 0}%`, background: 'var(--ahorro)' }} />
            </div>
          </div>
        )}

        {/* Acción: agregar manual */}
        <div className="flex justify-end">
          <button onClick={() => setMostrarManual(v => !v)} className="btn-secondary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Apartar para otra cosa
          </button>
        </div>

        {mostrarManual && (
          <div className="card p-5 border-2 border-primary-100">
            <h3 className="font-bold text-gray-900 mb-3">Nuevo apartado manual</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="label">Tipo</label>
                <FilterSelect
                  value={formManual.tipo}
                  onChange={v => setFM('tipo', v)}
                  options={[{ value: 'ahorro', label: '🐷 Ahorro' }, { value: 'otro', label: '📌 Otro' }]}
                  placeholder="Tipo" showClear={false}
                />
              </div>
              {formManual.tipo === 'ahorro' && metasAhorro.length > 0 && (
                <div>
                  <label className="label">Meta (opcional)</label>
                  <FilterSelect
                    value={formManual.origen_id}
                    onChange={v => setFM('origen_id', v)}
                    options={metasAhorro.map(m => ({ value: m.id, label: m.concepto }))}
                    placeholder="Sin meta"
                  />
                </div>
              )}
              <div className="col-span-2 lg:col-span-1">
                <label className="label">Concepto</label>
                <input className="input" placeholder="Ej: Fondo imprevistos"
                  value={formManual.concepto} onChange={e => setFM('concepto', e.target.value)} />
              </div>
              <div>
                <label className="label">Monto ($)</label>
                <input type="number" className="input font-mono" placeholder="0.00"
                  value={formManual.monto} onChange={e => setFM('monto', e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary px-6" onClick={handleAgregarManual} disabled={saving}>
                {saving ? 'Guardando...' : 'Apartar'}
              </button>
              <button className="btn-ghost" onClick={() => { setMostrarManual(false); setFormManual(FORM_MANUAL) }}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Lista de compromisos */}
        {loading ? (
          <div className="space-y-2">
            {Array(4).fill(0).map((_, i) => <div key={i} className="card h-16 animate-pulse bg-gray-50" />)}
          </div>
        ) : compromisos.length === 0 ? (
          <div className="card p-16 text-center text-gray-300 text-sm">
            No hay cobros ni apartados en esta quincena.<br />
            Agrega gastos fijos con día de cobro {rango.diaInicio}–{rango.diaFin} o aparta algo manualmente.
          </div>
        ) : (
          <div className="space-y-2">
            {compromisos.map(c => {
              const meta = TIPO_META[c.tipo] ?? TIPO_META.otro
              const estaApartado = !!c.apartadoRow
              const montoMostrado = estaApartado ? Number(c.apartadoRow.monto) : c.montoSugerido
              return (
                <div key={c.key}
                  className="card p-4 flex items-center gap-3 transition-all"
                  style={estaApartado ? { borderColor: 'var(--ahorro-bg)', borderWidth: 2 } : {}}>
                  <span className="text-xl flex-shrink-0">{meta.emoji}</span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800 text-sm truncate">{c.concepto}</p>
                      {c.pagado && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ background: 'var(--ahorro-bg)', color: 'var(--ahorro-fg)' }}>✅ ya pagado</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                      <span>{meta.label}</span>
                      {c.dia_cobro && (
                        <span className="flex items-center gap-1 font-mono">
                          <CalendarClock className="w-3 h-3" /> Día {c.dia_cobro}
                        </span>
                      )}
                      {c.sinFecha && c.tipo !== 'ahorro' && c.tipo !== 'otro' && (
                        <span className="text-amber-500">sin día asignado</span>
                      )}
                    </div>
                  </div>

                  {/* Monto */}
                  {editId === c.apartadoRow?.id ? (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <input type="number" autoFocus
                        className="input text-sm py-1 px-2 w-28 font-mono text-right"
                        value={editValor} onChange={e => setEditValor(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && guardarEdicion(c.apartadoRow.id)} />
                      <button onClick={() => guardarEdicion(c.apartadoRow.id)}
                        className="w-7 h-7 text-white rounded-lg flex items-center justify-center" style={{ background: 'var(--ahorro)' }}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setEditId(null); setEditValor('') }}
                        className="w-7 h-7 bg-gray-200 text-gray-600 rounded-lg flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => estaApartado && (setEditId(c.apartadoRow.id), setEditValor(String(montoMostrado)))}
                      className="font-mono font-bold text-base flex-shrink-0 text-right tabular"
                      style={{ color: estaApartado ? 'var(--ahorro-fg)' : 'var(--fg-1)', fontVariantNumeric: 'tabular-nums' }}
                      title={estaApartado ? 'Click para editar monto' : ''}>
                      {formatMXN(montoMostrado)}
                    </button>
                  )}

                  {/* Botón apartar/quitar */}
                  {estaApartado ? (
                    <button onClick={() => setConfirmQuitar(c.apartadoRow.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0 transition-all"
                      style={{ background: 'var(--ahorro-bg)', color: 'var(--ahorro-fg)' }}>
                      <CheckCircle2 className="w-4 h-4" /> Apartado
                    </button>
                  ) : (
                    <button onClick={() => handleApartar(c)} disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0 transition-all"
                      style={{ background: 'var(--surface-3, #f3f4f6)', color: 'var(--fg-2)' }}>
                      <Circle className="w-4 h-4" /> Apartar
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <p className="text-xs text-gray-400 text-center">
          Los gastos fijos y deudas se sugieren según su día de cobro. Click en el monto apartado para ajustarlo.
        </p>
        </>
        )}
      </div>

      <ConfirmModal
        open={!!confirmQuitar}
        titulo="¿Quitar este apartado?"
        descripcion="El monto volverá a tu disponible y el compromiso quedará pendiente de apartar."
        onConfirm={() => { quitarApartado(confirmQuitar); setConfirmQuitar(null); toast('Apartado quitado', 'info') }}
        onCancel={() => setConfirmQuitar(null)}
      />
    </Layout>
  )
}
