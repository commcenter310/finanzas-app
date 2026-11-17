import { NavLink } from 'react-router-dom'
import { LogOut, MessageSquare, Moon, Settings, Sun, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import BrandMark from './BrandMark'
import { SECCIONES } from './secciones'

// Cajón de navegación (solo móvil y tablet; en escritorio manda la barra superior).
export default function Sidebar({ open, onClose }) {
  const { signOut } = useAuth()
  const { esOscuro, toggleTema } = useTheme()
  const enlace = ({ isActive }) => `sidebar-nav-link ${isActive ? 'is-active' : ''}`

  return (
    <aside
      className={`sidebar-shell lg:hidden w-[264px] max-w-[85vw] h-screen flex flex-col fixed left-0 top-0 z-30 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${open ? 'translate-x-0' : '-translate-x-full'}`}
      aria-hidden={!open}
      inert={!open}
    >
      <div className="sidebar-brand">
        <BrandMark />
        <button type="button" onClick={onClose} className="sidebar-icon-button ml-auto" aria-label="Cerrar menú">
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Secciones">
        {SECCIONES.map(s => (
          s.rutas.length === 1 ? (
            <NavLink key={s.clave} to={s.rutas[0].to} end onClick={onClose} className={enlace}>
              <span className="sidebar-nav-icon"><s.icono strokeWidth={1.75} /></span>
              <span className="truncate">{s.etiqueta}</span>
            </NavLink>
          ) : (
            <section key={s.clave} className="sidebar-group">
              <p className="sidebar-group-title">
                <span className="sidebar-nav-icon"><s.icono strokeWidth={1.75} /></span>
                {s.etiqueta}
              </p>
              {s.rutas.map(r => (
                <NavLink key={r.to} to={r.to} end onClick={onClose}
                  className={({ isActive }) => `sidebar-nav-link is-sub ${isActive ? 'is-active' : ''}`}>
                  <span className="truncate">{r.etiqueta}</span>
                </NavLink>
              ))}
            </section>
          )
        ))}
      </nav>

      <div className="sidebar-footer">
        <NavLink to="/perfil" onClick={onClose} className={enlace}>
          <span className="sidebar-nav-icon"><Settings strokeWidth={1.75} /></span>
          <span>Configuración</span>
        </NavLink>
        <NavLink to="/whatsapp" onClick={onClose} className={enlace}>
          <span className="sidebar-nav-icon"><MessageSquare strokeWidth={1.75} /></span>
          <span>Historial de WhatsApp</span>
        </NavLink>
        <div className="sidebar-footer-actions">
          <button type="button" onClick={toggleTema} className="sidebar-utility-button">
            {esOscuro ? <Sun /> : <Moon />}
            <span>{esOscuro ? 'Tema claro' : 'Tema oscuro'}</span>
          </button>
          <button type="button" onClick={signOut} className="sidebar-utility-icon danger" aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogOut />
          </button>
        </div>
      </div>
    </aside>
  )
}
