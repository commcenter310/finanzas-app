export const fechaLocalISO = (fecha = new Date()) => {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

export const inicioMesISO = (mes, anio) =>
  `${anio}-${String(mes).padStart(2, '0')}-01`

export const finMesISO = (mes, anio) =>
  fechaLocalISO(new Date(anio, mes, 0))

export const contextoMes = (mes, anio, hoy = new Date()) => {
  const diasDelMes = new Date(anio, mes, 0).getDate()
  const inicioSeleccionado = new Date(anio, mes - 1, 1)
  const inicioActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const esMesActual = inicioSeleccionado.getTime() === inicioActual.getTime()
  const esMesPasado = inicioSeleccionado < inicioActual

  return {
    diasDelMes,
    diasTranscurridos: esMesActual ? hoy.getDate() : esMesPasado ? diasDelMes : 0,
    esMesActual,
    esMesPasado,
  }
}

// Mes anterior / siguiente con cambio de año (mes 1-12)
export const mesAnterior = (mes, anio) =>
  mes === 1 ? { mes: 12, anio: anio - 1 } : { mes: mes - 1, anio }

export const mesSiguiente = (mes, anio) =>
  mes === 12 ? { mes: 1, anio: anio + 1 } : { mes: mes + 1, anio }

// Mes al que aplica un ingreso según su fecha de recepción: un pago recibido
// del día 25 en adelante se sugiere para el mes siguiente (la nómina del 30
// cubre gastos del mes que empieza).
export const mesAplicacionIngreso = (fechaISO) => {
  const [anio, mes, dia] = fechaISO.split('-').map(Number)
  return dia >= 25 ? mesSiguiente(mes, anio) : { mes, anio }
}

// { mes, anio } de una fecha 'AAAA-MM-DD' (null si viene vacía o incompleta)
export const mesDeFechaISO = (fechaISO) => {
  const [anio, mes] = String(fechaISO ?? '').split('-').map(Number)
  return mes && anio ? { mes, anio } : null
}

// Los últimos `n` meses terminando en el de `hoy` (el más antiguo primero).
// Se parte del día 1 para no desbordar: 31-oct − 1 mes con setMonth da 1-oct.
export const ultimosMeses = (n, hoy = new Date()) =>
  Array.from({ length: n }, (_, k) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (n - 1 - k), 1)
    return { mes: d.getMonth() + 1, anio: d.getFullYear() }
  })
