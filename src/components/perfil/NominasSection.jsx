import { useState } from 'react'
import { useNominas } from '../../hooks/useNominas'
import { calcNomina, formatMXN, FRECUENCIA_LABEL, MESES, parseMesesPrima, serializeMesesPrima } from '../../utils/constantes'
import { Plus, Trash2, Pencil, Star, Briefcase, Wallet, Calculator } from 'lucide-react'
import FilterSelect from '../ui/FilterSelect'
import ConfirmModal from '../ui/ConfirmModal'
import EmptyState from '../ui/EmptyState'

const FORM_VACIO = {
  nombre: '', es_principal: false, tipo: 'sueldo', frecuencia: 'quincenal',
  monto_neto: '', sueldo_base_mensual: '',
  tiene_aguinaldo: false, dias_aguinaldo: '', mes_aguinaldo: '12',
  tiene_prima_vacacional: false, dias_prima_vacacional: '', veces_prima_al_anio: '2', meses_prima: [],
  tiene_utilidades: false, monto_utilidades: '', mes_utilidades: '5',
}

const MESES_OPTS = MESES.map((m, i) => ({ value: String(i + 1), label: m }))

const TIPO_OPTS = [
  { value: 'sueldo',     label: '💼 Sueldo (con prestaciones)' },
  { value: 'honorarios', label: '🧾 Honorarios' },
  { value: 'otro',       label: '📌 Otro ingreso' },
]
const FREC_OPTS = [
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'mensual',   label: 'Mensual' },
  { value: 'semanal',   label: 'Semanal' },
]

const toNum = (v) => v === '' || v == null ? 0 : Number(v)

// Normaliza el form a payload para la BD
const formAPayload = (f) => ({
  nombre: f.nombre,
  es_principal: f.es_principal,
  tipo: f.tipo,
  frecuencia: f.frecuencia,
  monto_neto: toNum(f.monto_neto),
  sueldo_base_mensual: toNum(f.sueldo_base_mensual),
  tiene_aguinaldo: f.tipo === 'sueldo' && f.tiene_aguinaldo,
  dias_aguinaldo: toNum(f.dias_aguinaldo),
  mes_aguinaldo: f.tipo === 'sueldo' && f.tiene_aguinaldo ? (toNum(f.mes_aguinaldo) || null) : null,
  tiene_prima_vacacional: f.tipo === 'sueldo' && f.tiene_prima_vacacional,
  dias_prima_vacacional: toNum(f.dias_prima_vacacional),
  veces_prima_al_anio: toNum(f.veces_prima_al_anio) || 1,
  meses_prima: f.tipo === 'sueldo' && f.tiene_prima_vacacional ? serializeMesesPrima((f.meses_prima ?? []).map(Number)) : null,
  tiene_utilidades: f.tipo === 'sueldo' && f.tiene_utilidades,
  monto_utilidades: toNum(f.monto_utilidades),
  mes_utilidades: f.tipo === 'sueldo' && f.tiene_utilidades ? (toNum(f.mes_utilidades) || null) : null,
})

export default function NominasSection({ onChange }) {
  const { nominas, loading, saving, agregar, actualizar, eliminar } = useNominas()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const abrirNueva = () => {
    setEditandoId(null)
    setForm({ ...FORM_VACIO, es_principal: nominas.length === 0 })
    setMostrarForm(true)
  }

  const abrirEditar = (n) => {
    setEditandoId(n.id)
    setForm({
      nombre: n.nombre, es_principal: n.es_principal, tipo: n.tipo, frecuencia: n.frecuencia,
      monto_neto: n.monto_neto ?? '', sueldo_base_mensual: n.sueldo_base_mensual ?? '',
      tiene_aguinaldo: n.tiene_aguinaldo, dias_aguinaldo: n.dias_aguinaldo ?? '',
      mes_aguinaldo: n.mes_aguinaldo ? String(n.mes_aguinaldo) : '12',
      tiene_prima_vacacional: n.tiene_prima_vacacional, dias_prima_vacacional: n.dias_prima_vacacional ?? '',
      veces_prima_al_anio: String(n.veces_prima_al_anio ?? 2),
      meses_prima: parseMesesPrima(n.meses_prima).map(String),
      tiene_utilidades: n.tiene_utilidades, monto_utilidades: n.monto_utilidades ?? '',
      mes_utilidades: n.mes_utilidades ? String(n.mes_utilidades) : '5',
    })
    setMostrarForm(true)
  }

  const cerrar = () => { setMostrarForm(false); setEditandoId(null); setForm(FORM_VACIO) }

  const setMesPrima = (idx, val) => setForm(f => {
    const arr = [...(f.meses_prima ?? [])]
    arr[idx] = val
    return { ...f, meses_prima: arr }
  })

  const guardar = async () => {
    if (!form.nombre || !form.monto_neto) return
    const payload = formAPayload(form)
    const { error } = editandoId ? await actualizar(editandoId, payload) : await agregar(payload)
    if (!error) {
      cerrar()
      onChange?.()
    }
  }

  // Cálculo en vivo para la previsualización dentro del form
  const preview = calcNomina(formAPayload(form))
  const esSueldo = form.tipo === 'sueldo'

  // Totales agregados de todas las nóminas
  const totalAnual = nominas.reduce((s, n) => s + calcNomina(n).ingresoAnualTotal, 0)
  const totalMensualProm = totalAnual / 12

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--divider)' }}>
        <div>
          <h2 className="font-bold text-sm" style={{ color: 'var(--fg-1)' }}>Ingresos y Nómina</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fg-4)' }}>
            Opcional · ayuda a estimar cuánto percibes al año incluyendo prestaciones
          </p>
        </div>
        <button onClick={abrirNueva} className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3">
          <Plus className="w-3.5 h-3.5" /> Agregar nómina
        </button>
      </div>

      {/* Resumen agregado */}
      {nominas.length > 0 && (
        <div className="grid grid-cols-2 divide-x" style={{ borderColor: 'var(--divider)', background: 'var(--surface-2)' }}>
          <div className="px-5 py-3">
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">Ingreso anual estimado</p>
            <p className="text-lg font-bold font-mono" style={{ color: 'var(--positive-fg)' }}>{formatMXN(totalAnual)}</p>
          </div>
          <div className="px-5 py-3">
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">Promedio mensual</p>
            <p className="text-lg font-bold font-mono text-primary-700">{formatMXN(totalMensualProm)}</p>
          </div>
        </div>
      )}

      {/* Formulario */}
      {mostrarForm && (
        <div className="p-4 border-b" style={{ background: 'var(--primary-50)', borderColor: 'var(--primary-100)' }}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <div className="col-span-2 lg:col-span-1">
              <label className="label">Nombre</label>
              <input className="input text-sm" placeholder="Ej: Nómina gobierno"
                value={form.nombre} onChange={e => setF('nombre', e.target.value)} />
            </div>
            <div>
              <label className="label">Tipo</label>
              <FilterSelect value={form.tipo} onChange={v => setF('tipo', v)} options={TIPO_OPTS} placeholder="Tipo" showClear={false} />
            </div>
            <div>
              <label className="label">Frecuencia de pago</label>
              <FilterSelect value={form.frecuencia} onChange={v => setF('frecuencia', v)} options={FREC_OPTS} placeholder="Frecuencia" showClear={false} />
            </div>
            <div>
              <label className="label">Neto que recibes (por pago)</label>
              <input type="number" className="input text-sm font-mono" placeholder="0.00"
                value={form.monto_neto} onChange={e => setF('monto_neto', e.target.value)} />
            </div>
          </div>

          {/* Prestaciones — solo para sueldo */}
          {esSueldo && (
            <div className="rounded-xl border p-3 mb-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4" style={{ color: 'var(--primary-700)' }} />
                <p className="text-sm font-semibold text-gray-700">Prestaciones</p>
              </div>
              <div className="mb-3">
                <label className="label">Sueldo base mensual (para calcular prestaciones)</label>
                <input type="number" className="input text-sm font-mono w-full sm:w-64" placeholder="0.00"
                  value={form.sueldo_base_mensual} onChange={e => setF('sueldo_base_mensual', e.target.value)} />
                <p className="text-xs mt-1" style={{ color: 'var(--fg-4)' }}>
                  Sueldo diario estimado: <strong>{formatMXN(preview.sueldoDiario)}</strong> (base ÷ 30)
                </p>
              </div>

              {/* Aguinaldo */}
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer mb-2 select-none">
                <input type="checkbox" className="accent-primary-700 w-4 h-4"
                  checked={form.tiene_aguinaldo} onChange={e => setF('tiene_aguinaldo', e.target.checked)} />
                Recibo aguinaldo
              </label>
              {form.tiene_aguinaldo && (
                <div className="flex items-center gap-2 mb-3 pl-6 flex-wrap">
                  <input type="number" className="input text-sm font-mono w-20" placeholder="días"
                    value={form.dias_aguinaldo} onChange={e => setF('dias_aguinaldo', e.target.value)} />
                  <span className="text-sm text-gray-500">días, en</span>
                  <div className="w-36">
                    <FilterSelect value={form.mes_aguinaldo} onChange={v => setF('mes_aguinaldo', v)} options={MESES_OPTS} placeholder="Mes" showClear={false} />
                  </div>
                  <span className="text-sm text-gray-500">→</span>
                  <span className="text-sm font-mono font-bold" style={{ color: 'var(--ahorro-fg)' }}>{formatMXN(preview.aguinaldo)}</span>
                </div>
              )}

              {/* Prima vacacional */}
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer mb-2 select-none">
                <input type="checkbox" className="accent-primary-700 w-4 h-4"
                  checked={form.tiene_prima_vacacional} onChange={e => setF('tiene_prima_vacacional', e.target.checked)} />
                Recibo prima vacacional
              </label>
              {form.tiene_prima_vacacional && (
                <div className="pl-6 mb-3">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <input type="number" className="input text-sm font-mono w-20" placeholder="días"
                      value={form.dias_prima_vacacional} onChange={e => setF('dias_prima_vacacional', e.target.value)} />
                    <span className="text-sm text-gray-500">días,</span>
                    <input type="number" min="1" max="4" className="input text-sm font-mono w-16" placeholder="veces"
                      value={form.veces_prima_al_anio} onChange={e => setF('veces_prima_al_anio', e.target.value)} />
                    <span className="text-sm text-gray-500">veces/año →</span>
                    <span className="text-sm font-mono font-bold" style={{ color: 'var(--ahorro-fg)' }}>
                      {formatMXN(preview.primaAnual)} <span className="font-normal text-gray-400">({formatMXN(preview.primaPorEvento)} c/u)</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-500">Se paga en:</span>
                    {Array.from({ length: Math.max(1, Number(form.veces_prima_al_anio) || 1) }).map((_, i) => (
                      <div key={i} className="w-32">
                        <FilterSelect value={form.meses_prima?.[i] ?? ''} onChange={v => setMesPrima(i, v)} options={MESES_OPTS} placeholder={`Mes ${i + 1}`} showClear={false} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Utilidades */}
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer mb-2 select-none">
                <input type="checkbox" className="accent-primary-700 w-4 h-4"
                  checked={form.tiene_utilidades} onChange={e => setF('tiene_utilidades', e.target.checked)} />
                Recibo utilidades (PTU)
              </label>
              {form.tiene_utilidades && (
                <div className="flex items-center gap-2 pl-6 flex-wrap">
                  <input type="number" className="input text-sm font-mono w-32" placeholder="monto estimado"
                    value={form.monto_utilidades} onChange={e => setF('monto_utilidades', e.target.value)} />
                  <span className="text-sm text-gray-500">al año, en</span>
                  <div className="w-36">
                    <FilterSelect value={form.mes_utilidades} onChange={v => setF('mes_utilidades', v)} options={MESES_OPTS} placeholder="Mes" showClear={false} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Previsualización total */}
          <div className="flex items-center justify-between rounded-xl px-4 py-2.5 mb-3" style={{ background: 'var(--ahorro-bg)' }}>
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ahorro-fg)' }}>
              Esta nómina al año
            </span>
            <span className="text-base font-bold font-mono" style={{ color: 'var(--ahorro-fg)' }}>
              {formatMXN(preview.ingresoAnualTotal)}
            </span>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input type="checkbox" className="accent-primary-700 w-4 h-4"
                checked={form.es_principal} onChange={e => setF('es_principal', e.target.checked)} />
              <Star className="w-3.5 h-3.5 text-amber-400" /> Es mi nómina principal
            </label>
            <div className="flex gap-2">
              <button className="btn-primary px-6 text-sm" onClick={guardar} disabled={saving}>
                {saving ? 'Guardando...' : editandoId ? 'Actualizar' : 'Guardar'}
              </button>
              <button className="btn-ghost text-sm" onClick={cerrar}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de nóminas */}
      <div className="divide-y" style={{ borderColor: 'var(--divider)' }}>
        {loading ? (
          <div className="px-5 py-8"><div className="h-5 bg-gray-50 rounded animate-pulse" /></div>
        ) : nominas.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState
              icon={Wallet}
              title="Configura tu ingreso principal"
              description="Con una nómina o ingreso base, el plan mensual y las proyecciones quedan mejor calibradas."
              action={
                <button type="button" onClick={abrirNueva} className="btn-primary inline-flex items-center gap-2 text-sm">
                  <Plus className="h-4 w-4" />
                  Agregar ingreso
                </button>
              }
            />
          </div>
        ) : nominas.map(n => {
          const c = calcNomina(n)
          const Icono = n.tipo === 'honorarios' ? Briefcase : Wallet
          return (
            <div key={n.id} className="flex items-center justify-between px-5 py-3 group">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Icono className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--fg-3)' }} />
                  <p className="font-semibold text-sm" style={{ color: 'var(--fg-1)' }}>{n.nombre}</p>
                  {n.es_principal && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                      style={{ background: 'var(--warning-bg)', color: 'var(--warning-fg)' }}>
                      <Star className="w-2.5 h-2.5" /> Principal
                    </span>
                  )}
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">
                    {FRECUENCIA_LABEL[n.frecuencia]}
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-4)' }}>
                  {formatMXN(n.monto_neto)} por pago · {formatMXN(c.ingresoAnualTotal)}/año
                  {c.extraordinarioAnual > 0 && ` · +${formatMXN(c.extraordinarioAnual)} prestaciones`}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => abrirEditar(n)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:bg-primary-50 hover:text-primary-700 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setConfirmDelete(n.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <ConfirmModal
        open={!!confirmDelete}
        titulo="¿Eliminar nómina?"
        descripcion="Esta acción no se puede deshacer."
        onConfirm={async () => {
          const { error } = await eliminar(confirmDelete)
          if (!error) onChange?.()
          setConfirmDelete(null)
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
