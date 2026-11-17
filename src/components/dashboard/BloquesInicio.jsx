// Bloques de la pantalla de Inicio. Solo presentan: los números vienen
// calculados de useDashboard (ver pages/Dashboard.jsx).
import { ArrowRight, MessageSquare } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatMXN, MESES } from '../../utils/constantes'
import { fechaCorta } from '../../utils/fecha'
import { calcularIngresoPendiente } from '../../utils/calculos'
import { plural } from '../../utils/texto'
import Resumen, { Dato } from '../ui/Resumen'
import EmptyState from '../ui/EmptyState'

export function Bloque({ titulo, enlace, children, className = '' }) {
  return (
    <section className={`card bloque ${className}`}>
      <header className="bloque-cabecera">
        <h2 className="titulo-seccion">{titulo}</h2>
        {enlace && (
          <Link to={enlace.to} className="enlace-seccion">
            {enlace.texto} <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </Link>
        )}
      </header>
      {children}
    </section>
  )
}

const Barra = ({ pct, color = 'var(--fg-1)' }) => (
  <div className="barra-fina" aria-hidden="true">
    <span style={{ width: `${Math.max(0, Math.min(pct, 100))}%`, background: color }} />
  </div>
)

// ── Disponible del mes (incluye el saldo del mes anterior como nota) ──
export function Disponible({ totalIngresos, totalGastos, porAsignar, totalApartado, ahorro, saldoAnterior, mesPrev, anioPrev, cargando }) {
  const disponibleReal = porAsignar == null ? null : porAsignar - totalApartado
  const consumoPct = totalIngresos > 0 ? Math.min((totalGastos / totalIngresos) * 100, 100) : null
  const notas = []
  if (totalApartado > 0) notas.push(`Ya descuenta ${formatMXN(totalApartado)} apartados en tu plan.`)
  if (saldoAnterior != null && Math.abs(saldoAnterior) > 0.5) {
    const mesTexto = `${MESES[mesPrev - 1].toLowerCase()}${anioPrev !== new Date().getFullYear() ? ` ${anioPrev}` : ''}`
    notas.push(saldoAnterior >= 0
      ? `Incluye ${formatMXN(saldoAnterior)} que sobraron de ${mesTexto}.`
      : `${mesTexto[0].toUpperCase()}${mesTexto.slice(1)} cerró con un déficit de ${formatMXN(Math.abs(saldoAnterior))}.`)
  }

  return (
    <Resumen
      titulo="Disponible este mes"
      cifra={disponibleReal == null ? 'Sin ingresos aún' : formatMXN(disponibleReal)}
      tono={disponibleReal != null && disponibleReal < 0 ? 'negative' : 'neutral'}
      nota={notas.join(' ') || null}
      progreso={consumoPct}
      cargando={cargando}
      desgloses={<>
        <Dato label="Ingresos" value={formatMXN(totalIngresos)} />
        <Dato label="Gastado" value={formatMXN(totalGastos)} />
        <Dato label="Ahorrado" value={formatMXN(ahorro)} />
      </>}
    />
  )
}

// ── Avisos ──
const COLOR_AVISO = {
  danger:  'var(--negative)',
  warning: 'var(--warning)',
  success: 'var(--positive)',
  info:    'var(--fg-4)',
}

export function PorAtender({ insights }) {
  if (insights.length === 0) return null
  return (
    <Bloque titulo="Por atender">
      <ul className="lista-filas">
        {insights.map(i => (
          <li key={i.clave ?? i.title}>
            <Link to={i.to} className="fila-aviso" title={i.body}>
              <span className="fila-aviso-punto" style={{ background: COLOR_AVISO[i.kind] ?? COLOR_AVISO.info }} aria-hidden="true" />
              <span className="fila-aviso-texto">{i.title}</span>
              <span className="fila-aviso-valor">{i.value}</span>
              <ArrowRight className="fila-aviso-flecha" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </Bloque>
  )
}

// ── Cierre del mes: ingreso registrado contra esperado y saldo proyectado ──
export function CierreMes({ mes, totalIngresos, ingresoEsperado, proyeccion }) {
  const hayEsperado = ingresoEsperado != null && ingresoEsperado > 0
  const hayProyeccion = proyeccion.esMesActual && proyeccion.saldoProyectado !== null
  if (!hayEsperado && !hayProyeccion) return null
  const faltante = hayEsperado ? calcularIngresoPendiente(ingresoEsperado, totalIngresos) : 0

  return (
    <Bloque titulo={`Cierre de ${MESES[mes - 1].toLowerCase()}`} enlace={{ to: '/plan-quincena', texto: 'Ver plan' }}>
      <div className="cierre">
        {hayEsperado && (
          <div className="cierre-ingreso">
            <div className="fila-cifras">
              <span>Ingreso registrado</span>
              <span className="tabular"><strong>{formatMXN(totalIngresos)}</strong> de ~{formatMXN(ingresoEsperado)}</span>
            </div>
            <Barra pct={(totalIngresos / ingresoEsperado) * 100} />
            {faltante > 0 && (
              <p className="nota-chica">
                Faltan {formatMXN(faltante)} según tu nómina.{' '}
                <Link to="/ingresos" className="underline underline-offset-2" style={{ color: 'var(--primary-700)' }}>Registrar</Link>
              </p>
            )}
          </div>
        )}
        {hayProyeccion && (
          <div className="cierre-proyeccion">
            <div className="min-w-0">
              <p className="text-[13px]" style={{ color: 'var(--fg-2)' }}>A este ritmo cierras con</p>
              <p className="nota-chica">
                Gasto proyectado {formatMXN(proyeccion.gastoProyectado)} · día {proyeccion.diaActual} de {proyeccion.diasMes}
              </p>
            </div>
            <p className="cierre-cifra tabular" style={proyeccion.saldoProyectado < 0 ? { color: 'var(--negative)' } : undefined}>
              {proyeccion.saldoProyectado >= 0 ? '+' : ''}{formatMXN(proyeccion.saldoProyectado)}
            </p>
          </div>
        )}
      </div>
    </Bloque>
  )
}

// ── Regla 50/30/20 ──
export function Regla({ reglas, filas }) {
  const titulo = `Regla ${Math.round(reglas.regla_necesidad * 100)}/${Math.round(reglas.regla_deseo * 100)}/${Math.round(reglas.regla_ahorro * 100)}`
  return (
    <Bloque titulo={titulo}>
      <div className="regla">
        {filas.map(({ name, actual, meta, fill }) => {
          const sobre = actual > meta
          return (
            <div key={name} className="regla-fila">
              <span className="regla-nombre">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: fill }} aria-hidden="true" />{name}
              </span>
              <Barra pct={meta > 0 ? (actual / meta) * 100 : 0} color={sobre ? 'var(--negative)' : fill} />
              <span className="regla-cifras tabular">
                <strong style={sobre ? { color: 'var(--negative-fg)' } : undefined}>{formatMXN(actual)}</strong>
                <span> / {formatMXN(meta)}</span>
              </span>
            </div>
          )
        })}
      </div>
    </Bloque>
  )
}

// ── Pagos fijos pendientes ──
export function PagosPendientes({ fijosPendientes }) {
  if (fijosPendientes.length === 0) return null
  const hoyDia = new Date().getDate()
  return (
    <Bloque titulo={plural(fijosPendientes.length, 'pago fijo pendiente', 'pagos fijos pendientes')} enlace={{ to: '/gastos-fijos', texto: 'Ver' }}>
      <ul className="lista-filas">
        {fijosPendientes.slice(0, 5).map(g => {
          const vencido = g.dia_cobro && g.dia_cobro < hoyDia
          const proximo = g.dia_cobro && (g.dia_cobro - hoyDia) <= 3 && !vencido
          return (
            <li key={g.id} className="fila-simple">
              <span className="truncate">{g.concepto}</span>
              {g.dia_cobro && (
                <span className="fila-simple-nota" style={vencido ? { color: 'var(--negative-fg)' } : proximo ? { color: 'var(--warning-fg)' } : undefined}>
                  {vencido ? `venció el ${g.dia_cobro}` : `día ${g.dia_cobro}`}
                </span>
              )}
              <span className="fila-simple-monto tabular">{formatMXN(g.monto_previsto)}</span>
            </li>
          )
        })}
      </ul>
      {fijosPendientes.length > 5 && <p className="nota-chica mt-1">y {fijosPendientes.length - 5} más</p>}
    </Bloque>
  )
}

// ── Categorías cerca del límite ──
export function CategoriasRiesgo({ categorias }) {
  if (categorias.length === 0) return null
  return (
    <Bloque titulo="Categorías cerca del límite" enlace={{ to: '/gastos-variables', texto: 'Ver' }}>
      <ul className="lista-filas">
        {categorias.map(cat => (
          <li key={cat.nombre} className="fila-categoria">
            <span className="truncate">{cat.nombre}</span>
            <Barra pct={cat.pct} color={cat.pct >= 100 ? 'var(--negative)' : 'var(--warning)'} />
            <span className="tabular" style={{ color: cat.pct >= 100 ? 'var(--negative-fg)' : 'var(--warning-fg)' }}>
              {cat.pct.toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </Bloque>
  )
}

// ── Últimos movimientos ──
const etiquetaOrigen = (t) => t.origen === 'gastos_fijos' ? 'Gasto fijo' : t.origen === 'deuda' ? 'Pago de deuda' : (t.categorias?.nombre ?? '—')

export function UltimosMovimientos({ transacciones, cargando }) {
  const filas = transacciones.slice(0, 6)
  return (
    <Bloque titulo="Últimos movimientos" enlace={{ to: '/control-gastos', texto: 'Ver todos' }} className="bloque-tabla">
      {cargando ? (
        <div className="space-y-2 px-[var(--card-pad)] pb-3">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-8 rounded-[var(--r-sm)] animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
        </div>
      ) : filas.length === 0 ? (
        <div className="px-[var(--card-pad)] pb-3">
          <EmptyState title="Sin movimientos este mes" description="Cuando registres un gasto aparecerá aquí." className="min-h-[140px]" />
        </div>
      ) : (
        <ul className="lista-filas">
          {filas.map(t => (
            <li key={t.id} className="fila-movimiento">
              <span className="fila-movimiento-fecha tabular">{fechaCorta(t.fecha)}</span>
              <span className="fila-movimiento-desc">
                <span className="truncate">{t.descripcion}</span>
                {t.origen === 'whatsapp' && <MessageSquare className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--fg-4)' }} aria-label="Registrado por WhatsApp" />}
                <span className="fila-movimiento-cat">{etiquetaOrigen(t)}</span>
              </span>
              <span className={`badge-${t.clasificacion} fila-movimiento-badge`}>{t.clasificacion}</span>
              <span className="fila-movimiento-monto tabular">{formatMXN(t.monto)}</span>
            </li>
          ))}
        </ul>
      )}
    </Bloque>
  )
}
