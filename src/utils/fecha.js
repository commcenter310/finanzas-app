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
