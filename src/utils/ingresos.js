import { contextoMes, fechaLocalISO, inicioMesISO, mesAplicacionIngreso, mesDeFechaISO } from './fecha'
import { esMontoPositivo, textoLimpio } from './validaciones'

// Modelo del formulario de ingresos (alta y edición usan el mismo):
// cómo nace, qué le falta y en qué fila de la tabla se convierte.

const sinValor = (valor) => valor === '' || valor == null

// Formulario nuevo para el mes que se está viendo: la fecha sugerida es hoy si
// se ve el mes en curso, o el día 1 del mes visto (así el ingreso aparece en
// la lista que el usuario tiene enfrente). El mes de aplicación sale de la
// fecha (día ≥ 25 → mes siguiente).
export const formNuevoIngreso = (mes, anio, hoy = new Date()) => {
  const fecha = contextoMes(mes, anio, hoy).esMesActual ? fechaLocalISO(hoy) : inicioMesISO(mes, anio)
  return { concepto: '', monto_presupuesto: '', monto_actual: '', fecha_recepcion: fecha, notas: '', ...mesAplicacionIngreso(fecha) }
}

export const formDesdeIngreso = (ingreso) => ({
  concepto:          ingreso.concepto,
  monto_presupuesto: ingreso.monto_presupuesto,
  monto_actual:      ingreso.monto_actual,
  fecha_recepcion:   ingreso.fecha_recepcion ?? '',
  notas:             ingreso.notas ?? '',
  mes:               ingreso.mes,
  anio:              ingreso.anio,
})

// Qué le falta al formulario para poder guardarse ('' si está completo)
export const problemaIngreso = (form) => {
  if (!textoLimpio(form.concepto)) return 'Escribe el concepto del ingreso.'
  if (!esMontoPositivo(form.monto_actual)) return 'Escribe cuánto recibiste (mayor a cero).'
  if (!sinValor(form.monto_presupuesto) && Number(form.monto_presupuesto) < 0) return 'El monto esperado no puede ser negativo.'
  if (!form.fecha_recepcion) return 'Elige la fecha en que llegó el dinero.'
  return ''
}

// Fila de la tabla `ingresos`: montos como número (un '' en una columna
// numérica da error 400), sin monto esperado se usa el recibido, y el mes de
// aplicación es el elegido o, si no viene, el de la fecha.
export const filaIngreso = (form) => {
  const recibido = Number(form.monto_actual) || 0
  const deFecha = mesDeFechaISO(form.fecha_recepcion)
  return {
    concepto:          textoLimpio(form.concepto),
    monto_actual:      recibido,
    monto_presupuesto: sinValor(form.monto_presupuesto) ? recibido : Number(form.monto_presupuesto) || 0,
    fecha_recepcion:   form.fecha_recepcion || null,
    notas:             textoLimpio(form.notas) || null,
    mes:               sinValor(form.mes)  ? deFecha?.mes  ?? null : Number(form.mes),
    anio:              sinValor(form.anio) ? deFecha?.anio ?? null : Number(form.anio),
  }
}

const mesesEntre = (a, b) => (a.anio * 12 + a.mes) - (b.anio * 12 + b.mes)

// Mes alrededor del cual el selector ofrece opciones (anterior / ese /
// siguiente): el de la fecha en que llegó el dinero. Si el ingreso aplica a un
// mes más lejano, se centra en ese para que la opción activa siempre se vea.
export const baseMesPicker = (form) => {
  const elegido = { mes: form.mes, anio: form.anio }
  const deFecha = mesDeFechaISO(form.fecha_recepcion)
  return deFecha && Math.abs(mesesEntre(elegido, deFecha)) <= 1 ? deFecha : elegido
}
