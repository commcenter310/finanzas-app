export function crearOperacionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = Math.floor(Math.random() * 16)
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

export function obtenerOperacionId(store, key, firma) {
  const storeKey = String(key)
  const firmaNormalizada = typeof firma === 'string' ? firma : JSON.stringify(firma)
  const pendiente = store.get(storeKey)
  if (pendiente?.firma === firmaNormalizada) return pendiente.id

  const id = crearOperacionId()
  store.set(storeKey, { id, firma: firmaNormalizada })
  return id
}

export function liberarOperacionId(store, key) {
  store.delete(String(key))
}

export function mensajeErrorOperacion(error) {
  const source = `${error?.code ?? ''} ${error?.message ?? ''}`
  if (source.includes('OPERACION_MONTO_INVALIDO')) return 'Ingresa un monto mayor a $0.'
  if (source.includes('OPERACION_NO_ENCONTRADA')) return 'El registro ya no existe. Actualiza e intenta de nuevo.'
  if (source.includes('OPERACION_PROTEGIDA')) return 'Este movimiento se administra desde su módulo de origen.'
  if (source.includes('OPERACION_METODO_INVALIDO')) return 'El método de pago ya no está disponible.'
  if (source.includes('OPERACION_CREDITO_INVALIDO')) return 'La tarjeta vinculada ya no está disponible.'
  if (source.includes('OPERACION_CATEGORIA_INVALIDA')) return 'La categoría seleccionada ya no está disponible.'
  return 'No pudimos completar la operación. Intenta de nuevo.'
}
