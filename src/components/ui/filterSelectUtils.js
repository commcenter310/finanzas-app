export const normalizarBusqueda = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('es-MX')
  .trim()

export const filtrarOpciones = (options, query) => {
  const termino = normalizarBusqueda(query)
  if (!termino) return options
  return options.filter(option =>
    normalizarBusqueda(`${option.icon ?? ''} ${option.label}`).includes(termino)
  )
}
