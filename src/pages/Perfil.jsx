import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery'
import { formatMXN } from '../utils/constantes'
import { Save, Plus, Trash2 } from 'lucide-react'

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

  const agregarMetodo = async () => {
    if (!formMetodo.nombre) return
    setSavingMetodo(true)
    await supabase.from('metodos_pago').insert({ ...formMetodo, user_id: user.id })
    setSavingMetodo(false)
    setFormMetodo({ nombre: '', tipo: 'debito' })
    setMostrarFormMetodo(false)
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

  const agregarCategoria = async () => {
    if (!formCat.nombre) return
    await supabase.from('categorias').insert({ ...formCat, user_id: user.id, tipo_gasto: 'variable' })
    setFormCat({ nombre: '', clasificacion: 'deseo', icono: '📦' })
    setMostrarFormCat(false)
    refetchCats()
  }

  return (
    <Layout titulo="Perfil">
      <div className="max-w-2xl space-y-6">

        {/* Datos básicos */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-4">Datos Básicos</h2>
          <div className="space-y-3">
            <div>
              <label className="label">Email</label>
              <input className="input bg-gray-50 text-gray-400 cursor-not-allowed" value={user?.email ?? ''} readOnly />
            </div>
            <div>
              <label className="label">Nombre</label>
              <input className="input" placeholder="Tu nombre" value={nombre} onChange={e => setNombre(e.target.value)} />
            </div>
            <div>
              <label className="label">Teléfono WhatsApp</label>
              <input className="input font-mono" placeholder="+52 55 1234 5678" value={telefono} onChange={e => setTelefono(e.target.value)} />
            </div>
            <div>
              <label className="label">Umbral de gastos hormiga ($)</label>
              <input type="number" className="input font-mono w-40" placeholder="100"
                value={umbralHormiga} onChange={e => setUmbralHormiga(e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">Transacciones por debajo de este monto se contarán como "gastos hormiga"</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="btn-primary flex items-center gap-2 text-sm" onClick={guardarBasico} disabled={savingBasico}>
                <Save className="w-4 h-4" /> {savingBasico ? 'Guardando...' : 'Guardar'}
              </button>
              {msgBasico && <span className="text-sm" style={{ color: 'var(--positive-fg)' }}>{msgBasico}</span>}
            </div>
          </div>
        </div>

        {/* Regla 50/30/20 */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-1">Regla Personalizada</h2>
          <p className="text-xs text-gray-400 mb-4">Los valores deben sumar 100%</p>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { key: 'necesidad', label: '🔵 Necesidad', color: 'var(--necesidad-fg)' },
              { key: 'deseo',     label: '🟡 Deseo',     color: 'var(--deseo-fg)' },
              { key: 'ahorro',    label: '🟢 Ahorro',    color: 'var(--ahorro-fg)' },
            ].map(({ key, label, color }) => (
              <div key={key}>
                <label className="label">{label}</label>
                <div className="relative">
                  <input type="number" step="0.01" min="0" max="1" className="input font-mono pr-8" style={{ color }}
                    value={regla[key]}
                    onChange={e => setRegla(r => ({ ...r, [key]: e.target.value }))} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    {(Number(regla[key]) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          {errorRegla && <p className="text-sm mb-3" style={{ color: 'var(--negative-fg)' }}>{errorRegla}</p>}
          <div className="flex items-center gap-3">
            <button className="btn-primary flex items-center gap-2 text-sm" onClick={guardarRegla} disabled={savingRegla}>
              <Save className="w-4 h-4" /> {savingRegla ? 'Guardando...' : 'Guardar Regla'}
            </button>
            <span className="text-sm font-mono" style={{ color: Math.abs((Number(regla.necesidad) + Number(regla.deseo) + Number(regla.ahorro)) - 1) < 0.01 ? 'var(--positive-fg)' : 'var(--negative-fg)' }}>
              Total: {((Number(regla.necesidad) + Number(regla.deseo) + Number(regla.ahorro)) * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Métodos de pago */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-50">
            <h2 className="font-bold text-gray-900">Métodos de Pago</h2>
            <button onClick={() => setMostrarFormMetodo(v => !v)} className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3">
              <Plus className="w-4 h-4" /> Agregar
            </button>
          </div>
          {mostrarFormMetodo && (
            <div className="p-4 bg-primary-50 border-b border-primary-100 flex gap-3 items-end">
              <div className="flex-1">
                <label className="label">Nombre</label>
                <input className="input text-sm" placeholder="Ej: HSBC, Banamex..."
                  value={formMetodo.nombre} onChange={e => setFormMetodo(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div>
                <label className="label">Tipo</label>
                <select className="input text-sm" value={formMetodo.tipo} onChange={e => setFormMetodo(f => ({ ...f, tipo: e.target.value }))}>
                  <option value="debito">Débito</option>
                  <option value="credito">Crédito</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="digital">Digital</option>
                </select>
              </div>
              <button className="btn-primary text-sm py-2.5 px-4" onClick={agregarMetodo} disabled={savingMetodo}>
                Guardar
              </button>
              <button className="btn-ghost text-sm" onClick={() => setMostrarFormMetodo(false)}>Cancelar</button>
            </div>
          )}
          <div className="divide-y divide-gray-50">
            {(metodos ?? []).filter(m => m.activo).map(m => (
              <div key={m.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{m.nombre}</p>
                  <p className="text-xs text-gray-400">{m.tipo}</p>
                </div>
                <button onClick={() => eliminarMetodo(m.id)}
                  className="w-7 h-7 rounded-lg hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-gray-300">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Categorías */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-50">
            <h2 className="font-bold text-gray-900">Categorías</h2>
            <button onClick={() => setMostrarFormCat(v => !v)} className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3">
              <Plus className="w-4 h-4" /> Agregar
            </button>
          </div>
          {mostrarFormCat && (
            <div className="p-4 bg-primary-50 border-b border-primary-100 flex gap-3 items-end">
              <div>
                <label className="label">Ícono</label>
                <input className="input text-sm w-16 text-center" value={formCat.icono}
                  onChange={e => setFormCat(f => ({ ...f, icono: e.target.value }))} />
              </div>
              <div className="flex-1">
                <label className="label">Nombre</label>
                <input className="input text-sm" placeholder="Ej: Medicamentos..."
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
              <button className="btn-primary text-sm py-2.5 px-4" onClick={agregarCategoria}>Guardar</button>
              <button className="btn-ghost text-sm" onClick={() => setMostrarFormCat(false)}>Cancelar</button>
            </div>
          )}
          <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
            {(categorias ?? []).map(c => (
              <div key={c.id} className={`flex items-center justify-between px-5 py-2.5 ${!c.activa ? 'opacity-40' : ''}`}>
                <div className="flex items-center gap-2">
                  <span>{c.icono}</span>
                  <p className="font-medium text-gray-800 text-sm">{c.nombre}</p>
                  <span className={`badge-${c.clasificacion} text-xs`}>{c.clasificacion}</span>
                </div>
                <button onClick={() => toggleCategoria(c.id, c.activa)}
                  className="text-xs px-2 py-1 rounded-full font-semibold transition-all"
                  style={c.activa ? { background: 'var(--surface-3)', color: 'var(--fg-3)' } : { background: 'var(--ahorro-bg)', color: 'var(--ahorro-fg)' }}>
                  {c.activa ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  )
}
