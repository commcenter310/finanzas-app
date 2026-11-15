// Textos que el bot manda por WhatsApp. Funciones puras: reciben datos y
// devuelven el mensaje. Los cálculos del mes son los mismos de la app
// (src/utils/calculos.js), para que el bot y el Inicio digan lo mismo.
import {
  calcularPorAsignar, calcularSaldoAnterior, calcularSaldoArrastrado,
  calcularTotalGastos, sumarPorClasificacion,
} from '../../src/utils/calculos.js'
import { diasDelMes, MESES, partesFecha } from './fechas.js'
import { fmx } from './texto.js'

const EMOJI_CLASIFICACION = { necesidad: '🔵', deseo: '🟡', ahorro: '🟢' }
const lineas = (...partes) => partes.flat().filter(x => x !== null && x !== undefined && x !== false).join('\n')

export const textoAyuda = () => lineas(
  '👋 Soy el bot de Finni. Escríbeme así:',
  '',
  '*Registrar*',
  '• *89 café nu* — gasto (monto, concepto y con qué pagaste)',
  '• *ayer 200 gasolina* · *el lunes 120 tacos*',
  '• *3000 tele nu a 12 meses* — compra a meses',
  '• *recibí 5000 nómina* — ingreso',
  '• *pagué la luz* — marca un gasto fijo como pagado',
  '• *aboné 500 a nu* — abono a una tarjeta o deuda',
  '',
  '*Corregir el último gasto*',
  '• *era 95* · *cambia la categoría a comida* · *fue con efectivo*',
  '• *deshacer* — lo borra',
  '',
  '*Consultar*',
  '• *resumen* · *pendientes* · *mis deudas* · *tarjetas*',
  '• *últimos gastos* · *cuánto me queda en café*',
  '',
  '🎙️ También puedes mandarme una nota de voz.',
)

// Días que faltan para el día `dia` del mes (este mes o el siguiente).
// Un día que no existe en el mes (31 en febrero) cuenta como el último.
export function diasHasta(dia, hoyISO) {
  if (dia == null) return null
  const { anio, mes, dia: hoy } = partesFecha(hoyISO)
  const esteMes = diasDelMes(mes, anio)
  const objetivo = Math.min(Number(dia), esteMes)
  if (objetivo >= hoy) return objetivo - hoy
  const sig = mes === 12 ? { mes: 1, anio: anio + 1 } : { mes: mes + 1, anio }
  return (esteMes - hoy) + Math.min(Number(dia), diasDelMes(sig.mes, sig.anio))
}
const enDias = (n) => (n === null ? '' : n === 0 ? ' (hoy)' : n === 1 ? ' (mañana)' : ` (en ${n} días)`)

export function textoResumen(d, perfil, mes, anio) {
  const totalIngresos = d.ingresos.reduce((s, i) => s + Number(i.monto_actual), 0)
  const { totalGastos } = calcularTotalGastos(d.gastosFijos, d.transacciones)
  const hayMesAnterior = d.ingresosPrev.length + d.gastosFijosPrev.length + d.transaccionesPrev.length > 0
  const saldoAnterior = hayMesAnterior ? calcularSaldoAnterior(d.ingresosPrev, d.gastosFijosPrev, d.transaccionesPrev) : null
  const arrastrado = calcularSaldoArrastrado(saldoAnterior)
  const disponible = calcularPorAsignar({ totalIngresos, totalGastos, saldoAnterior })
  const variables = d.transacciones.filter(t => t.origen !== 'gastos_fijos')
  const porTipo = sumarPorClasificacion(d.gastosFijos, variables)
  const pendientes = d.gastosFijos.filter(g => !g.pagado)
  const porPagar = pendientes.reduce((s, g) => s + Number(g.monto_previsto), 0)
  const meta = (regla) => fmx(Math.round(totalIngresos * Number(regla ?? 0)))

  return lineas(
    `📊 *Resumen ${MESES[mes - 1]} ${anio}*`,
    '',
    `💰 Ingresos: ${fmx(totalIngresos)}`,
    arrastrado > 0 && `↪️ Sobró del mes pasado: ${fmx(arrastrado)}`,
    `💸 Gastos: ${fmx(totalGastos)}`,
    disponible === null
      ? '⚪ Sin ingresos registrados este mes'
      : `${disponible >= 0 ? '✅' : '🔴'} Disponible: ${fmx(disponible)}`,
    pendientes.length > 0 && `🧾 Fijos por pagar: ${fmx(porPagar)} (${pendientes.length})`,
    '',
    '📐 *Regla 50/30/20*',
    `🔵 Necesidad: ${fmx(porTipo.necesidad)} (meta ${meta(perfil.regla_necesidad)})`,
    `🟡 Deseo: ${fmx(porTipo.deseo)} (meta ${meta(perfil.regla_deseo)})`,
    `🟢 Ahorro: ${fmx(porTipo.ahorro)} (meta ${meta(perfil.regla_ahorro)})`,
  )
}

// Igual que la pantalla Deudas: deudas manuales + tarjetas con saldo
export function textoDeudas(deudas, tarjetas) {
  const conSaldo = tarjetas.filter(t => Number(t.saldo_utilizado) > 0)
  if (deudas.length + conSaldo.length === 0) return '✅ No tienes deudas ni saldo en tarjetas.'
  const total = [...deudas.map(d => d.saldo_actual), ...conSaldo.map(t => t.saldo_utilizado)].reduce((s, n) => s + Number(n), 0)
  return lineas(
    '💳 *Lo que debes*',
    '',
    deudas.map(d => `• ${d.nombre}: ${fmx(d.saldo_actual)}${d.fecha_proximo_pago ? ` (próximo pago ${d.fecha_proximo_pago})` : ''}`),
    conSaldo.map(t => `• 💳 ${t.nombre}: ${fmx(t.saldo_utilizado)}`),
    '',
    `💰 Total: ${fmx(total)}`,
  )
}

export function textoCreditos(tarjetas, hoyISO) {
  if (tarjetas.length === 0) return 'No tienes tarjetas registradas. Agrégalas en la app → Créditos.'
  return lineas(
    '🏦 *Tus tarjetas*',
    ...tarjetas.map(t => {
      const saldo = Number(t.saldo_utilizado ?? 0)
      const limite = Number(t.limite_credito ?? 0)
      return lineas(
        '',
        `💳 *${t.nombre}*`,
        limite > 0
          ? `Saldo: ${fmx(saldo)} de ${fmx(limite)} · disponible ${fmx(Math.max(0, limite - saldo))}`
          : `Saldo: ${fmx(saldo)}`,
        t.fecha_corte != null && `Corte: día ${t.fecha_corte}${enDias(diasHasta(t.fecha_corte, hoyISO))}`,
        t.fecha_pago != null && `Pago: día ${t.fecha_pago}${enDias(diasHasta(t.fecha_pago, hoyISO))}`,
      )
    }),
  )
}

export function textoUltimos(movimientos) {
  if (movimientos.length === 0) return '📋 Aún no tienes gastos registrados.'
  return lineas(
    `📋 *Últimos ${movimientos.length} gastos*`,
    '',
    movimientos.map((t, i) => {
      const cat = t.categorias ? `${t.categorias.icono ?? '📦'} ` : '📦 '
      const metodo = t.metodos_pago ? ` · ${t.metodos_pago.nombre}` : ''
      return `${i + 1}. ${cat}${t.descripcion} — ${fmx(t.monto)}${metodo} · ${t.fecha}`
    }),
  )
}

export function textoPendientes(fijos, mes, anio) {
  if (fijos.length === 0) return `✅ No tienes gastos fijos pendientes en ${MESES[mes - 1]}.`
  const total = fijos.reduce((s, g) => s + Number(g.monto_previsto), 0)
  return lineas(
    `🧾 *Por pagar en ${MESES[mes - 1]} ${anio}*`,
    '',
    fijos.map(g => `• ${g.concepto}: ${fmx(g.monto_previsto)}${g.dia_cobro ? ` (día ${g.dia_cobro})` : ''}`),
    '',
    `💰 Total: ${fmx(total)}`,
    '',
    `_Cuando pagues uno, escríbeme: *pagué ${String(fijos[0].concepto).trim().toLowerCase()}*_`,
  )
}

export function textoPresupuesto(categoria, { limite, gastado }, mes, anio) {
  const etiqueta = `${MESES[mes - 1]} ${anio}`
  if (!(limite > 0)) return `⚪ *${categoria.nombre}* no tiene presupuesto.\nGastado en ${etiqueta}: ${fmx(gastado)}`
  const disponible = limite - gastado
  const pct = Math.round((gastado / limite) * 100)
  const emoji = gastado >= limite ? '🔴' : pct >= 80 ? '🟡' : '✅'
  return lineas(
    `📊 *${categoria.nombre} — ${etiqueta}*`,
    `💸 Gastado: ${fmx(gastado)}`,
    `🎯 Presupuesto: ${fmx(limite)}`,
    disponible >= 0 ? `${emoji} Te quedan ${fmx(disponible)} (${pct}% usado)` : `${emoji} Excedido por ${fmx(-disponible)}`,
  )
}

// Aviso al registrar un gasto en una categoría con presupuesto casi agotado
export function alertaPresupuesto({ limite, gastado }) {
  if (!(limite > 0)) return null
  const pct = Math.round((gastado / limite) * 100)
  if (pct >= 100) return `⚠️ *Presupuesto excedido*: ${fmx(gastado)} de ${fmx(limite)}`
  if (pct >= 80) return `🟡 Presupuesto al ${pct}%: te quedan ${fmx(limite - gastado)}`
  return null
}

// g: { monto, descripcion, categoria, clasificacion, metodo, fecha, msi }
export function textoGasto(titulo, g, { hoy, alerta = null, nota = null } = {}) {
  const meses = g.msi && g.metodo?.credito_id ? ` · ${g.msi} meses` : ''
  return lineas(
    titulo,
    `💸 ${fmx(g.monto)} — ${g.descripcion}`,
    `${EMOJI_CLASIFICACION[g.clasificacion] ?? '⚪'} ${g.categoria ? g.categoria.nombre : 'Sin categoría'}`,
    g.metodo ? `💳 ${g.metodo.nombre}${meses}` : '💳 Sin método de pago',
    g.fecha !== hoy && `📅 ${g.fecha}`,
    alerta,
    nota,
  )
}
