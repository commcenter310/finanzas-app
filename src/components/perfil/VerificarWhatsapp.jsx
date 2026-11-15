import { useState } from 'react'
import { BadgeCheck, ShieldAlert } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../ui/Toast'
import { resultadoVerificacion, soloCodigo } from '../../utils/whatsapp'

// El bot solo atiende números verificados: al escribirle, responde con un
// código que se captura aquí. Así se comprueba que quien tiene la cuenta
// también tiene el teléfono (ver supabase-whatsapp.sql).
// `pendienteDeGuardar`: el número del formulario aún no es el guardado.
export default function VerificarWhatsapp({ profile, pendienteDeGuardar, onVerificado }) {
  const toast = useToast()
  const [codigo, setCodigo] = useState('')
  const [verificando, setVerificando] = useState(false)

  if (!profile?.telefono || pendienteDeGuardar) {
    return (
      <p className="text-xs mt-1.5" style={{ color: 'var(--fg-4)' }}>
        Guarda tu número para poder registrar gastos por WhatsApp.
      </p>
    )
  }

  if (profile.whatsapp_verificado) {
    return (
      <p className="text-xs mt-1.5 flex items-center gap-1 font-semibold" style={{ color: 'var(--positive-fg)' }}>
        <BadgeCheck className="w-3.5 h-3.5" /> Número verificado para el bot
      </p>
    )
  }

  const verificar = async (evento) => {
    evento.preventDefault()
    if (codigo.length !== 6) return toast('Escribe el código de 6 dígitos que te mandó el bot.', 'error')
    setVerificando(true)
    const { data, error } = await supabase.rpc('verificar_whatsapp', { p_codigo: codigo })
    setVerificando(false)
    const { ok, mensaje } = resultadoVerificacion(error ? undefined : data)
    toast(mensaje, ok ? 'success' : 'error')
    if (!ok) return
    setCodigo('')
    onVerificado?.()
  }

  return (
    <form onSubmit={verificar} className="mt-2 p-3 rounded-[var(--r-md)] border" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
      <p className="text-xs flex items-start gap-1.5" style={{ color: 'var(--fg-2)' }}>
        <ShieldAlert className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--warning-fg)' }} />
        <span>
          <strong>Falta verificar este número.</strong> Mándale cualquier mensaje al bot desde ese WhatsApp:
          te responderá un código de 6 dígitos. Escríbelo aquí.
        </span>
      </p>
      <div className="flex items-center gap-2 mt-2">
        <label className="sr-only" htmlFor="whatsapp-codigo">Código de verificación</label>
        <input id="whatsapp-codigo" className="input font-mono text-sm w-32 tracking-widest" placeholder="000000"
          inputMode="numeric" autoComplete="one-time-code" maxLength={6}
          value={codigo} onChange={e => setCodigo(soloCodigo(e.target.value))} />
        <button type="submit" className="btn-primary text-sm" disabled={verificando}>
          {verificando ? 'Verificando…' : 'Verificar'}
        </button>
      </div>
    </form>
  )
}
