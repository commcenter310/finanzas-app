import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowUpDown,
  Check,
  Copy,
  Gauge,
  Layers3,
  Pencil,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Target,
  X,
} from 'lucide-react'
import Layout from '../components/layout/Layout'
import EmptyState from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'
import {
  SegmentedControl,
} from '../components/commitments/CommitmentUI'
import {
  SpendingMetric,
  SpendingOverview,
  SpendingSignal,
} from '../components/spending/SpendingUI'
import { useGastosVariables } from '../hooks/useGastosVariables'
import { formatMXN } from '../utils/constantes'
import { CRITERIOS_ORDEN, ordenarCategorias } from '../utils/ordenarCategorias'
import { plural } from '../utils/texto'
import FilterSelect from '../components/ui/FilterSelect'

const BAR_COLORS = {
  necesidad: 'var(--necesidad)',
  deseo: 'var(--deseo)',
  ahorro: 'var(--ahorro)',
}
const ORDEN_OPTIONS = [
  { value: 'alfabetico', label: 'Alfabético (A–Z)' },
  { value: 'gasto', label: 'Mayor gasto' },
  { value: 'uso', label: '% del límite usado' },
]
const ORDEN_KEY = 'finni-presupuesto-orden'

// Orden elegido, recordado en este dispositivo (el almacenamiento puede no estar disponible)
const leerOrden = () => {
  try {
    const guardado = localStorage.getItem(ORDEN_KEY)
    return CRITERIOS_ORDEN.includes(guardado) ? guardado : 'alfabetico'
  } catch {
    return 'alfabetico'
  }
}

const FILTER_OPTIONS = [
  { value: 'todas', label: 'Todas', icon: Layers3 },
  { value: 'necesidad', label: 'Necesidad', icon: ShieldCheck },
  { value: 'deseo', label: 'Deseo', icon: Sparkles },
  { value: 'ahorro', label: 'Ahorro', icon: PiggyBank },
]

function BudgetCategoryRow({ categoria, onActualizar }) {
  const toast = useToast()
  const [editando, setEditando] = useState(false)
  const [nuevoLimite, setNuevoLimite] = useState(categoria.limite)
  const [guardando, setGuardando] = useState(false)
  const sinLimite = categoria.limite === 0
  const porcentajeReal = categoria.limite > 0 ? (categoria.gastado / categoria.limite) * 100 : 0
  const disponible = categoria.limite - categoria.gastado
  const tone = categoria.sobre ? 'negative' : sinLimite ? 'warning' : 'positive'

  const guardarLimite = async () => {
    setGuardando(true)
    // Espera a que llegue el dato nuevo (recarga silenciosa) antes de cerrar:
    // así no se ve ni el valor viejo ni la lista recargándose
    const { error } = await onActualizar(categoria.id, Math.max(0, Number(nuevoLimite) || 0))
    setGuardando(false)
    if (error) {
      toast('No se pudo guardar el límite. Intenta de nuevo.', 'error')
      return
    }
    setEditando(false)
  }

  const cancelarEdicion = () => {
    setNuevoLimite(categoria.limite)
    setEditando(false)
  }

  return (
    <li className={`presu-fila tone-${tone}`}>
      <span className="presu-nombre">
        <strong>{categoria.nombre}</strong>
        <span className={`badge-${categoria.clasificacion}`}>{categoria.clasificacion}</span>
      </span>

      <span className="presu-uso">
        <span className="presu-barra" aria-hidden="true">
          <span
            style={{
              width: `${Math.min(porcentajeReal, 100)}%`,
              background: categoria.sobre ? 'var(--negative)' : (BAR_COLORS[categoria.clasificacion] ?? 'var(--primary)'),
            }}
          />
        </span>
        <span className="presu-pct">{sinLimite ? '' : `${porcentajeReal.toFixed(0)}%`}</span>
      </span>

      <span className="presu-gastado">
        {formatMXN(categoria.gastado)}
        {!sinLimite && <small> de {formatMXN(categoria.limite)}</small>}
      </span>

      <span className={`presu-disponible ${categoria.sobre ? 'is-negative' : ''}`}>
        {categoria.sobre
          ? <>{formatMXN(Math.abs(disponible))} <small>de más</small></>
          : sinLimite ? <small>sin límite</small> : <>{formatMXN(disponible)} <small>libres</small></>}
      </span>

      <span className="presu-limite">
        {editando ? (
          <span className="budget-limit-editor">
            <span>$</span>
            <input
              type="number"
              min="0"
              step="100"
              value={nuevoLimite}
              onChange={event => setNuevoLimite(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') guardarLimite()
                if (event.key === 'Escape') cancelarEdicion()
              }}
              aria-label={`Nuevo límite para ${categoria.nombre}`}
              autoFocus
            />
            <button type="button" onClick={guardarLimite} disabled={guardando} aria-label="Guardar límite" title="Guardar">
              <Check aria-hidden="true" />
            </button>
            <button type="button" onClick={cancelarEdicion} aria-label="Cancelar edición" title="Cancelar">
              <X aria-hidden="true" />
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="presu-limite-boton"
            aria-label={`Cambiar límite de ${categoria.nombre}`}
            onClick={() => {
              setNuevoLimite(categoria.limite)
              setEditando(true)
            }}
          >
            {sinLimite ? 'Poner límite' : `Límite ${formatMXN(categoria.limite)}`}
            <Pencil aria-hidden="true" />
          </button>
        )}
      </span>
    </li>
  )
}

export default function GastosVariables() {
  const {
    loading,
    categorias,
    actualizarPresupuesto,
    copiarDelMesAnterior,
    autoCopiadosCount,
    proyeccionTotal,
    esMesPasado,
  } = useGastosVariables()
  const toast = useToast()
  const [filtro, setFiltro] = useState('todas')
  const [orden, setOrdenState] = useState(leerOrden)
  const setOrden = (valor) => {
    setOrdenState(valor)
    try { localStorage.setItem(ORDEN_KEY, valor) } catch { /* sin almacenamiento: solo esta sesión */ }
  }
  const prevAutoCopRef = useRef(0)

  useEffect(() => {
    if (autoCopiadosCount > 0 && autoCopiadosCount !== prevAutoCopRef.current) {
      prevAutoCopRef.current = autoCopiadosCount
      toast(`${plural(autoCopiadosCount, 'presupuesto copiado', 'presupuestos copiados')} del mes anterior`, 'success')
    }
  }, [autoCopiadosCount, toast])

  const resumen = useMemo(() => {
    const conLimite = categorias.filter(categoria => categoria.limite > 0)
    const sinLimite = categorias.filter(categoria => categoria.limite === 0)
    const totalGastadoConLimite = conLimite.reduce((sum, categoria) => sum + categoria.gastado, 0)
    const totalGastado = categorias.reduce((sum, categoria) => sum + categoria.gastado, 0)
    const totalLimite = conLimite.reduce((sum, categoria) => sum + categoria.limite, 0)
    const gastoSinLimite = sinLimite.reduce((sum, categoria) => sum + categoria.gastado, 0)
    const excedidas = conLimite
      .filter(categoria => categoria.sobre)
      .sort((a, b) => (b.gastado - b.limite) - (a.gastado - a.limite))
    const porcentaje = totalLimite > 0 ? (totalGastadoConLimite / totalLimite) * 100 : 0

    return {
      conLimite,
      sinLimite,
      totalGastado,
      totalGastadoConLimite,
      totalLimite,
      gastoSinLimite,
      excedidas,
      porcentaje,
      disponible: totalLimite - totalGastadoConLimite,
    }
  }, [categorias])

  // Filtro por clasificación + orden elegido (alfabético por defecto)
  const filtradas = ordenarCategorias(
    filtro === 'todas' ? categorias : categorias.filter(categoria => categoria.clasificacion === filtro),
    orden
  )

  const proyeccionLabel = esMesPasado ? 'Cierre real' : 'Proyección'

  const handleCopiar = async () => {
    const { copiados, error } = await copiarDelMesAnterior()
    if (error) return toast('No se pudieron copiar los límites. Intenta de nuevo.', 'error')
    toast(copiados > 0 ? plural(copiados, 'límite copiado', 'límites copiados') : 'El mes anterior no tiene límites', copiados > 0 ? 'success' : 'info')
  }

  let signal
  if (resumen.excedidas.length > 0) {
    const categoria = resumen.excedidas[0]
    signal = (
      <SpendingSignal
        icon={AlertTriangle}
        title={categoria.nombre}
        description={`${formatMXN(categoria.gastado - categoria.limite)} por arriba de su límite.`}
        tone="negative"
        action={(
          <button type="button" className="spending-signal-link" onClick={() => setFiltro(categoria.clasificacion)}>
            Ver clasificación
          </button>
        )}
      />
    )
  } else if (resumen.totalLimite > 0 && !esMesPasado && proyeccionTotal > resumen.totalLimite) {
    signal = (
      <SpendingSignal
        icon={Gauge}
        title="Vas a rebasar el presupuesto"
        description={`La proyección supera el presupuesto por ${formatMXN(proyeccionTotal - resumen.totalLimite)}.`}
        tone="warning"
      />
    )
  } else if (resumen.sinLimite.length > 0) {
    signal = (
      <SpendingSignal
        icon={Target}
        title={`${plural(resumen.sinLimite.length, 'categoría', 'categorías')} sin límite`}
        description={`${formatMXN(resumen.gastoSinLimite)} gastados fuera del presupuesto configurado.`}
        tone="warning"
      />
    )
  } else {
    signal = (
      <SpendingSignal
        icon={ShieldCheck}
        title="Todo dentro del límite"
        description="Ninguna categoría con límite se ha pasado."
        tone="positive"
      />
    )
  }

  return (
    <Layout titulo="Presupuesto" acciones={(
      <button type="button" onClick={handleCopiar} className="btn-secondary">
        <Copy className="w-4 h-4" aria-hidden="true" />
        <span>Copiar mes anterior</span>
      </button>
    )}>
      <div className="spending-page">
        <SpendingOverview
          title={resumen.disponible < 0 ? 'Te pasaste del presupuesto por' : 'Te queda del presupuesto'}
          amount={formatMXN(Math.abs(resumen.disponible))}
          progress={resumen.porcentaje}
          progressLabel={`${formatMXN(resumen.totalGastadoConLimite)} utilizados`}
          progressEnd={`${resumen.porcentaje.toFixed(0)}% de ${formatMXN(resumen.totalLimite)}`}
          tone={resumen.disponible < 0 ? 'negative' : resumen.porcentaje >= 80 ? 'warning' : 'primary'}
          loading={loading}
          metrics={(
            <>
              <SpendingMetric label="Gasto total" value={formatMXN(resumen.totalGastado)} tone="need" />
              <SpendingMetric label={proyeccionLabel} value={formatMXN(proyeccionTotal)} tone="want" />
              <SpendingMetric label="Excedidas" value={String(resumen.excedidas.length)} tone={resumen.excedidas.length ? 'negative' : 'saving'} />
            </>
          )}
          aside={signal}
        />

        {loading ? (
          <div className="budget-category-list spending-loading">
            {Array.from({ length: 6 }, (_, index) => <span key={index} />)}
          </div>
        ) : filtradas.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No hay categorías activas"
            description="Configura categorías variables para definir sus límites mensuales."
            action={<Link to="/perfil" className="btn-primary text-sm">Configurar categorías</Link>}
          />
        ) : (
          <section className="budget-category-list">
            <div className="mov-filtros">
              <SegmentedControl
                ariaLabel="Filtrar presupuesto por clasificación"
                value={filtro}
                options={FILTER_OPTIONS}
                onChange={setFiltro}
              />
              <span className="presu-conteo">{plural(filtradas.length, 'categoría')}</span>
              <div className="budget-sort" aria-label="Ordenar categorías">
                <ArrowUpDown aria-hidden="true" />
                <FilterSelect
                  value={orden}
                  onChange={valor => setOrden(valor || 'alfabetico')}
                  options={ORDEN_OPTIONS}
                  placeholder="Ordenar"
                  showClear={false}
                />
              </div>
            </div>
            <div className="presu-fila presu-cabecera" aria-hidden="true">
              <span>Categoría</span>
              <span>Uso</span>
              <span className="text-right">Gastado</span>
              <span className="text-right">Disponible</span>
              <span className="text-right">Límite</span>
            </div>
            <ul>
              {filtradas.map(categoria => (
                <BudgetCategoryRow
                  key={categoria.id}
                  categoria={categoria}
                  onActualizar={actualizarPresupuesto}
                />
              ))}
            </ul>
          </section>
        )}

      </div>
    </Layout>
  )
}
