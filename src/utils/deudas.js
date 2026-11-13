import { textoLimpio } from './validaciones'

// Convierte el formulario en la fila que espera la tabla: los campos opcionales
// vacíos van como null (un '' en una columna de fecha o numérica da error 400).
export const filaDeuda = (datos) => ({
  nombre:             textoLimpio(datos.nombre),
  saldo_actual:       Number(datos.saldo_actual),
  saldo_original:     Number(datos.saldo_original) || null,
  pago_mensual:       Number(datos.pago_mensual)   || null,
  frecuencia_pago:    datos.frecuencia_pago === 'quincenal' ? 'quincenal' : 'mensual',
  tasa_interes:       Number(datos.tasa_interes)   || null,
  fecha_proximo_pago: datos.fecha_proximo_pago     || null,
  notas:              textoLimpio(datos.notas)     || null,
})
