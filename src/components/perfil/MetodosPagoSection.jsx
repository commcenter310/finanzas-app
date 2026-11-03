import { useState } from 'react'
import { Plus, Search, Check, X, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { invalidateQueryCache } from '../../hooks/useSupabaseQuery'
import { useGuardarConAviso } from '../../hooks/useGuardarConAviso'
import FilterSelect from '../ui/FilterSelect'
import ConfirmModal from '../ui/ConfirmModal'

const TIPO_METODO_OPTS = [
  { value: 'debito',   label: 'Débito',   dotColor: 'var(--fg-3)'    },
  { value: 'credito',  label: 'Crédito',  dotColor: 'var(--primary)' },
  { value: 'efectivo', label: 'Efectivo', dotColor: 'var(--ahorro)'  },
  { value: 'digital',  label: 'Digital',  dotColor: 'var(--deseo)'   },
]

// Métodos de pago de Perfil: alta, edición, borrado (con confirmación) y búsqueda.
// `metodos` incluye los inactivos; solo se listan los activos.
export default function MetodosPagoSection({ metodos, mostrarForm: mostrarFormMetodo, setMostrarForm: setMostrarFormMetodo }) {
  const { user } = useAuth()
  const guardar = useGuardarConAviso()

  const invalidateMetodos = () => invalidateQueryCache([
    'metodos:',
    'creditos:',
    'deudas:',
    'recordatorios:',
    'tx:',
    'dash:',
    'tendencias:',
  ])

  const [formMetodo, setFormMetodo] = useState({ nombre: '', tipo: 'debito' })
  const [savingMetodo, setSavingMetodo] = useState(false)
  const [busquedaMetodo, setBusquedaMetodo] = useState('')
  const [editandoMetodo, setEditandoMetodo] = useState(null)   // id del método en edición
  const [formEditMetodo, setFormEditMetodo] = useState({})

  const agregarMetodo = async () => {
    if (!formMetodo.nombre) return
    setSavingMetodo(true)
    const ok = await guardar(supabase.from('metodos_pago').insert({ ...formMetodo, user_id: user.id }))
    setSavingMetodo(false)
    if (!ok) return
    setFormMetodo({ nombre: '', tipo: 'debito' })
    setMostrarFormMetodo(false)
    invalidateMetodos()
  }

  const iniciarEditMetodo = (m) => {
    setEditandoMetodo(m.id)
    setFormEditMetodo({ nombre: m.nombre, tipo: m.tipo })
  }

  const guardarEditMetodo = async (id) => {
    if (!formEditMetodo.nombre) return
    if (!await guardar(supabase.from('metodos_pago').update(formEditMetodo).eq('id', id))) return
    setEditandoMetodo(null)
    invalidateMetodos()
  }

  const [metodoAEliminar, setMetodoAEliminar] = useState(null)

  const eliminarMetodo = async (id) => {
    if (!await guardar(supabase.from('metodos_pago').update({ activo: false }).eq('id', id), 'No se pudo eliminar. Intenta de nuevo.')) return
    invalidateMetodos()
  }

  return (
    <>
    <div id="perfil-metodos" className="card overflow-hidden scroll-mt-24">
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
      <div className="px-4 py-2.5 border-b" style={{ borderColor: 'var(--divider)' }}>
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
      <div className="divide-y overflow-y-auto max-h-52" style={{ borderColor: 'var(--divider)' }}>
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
                <div className="flex items-center gap-1 acciones-hover">
                  <button onClick={() => iniciarEditMetodo(m)} aria-label={`Editar ${m.nombre}`} title="Editar"
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                    style={{ color: 'var(--fg-4)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-50)'; e.currentTarget.style.color = 'var(--primary-700)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--fg-4)' }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setMetodoAEliminar(m)} aria-label={`Eliminar ${m.nombre}`} title="Eliminar"
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
    <ConfirmModal
      open={!!metodoAEliminar}
      titulo={`¿Eliminar ${metodoAEliminar?.nombre ?? 'este método'}?`}
      descripcion="Dejará de aparecer al registrar gastos. Los movimientos que ya hiciste con él no se borran."
      onConfirm={async () => {
        const id = metodoAEliminar.id
        setMetodoAEliminar(null)
        await eliminarMetodo(id)
      }}
      onCancel={() => setMetodoAEliminar(null)}
    />
    </>
  )
}
