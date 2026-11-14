// Reglas básicas de los formularios. Los inputs guardan texto: estas funciones
// aceptan '' / null / undefined sin tronar.

// "$0", "", "abc" y negativos no son un monto válido
export const esMontoPositivo = (valor) => Number(valor) > 0

// Día del mes escrito por el usuario (día de corte, de pago, de cobro): 1–31
export const esDiaDelMes = (valor) => {
  if (valor === '' || valor == null) return false
  const dia = Number(valor)
  return Number.isInteger(dia) && dia >= 1 && dia <= 31
}

// Campo opcional: vacío es válido; si trae algo, debe ser un día del mes
export const esDiaDelMesOpcional = (valor) => valor === '' || valor == null || esDiaDelMes(valor)

// Texto sin espacios sobrantes ('' si no hay nada)
export const textoLimpio = (valor) => String(valor ?? '').trim()
