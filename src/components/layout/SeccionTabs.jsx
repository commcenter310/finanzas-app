import { NavLink, useLocation } from 'react-router-dom'
import { seccionDeRuta } from './secciones'

// Pestañas de la sección actual (Gastos: Movimientos · Fijos · Presupuesto).
// No pinta nada si la sección tiene una sola página.
export default function SeccionTabs() {
  const { pathname } = useLocation()
  const seccion = seccionDeRuta(pathname)
  if (!seccion || seccion.rutas.length < 2) return null

  return (
    <nav className="tabs" aria-label={seccion.etiqueta}>
      {seccion.rutas.map(r => (
        <NavLink key={r.to} to={r.to} end className={({ isActive }) => `tab ${isActive ? 'is-active' : ''}`}>
          {r.etiqueta}
        </NavLink>
      ))}
    </nav>
  )
}
