import { ArrowRight, Check } from 'lucide-react'

// Guía de configuración de Perfil: progreso y siguiente paso sugerido.
export default function SetupGuide({ items }) {
  const completados = items.filter(item => item.done).length
  const progreso = items.length ? Math.round((completados / items.length) * 100) : 0
  const siguiente = items.find(item => !item.done)

  return (
    <section className="card p-5 overflow-hidden">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--primary-700)' }}>
            Centro de configuración
          </p>
          <h2 className="mt-1 text-xl font-bold" style={{ color: 'var(--fg-1)' }}>
            Tu setup financiero
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--fg-3)' }}>
            Deja listas las piezas que hacen que el dashboard, las alertas y los cálculos trabajen con datos tuyos.
          </p>
          {siguiente && (
            <button
              type="button"
              onClick={siguiente.onClick}
              className="mt-4 inline-flex items-center gap-2 rounded-[var(--r-md)] px-3 py-2 text-sm font-semibold transition-colors"
              style={{ background: 'var(--primary-50)', color: 'var(--primary-700)' }}
            >
              Siguiente: {siguiente.title}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="min-w-[190px] rounded-[var(--r-lg)] border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs font-semibold" style={{ color: 'var(--fg-3)' }}>Progreso</span>
            <span className="font-mono text-lg font-bold" style={{ color: 'var(--fg-1)' }}>{completados}/{items.length}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-3)' }}>
            <div className="h-full rounded-full bar-fill" style={{ width: `${progreso}%`, background: 'var(--primary)' }} />
          </div>
          <p className="mt-2 text-xs" style={{ color: 'var(--fg-4)' }}>
            {progreso === 100 ? 'Listo para operar con mejor contexto.' : `${progreso}% configurado`}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map(item => {
          const Icon = item.Icon
          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              className="group flex min-h-[92px] items-start gap-3 rounded-[var(--r-lg)] border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm"
              style={{
                borderColor: item.done ? 'var(--primary-200)' : 'var(--border)',
                background: item.done ? 'var(--primary-50)' : 'var(--surface)',
              }}
            >
              <span
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[var(--r-md)]"
                style={{
                  background: item.done ? 'var(--primary-100)' : 'var(--primary-50)',
                  color: 'var(--primary-700)',
                }}
              >
                {item.done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold" style={{ color: 'var(--fg-1)' }}>{item.title}</span>
                <span className="mt-0.5 block text-xs leading-5" style={{ color: 'var(--fg-3)' }}>{item.detail}</span>
              </span>
              {!item.done && <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: 'var(--fg-4)' }} />}
            </button>
          )
        })}
      </div>
    </section>
  )
}
