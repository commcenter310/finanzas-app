// Perfil sincroniza el form con datos cargados async (profile) vía effects de sync
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery'
import { useNominasLista } from '../hooks/useCatalogos'
import { useToast } from '../components/ui/Toast'
import { Save, User, MessageSquare, TrendingUp, CreditCard, BarChart3, Settings, KeyRound } from 'lucide-react'
import ErrorState from '../components/ui/ErrorState'
import NominasSection from '../components/perfil/NominasSection'
import MetodosPagoSection from '../components/perfil/MetodosPagoSection'
import CategoriasSection from '../components/perfil/CategoriasSection'
import SetupGuide from '../components/perfil/SetupGuide'
import PasswordForm from '../components/auth/PasswordForm'
import VerificarWhatsapp from '../components/perfil/VerificarWhatsapp'
import { useGuardarConAviso } from '../hooks/useGuardarConAviso'
import { telefonoA10, telefonoAWhatsApp, soloDiezDigitos } from '../utils/telefono'

export default function Perfil() {
  const { user, profile, profileError, refreshProfile, cambiarPassword } = useAuth()
  const uid = user?.id
  const toast = useToast()
  const guardar = useGuardarConAviso()
  // La guía de configuración abre estos formularios cuando la lista está vacía
  const [mostrarFormMetodo, setMostrarFormMetodo] = useState(false)
  const [mostrarFormCat, setMostrarFormCat] = useState(false)

  // Datos básicos — el teléfono se edita como 10 dígitos; se guarda en formato
  // WhatsApp México (521 + 10 dígitos) sin que el usuario vea el "1"
  const [nombre,         setNombre]         = useState(profile?.nombre          ?? '')
  const [telefono10,     setTelefono10]     = useState(telefonoA10(profile?.telefono))
  const [umbralHormiga,  setUmbralHormiga]  = useState(profile?.umbral_hormiga  ?? 100)
  const [savingBasico, setSavingBasico] = useState(false)
  const [msgBasico, setMsgBasico] = useState('')

  // Sembrar el form cuando carga/cambia el profile (sync de dato externo → estado)
  useEffect(() => {
    setNombre(profile?.nombre ?? '')
    setTelefono10(telefonoA10(profile?.telefono))
    setUmbralHormiga(profile?.umbral_hormiga ?? 100)
  }, [profile])

  const guardarBasico = async () => {
    if (!profile) return   // sin perfil cargado se sobrescribiría con campos vacíos
    if (telefono10.length > 0 && telefono10.length < 10) {
      setMsgBasico('⚠️ El celular debe tener 10 dígitos')
      setTimeout(() => setMsgBasico(''), 3000)
      return
    }
    setSavingBasico(true)
    const { error } = await supabase.from('profiles').update({
      nombre,
      telefono: telefonoAWhatsApp(telefono10),   // null si está vacío
      umbral_hormiga: Number(umbralHormiga),
    }).eq('id', user.id)
    setSavingBasico(false)
    if (error) {
      // 23505 = unique_violation: el teléfono ya está ligado a otra cuenta
      toast(error.code === '23505'
        ? 'Ese número de WhatsApp ya está registrado en otra cuenta.'
        : 'No se pudieron guardar tus datos. Intenta de nuevo.', 'error')
      return
    }
    await refreshProfile()
    setMsgBasico('Guardado')
    setTimeout(() => setMsgBasico(''), 2000)
  }

  // Regla 50/30/20
  const [regla, setRegla] = useState({
    necesidad: profile?.regla_necesidad ?? 0.5,
    deseo:     profile?.regla_deseo     ?? 0.3,
    ahorro:    profile?.regla_ahorro    ?? 0.2,
  })
  const [errorRegla, setErrorRegla] = useState('')
  const [savingRegla, setSavingRegla] = useState(false)

  useEffect(() => {
    setRegla({
      necesidad: profile?.regla_necesidad ?? 0.5,
      deseo:     profile?.regla_deseo     ?? 0.3,
      ahorro:    profile?.regla_ahorro    ?? 0.2,
    })
  }, [profile])

  const guardarRegla = async () => {
    if (!profile) return
    const n = Number(regla.necesidad), d = Number(regla.deseo), a = Number(regla.ahorro)
    if ([n, d, a].some(v => v < 0 || v > 1)) return setErrorRegla('Cada valor debe estar entre 0% y 100%')
    const total = n + d + a
    if (Math.abs(total - 1) > 0.01) return setErrorRegla('Los porcentajes deben sumar 100%')
    setSavingRegla(true)
    setErrorRegla('')
    const ok = await guardar(supabase.from('profiles').update({
      regla_necesidad: n,
      regla_deseo:     d,
      regla_ahorro:    a,
    }).eq('id', user.id))
    if (ok) await refreshProfile()
    setSavingRegla(false)
  }

  // Métodos de pago
  const { data: metodos } = useSupabaseQuery(async () => {
    const { data } = await supabase.from('metodos_pago').select('*').eq('user_id', user.id).order('nombre')
    return data ?? []
  }, [uid], `metodos:perfil:${uid}`)

  // Categorías
  const { data: categorias } = useSupabaseQuery(async () => {
    const { data } = await supabase.from('categorias').select('*').eq('user_id', user.id).order('clasificacion').order('nombre')
    return data ?? []
  }, [uid], `categorias:perfil:${uid}`)

  const { nominas } = useNominasLista()

  const totalRegla = Number(regla.necesidad) + Number(regla.deseo) + Number(regla.ahorro)
  const reglaOk    = Math.abs(totalRegla - 1) < 0.01
  const metodosActivos = (metodos ?? []).filter(m => m.activo)
  const categoriasActivas = (categorias ?? []).filter(c => c.activa)
  const nominasConfiguradas = nominas.length

  const irA = (id, beforeScroll) => {
    beforeScroll?.()
    window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const setupItems = [
    {
      key: 'datos',
      title: 'Datos básicos',
      detail: nombre.trim().length >= 2 ? 'Nombre listo para personalizar tus vistas.' : 'Agrega tu nombre para identificar tu perfil.',
      done: nombre.trim().length >= 2,
      Icon: User,
      onClick: () => irA('perfil-datos'),
    },
    {
      key: 'whatsapp',
      title: 'WhatsApp',
      detail: telefono10.length === 10 ? 'Número completo para futuras alertas.' : 'Captura 10 dígitos para dejarlo listo.',
      done: telefono10.length === 10,
      Icon: MessageSquare,
      onClick: () => irA('perfil-datos'),
    },
    {
      key: 'nomina',
      title: 'Ingreso principal',
      detail: nominasConfiguradas > 0 ? `${nominasConfiguradas} fuente${nominasConfiguradas === 1 ? '' : 's'} de ingreso configurada${nominasConfiguradas === 1 ? '' : 's'}.` : 'Agrega al menos una fuente de ingreso.',
      done: nominasConfiguradas > 0,
      Icon: TrendingUp,
      onClick: () => irA('perfil-nomina'),
    },
    {
      key: 'metodos',
      title: 'Métodos de pago',
      detail: metodosActivos.length > 0 ? `${metodosActivos.length} método${metodosActivos.length === 1 ? '' : 's'} activo${metodosActivos.length === 1 ? '' : 's'}.` : 'Crea los bancos, tarjetas o efectivo que usas.',
      done: metodosActivos.length > 0,
      Icon: CreditCard,
      onClick: () => irA('perfil-metodos', () => { if (metodosActivos.length === 0) setMostrarFormMetodo(true) }),
    },
    {
      key: 'categorias',
      title: 'Categorías',
      detail: categoriasActivas.length > 0 ? `${categoriasActivas.length} categoría${categoriasActivas.length === 1 ? '' : 's'} activa${categoriasActivas.length === 1 ? '' : 's'}.` : 'Activa o crea categorías para clasificar gastos.',
      done: categoriasActivas.length > 0,
      Icon: BarChart3,
      onClick: () => irA('perfil-categorias', () => { if (categoriasActivas.length === 0) setMostrarFormCat(true) }),
    },
    {
      key: 'regla',
      title: 'Regla 50/30/20',
      detail: reglaOk ? 'La distribución suma 100%.' : 'Ajusta los porcentajes hasta sumar 100%.',
      done: reglaOk,
      Icon: Settings,
      onClick: () => irA('perfil-regla'),
    },
  ]


  // Sin perfil no se muestra el formulario: estaría vacío y guardarlo
  // borraría nombre, teléfono (el bot dejaría de reconocerte) y reglas.
  if (!profile) {
    return (
      <Layout titulo="Configuración">
        {profileError
          ? <ErrorState onRetry={refreshProfile} mensaje="No pudimos cargar tu perfil. Revisa tu conexión e intenta de nuevo." />
          : <div className="card p-4 text-sm" style={{ color: 'var(--fg-3)' }}>Cargando tu perfil…</div>}
      </Layout>
    )
  }

  const indice = [
    ['perfil-datos', 'Tus datos'],
    ['perfil-regla', 'Regla de reparto'],
    ['perfil-nomina', 'Ingresos y nómina'],
    ['perfil-metodos', 'Métodos de pago'],
    ['perfil-categorias', 'Categorías'],
    ['perfil-seguridad', 'Seguridad'],
  ]

  return (
    <Layout titulo="Configuración">
      <div className="ajustes">
      {/* Índice (solo escritorio): salta a cada sección sin tocar la URL */}
      <nav className="ajustes-indice" aria-label="Secciones de configuración">
        <p className="ajustes-indice-titulo">Configuración</p>
        {indice.map(([id, etiqueta]) => (
          <button key={id} type="button" onClick={() => irA(id)}>{etiqueta}</button>
        ))}
        <Link to="/whatsapp">Historial de WhatsApp</Link>
      </nav>
      <div className="space-y-3 min-w-0">
        <SetupGuide items={setupItems} />

        {/* ── Fila 1: misma altura en ambas columnas ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">

          {/* Datos básicos */}
          <div id="perfil-datos" className="card p-4 scroll-mt-24">
            <h2 className="titulo-seccion mb-3">Tus datos</h2>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="col-span-2">
                <label className="label">Email</label>
                <input className="input text-sm cursor-not-allowed" style={{ color: 'var(--fg-4)', background: 'var(--surface-2)' }}
                  value={user?.email ?? ''} readOnly />
              </div>
              <div>
                <label className="label">Nombre</label>
                <input className="input text-sm" placeholder="Tu nombre"
                  value={nombre} onChange={e => setNombre(e.target.value)} />
              </div>
              <div>
                <label className="label">WhatsApp</label>
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-[10px] rounded-[var(--r-md)] font-mono text-sm font-semibold border flex-shrink-0"
                    style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--fg-2)' }}>
                    +52
                  </span>
                  <input className="input font-mono text-sm" placeholder="6675078043" inputMode="numeric"
                    value={telefono10} onChange={e => setTelefono10(soloDiezDigitos(e.target.value))} />
                </div>
              </div>
              <div className="col-span-2 -mt-1.5">
                <VerificarWhatsapp
                  profile={profile}
                  pendienteDeGuardar={telefono10 !== telefonoA10(profile.telefono)}
                  onVerificado={refreshProfile}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="label">Gasto hormiga: hasta cuánto</label>
              <div className="flex items-center gap-2">
                <input type="number" className="input font-mono text-sm w-28" placeholder="100"
                  value={umbralHormiga} onChange={e => setUmbralHormiga(e.target.value)} />
                <span className="text-sm font-medium" style={{ color: 'var(--fg-3)' }}>pesos</span>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--fg-4)' }}>
                Solo gastos de <strong style={{ color: 'var(--deseo-fg)' }}>Deseo</strong> por debajo de este monto se cuentan como hormiga
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="btn-primary flex items-center gap-2 text-sm" onClick={guardarBasico} disabled={savingBasico}>
                <Save className="w-4 h-4" /> {savingBasico ? 'Guardando...' : 'Guardar'}
              </button>
              {msgBasico && <span className="text-sm font-medium" style={{ color: 'var(--positive-fg)' }}>{msgBasico}</span>}
            </div>
          </div>

          {/* Regla 50/30/20 */}
          <div id="perfil-regla" className="card p-4 scroll-mt-24">
            <h2 className="titulo-seccion mb-1">Tu regla de reparto</h2>
            <p className="text-xs mb-3" style={{ color: 'var(--fg-4)' }}>Los porcentajes deben sumar exactamente 100%</p>
            <div className="space-y-2 mb-3">
              {[
                { key: 'necesidad', label: 'Necesidad', color: 'var(--necesidad-fg)', trackColor: 'var(--necesidad)' },
                { key: 'deseo',     label: 'Deseo',     color: 'var(--deseo-fg)',     trackColor: 'var(--deseo)'     },
                { key: 'ahorro',    label: 'Ahorro',    color: 'var(--ahorro-fg)',    trackColor: 'var(--ahorro)'    },
              ].map(({ key, label, trackColor }) => {
                const pct = Math.round(Number(regla[key]) * 100)
                return (
                  <div key={key}>
                    {/* Etiqueta + valor */}
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm flex items-center gap-2" style={{ color: 'var(--fg-1)' }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: trackColor }} />{label}
                      </span>
                      <span className="text-sm font-semibold tabular" style={{ color: 'var(--fg-1)' }}>
                        {pct}%
                      </span>
                    </div>
                    {/* Barra con jalador */}
                    <div className="relative h-5 flex items-center">
                      {/* Track */}
                      <div className="absolute w-full h-1 rounded-full" style={{ background: 'var(--surface-3)' }} />
                      {/* Fill */}
                      <div
                        className="absolute h-1 rounded-full pointer-events-none"
                        style={{ width: `${pct}%`, background: trackColor }}
                      />
                      {/* Range input invisible — captura todos los eventos de arrastre */}
                      <input
                        type="range" min="0" max="100" step="1"
                        value={pct}
                        onChange={e => setRegla(r => ({ ...r, [key]: Number(e.target.value) / 100 }))}
                        className="absolute w-full h-full cursor-pointer"
                        style={{ opacity: 0, zIndex: 2 }}
                      />
                      {/* Jalador visible */}
                      <div
                        className="absolute w-4 h-4 rounded-full pointer-events-none"
                        style={{
                          left:       `calc(${pct}% - 8px)`,
                          background: trackColor,
                          border:     '2px solid var(--surface)',
                          zIndex:     1,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between mb-3 pt-2 border-t border-[var(--divider)]">
              <span className="text-sm" style={{ color: reglaOk ? 'var(--fg-3)' : 'var(--negative-fg)' }}>
                {reglaOk ? 'Total' : 'Debe sumar 100%'}
              </span>
              <span className="text-sm font-semibold tabular" style={{ color: reglaOk ? 'var(--fg-1)' : 'var(--negative-fg)' }}>
                {(totalRegla * 100).toFixed(0)}%
              </span>
            </div>
            {errorRegla && <p className="text-sm mb-3" style={{ color: 'var(--negative-fg)' }}>{errorRegla}</p>}
            <button className="btn-primary flex items-center gap-2 text-sm"
              onClick={guardarRegla} disabled={savingRegla || !reglaOk}>
              <Save className="w-4 h-4" /> {savingRegla ? 'Guardando...' : 'Guardar regla'}
            </button>
          </div>

        </div>

        {/* ── Ingresos y Nómina ── */}
        <div id="perfil-nomina" className="scroll-mt-24">
          <NominasSection />
        </div>

        {/* ── Fila 2: Métodos de pago + Categorías ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">

          <MetodosPagoSection metodos={metodos ?? []} mostrarForm={mostrarFormMetodo} setMostrarForm={setMostrarFormMetodo} />

          <CategoriasSection categorias={categorias ?? []} mostrarForm={mostrarFormCat} setMostrarForm={setMostrarFormCat} />
        </div>

        {/* ── Seguridad ── */}
        <div id="perfil-seguridad" className="card p-4 scroll-mt-24">
          <h2 className="titulo-seccion mb-2 sm:mb-1 flex items-center gap-2">
            <KeyRound className="w-4 h-4" style={{ color: 'var(--fg-3)' }} /> Seguridad
          </h2>
          <p className="hidden sm:block text-xs mb-3" style={{ color: 'var(--fg-3)' }}>
            Cambia la contraseña con la que entras a Finni. Tu sesión en este dispositivo sigue abierta.
          </p>
          <PasswordForm onGuardar={cambiarPassword} enLinea />
        </div>
      </div>
      </div>
    </Layout>
  )
}
