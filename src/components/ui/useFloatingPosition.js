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
    const measuredHeight = panel?.offsetHeight ?? maxHeight

    const spaceBelow = window.innerHeight - rect.bottom - gap - margin
    const spaceAbove = rect.top - gap - margin
    const opensUp = measuredHeight > spaceBelow && spaceAbove > spaceBelow
    const availableHeight = Math.min(maxHeight, Math.max(minHeight, opensUp ? spaceAbove : spaceBelow))
    const floatingHeight = Math.min(measuredHeight, availableHeight)

    const maxLeft = Math.max(margin, window.innerWidth - panelWidth - margin)
    const left = Math.min(Math.max(margin, rect.left), maxLeft)
    const top = opensUp
      ? Math.max(margin, rect.top - gap - floatingHeight)
      : Math.min(rect.bottom + gap, window.innerHeight - margin - floatingHeight)

    setStyle({
      position: 'fixed',
      left,
      top,
      width: panelWidth,
      maxHeight: availableHeight,
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
