import { AlertTriangle, CalendarClock, PiggyBank, Sparkles, Target, TrendingUp, Wallet } from 'lucide-react'
import { formatMXN } from '../../utils/constantes'
import { calcularIngresoPendiente } from '../../utils/calculos'
import { plural } from '../../utils/texto'

// Consejos ("insights") del Dashboard a partir de los números del mes.
// Devuelve tarjetas ordenadas por prioridad; las muestra DashboardOverview.
export function buildDashboardInsights({
  totalIngresos,
  ingresoEsperado,
  proyeccion,
  porAsignar,
  totalApartado,
  ahorro,
  reglas,
  categoriasEnRiesgo,
  gastosHormiga,
  fijosPendientes,
}) {
  const insights = []
  const disponibleReal = porAsignar == null ? null : porAsignar - totalApartado
  const saldoProyectado = proyeccion?.saldoProyectado
  const ingresoFaltante = calcularIngresoPendiente(ingresoEsperado, totalIngresos)
  const totalFijosPendientes = fijosPendientes.reduce((s, g) => s + Number(g.monto_previsto ?? 0), 0)
  const topCategoria = categoriasEnRiesgo[0]
  const objetivoAhorro = totalIngresos > 0 ? totalIngresos * reglas.regla_ahorro : 0
  const ahorroFaltante = Math.max(0, objetivoAhorro - ahorro)

  if (proyeccion?.esMesActual && saldoProyectado != null && saldoProyectado < 0) {
    insights.push({
      kind: 'danger',
      icon: AlertTriangle,
      title: 'Riesgo de cierre negativo',
      value: formatMXN(Math.abs(saldoProyectado)),
      body: 'A este ritmo el mes cierra abajo. Revisa gastos variables o mueve pagos no urgentes.',
      to: '/control-gastos',
      action: 'Revisar gastos',
    })
  } else if (disponibleReal != null) {
    insights.push({
      kind: disponibleReal >= 0 ? 'success' : 'danger',
      icon: Wallet,
      title: disponibleReal >= 0 ? 'Disponible real' : 'Disponible comprometido',
      value: formatMXN(disponibleReal),
      body: totalApartado > 0
        ? 'Ya descuenta lo apartado en tu plan de quincena.'
        : 'Usalo como limite antes de registrar nuevos gastos.',
      to: '/plan-quincena',
      action: 'Ver plan',
    })
  }

  if (fijosPendientes.length > 0) {
    insights.push({
      kind: 'warning',
      icon: CalendarClock,
      title: `${fijosPendientes.length} pago${fijosPendientes.length !== 1 ? 's' : ''} pendiente${fijosPendientes.length !== 1 ? 's' : ''}`,
      value: formatMXN(totalFijosPendientes),
      body: 'Liquidarlos primero evita que el disponible se vea mejor de lo que realmente esta.',
      to: '/gastos-fijos',
      action: 'Ver pendientes',
    })
  }

  if (topCategoria) {
    insights.push({
      kind: topCategoria.pct >= 100 ? 'danger' : 'warning',
      icon: Target,
      title: topCategoria.pct >= 100 ? 'Categoria excedida' : 'Categoria en riesgo',
      value: topCategoria.nombre,
      body: `Lleva ${topCategoria.pct.toFixed(0)}% usado (${formatMXN(topCategoria.gastado)} de ${formatMXN(topCategoria.monto_limite)}).`,
      to: '/gastos-variables',
      action: 'Ajustar presupuesto',
    })
  }

  if (ingresoFaltante > 0) {
    insights.push({
      kind: 'info',
      icon: TrendingUp,
      title: 'Ingreso por registrar',
      value: formatMXN(ingresoFaltante),
      body: 'Capturalo cuando llegue para que la proyeccion y el disponible sean mas precisos.',
      to: '/ingresos',
      action: 'Capturar ingreso',
    })
  }

  if (objetivoAhorro > 0 && ahorroFaltante > objetivoAhorro * 0.2) {
    insights.push({
      kind: 'info',
      icon: PiggyBank,
      title: 'Ahorro bajo la meta',
      value: formatMXN(ahorroFaltante),
      body: `Falta eso para llegar al ${Math.round(reglas.regla_ahorro * 100)}% de tu regla.`,
      to: '/ahorros',
      action: 'Ver ahorros',
    })
  }

  if (gastosHormiga.count >= 3) {
    insights.push({
      kind: 'warning',
      icon: Sparkles,
      title: 'Gastos pequenos acumulados',
      value: formatMXN(gastosHormiga.total),
      body: `${plural(gastosHormiga.count, 'movimiento menor', 'movimientos menores')} a ${formatMXN(gastosHormiga.umbral)} ya pesan en el mes.`,
      to: '/control-gastos',
      action: 'Filtrar gastos',
    })
  }

  if (insights.length === 0 && totalIngresos > 0) {
    insights.push({
      kind: 'success',
      icon: Target,
      title: 'Mes bajo control',
      value: 'Sin alertas fuertes',
      body: 'Tus principales indicadores no muestran urgencias por ahora.',
      to: '/tendencias',
      action: 'Ver tendencias',
    })
  }

  return insights.slice(0, 4)
}
