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
