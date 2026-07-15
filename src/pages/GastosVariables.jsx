import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart3,
  Check,
  Copy,
  Gauge,
  Layers3,
  Pencil,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Target,
  WalletCards,
  X,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import Layout from '../components/layout/Layout'
import EmptyState from '../components/ui/EmptyState'
import { ChartLegend, ChartTooltip } from '../components/ui/Chart'
import { useToast } from '../components/ui/Toast'
import {
  SectionHeader,
  SegmentedControl,
  StatusPill,
} from '../components/commitments/CommitmentUI'
import {
  SpendingMetric,
  SpendingNav,
  SpendingOverview,
  SpendingSignal,
} from '../components/spending/SpendingUI'
import { useGastosVariables } from '../hooks/useGastosVariables'
import { formatMXN } from '../utils/constantes'
import {
  chartAxisProps,
  chartAxisTick,
  chartGridProps,
  formatCompactCurrency,
} from '../utils/chart'

const BAR_COLORS = {
  necesidad: 'var(--necesidad)',
  deseo: 'var(--deseo)',
  ahorro: 'var(--ahorro)',
}
const FILTER_OPTIONS = [
  { value: 'todas', label: 'Todas', icon: Layers3 },
  { value: 'necesidad', label: 'Necesidad', icon: ShieldCheck },
  { value: 'deseo', label: 'Deseo', icon: Sparkles },
  { value: 'ahorro', label: 'Ahorro', icon: PiggyBank },
]

function BudgetCategoryRow({ categoria, onActualizar }) {
  const [editando, setEditando] = useState(false)
  const [nuevoLimite, setNuevoLimite] = useState(categoria.limite)
  const [guardando, setGuardando] = useState(false)
  const sinLimite = categoria.limite === 0
  const porcentajeReal = categoria.limite > 0 ? (categoria.gastado / categoria.limite) * 100 : 0
  const disponible = categoria.limite - categoria.gastado
  const tone = categoria.sobre ? 'negative' : sinLimite ? 'warning' : 'positive'

  const guardarLimite = async () => {
    setGuardando(true)
    await onActualizar(categoria.id, Math.max(0, Number(nuevoLimite) || 0))
    setGuardando(false)
    setEditando(false)
  }

  const cancelarEdicion = () => {
    setNuevoLimite(categoria.limite)
    setEditando(false)
  }

  return (
    <article className={`budget-category-row tone-${tone}`}>
      <div className="budget-category-identity">
        <span className="budget-category-icon">{categoria.icono}</span>
        <div>
          <strong>{categoria.nombre}</strong>
          <StatusPill tone={categoria.clasificacion === 'ahorro' ? 'positive' : categoria.clasificacion === 'deseo' ? 'warning' : 'primary'}>
            {categoria.clasificacion}
          </StatusPill>
        </div>
      </div>

      <div className="budget-category-progress">
        <div className="budget-category-progress-copy">
          <span>{sinLimite ? 'Sin referencia mensual' : `${porcentajeReal.toFixed(0)}% utilizado`}</span>
          <strong>{sinLimite ? formatMXN(categoria.gastado) : `${formatMXN(categoria.gastado)} de ${formatMXN(categoria.limite)}`}</strong>
        </div>
        <div className="budget-category-track">
          <span
            style={{
              width: `${Math.min(porcentajeReal, 100)}%`,
              background: categoria.sobre ? 'var(--negative)' : (BAR_COLORS[categoria.clasificacion] ?? 'var(--primary)'),
            }}
          />
        </div>
      </div>

      <div className="budget-category-balance">
        <span>{categoria.sobre ? 'Excedente' : sinLimite ? 'Gastado' : 'Disponible'}</span>
        <strong className={categoria.sobre ? 'is-negative' : ''}>
          {categoria.sobre ? formatMXN(Math.abs(disponible)) : sinLimite ? formatMXN(categoria.gastado) : formatMXN(disponible)}
        </strong>
      </div>

      <div className="budget-category-limit">
        {editando ? (
          <div className="budget-limit-editor">
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
          </div>
        ) : (
          <button
            type="button"
            className="budget-limit-button"
            onClick={() => {
              setNuevoLimite(categoria.limite)
              setEditando(true)
            }}
          >
            <span>
              <small>Límite</small>
              <strong>{sinLimite ? 'Sin límite' : formatMXN(categoria.limite)}</strong>
            </span>
            <Pencil aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
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
    diasTranscurridos,
    diasDelMes,
    esMesActual,
    esMesPasado,
  } = useGastosVariables()
  const toast = useToast()
  const [filtro, setFiltro] = useState('todas')
  const prevAutoCopRef = useRef(0)

  useEffect(() => {
    if (autoCopiadosCount > 0 && autoCopiadosCount !== prevAutoCopRef.current) {
      prevAutoCopRef.current = autoCopiadosCount
      toast(`${autoCopiadosCount} presupuestos copiados del mes anterior`, 'success')
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

  const filtradas = filtro === 'todas'
    ? categorias
    : categorias.filter(categoria => categoria.clasificacion === filtro)

  const datosGrafico = resumen.conLimite
    .map(categoria => ({
      name: categoria.nombre.length > 16 ? `${categoria.nombre.slice(0, 15)}…` : categoria.nombre,
      limite: categoria.limite,
      gastado: categoria.gastado,
      sobre: categoria.sobre,
      clasificacion: categoria.clasificacion,
    }))
    .sort((a, b) => Number(b.sobre) - Number(a.sobre) || b.gastado - a.gastado)

  const estadoPeriodo = esMesActual
    ? `Día ${diasTranscurridos} de ${diasDelMes}`
    : esMesPasado ? 'Periodo cerrado' : 'Periodo futuro'
  const proyeccionLabel = esMesPasado ? 'Cierre real' : 'Proyección'

  const handleCopiar = async () => {
    const { copiados } = await copiarDelMesAnterior()
    toast(copiados > 0 ? `${copiados} límites copiados` : 'El mes anterior no tiene límites', copiados > 0 ? 'success' : 'info')
  }

  let signal
  if (resumen.excedidas.length > 0) {
    const categoria = resumen.excedidas[0]
    signal = (
      <SpendingSignal
        icon={AlertTriangle}
        label="Atención inmediata"
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
        label="Ritmo proyectado"
        title="El mes puede rebasar el plan"
        description={`La proyección supera el presupuesto por ${formatMXN(proyeccionTotal - resumen.totalLimite)}.`}
        tone="warning"
      />
    )
  } else if (resumen.sinLimite.length > 0) {
    signal = (
      <SpendingSignal
        icon={Target}
        label="Cobertura pendiente"
        title={`${resumen.sinLimite.length} categorías sin límite`}
        description={`${formatMXN(resumen.gastoSinLimite)} gastados fuera del presupuesto configurado.`}
        tone="warning"
      />
    )
  } else {
    signal = (
      <SpendingSignal
        icon={ShieldCheck}
        label="Presupuesto estable"
        title="Todo dentro del plan"
        description="Las categorías configuradas conservan margen disponible."
        tone="positive"
      />
    )
  }

  return (
    <Layout titulo="Presupuesto">
      <div className="spending-page">
        <div className="spending-module-bar">
          <SpendingNav />
          <button type="button" onClick={handleCopiar} className="btn-secondary spending-copy-button">
            <Copy aria-hidden="true" />
            <span>Copiar mes anterior</span>
          </button>
        </div>

        <SpendingOverview
          eyebrow={estadoPeriodo}
          title="Tu margen para decidir"
          description={`${resumen.conLimite.length} categorías con presupuesto activo`}
          amountLabel={resumen.disponible < 0 ? 'Presupuesto excedido' : 'Disponible en límites'}
          amount={formatMXN(Math.abs(resumen.disponible))}
          progress={resumen.porcentaje}
          progressLabel={`${formatMXN(resumen.totalGastadoConLimite)} utilizados`}
          progressEnd={`${resumen.porcentaje.toFixed(0)}% de ${formatMXN(resumen.totalLimite)}`}
          tone={resumen.disponible < 0 ? 'negative' : resumen.porcentaje >= 80 ? 'warning' : 'primary'}
          loading={loading}
          metrics={(
            <>
              <SpendingMetric icon={WalletCards} label="Gasto total" value={formatMXN(resumen.totalGastado)} tone="need" />
              <SpendingMetric icon={BarChart3} label={proyeccionLabel} value={formatMXN(proyeccionTotal)} tone="want" />
              <SpendingMetric icon={AlertTriangle} label="Excedidas" value={String(resumen.excedidas.length)} tone={resumen.excedidas.length ? 'negative' : 'saving'} />
            </>
          )}
          aside={signal}
        />

        <SectionHeader
          eyebrow="Límites mensuales"
          title="Presupuesto por categoría"
          description={`${filtradas.length} categorías visibles`}
          action={(
            <SegmentedControl
              ariaLabel="Filtrar presupuesto por clasificación"
              value={filtro}
              options={FILTER_OPTIONS}
              onChange={setFiltro}
            />
          )}
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
            <div className="budget-category-head" aria-hidden="true">
              <span>Categoría</span>
              <span>Uso del presupuesto</span>
              <span>Balance</span>
              <span>Límite mensual</span>
            </div>
            {filtradas.map(categoria => (
              <BudgetCategoryRow
                key={categoria.id}
                categoria={categoria}
                onActualizar={actualizarPresupuesto}
              />
            ))}
          </section>
        )}

        {!loading && datosGrafico.length > 0 && (
          <section className="budget-chart-section">
            <SectionHeader
              eyebrow="Distribucion"
              title="Planeado contra ejecutado"
              description="Comparativo de categorías con límite activo"
            />
            <div className="budget-chart">
              <ResponsiveContainer width="100%" height={Math.max(260, datosGrafico.length * 42)}>
                <BarChart
                  data={datosGrafico}
                  layout="vertical"
                  barSize={11}
                  barGap={4}
                  margin={{ left: 2, right: 22, top: 10, bottom: 0 }}
                >
                  <CartesianGrid {...chartGridProps} horizontal={false} vertical />
                  <XAxis type="number" {...chartAxisProps} tickFormatter={formatCompactCurrency} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={124}
                    axisLine={false}
                    tickLine={false}
                    tick={{ ...chartAxisTick, fontSize: 11 }}
                  />
                  <Tooltip content={<ChartTooltip nameMap={{ limite: 'Límite', gastado: 'Gastado' }} />} />
                  <Legend content={<ChartLegend nameMap={{ limite: 'Límite', gastado: 'Gastado' }} />} />
                  <Bar dataKey="limite" name="limite" fill="var(--surface-3)" radius={[0, 5, 5, 0]} />
                  <Bar dataKey="gastado" name="gastado" radius={[0, 5, 5, 0]}>
                    {datosGrafico.map(entry => (
                      <Cell
                        key={entry.name}
                        fill={entry.sobre ? 'var(--negative)' : (BAR_COLORS[entry.clasificacion] ?? 'var(--primary)')}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}
      </div>
    </Layout>
  )
}
