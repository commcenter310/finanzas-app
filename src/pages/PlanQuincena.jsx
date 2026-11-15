import { useState } from 'react'
import Layout from '../components/layout/Layout'
import { usePlanQuincena } from '../hooks/usePlanQuincena'
import { useMes } from '../context/MesContext'
import { formatMXN, MESES, rangoQuincena } from '../utils/constantes'
import {
  PiggyBank, CheckCircle2, Circle, CalendarClock, Plus,
  Receipt, CreditCard, Wallet, X,
} from 'lucide-react'
import ConfirmModal from '../components/ui/ConfirmModal'
import FilterSelect from '../components/ui/FilterSelect'
import ErrorState   from '../components/ui/ErrorState'
import EmptyState   from '../components/ui/EmptyState'
import { plural } from '../utils/texto'
import { useToast } from '../components/ui/Toast'
import { useGuardarConAviso } from '../hooks/useGuardarConAviso'
import { esMontoPositivo, textoLimpio } from '../utils/validaciones'
import ProyeccionView from '../components/plan/ProyeccionView'

const TIPO_META = {
  gasto_fijo: { icon: Receipt,    emoji: '🧾', label: 'Gasto fijo' },
  deuda:      { icon: CreditCard, emoji: '💳', label: 'Deuda'      },
  ahorro:     { icon: PiggyBank,  emoji: '🐷', label: 'Ahorro'     },
  otro:       { icon: Wallet,     emoji: '📌', label: 'Otro'       },
}

const FORM_MANUAL = { concepto: '', monto: '', tipo: 'ahorro', origen_id: '' }
const AVISO_FALLO = { error: 'No se pudo guardar el cambio. Revisa tu conexión e intenta de nuevo.' }

export default function PlanQuincena() {
  const { mes, anio } = useMes()
  const toast = useToast()
  const guardar = useGuardarConAviso()
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
    if (!await guardar(apartar(item), AVISO_FALLO)) return
    toast(`Apartaste ${formatMXN(item.montoSugerido)} para ${item.concepto}`, 'success')
  }

  const handleApartarTodo = async () => {
    if (pendientes.length === 0) return
    if (!await guardar(apartarTodo(), AVISO_FALLO)) return
    toast(`Apartaste ${plural(pendientes.length, 'compromiso', 'compromisos')}`, 'success')
  }

  const guardarEdicion = async (apartadoId) => {
    if (editValor !== '') {
      if (!esMontoPositivo(editValor)) return toast('El monto apartado debe ser mayor a cero.', 'error')
      if (!await guardar(editarMonto(apartadoId, editValor), AVISO_FALLO)) return   // se deja abierto para reintentar
    }
    setEditId(null); setEditValor('')
  }

  const handleAgregarManual = async () => {
    // Con una meta de ahorro elegida, el concepto sale de la meta
    const conMeta = formManual.tipo === 'ahorro' && formManual.origen_id
    if ((!conMeta && !textoLimpio(formManual.concepto)) || !esMontoPositivo(formManual.monto)) {
      toast('Escribe el concepto y un monto mayor a cero.', 'error')
      return
    }
    let concepto = formManual.concepto
    let origen_id = null
    if (formManual.tipo === 'ahorro' && formManual.origen_id) {
      const meta = metasAhorro.find(m => m.id === Number(formManual.origen_id))
      if (meta) { concepto = `Ahorro: ${meta.concepto}`; origen_id = meta.id }
    }
    if (!await guardar(agregarManual({ concepto, monto: formManual.monto, tipo: formManual.tipo, origen_id }), AVISO_FALLO)) return
    toast('Apartado agregado', 'success')
    setFormManual(FORM_MANUAL); setMostrarManual(false)
  }

  if (error && !loading && compromisos.length === 0) {
    return (
      <Layout titulo="Plan de quincena">
        <ErrorState onRetry={recargar} mensaje={error} />
      </Layout>
    )
  }

  return (
    <Layout titulo="Plan de quincena">
      <div className="space-y-5">

        {/* Tabs: plan actual vs proyección */}
        <div className="tabs" role="tablist">
          {[['plan', 'Esta quincena'], ['proyeccion', 'Próximos 12 meses']].map(([k, label]) => (
            <button key={k} role="tab" aria-selected={vista === k} onClick={() => setVista(k)}
              className={`tab ${vista === k ? 'is-active' : ''}`}>
              {label}
            </button>
          ))}
        </div>

        {vista === 'proyeccion' ? <ProyeccionView /> : (
        <>

        {/* Selector de quincena */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="tabs">
            {[
              { k: 'q1',  label: '1ª quincena', sub: () => { const r = rangoQuincena(mes, anio, 1); return `${r.diaInicio}–${r.diaFin} ${MESES[mes - 1].slice(0, 3)}` } },
              { k: 'q2',  label: '2ª quincena', sub: () => { const r = rangoQuincena(mes, anio, 2); return `${r.diaInicio}–${r.diaFin} ${MESES[mes - 1].slice(0, 3)}` } },
              { k: 'mes', label: 'Todo el mes', sub: () => '' },
            ].map(({ k, label, sub }) => {
              const active = modo === k
              return (
                <button key={k} onClick={() => setModo(k)}
                  className={`tab ${active ? 'is-active' : ''}`}>
                  {label} <span className="font-normal" style={{ color: 'var(--fg-3)' }}>{sub()}</span>
                </button>
              )
            })}
          </div>
          {pendientes.length > 0 && (
            <button onClick={handleApartarTodo} disabled={saving}
              className="btn-primary flex items-center gap-2 text-sm">
              Apartar todo ({pendientes.length})
            </button>
          )}
        </div>

        {/* Tarjetas de resultado */}
        <div className="stat-strip grid grid-cols-2 lg:grid-cols-4">
          <div className="card p-4">
            <p className="stat-label">
              {esMes ? 'Ingreso del mes' : 'Ingreso de la quincena'}
            </p>
            <p className="stat-value">{formatMXN(ingresoEsperado)}</p>
            <p className="stat-nota">
              {usandoEstimado
                ? '≈ estimado de tu nómina'
                : ingresoRecibido > 0 ? `${formatMXN(ingresoRecibido)} recibido` : 'esperado'}
            </p>
          </div>
          <div className="card p-4">
            <p className="stat-label">A apartar</p>
            <p className="stat-value">{formatMXN(totalCompromisos)}</p>
            <p className="stat-nota">{totalItems} compromiso{totalItems !== 1 ? 's' : ''}</p>
          </div>
          <div className="card p-4">
            <p className="stat-label">Libre para gastar</p>
            <p className="stat-value"
              style={libreSiApartasTodo < 0 ? { color: 'var(--negative)' } : undefined}>
              {formatMXN(libreSiApartasTodo)}
            </p>
            <p className="stat-nota">si apartas todo</p>
          </div>
          <div className="card p-4">
            <p className="stat-label">Disponible ahora</p>
            <p className="stat-value">{formatMXN(disponibleAhora)}</p>
            <p className="stat-nota">{formatMXN(totalApartado)} ya apartado</p>
          </div>
        </div>

        {/* Barra de progreso */}
        {totalItems > 0 && (
          <div>
            <div className="flex justify-between text-sm mb-2" style={{ color: 'var(--fg-3)' }}>
              <span>Llevas apartados {countApartados} de {totalItems}</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
              <div className="h-full rounded-full bar-fill"
                style={{ width: `${totalItems > 0 ? (countApartados / totalItems) * 100 : 0}%`, background: 'var(--fg-1)' }} />
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
          <div className="card p-5">
            <h3 className="titulo-seccion mb-3">Apartar para otra cosa</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="label">Tipo</label>
                <FilterSelect
                  value={formManual.tipo}
                  onChange={v => setFM('tipo', v)}
                  options={[{ value: 'ahorro', label: 'Ahorro' }, { value: 'otro', label: 'Otro' }]}
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
            {Array(4).fill(0).map((_, i) => <div key={i} className="card h-16 animate-pulse" />)}
          </div>
        ) : compromisos.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No hay compromisos en esta quincena"
            description={`Agrega gastos fijos con dia de cobro ${rango.diaInicio}-${rango.diaFin} o aparta algo manualmente.`}
            action={
              <button onClick={() => setMostrarManual(true)} className="btn-primary text-sm">
                <Plus className="w-4 h-4" /> Apartar para otra cosa
              </button>
            }
          />
        ) : (
          <div className="card divide-y divide-[var(--divider)]">
            {compromisos.map(c => {
              const meta = TIPO_META[c.tipo] ?? TIPO_META.otro
              const estaApartado = !!c.apartadoRow
              const montoMostrado = estaApartado ? Number(c.apartadoRow.monto) : c.montoSugerido
              return (
                <div key={c.key} className="px-5 py-3 flex items-center gap-4">

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate" style={{ color: 'var(--fg-1)' }}>{c.concepto}</p>
                      {c.pagado && (
                        <span className="text-[13px]" style={{ color: 'var(--positive-fg)' }}>ya pagado</span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[13px]" style={{ color: 'var(--fg-3)' }}>
                      {meta.label}
                      {c.dia_cobro && ` · día ${c.dia_cobro}`}
                      {c.sinFecha && c.tipo !== 'ahorro' && c.tipo !== 'otro' && (
                        <span style={{ color: 'var(--warning-fg)' }}> · sin día asignado</span>
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
                        className="icon-button icon-button-sm" style={{ background: 'var(--primary-600)', color: 'var(--fg-on-primary)' }} aria-label="Guardar monto">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setEditId(null); setEditValor('') }}
                        className="icon-button icon-button-sm" aria-label="Cancelar"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => estaApartado && (setEditId(c.apartadoRow.id), setEditValor(String(montoMostrado)))}
                      className="font-medium text-sm flex-shrink-0 text-right tabular"
                      style={{ color: 'var(--fg-1)' }}
                      title={estaApartado ? 'Click para editar monto' : ''}>
                      {formatMXN(montoMostrado)}
                    </button>
                  )}

                  {/* Botón apartar/quitar */}
                  {estaApartado ? (
                    <button onClick={() => setConfirmQuitar(c.apartadoRow.id)}
                      className="btn-check is-on" title="Quitar el apartado">
                      <CheckCircle2 className="w-4 h-4" /> Apartado
                    </button>
                  ) : (
                    <button onClick={() => handleApartar(c)} disabled={saving}
                      className="btn-check">
                      <Circle className="w-4 h-4" /> Apartar
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <p className="text-[13px] text-gray-500 text-center">
          Los gastos fijos y deudas se sugieren según su día de cobro. Click en el monto apartado para ajustarlo.
        </p>
        </>
        )}
      </div>

      <ConfirmModal
        open={!!confirmQuitar}
        titulo="¿Quitar este apartado?"
        descripcion="El monto volverá a tu disponible y el compromiso quedará pendiente de apartar."
        onConfirm={async () => {
          const id = confirmQuitar
          setConfirmQuitar(null)
          if (await guardar(quitarApartado(id), AVISO_FALLO)) toast('Apartado quitado', 'info')
        }}
        onCancel={() => setConfirmQuitar(null)}
      />
    </Layout>
  )
}
