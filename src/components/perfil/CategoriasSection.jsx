import { useState } from 'react'
import { Plus, Search, Check, X, Pencil } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { invalidateQueryCache } from '../../hooks/useSupabaseQuery'
import { useToast } from '../ui/Toast'
import { useGuardarConAviso } from '../../hooks/useGuardarConAviso'
import { CLASIF_OPTS } from '../../utils/constantes'
import FilterSelect from '../ui/FilterSelect'

// Categorías de Perfil: alta, edición, activar/desactivar y búsqueda.
export default function CategoriasSection({ categorias, mostrarForm: mostrarFormCat, setMostrarForm: setMostrarFormCat }) {
  const { user } = useAuth()
  const guardar = useGuardarConAviso()
  const toast = useToast()

  const invalidateCategorias = () => invalidateQueryCache([
    'categorias:',
    'tx:',
    'dash:',
    'gastosVariables:',
    'tendencias:',
  ])

  const toggleCategoria = async (id, activa) => {
    if (!await guardar(supabase.from('categorias').update({ activa: !activa }).eq('id', id))) return
    invalidateCategorias()
  }

  const [formCat, setFormCat] = useState({ nombre: '', clasificacion: 'deseo', icono: '📦' })
  const [busquedaCat, setBusquedaCat] = useState('')
  const [editandoCat, setEditandoCat] = useState(null)   // id de la categoría en edición
  const [formEditCat, setFormEditCat] = useState({})

  const agregarCategoria = async () => {
    const nombre = formCat.nombre.trim()
    if (!nombre) return toast('Escribe el nombre de la categoría.', 'error')
    if (!await guardar(
      supabase.from('categorias').insert({ ...formCat, nombre, user_id: user.id, tipo_gasto: 'variable' }),
      { duplicado: 'Ya tienes una categoría con ese nombre.' }
    )) return
    setFormCat({ nombre: '', clasificacion: 'deseo', icono: '📦' })
    setMostrarFormCat(false)
    invalidateCategorias()
  }

  const iniciarEditCat = (c) => {
    setEditandoCat(c.id)
    setFormEditCat({ icono: c.icono, nombre: c.nombre, clasificacion: c.clasificacion })
  }

  const guardarEditCat = async (id) => {
    const nombre = String(formEditCat.nombre ?? '').trim()
    if (!nombre) return toast('La categoría necesita un nombre.', 'error')
    if (!await guardar(
      supabase.from('categorias').update({ ...formEditCat, nombre }).eq('id', id),
      { duplicado: 'Ya tienes una categoría con ese nombre.' }
    )) return
    setEditandoCat(null)
    invalidateCategorias()
  }

  return (
    <div id="perfil-categorias" className="card overflow-hidden scroll-mt-24">
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
      <div className="px-4 py-2.5 border-b" style={{ borderColor: 'var(--divider)' }}>
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
      <div className="divide-y overflow-y-auto max-h-52" style={{ borderColor: 'var(--divider)' }}>
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
                {/* Botón editar (ver .acciones-hover) */}
                <button onClick={() => iniciarEditCat(c)} aria-label={`Editar ${c.nombre}`} title="Editar"
                  className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors acciones-hover"
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
  )
}
