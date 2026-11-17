import logoClaro from '../../assets/brand/logo-claro.png'
import logoOscuro from '../../assets/brand/logo-oscuro.png'
import emblemaClaro from '../../assets/brand/emblema-claro.png'
import emblemaOscuro from '../../assets/brand/emblema-oscuro.png'
import { useTheme } from '../../context/ThemeContext'

// Logo de Finni Apoyo.
// - compact: solo el símbolo (encabezado móvil, pantallas de carga/error).
// - inverse: el fondo detrás es oscuro (barra lateral, panel del login) →
//   letras blancas. En tema oscuro también se usa la versión de letras blancas.
export default function BrandMark({ compact = false, inverse = false, className = '' }) {
  // Fuera de ThemeProvider (p. ej. pantalla de error general) useTheme es null
  const tema = useTheme()
  const oscuro = inverse || tema?.esOscuro
  if (compact) {
    return <img src={oscuro ? emblemaOscuro : emblemaClaro} alt="Finni Apoyo" className={`brand-emblem ${className}`} width="256" height="256" />
  }
  return (
    <img
      src={oscuro ? logoOscuro : logoClaro}
      alt="Finni Apoyo"
      className={`brand-logo ${className}`}
      width="600"
      height="220"
    />
  )
}
