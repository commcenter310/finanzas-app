/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react'

// El tema se aplica ANTES del primer pintado por el script inline de index.html
// (localStorage 'finni-theme' > preferencia del sistema). Este contexto solo
// lee ese estado inicial y expone el toggle.
const ThemeContext = createContext(null)

const aplicarTema = (tema) => {
  if (tema === 'dark') document.documentElement.dataset.theme = 'dark'
  else delete document.documentElement.dataset.theme
  localStorage.setItem('finni-theme', tema)
  // Color de la barra del sistema (Android/PWA)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.content = tema === 'dark' ? '#080C14' : '#EEF3FA'
}

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  )

  const toggleTema = () => {
    const nuevo = tema === 'dark' ? 'light' : 'dark'
    aplicarTema(nuevo)
    setTema(nuevo)
  }

  return (
    <ThemeContext.Provider value={{ tema, esOscuro: tema === 'dark', toggleTema }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
