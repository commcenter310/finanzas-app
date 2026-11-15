import { ArrowRight, Check } from 'lucide-react'

// Guía de configuración de Perfil: qué falta por llenar. Cuando todo está
// listo desaparece: no hace falta felicitar a nadie por llenar un formulario.
export default function SetupGuide({ items }) {
  const pendientes = items.filter(item => !item.done)
  if (pendientes.length === 0) return null
  const completados = items.length - pendientes.length

  return (
    <section className="card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="titulo-seccion">Te falta configurar</h2>
        <span className="text-[13px] tabular" style={{ color: 'var(--fg-3)' }}>
          {completados} de {items.length} listos
        </span>
      </div>

      <ul className="mt-2 divide-y divide-[var(--divider)]">
        {items.map(item => (
          <li key={item.key}>
            <button
              type="button"
              onClick={item.onClick}
              className="group flex w-full items-center gap-3 py-2.5 text-left"
            >
              <span
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border"
                style={item.done
                  ? { background: 'var(--primary-600)', borderColor: 'var(--primary-600)', color: 'var(--fg-on-primary)' }
                  : { borderColor: 'var(--border-strong)' }}
              >
                {item.done && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-sm font-medium" style={{ color: item.done ? 'var(--fg-3)' : 'var(--fg-1)' }}>{item.title}</span>
                <span className="ml-2 text-[13px]" style={{ color: 'var(--fg-3)' }}>{item.detail}</span>
              </span>
              {!item.done && <ArrowRight className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--fg-3)' }} />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
