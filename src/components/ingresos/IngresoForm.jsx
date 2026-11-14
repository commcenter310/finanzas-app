import DatePicker from '../ui/DatePicker'
import { MESES } from '../../utils/constantes'
import { mesAnterior, mesAplicacionIngreso, mesDeFechaISO, mesSiguiente } from '../../utils/fecha'
import { baseMesPicker } from '../../utils/ingresos'

// Selector del mes al que aplica el ingreso: anterior / base / siguiente
function MesPicker({ mes, anio, base, onChange }) {
  const opciones = [mesAnterior(base.mes, base.anio), base, mesSiguiente(base.mes, base.anio)]
  return (
    <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      {opciones.map(op => {
        const activo = mes === op.mes && anio === op.anio
        return (
          <button
            key={`${op.mes}-${op.anio}`}
            type="button"
            aria-pressed={activo}
            className="flex-1 py-2 px-2 transition-colors leading-tight"
            style={{
              background: activo ? 'var(--primary)' : 'var(--surface-2)',
              color:      activo ? 'var(--fg-on-primary)' : 'var(--fg-3)',
            }}
            onClick={() => onChange(op)}
          >
            <div className="text-[11px] font-bold">{MESES[op.mes - 1].slice(0, 3)}</div>
            <div style={{ fontSize: 10, fontWeight: 400, opacity: activo ? 0.85 : 0.7 }}>{op.anio}</div>
          </button>
        )
      })}
    </div>
  )
}

// Campos de un ingreso. Lo usan el alta y la edición en la página Ingresos;
// el estado (`form`, ver utils/ingresos.js) y los botones son de quien lo usa.
export default function IngresoForm({ form, setForm }) {
  const set = (campo) => (evento) => setForm(f => ({ ...f, [campo]: evento.target.value }))

  // Al cambiar la fecha se vuelve a sugerir el mes de aplicación (día ≥ 25 →
  // mes siguiente: la nómina del 30 cubre los gastos del mes que empieza).
  const cambiarFecha = (fecha) => setForm(f => ({ ...f, fecha_recepcion: fecha, ...(fecha ? mesAplicacionIngreso(fecha) : {}) }))

  const recibidoEn = mesDeFechaISO(form.fecha_recepcion)
  const aplicaEnOtroMes = recibidoEn && (recibidoEn.mes !== form.mes || recibidoEn.anio !== form.anio)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="col-span-2 lg:col-span-1">
        <label className="label">Concepto <span className="text-negative">*</span></label>
        <input className="input text-sm" placeholder="Ej: Quincena 15" value={form.concepto} onChange={set('concepto')} />
      </div>
      <div>
        <label className="label">Recibido ($) <span className="text-negative">*</span></label>
        <input type="number" min="0" inputMode="decimal" className="input text-sm font-mono" placeholder="0"
          value={form.monto_actual} onChange={set('monto_actual')} />
      </div>
      <div>
        <label className="label">Esperado ($)</label>
        <input type="number" min="0" inputMode="decimal" className="input text-sm font-mono" placeholder="= recibido"
          value={form.monto_presupuesto} onChange={set('monto_presupuesto')} />
      </div>
      <div className="col-span-2 lg:col-span-1">
        <label className="label">Fecha en que llegó <span className="text-negative">*</span></label>
        <DatePicker className="w-full" value={form.fecha_recepcion} onChange={cambiarFecha} />
      </div>
      <div className="col-span-2">
        <label className="label">¿A qué mes aplica?</label>
        <MesPicker mes={form.mes} anio={form.anio} base={baseMesPicker(form)}
          onChange={({ mes, anio }) => setForm(f => ({ ...f, mes, anio }))} />
        {aplicaEnOtroMes && (
          <p className="text-xs mt-1.5" style={{ color: 'var(--primary)' }}>
            💡 Recibido en {MESES[recibidoEn.mes - 1]}, contará en el balance de {MESES[form.mes - 1]} {form.anio}
          </p>
        )}
      </div>
      <div className="col-span-2">
        <label className="label">Notas <span className="text-fg-4 font-normal">(opcional)</span></label>
        <input className="input text-sm" placeholder="Ej: incluye bono" maxLength={200} value={form.notas} onChange={set('notas')} />
      </div>
    </div>
  )
}
