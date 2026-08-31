import { useCallback, useEffect, useLayoutEffect, useState } from 'react'

export function useFloatingPosition({
  open,
  triggerRef,
  panelRef,
  width,
  gap = 6,
  margin = 8,
  minHeight = 120,
  maxHeight = 240,
}) {
  const [style, setStyle] = useState(null)

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const panel = panelRef.current
    const panelWidth = width ?? Math.max(rect.width, panel?.offsetWidth ?? rect.width)
    // scrollHeight = altura NATURAL del contenido (aunque el panel esté recortado
    // por un maxHeight previo). Usar offsetHeight aquí se retroalimentaba y dejaba
    // el panel cada vez más pequeño (calendario mostrando solo el encabezado).
    const naturalHeight = panel?.scrollHeight || maxHeight
    const viewportH = window.innerHeight

    // Altura final: la deseada, pero nunca más alta que la pantalla
    const height = Math.max(minHeight, Math.min(maxHeight, naturalHeight, viewportH - margin * 2))

    const spaceBelow = viewportH - rect.bottom - gap - margin
    const spaceAbove = rect.top - gap - margin
    // Abre hacia arriba solo si no cabe abajo y arriba hay más espacio
    const opensUp = height > spaceBelow && spaceAbove > spaceBelow

    const maxLeft = Math.max(margin, window.innerWidth - panelWidth - margin)
    const left = Math.min(Math.max(margin, rect.left), maxLeft)

    // Posición preferida según la dirección, luego se acota para quedar siempre
    // completo dentro de la pantalla (puede solaparse un poco con el trigger si
    // el espacio es muy justo — preferible a recortar el contenido)
    const preferredTop = opensUp ? rect.top - gap - height : rect.bottom + gap
    const top = Math.min(Math.max(margin, preferredTop), viewportH - margin - height)

    setStyle({
      position: 'fixed',
      left,
      top,
      width: panelWidth,
      maxHeight: height,
    })
  }, [gap, margin, maxHeight, minHeight, panelRef, triggerRef, width])

  useLayoutEffect(() => {
    if (open) updatePosition()
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return undefined

    const onUpdate = () => updatePosition()
    const raf = window.requestAnimationFrame(onUpdate)

    window.addEventListener('resize', onUpdate)
    window.addEventListener('scroll', onUpdate, true)

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', onUpdate)
      window.removeEventListener('scroll', onUpdate, true)
    }
  }, [open, updatePosition])

  return style ?? { position: 'fixed', left: -9999, top: -9999, width: width ?? 'auto' }
}
