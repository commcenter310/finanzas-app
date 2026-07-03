import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatMXN } from '../utils/constantes'
import { soloDiezDigitos, telefonoAWhatsApp } from '../utils/telefono'
import { Wallet, User, MessageSquare, CreditCard, TrendingUp, Plus, Trash2, ArrowRight, ArrowLeft, Check } from 'lucide-react'
import FilterSelect from '../components/ui/FilterSelect'

const FREC_OPTS = [
  { value: 'quincenal', label: 'Quincenal (cada 15 días)' },
  { value: 'mensual',   label: 'Mensual' },
  { value: 'semanal',   label: 'Semanal' },
]

const TARJETA_VACIA = { nombre: '', limite_credito: '', fecha_corte: '', fecha_pago: '' }

const PASOS = [
  { icono: User,          titulo: 'Tu nombre' },
  { icono: MessageSquare, titulo: 'WhatsApp' },
  { icono: CreditCard,    titulo: 'Tarjetas' },
  { icono: TrendingUp,    titulo: 'Ingreso' },
]

export default function Bienvenida() {
  const { user, refreshProfile } = useAuth()
  const [paso, setPaso] = useState(0)
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Datos acumulados — no se escribe nada en la BD hasta el final
  const [nombre, setNombre] = useState('')
  const [telefono10, setTelefono10] = useState('')
  const [tarjetas, setTarjetas] = useState([])
  const [formTarjeta, setFormTarjeta] = useState(TARJETA_VACIA)
  const setFT = (k, v) => setFormTarjeta(f => ({ ...f, [k]: v }))
  const [nomina, setNomina] = useState({ nombre: 'Nómina', frecuencia: 'quincenal', monto_neto: '' })
  const setFN = (k, v) => setNomina(f => ({ ...f, [k]: v }))

  const agregarTarjeta = () => {
    if (!formTarjeta.nombre) return
    setTarjetas(t => [...t, formTarjeta])
    setFormTarjeta(TARJETA_VACIA)
  }
  const quitarTarjeta = (i) => setTarjetas(t => t.filter((_, idx) => idx !== i))

  const telefonoValido = telefono10.length === 0 || telefono10.length === 10

  const puedeAvanzar =
    paso === 0 ? nombre.trim().length >= 2 :
    paso === 1 ? telefonoValido :
    true

  // Vincula (o crea) el método de pago de una tarjeta.
  // metodos_pago tiene UNIQUE(user_id, nombre): si el método ya existe
  // (los default incluyen NU, Stori, etc.), solo se le cuelga el credito_id.
  const vincularMetodoTarjeta = async (nombreTarjeta, creditoId) => {
    const { data: existente } = await supabase.from('metodos_pago')
      .select('id').eq('user_id', user.id).eq('nombre', nombreTarjeta).maybeSingle()
    if (existente) {
      await supabase.from('metodos_pago')
        .update({ credito_id: creditoId, tipo: 'credito', activo: true }).eq('id', existente.id)
    } else {
      await supabase.from('metodos_pago')
        .insert({ user_id: user.id, nombre: nombreTarjeta, tipo: 'credito', credito_id: creditoId })
    }
  }

  const finalizar = async (omitir = false) => {
    setGuardando(true)
    setErrorMsg('')
    try {
      if (!omitir) {
        // 1. Tarjetas → creditos + método de pago vinculado
        for (const t of tarjetas) {
          const { data: credito, error } = await supabase.from('creditos').insert({
            user_id: user.id,
            nombre: t.nombre,
            limite_credito: t.limite_credito ? Number(t.limite_credito) : null,
            fecha_corte: t.fecha_corte ? Number(t.fecha_corte) : null,
            fecha_pago: t.fecha_pago ? Number(t.fecha_pago) : null,
          }).select('id').single()
          if (error) throw error
          await vincularMetodoTarjeta(t.nombre, credito.id)
        }

        // 2. Nómina principal
        if (Number(nomina.monto_neto) > 0) {
          const { error } = await supabase.from('nominas').insert({
            user_id: user.id,
            nombre: nomina.nombre || 'Nómina',
            es_principal: true,
            tipo: 'sueldo',
            frecuencia: nomina.frecuencia,
            monto_neto: Number(nomina.monto_neto),
          })
          if (error) throw error
        }
      }

      // 3. Perfil (nombre + teléfono en formato WhatsApp) + marcar completado
      const updates = { onboarding_completado: true }
      if (!omitir && nombre.trim()) updates.nombre = nombre.trim()
      const wa = telefonoAWhatsApp(telefono10)
      if (!omitir && wa) updates.telefono = wa
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id)
      if (error) throw error

      await refreshProfile()
    } catch (e) {
      setErrorMsg(e.message ?? 'Error al guardar. Intenta de nuevo.')
      setGuardando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-app)' }}>
      <div className="w-full max-w-xl">

        {/* Brand */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-[14px] flex items-center justify-center"
            style={{ background: 'var(--grad-primary)', boxShadow: 'var(--shadow-primary)' }}>
            <Wallet className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <p className="font-bold leading-none" style={{ color: 'var(--fg-1)' }}>Finni Apoyo</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>Configuremos tu cuenta</p>
          </div>
        </div>

        {/* Progreso */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {PASOS.map((p, i) => {
            const Icono = p.icono
            const activo = i === paso
            const hecho  = i < paso
            return (
              <div key={p.titulo} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                    style={{
                      background: hecho ? 'var(--ahorro)' : activo ? 'var(--primary-600)' : 'var(--surface-3)',
                      color: hecho || activo ? 'var(--fg-on-primary)' : 'var(--fg-4)',
                    }}>
                    {hecho ? <Check className="w-4 h-4" /> : <Icono className="w-4 h-4" />}
                  </div>
                  <span className="text-[10px] font-semibold" style={{ color: activo ? 'var(--fg-1)' : 'var(--fg-4)' }}>
                    {p.titulo}
                  </span>
                </div>
                {i < PASOS.length - 1 && (
                  <div className="w-8 h-0.5 rounded-full mb-4" style={{ background: hecho ? 'var(--ahorro)' : 'var(--surface-3)' }} />
                )}
              </div>
            )
          })}
        </div>

        {/* Tarjeta del paso */}
        <div className="card p-6 sm:p-8">

          {paso === 0 && (
            <>
              <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--fg-1)' }}>¡Bienvenido! 👋</h1>
              <p className="text-sm mb-5" style={{ color: 'var(--fg-3)' }}>
                Empecemos por lo básico. ¿Cómo te llamas?
              </p>
              <label className="label">Nombre completo</label>
              <input className="input" placeholder="Ej: Diego Martínez" autoFocus
                value={nombre} onChange={e => setNombre(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && puedeAvanzar && setPaso(1)} />
            </>
          )}

          {paso === 1 && (
            <>
              <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--fg-1)' }}>Tu WhatsApp 💬</h1>
              <p className="text-sm mb-5" style={{ color: 'var(--fg-3)' }}>
                Vincula tu número y podrás registrar gastos mandando un mensaje:
                <em> "89 starbucks"</em> y listo. Opcional, lo puedes hacer después.
              </p>
              <label className="label">Número de celular (10 dígitos)</label>
              <div className="flex items-center gap-2">
                <span className="px-3 py-[10px] rounded-[var(--r-md)] font-mono text-sm font-semibold border"
                  style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--fg-2)' }}>
                  🇲🇽 +52
                </span>
                <input className="input font-mono flex-1" placeholder="6675078043" inputMode="numeric" autoFocus
                  value={telefono10}
                  onChange={e => setTelefono10(soloDiezDigitos(e.target.value))} />
              </div>
              {telefono10.length > 0 && telefono10.length < 10 && (
                <p className="text-xs mt-1.5" style={{ color: 'var(--warning-fg)' }}>
                  Faltan {10 - telefono10.length} dígitos
                </p>
              )}
              {telefono10.length === 10 && (
                <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: 'var(--ahorro-fg)' }}>
                  <Check className="w-3 h-3" /> Número completo
                </p>
              )}
            </>
          )}

          {paso === 2 && (
            <>
              <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--fg-1)' }}>Tus tarjetas de crédito 💳</h1>
              <p className="text-sm mb-5" style={{ color: 'var(--fg-3)' }}>
                Agrégalas para llevar el control de saldos, cortes y fechas de pago. Opcional.
              </p>

              {tarjetas.length > 0 && (
                <div className="space-y-2 mb-4">
                  {tarjetas.map((t, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl border"
                      style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <CreditCard className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--fg-3)' }} />
                        <span className="text-sm font-semibold truncate" style={{ color: 'var(--fg-1)' }}>{t.nombre}</span>
                        {t.limite_credito && <span className="text-xs font-mono" style={{ color: 'var(--fg-4)' }}>{formatMXN(t.limite_credito)}</span>}
                      </div>
                      <button onClick={() => quitarTarjeta(i)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-500 flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="col-span-2 sm:col-span-1">
                  <label className="label">Nombre</label>
                  <input className="input text-sm" placeholder="Ej: NU, BBVA Azul..."
                    value={formTarjeta.nombre} onChange={e => setFT('nombre', e.target.value)} />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="label">Límite ($) <span className="font-normal normal-case" style={{ color: 'var(--fg-4)' }}>(opcional)</span></label>
                  <input type="number" className="input text-sm font-mono" placeholder="0.00"
                    value={formTarjeta.limite_credito} onChange={e => setFT('limite_credito', e.target.value)} />
                </div>
                <div>
                  <label className="label">Día de corte</label>
                  <input type="number" min="1" max="31" className="input text-sm font-mono" placeholder="Ej: 10"
                    value={formTarjeta.fecha_corte} onChange={e => setFT('fecha_corte', e.target.value)} />
                </div>
                <div>
                  <label className="label">Día de pago</label>
                  <input type="number" min="1" max="31" className="input text-sm font-mono" placeholder="Ej: 30"
                    value={formTarjeta.fecha_pago} onChange={e => setFT('fecha_pago', e.target.value)} />
                </div>
              </div>
              <button onClick={agregarTarjeta} disabled={!formTarjeta.nombre}
                className="btn-secondary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                <Plus className="w-4 h-4" /> Agregar tarjeta
              </button>
            </>
          )}

          {paso === 3 && (
            <>
              <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--fg-1)' }}>Tu ingreso principal 💰</h1>
              <p className="text-sm mb-5" style={{ color: 'var(--fg-3)' }}>
                Con esto la app puede planear tus quincenas y proyectar tu año. Opcional —
                en Perfil podrás agregar más nóminas y prestaciones (aguinaldo, prima).
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="label">Nombre</label>
                  <input className="input text-sm" placeholder="Ej: Nómina gobierno"
                    value={nomina.nombre} onChange={e => setFN('nombre', e.target.value)} />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="label">¿Cada cuánto te pagan?</label>
                  <FilterSelect value={nomina.frecuencia} onChange={v => setFN('frecuencia', v)}
                    options={FREC_OPTS} placeholder="Frecuencia" showClear={false} />
                </div>
                <div className="col-span-2">
                  <label className="label">¿Cuánto recibes por pago? (neto)</label>
                  <input type="number" className="input font-mono" placeholder="0.00" autoFocus
                    value={nomina.monto_neto} onChange={e => setFN('monto_neto', e.target.value)} />
                </div>
              </div>
            </>
          )}

          {errorMsg && (
            <p className="text-sm mt-4 px-3 py-2 rounded-xl" style={{ background: 'var(--negative-bg)', color: 'var(--negative-fg)' }}>
              {errorMsg}
            </p>
          )}

          {/* Navegación */}
          <div className="flex items-center justify-between mt-6">
            {paso > 0
              ? <button className="btn-ghost flex items-center gap-1.5 text-sm" onClick={() => setPaso(p => p - 1)} disabled={guardando}>
                  <ArrowLeft className="w-4 h-4" /> Atrás
                </button>
              : <span />}
            {paso < PASOS.length - 1
              ? <button className="btn-primary flex items-center gap-1.5 px-6" onClick={() => setPaso(p => p + 1)} disabled={!puedeAvanzar}>
                  Siguiente <ArrowRight className="w-4 h-4" />
                </button>
              : <button className="btn-primary flex items-center gap-1.5 px-6" onClick={() => finalizar(false)} disabled={guardando}>
                  {guardando ? 'Guardando...' : <>Empezar <Check className="w-4 h-4" /></>}
                </button>}
          </div>
        </div>

        {/* Omitir */}
        <p className="text-center mt-4">
          <button onClick={() => finalizar(true)} disabled={guardando}
            className="text-xs underline" style={{ color: 'var(--fg-4)' }}>
            Omitir por ahora — configuraré todo después en Perfil
          </button>
        </p>
      </div>
    </div>
  )
}
