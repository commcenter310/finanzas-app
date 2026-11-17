import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, MessageSquare, Moon, Settings, Sun } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

// Menú de la esquina: lo que no es una sección de la app (configuración,
// historial del bot, tema y cerrar sesión).
export default function MenuCuenta() {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef(null)
  const { profile, user, signOut } = useAuth()
  const { esOscuro, toggleTema } = useTheme()
  const nombre = profile?.nombre?.trim() || user?.email || ''
  const inicial = (nombre[0] ?? '?').toUpperCase()

  useEffect(() => {
    if (!abierto) return undefined
    const fuera = (e) => { if (!ref.current?.contains(e.target)) setAbierto(false) }
    const tecla = (e) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  const cerrar = () => setAbierto(false)

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        className="menu-cuenta-boton"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label="Menú de cuenta"
        onClick={() => setAbierto(v => !v)}
      >
        {inicial}
      </button>

      {abierto && (
        <div className="menu-cuenta" role="menu">
          {nombre && <p className="menu-cuenta-nombre">{nombre}</p>}
          <Link role="menuitem" to="/perfil" className="menu-cuenta-item" onClick={cerrar}>
            <Settings aria-hidden="true" /> Configuración
          </Link>
          <Link role="menuitem" to="/whatsapp" className="menu-cuenta-item" onClick={cerrar}>
            <MessageSquare aria-hidden="true" /> Historial de WhatsApp
          </Link>
          <button role="menuitem" type="button" className="menu-cuenta-item" onClick={() => { toggleTema(); cerrar() }}>
            {esOscuro ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            {esOscuro ? 'Tema claro' : 'Tema oscuro'}
          </button>
          <button role="menuitem" type="button" className="menu-cuenta-item is-danger" onClick={signOut}>
            <LogOut aria-hidden="true" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
