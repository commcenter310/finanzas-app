import { Component } from 'react'
import { AlertTriangle, Home, RotateCw } from 'lucide-react'
import BrandMark from '../layout/BrandMark'

// Si una pantalla truena al dibujarse (dato inesperado, chunk que no cargó…),
// React desmonta todo y la app queda en blanco. Este límite atrapa el error y
// muestra una salida: recargar o volver al inicio. La sesión no se pierde.
//
// `resetKey` (p. ej. la ruta actual) limpia el error al navegar a otra página.
export default class ErrorBoundary extends Component {
  state = { error: null, resetKey: this.props.resetKey }

  static getDerivedStateFromError(error) {
    return { error }
  }

  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey }
    return null
  }

  componentDidCatch(error, info) {
    console.error('Error al dibujar la pantalla:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-app)' }}>
        <div className="error-state card p-6" role="alert" style={{ maxWidth: 420 }}>
          <BrandMark compact />
          <div className="error-state__icon">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold" style={{ color: 'var(--fg-1)' }}>Algo salió mal en esta pantalla</p>
            <p className="text-sm mt-1" style={{ color: 'var(--fg-3)' }}>
              Tus datos están a salvo. Recarga para intentarlo de nuevo o vuelve al inicio.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            <button onClick={() => window.location.reload()} className="btn-primary flex items-center gap-2 text-sm">
              <RotateCw className="w-4 h-4" /> Recargar
            </button>
            <button onClick={() => window.location.assign('/')} className="btn-ghost flex items-center gap-2 text-sm">
              <Home className="w-4 h-4" /> Ir al inicio
            </button>
          </div>
        </div>
      </div>
    )
  }
}
