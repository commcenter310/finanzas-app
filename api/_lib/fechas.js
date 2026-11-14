// Fechas del bot. Funciones puras salvo fechaLocalISO (lee el reloj).

// La app nació en Sinaloa; APP_TIME_ZONE permite cambiarla sin tocar código.
export const ZONA_HORARIA = process.env.APP_TIME_ZONE || 'America/Mazatlan'

// Fecha "de calendario" en la zona del usuario, no la del servidor (UTC)
export function fechaLocalISO(fecha = new Date(), zona = ZONA_HORARIA) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(fecha).map(x => [x.type, x.value])
  )
  return `${p.year}-${p.month}-${p.day}`
}

const aUTC = (iso) => { const [a, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(a, m - 1, d)) }
const aISO = (d) => d.toISOString().slice(0, 10)

export const sumarDias = (iso, n) => { const d = aUTC(iso); d.setUTCDate(d.getUTCDate() + n); return aISO(d) }
export const diaSemana = (iso) => aUTC(iso).getUTCDay()   // 0 = domingo
export const partesFecha = (iso) => { const [anio, mes, dia] = iso.split('-').map(Number); return { anio, mes, dia } }
export const diasDelMes = (mes, anio) => new Date(Date.UTC(anio, mes, 0)).getUTCDate()
export const rangoMes = (mes, anio) => {
  const mm = String(mes).padStart(2, '0')
  return { inicio: `${anio}-${mm}-01`, fin: `${anio}-${mm}-${String(diasDelMes(mes, anio)).padStart(2, '0')}` }
}
export const mesAnterior = (mes, anio) => (mes === 1 ? { mes: 12, anio: anio - 1 } : { mes: mes - 1, anio })

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const MESES_NORM = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DIAS_NORM = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

// ¿Es una fecha real, no futura y de hace menos de un año?
export function fechaAceptable(iso, hoyISO) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso ?? ''))) return false
  const d = aUTC(iso)
  if (Number.isNaN(d.getTime()) || aISO(d) !== iso) return false
  return iso <= hoyISO && iso >= sumarDias(hoyISO, -366)
}

// Busca una fecha dicha con palabras ("ayer", "hace 3 días", "el lunes",
// "el 5 de noviembre") en las palabras normalizadas del mensaje.
// Devuelve { fecha, inicio, largo } (qué palabras quitar) o null.
export function extraerFecha(norm, hoyISO) {
  const hallazgo = (fecha, inicio, largo) => (fechaAceptable(fecha, hoyISO) ? { fecha, inicio, largo } : null)

  for (let i = 0; i < norm.length; i++) {
    const [a, b, c, d] = norm.slice(i, i + 4)

    if (a === 'antes' && b === 'de' && c === 'ayer') return hallazgo(sumarDias(hoyISO, -2), i, 3)
    if (a === 'antier' || a === 'anteayer') return hallazgo(sumarDias(hoyISO, -2), i, 1)
    if (a === 'ayer') return hallazgo(sumarDias(hoyISO, -1), i, 1)
    if (a === 'hoy') return hallazgo(hoyISO, i, 1)

    if (a === 'hace' && /^\d{1,2}$/.test(b ?? '') && (c === 'dias' || c === 'dia')) {
      return hallazgo(sumarDias(hoyISO, -Number(b)), i, 3)
    }

    // "el 5 de noviembre": si ese día aún no llega este año, es del año pasado
    if (a === 'el' && /^\d{1,2}$/.test(b ?? '') && c === 'de' && MESES_NORM.includes(d)) {
      const { anio } = partesFecha(hoyISO)
      const mm = String(MESES_NORM.indexOf(d) + 1).padStart(2, '0')
      const dd = String(Number(b)).padStart(2, '0')
      const esteAnio = `${anio}-${mm}-${dd}`
      return hallazgo(esteAnio <= hoyISO ? esteAnio : `${anio - 1}-${mm}-${dd}`, i, 4)
    }

    // "el lunes", "este martes", "lunes pasado": el más reciente (hoy cuenta,
    // salvo que diga "pasado")
    const conArticulo = (a === 'el' || a === 'este') && DIAS_NORM.includes(b)
    const dia = conArticulo ? b : a
    if (DIAS_NORM.includes(dia)) {
      const despues = conArticulo ? c : b
      const pasado = despues === 'pasado'
      let atras = (diaSemana(hoyISO) - DIAS_NORM.indexOf(dia) + 7) % 7
      if (atras === 0 && pasado) atras = 7
      return hallazgo(sumarDias(hoyISO, -atras), i, (conArticulo ? 2 : 1) + (pasado ? 1 : 0))
    }
  }
  return null
}
