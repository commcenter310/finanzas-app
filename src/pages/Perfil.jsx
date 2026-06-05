import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery'
import { formatMXN } from '../utils/constantes'
import { Save, Plus, Trash2, Pencil, Check, X } from 'lucide-react'

export default function Perfil() {
  const { user, profile, refreshProfile } = useAuth()

  // Datos básicos
  const [nombre,         setNombre]         = useState(profile?.nombre          ?? '')
  const [telefono,       setTelefono]       = useState(profile?.telefono        ?? '')
  const [umbralHormiga,  setUmbralHormiga]  = useState(profile?.umbral_hormiga  ?? 100)
  const [savingBasico, setSavingBasico] = useState(false)
  const [msgBasico, setMsgBasico] = useState('')

  useEffect(() => {
    setNombre(profile?.nombre ?? '')
    setTelefono(profile?.telefono ?? '')
    setUmbralHormiga(profile?.umbral_hormiga ?? 100)
  }, [profile])

  const guardarBasico = async () => {
    setSavingBasico(true)
    await supabase.from('profiles').update({ nombre, telefono, umbral_hormiga: Number(umbralHormiga) }).eq('id', user.id)
    await refreshProfile()
    setSavingBasico(false)
    setMsgBasico('Guardado ✅')
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
    const n = Number(regla.necesidad), d = Number(regla.deseo), a = Number(regla.ahorro)
    if ([n, d, a].some(v => v < 0 || v > 1)) return setErrorRegla('Cada valor debe estar entre 0% y 100%')
    const total = n + d + a
    if (Math.abs(total - 1) > 0.01) return setErrorRegla('Los porcentajes deben sumar 100%')
    setSavingRegla(true)
    setErrorRegla('')
    await supabase.from('profiles').update({
      regla_necesidad: Number(regla.necesidad),
      regla_deseo:     Number(regla.deseo),
      regla_ahorro:    Number(regla.ahorro),
    }).eq('id', user.id)
    await refreshProfile()
    setSavingRegla(false)
  }

  // Métodos de pago
  const { data: metodos, refetch: refetchMetodos } = useSupabaseQuery(async () => {
    const { data } = await supabase.from('metodos_pago').select('*').eq('user_id', user.id).order('nombre')
    return data ?? []
  }, [user?.id])

  const [formMetodo, setFormMetodo] = useState({ nombre: '', tipo: 'debito' })
  const [savingMetodo, setSavingMetodo] = useState(false)
  const [mostrarFormMetodo, setMostrarFormMetodo] = useState(false)
  const [editandoMetodo, setEditandoMetodo] = useState(null)   // id del método en edición
  const [formEditMetodo, setFormEditMetodo] = useState({})

  const agregarMetodo = async () => {
    if (!formMetodo.nombre) return
    setSavingMetodo(true)
    await supabase.from('metodos_pago').insert({ ...formMetodo, user_id: user.id })
    setSavingMetodo(false)
    setFormMetodo({ nombre: '', tipo: 'debito' })
    setMostrarFormMetodo(false)
    refetchMetodos()
  }

  const iniciarEditMetodo = (m) => {
    setEditandoMetodo(m.id)
    setFormEditMetodo({ nombre: m.nombre, tipo: m.tipo })
  }

  const guardarEditMetodo = async (id) => {
    if (!formEditMetodo.nombre) return
    await supabase.from('metodos_pago').update(formEditMetodo).eq('id', id)
    setEditandoMetodo(null)
    refetchMetodos()
  }

  const eliminarMetodo = async (id) => {
    await supabase.from('metodos_pago').update({ activo: false }).eq('id', id)
    refetchMetodos()
  }

  // Categorías
  const { data: categorias, refetch: refetchCats } = useSupabaseQuery(async () => {
    const { data } = await supabase.from('categorias').select('*').eq('user_id', user.id).order('clasificacion').order('nombre')
    return data ?? []
  }, [user?.id])

  const toggleCategoria = async (id, activa) => {
    await supabase.from('categorias').update({ activa: !activa }).eq('id', id)
    refetchCats()
  }

  const [formCat, setFormCat] = useState({ nombre: '', clasificacion: 'deseo', icono: '📦' })
  const [mostrarFormCat, setMostrarFormCat] = useState(false)
  const [editandoCat, setEditandoCat] = useState(null)   // id de la categoría en edición
  const [formEditCat, setFormEditCat] = useState({})

  const agregarCategoria = async () => {
    if (!formCat.nombre) return
    await supabase.from('categorias').insert({ ...formCat, user_id: user.id, tipo_gasto: 'variable' })
    setFormCat({ nombre: '', clasificacion: 'deseo', icono: '📦' })
    setMostrarFormCat(false)
    refetchCats()
  }

  const iniciarEditCat = (c) => {
    setEditandoCat(c.id)
    setFormEditCat({ icono: c.icono, nombre: c.nombre, clasificacion: c.clasificacion })
  }

  const guardarEditCat = async (id) => {
    if (!formEditCat.nombre) return
    await supabase.from('categorias').update(formEditCat).eq('id', id)
    setEditandoCat(null)
    refetchCats()
  }

  const totalRegla = Number(regla.necesidad) + Number(regla.deseo) + Number(regla.ahorro)
  const reglaOk    = Math.abs(totalRegla - 1) < 0.01

  return (
    <Layout titulo="Perfil">
      <div className="space-y-5">

        {/* ── Fila 1: Datos básicos + Regla 50/30/20 lado a lado ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

          {/* Datos básicos */}
          <div className="card p-5">
            <h2 className="font-bold mb-4" style={{ color: 'var(--fg-1)', fontSize: 15 }}>Datos Básicos</h2>
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
                <input className="input font-mono text-sm" placeholder="+52 55 1234 5678"
                  value={telefono} onChange={e => setTelefono(e.target.value)} />
              </div>
            </div>
            <div className="mb-4">
              <label className="label">Umbral gastos hormiga 🐜</label>
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
          <div className="card p-5">
            <h2 className="font-bold mb-1" style={{ color: 'var(--fg-1)', fontSize: 15 }}>Regla Personalizada</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--fg-4)' }}>Los porcentajes deben sumar exactamente 100%</p>
            <div className="space-y-3 mb-4">
              {[
                { key: 'necesidad', label: 'Necesidad', emoji: '🔵', color: 'var(--necesidad-fg)' },
                { key: 'deseo',     label: 'Deseo',     emoji: '🟡', color: 'var(--deseo-fg)'     },
                { key: 'ahorro',    label: 'Ahorro',    emoji: '🟢', color: 'var(--ahorro-fg)'    },
              ].map(({ key, label, emoji, color }) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-sm font-semibold w-24 flex-shrink-0" style={{ color }}>
                    {emoji} {label}
                  </span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(Number(regla[key]) * 100, 100)}%`, background: color }} />
                  </div>
                  <div className="relative flex-shrink-0">
                    <input type="number" step="1" min="0" max="100"
                      className="input font-mono text-sm w-20 pr-6 text-right"
                      style={{ color }}
                      value={Math.round(Number(regla[key]) * 100)}
                      onChange={e => setRegla(r => ({ ...r, [key]: Number(e.target.value) / 100 }))}
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--fg-4)' }}>%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mb-3 py-2 px-3 rounded-xl"
              style={{ background: reglaOk ? 'var(--positive-bg)' : 'var(--negative-bg)' }}>
              <span className="text-xs font-semibold" style={{ color: reglaOk ? 'var(--positive-fg)' : 'var(--negative-fg)' }}>
                {reglaOk ? '✓ Total correcto' : '⚠ Debe sumar 100%'}
              </span>
              <span className="text-sm font-bold tabular" style={{ color: reglaOk ? 'var(--positive-fg)' : 'var(--negative-fg)', fontVariantNumeric: 'tabular-nums' }}>
                {(totalRegla * 100).toFixed(0)}%
              </span>
            </div>
            {errorRegla && <p className="text-sm mb-3" style={{ color: 'var(--negative-fg)' }}>{errorRegla}</p>}
            <button className="btn-primary flex items-center gap-2 text-sm w-full justify-center"
              onClick={guardarRegla} disabled={savingRegla || !reglaOk}>
              <Save className="w-4 h-4" /> {savingRegla ? 'Guardando...' : 'Guardar Regla'}
            </button>
          </div>

        </div>

        {/* ── Fila 2: Métodos de pago + Categorías lado a lado ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

          {/* Métodos de pago */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--divider)' }}>
              <h2 className="font-bold text-sm" style={{ color: 'var(--fg-1)' }}>Métodos de Pago</h2>
              <button onClick={() => setMostrarFormMetodo(v => !v)}
                className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3">
                <Plus className="w-3.5 h-3.5" /> Agregar
              </button>
            </div>
            {mostrarFormMetodo && (
              <div className="p-4 border-b" style={{ background: 'var(--primary-50)', borderColor: 'var(--primary-100)' }}>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="label">Nombre</label>
                    <input className="input text-sm" placeholder="Ej: HSBC..."
                      value={formMetodo.nombre} onChange={e => setFormMetodo(f => ({ ...f, nombre: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Tipo</label>
                    <select className="input text-sm" value={formMetodo.tipo}
                      onChange={e => setFormMetodo(f => ({ ...f, tipo: e.target.value }))}>
                      <option value="debito">Débito</option>
                      <option value="credito">Crédito</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="digital">Digital</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn-primary text-xs py-2 px-4" onClick={agregarMetodo} disabled={savingMetodo}>Guardar</button>
                  <button className="btn-ghost text-xs" onClick={() => setMostrarFormMetodo(false)}>Cancelar</button>
                </div>
              </div>
            )}
            <div className="divide-y max-h-64 overflow-y-auto" style={{ borderColor: 'var(--divider)' }}>
              {(metodos ?? []).filter(m => m.activo).length === 0
                ? <p className="px-5 py-8 text-center text-sm" style={{ color: 'var(--fg-4)' }}>Sin métodos de pago</p>
                : (metodos ?? []).filter(m => m.activo).map(m => (
                  editandoMetodo === m.id ? (
                    /* ── Fila en modo edición ── */
                    <div key={m.id} className="px-4 py-2.5 flex items-center gap-2" style={{ background: 'var(--primary-50)' }}>
                      <input
                        className="input text-sm flex-1 py-1.5"
                        value={formEditMetodo.nombre}
                        onChange={e => setFormEditMetodo(f => ({ ...f, nombre: e.target.value }))}
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') guardarEditMetodo(m.id); if (e.key === 'Escape') setEditandoMetodo(null) }}
                      />
                      <select
                        className="input text-sm py-1.5 w-28"
                        value={formEditMetodo.tipo}
                        onChange={e => setFormEditMetodo(f => ({ ...f, tipo: e.target.value }))}>
                        <option value="debito">Débito</option>
                        <option value="credito">Crédito</option>
                        <option value="efectivo">Efectivo</option>
                        <option value="digital">Digital</option>
                      </select>
                      <button onClick={() => guardarEditMetodo(m.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                        style={{ background: 'var(--ahorro)' }}>
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditandoMetodo(null)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-200 text-gray-600 flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    /* ── Fila normal ── */
                    <div key={m.id} className="flex items-center justify-between px-5 py-3 group">
                      <div>
                        <p className="font-medium text-sm" style={{ color: 'var(--fg-1)' }}>{m.nombre}</p>
                        <p className="text-xs capitalize" style={{ color: 'var(--fg-4)' }}>{m.tipo}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => iniciarEditMetodo(m)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                          style={{ color: 'var(--fg-4)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-50)'; e.currentTarget.style.color = 'var(--primary-700)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--fg-4)' }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => eliminarMetodo(m.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                          style={{ color: 'var(--fg-4)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--negative-bg)'; e.currentTarget.style.color = 'var(--negative-fg)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--fg-4)' }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                ))}
            </div>
          </div>

          {/* Categorías */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--divider)' }}>
              <h2 className="font-bold text-sm" style={{ color: 'var(--fg-1)' }}>Categorías</h2>
              <button onClick={() => setMostrarFormCat(v => !v)}
                className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3">
                <Plus className="w-3.5 h-3.5" /> Agregar
              </button>
            </div>
            {mostrarFormCat && (
              <div className="p-4 border-b" style={{ background: 'var(--primary-50)', borderColor: 'var(--primary-100)' }}>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div>
                    <label className="label">Ícono</label>
                    <input className="input text-sm text-center" value={formCat.icono}
                      onChange={e => setFormCat(f => ({ ...f, icono: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Nombre</label>
                    <input className="input text-sm" placeholder="Medicamentos..."
                      value={formCat.nombre} onChange={e => setFormCat(f => ({ ...f, nombre: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Tipo</label>
                    <select className="input text-sm" value={formCat.clasificacion}
                      onChange={e => setFormCat(f => ({ ...f, clasificacion: e.target.value }))}>
                      <option value="necesidad">Necesidad</option>
                      <option value="deseo">Deseo</option>
                      <option value="ahorro">Ahorro</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn-primary text-xs py-2 px-4" onClick={agregarCategoria}>Guardar</button>
                  <button className="btn-ghost text-xs" onClick={() => setMostrarFormCat(false)}>Cancelar</button>
                </div>
              </div>
            )}
            <div className="divide-y max-h-64 overflow-y-auto" style={{ borderColor: 'var(--divider)' }}>
              {(categorias ?? []).map(c => (
                editandoCat === c.id ? (
                  /* ── Fila en modo edición ── */
                  <div key={c.id} className="px-4 py-2.5 flex items-center gap-2" style={{ background: 'var(--primary-50)' }}>
                    <input
                      className="input text-sm text-center py-1.5 w-12 flex-shrink-0"
                      value={formEditCat.icono}
                      onChange={e => setFormEditCat(f => ({ ...f, icono: e.target.value }))}
                    />
                    <input
                      className="input text-sm py-1.5 flex-1"
                      value={formEditCat.nombre}
                      onChange={e => setFormEditCat(f => ({ ...f, nombre: e.target.value }))}
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') guardarEditCat(c.id); if (e.key === 'Escape') setEditandoCat(null) }}
                    />
                    <select
                      className="input text-sm py-1.5 w-28 flex-shrink-0"
                      value={formEditCat.clasificacion}
                      onChange={e => setFormEditCat(f => ({ ...f, clasificacion: e.target.value }))}>
                      <option value="necesidad">Necesidad</option>
                      <option value="deseo">Deseo</option>
                      <option value="ahorro">Ahorro</option>
                    </select>
                    <button onClick={() => guardarEditCat(c.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                      style={{ background: 'var(--ahorro)' }}>
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setEditandoCat(null)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-200 text-gray-600 flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  /* ── Fila normal ── */
                  <div key={c.id} className="flex items-center justify-between px-5 py-2.5 group"
                    style={{ opacity: c.activa ? 1 : 0.4 }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex-shrink-0">{c.icono}</span>
                      <p className="font-medium text-sm truncate" style={{ color: 'var(--fg-1)' }}>{c.nombre}</p>
                      <span className={`badge badge-${c.clasificacion} flex-shrink-0`}>{c.clasificacion}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      {/* Botón editar — visible en hover */}
                      <button onClick={() => iniciarEditCat(c)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                        style={{ color: 'var(--fg-4)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-50)'; e.currentTarget.style.color = 'var(--primary-700)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--fg-4)' }}>
                        <Pencil className="w-3 h-3" />
                      </button>
                      {/* Botón activar/desactivar — siempre visible */}
                      <button onClick={() => toggleCategoria(c.id, c.activa)}
                        className="text-xs px-2 py-1 rounded-full font-semibold transition-all"
                        style={c.activa ? { background: 'var(--surface-3)', color: 'var(--fg-3)' } : { background: 'var(--ahorro-bg)', color: 'var(--ahorro-fg)' }}>
                        {c.activa ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>

        </div>
      </div>
    </Layout>
  )
}
