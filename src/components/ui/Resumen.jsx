// Franja de resumen de una página: título corto, la cifra principal y, en la
// misma línea, sus desgloses. Debajo, opcionalmente, una barra de progreso de
// 3 px y una línea de aviso. Sustituye a las cabeceras grandes que había por
// página (Movimientos, Presupuesto, Deudas, Tarjetas).
//
// - tono: 'neutral' | 'warning' | 'negative' (colorea la cifra y la barra)
// - desgloses: nodos (normalmente <Dato />)
// - aviso: nodo (normalmente <Aviso />); no se pinta si es null
export default function Resumen({
  titulo,
  cifra,
  nota,
  tono = 'neutral',
  progreso,
  desgloses,
  aviso,
  cargando = false,
}) {
  const pct = progreso == null ? null : Math.max(0, Math.min(Number(progreso) || 0, 100))

  return (
    <section className={`resumen tone-${tono}`}>
      <div className="resumen-cuerpo">
        <div className="resumen-principal">
          <p className="resumen-titulo">{titulo}</p>
          {cargando
            ? <span className="resumen-esqueleto" aria-hidden="true" />
            : <p className="resumen-cifra">{cifra}</p>}
          {nota && !cargando && <p className="resumen-nota">{nota}</p>}
        </div>
        {desgloses && !cargando && <div className="resumen-datos">{desgloses}</div>}
      </div>
      {pct != null && !cargando && (
        <div className="resumen-barra" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${pct}%` }} />
        </div>
      )}
      {aviso && !cargando && aviso}
    </section>
  )
}

export function Dato({ label, value, tone = 'neutral' }) {
  return (
    <div className={`resumen-dato tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

// Una línea bajo la franja: "Ropa — $228.90 por arriba de su límite.  Ver →"
export function Aviso({ title, description, action, tone = 'neutral' }) {
  return (
    <div className={`resumen-aviso tone-${tone}`}>
      <p>
        <strong>{title}</strong>
        {description && <span> {description}</span>}
      </p>
      {action && <div className="resumen-aviso-accion">{action}</div>}
    </div>
  )
}
