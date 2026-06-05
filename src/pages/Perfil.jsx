import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery'
import { formatMXN } from '../utils/constantes'
import { Save, Plus, Trash2, Pencil, Check, X, Search } from 'lucide-react'
import FilterSelect from '../components/ui/FilterSelect'

const TIPO_METODO_OPTS = [
  { value: 'debito',   label: 'Débito',   dotColor: 'var(--fg-3)'    },
  { value: 'credito',  label: 'Crédito',  dotColor: 'var(--primary)' },
  { value: 'efectivo', label: 'Efectivo', dotColor: 'var(--ahorro)'  },
  { value: 'digital',  label: 'Digital',  dotColor: 'var(--deseo)'   },
]
const CLASIF_OPTS = [
  { value: 'necesidad', label: 'Necesidad', dotColor: 'var(--necesidad)' },
  { value: 'deseo',     label: 'Deseo',     dotColor: 'var(--deseo)'     },
  { value: 'ahorro',    label: 'Ahorro',    dotColor: 'var(--ahorro)'    },
]

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
  const [busquedaMetodo, setBusquedaMetodo] = useState('')
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
  const [busquedaCat, setBusquedaCat] = useState('')
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
      {/* flex-col para que la fila de listas pueda crecer hasta el final */}
      <div className="flex flex-col gap-5" style={{ minHeight: 'calc(100vh - 130px)' }}>

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
            <div className="space-y-5 mb-4">
              {[
                { key: 'necesidad', label: 'Necesidad', emoji: '🔵', color: 'var(--necesidad-fg)', trackColor: 'var(--necesidad)' },
                { key: 'deseo',     label: 'Deseo',     emoji: '🟡', color: 'var(--deseo-fg)',     trackColor: 'var(--deseo)'     },
                { key: 'ahorro',    label: 'Ahorro',    emoji: '🟢', color: 'var(--ahorro-fg)',    trackColor: 'var(--ahorro)'    },
              ].map(({ key, label, emoji, color, trackColor }) => {
                const pct = Math.round(Number(regla[key]) * 100)
                return (
                  <div key={key}>
                    {/* Etiqueta + valor */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold" style={{ color }}>{emoji} {label}</span>
                      <div className="relative flex-shrink-0">
                        <input
                          type="number" step="1" min="0" max="100"
                          className="input font-mono text-sm w-16 pr-5 text-right py-1"
                          style={{ color }}
                          value={pct}
                          onChange={e => setRegla(r => ({ ...r, [key]: Number(e.target.value) / 100 }))}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--fg-4)' }}>%</span>
                      </div>
                    </div>
                    {/* Barra con jalador */}
                    <div className="relative h-5 flex items-center">
                      {/* Track */}
                      <div className="absolute w-full h-2.5 rounded-full" style={{ background: 'var(--surface-3)' }} />
                      {/* Fill */}
                      <div
                        className="absolute h-2.5 rounded-full pointer-events-none"
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
                        className="absolute w-5 h-5 rounded-full bg-white border-[2.5px] shadow-md pointer-events-none"
                        style={{
                          left:        `calc(${pct}% - 10px)`,
                          borderColor: trackColor,
                          zIndex:      1,
                          boxShadow:   '0 1px 4px rgba(0,0,0,0.18)',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
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

        {/* ── Fila 2: ocupa todo el espacio restante ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1 items-stretch min-h-0">

          {/* Métodos de pago */}
          <div className="card overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--divider)' }}>
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
                    <FilterSelect
                      value={formMetodo.tipo}
                      onChange={v => setFormMetodo(f => ({ ...f, tipo: v }))}
                      options={TIPO_METODO_OPTS}
                      placeholder="Tipo"
                      showClear={false}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn-primary text-xs py-2 px-4" onClick={agregarMetodo} disabled={savingMetodo}>Guardar</button>
                  <button className="btn-ghost text-xs" onClick={() => setMostrarFormMetodo(false)}>Cancelar</button>
                </div>
              </div>
            )}
            {/* Buscador métodos */}
            <div className="px-4 py-2.5 border-b flex-shrink-0" style={{ borderColor: 'var(--divider)' }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--fg-4)' }} />
                <input
                  className="input text-sm pl-8 py-1.5"
                  placeholder="Buscar método..."
                  value={busquedaMetodo}
                  onChange={e => setBusquedaMetodo(e.target.value)}
                />
              </div>
            </div>
            <div className="divide-y overflow-y-auto flex-1 min-h-0" style={{ borderColor: 'var(--divider)' }}>
              {(() => {
                const lista = (metodos ?? []).filter(m => m.activo && m.nombre.toLowerCase().includes(busquedaMetodo.toLowerCase()))
                if (lista.length === 0) return <p className="px-5 py-8 text-center text-sm" style={{ color: 'var(--fg-4)' }}>{busquedaMetodo ? 'Sin resultados' : 'Sin métodos de pago'}</p>
                return lista.map(m => (
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
                      <div className="w-32 flex-shrink-0">
                        <FilterSelect
                          value={formEditMetodo.tipo}
                          onChange={v => setFormEditMetodo(f => ({ ...f, tipo: v }))}
                          options={TIPO_METODO_OPTS}
                          placeholder="Tipo"
                          showClear={false}
                        />
                      </div>
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
                ))
            })()}
            </div>
          </div>

          {/* Categorías */}
          <div className="card overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--divider)' }}>
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
                    <FilterSelect
                      value={formCat.clasificacion}
                      onChange={v => setFormCat(f => ({ ...f, clasificacion: v }))}
                      options={CLASIF_OPTS}
                      placeholder="Tipo"
                      showClear={false}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn-primary text-xs py-2 px-4" onClick={agregarCategoria}>Guardar</button>
                  <button className="btn-ghost text-xs" onClick={() => setMostrarFormCat(false)}>Cancelar</button>
                </div>
              </div>
            )}
            {/* Buscador categorías */}
            <div className="px-4 py-2.5 border-b flex-shrink-0" style={{ borderColor: 'var(--divider)' }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--fg-4)' }} />
                <input
                  className="input text-sm pl-8 py-1.5"
                  placeholder="Buscar categoría..."
                  value={busquedaCat}
                  onChange={e => setBusquedaCat(e.target.value)}
                />
              </div>
            </div>
            <div className="divide-y overflow-y-auto flex-1 min-h-0" style={{ borderColor: 'var(--divider)' }}>
              {(categorias ?? [])
                .filter(c => c.nombre.toLowerCase().includes(busquedaCat.toLowerCase()))
                .map(c => (
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
                    <div className="w-32 flex-shrink-0">
                      <FilterSelect
                        value={formEditCat.clasificacion}
                        onChange={v => setFormEditCat(f => ({ ...f, clasificacion: v }))}
                        options={CLASIF_OPTS}
                        placeholder="Tipo"
                        showClear={false}
                      />
                    </div>
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
