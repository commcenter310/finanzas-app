import { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { MesProvider } from './context/MesContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './components/ui/Toast'
import ErrorBoundary from './components/ui/ErrorBoundary'
import BrandMark from './components/layout/BrandMark'
import { lazyWithRetry } from './utils/lazyWithRetry'
import Auth from './pages/Auth'

// Páginas cargadas bajo demanda → divide el bundle.
// lazyWithRetry recarga una vez si un chunk quedó viejo tras un deploy nuevo.
const Dashboard       = lazyWithRetry(() => import('./pages/Dashboard'))
const Ingresos        = lazyWithRetry(() => import('./pages/Ingresos'))
const GastosFijos     = lazyWithRetry(() => import('./pages/GastosFijos'))
const GastosVariables = lazyWithRetry(() => import('./pages/GastosVariables'))
const ControlGastos   = lazyWithRetry(() => import('./pages/ControlGastos'))
const Creditos        = lazyWithRetry(() => import('./pages/Creditos'))
const Deudas          = lazyWithRetry(() => import('./pages/Deudas'))
const Ahorros         = lazyWithRetry(() => import('./pages/Ahorros'))
const PlanQuincena    = lazyWithRetry(() => import('./pages/PlanQuincena'))
const Tendencias      = lazyWithRetry(() => import('./pages/Tendencias'))
const Perfil          = lazyWithRetry(() => import('./pages/Perfil'))
const WhatsappLog     = lazyWithRetry(() => import('./pages/WhatsappLog'))
const SimuladorCredito = lazyWithRetry(() => import('./pages/SimuladorCredito'))
const Proyeccion      = lazyWithRetry(() => import('./pages/Proyeccion'))
const Bienvenida      = lazyWithRetry(() => import('./pages/Bienvenida'))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Cargando">
      <BrandMark compact className="brand-loader" />
    </div>
  )
}

function ProtectedRoutes() {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />

  if (!user) return <Navigate to="/auth" />

  // Usuario nuevo → wizard de bienvenida (pantalla completa, sin sidebar).
  // Comparación estricta con false: si la columna onboarding_completado aún
  // no existe en la BD (undefined), la app se comporta como siempre.
  if (profile?.onboarding_completado === false) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Bienvenida />
      </Suspense>
    )
  }

  return (
    <MesProvider>
      {/* Se reinicia al cambiar de ruta: un fallo en una página no bloquea las demás */}
      <ErrorBoundary resetKey={location.pathname}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"                 element={<Dashboard />} />
            <Route path="/plan-quincena"    element={<PlanQuincena />} />
            <Route path="/ingresos"         element={<Ingresos />} />
            <Route path="/gastos-fijos"     element={<GastosFijos />}     />
            <Route path="/gastos-variables" element={<GastosVariables />} />
            <Route path="/control-gastos"   element={<ControlGastos />}   />
            <Route path="/creditos"         element={<Creditos />}   />
            <Route path="/deudas"           element={<Deudas />}     />
            <Route path="/ahorros"          element={<Ahorros />}    />
            <Route path="/tendencias"       element={<Tendencias />} />
            <Route path="/proyeccion"       element={<Proyeccion />} />
            <Route path="/simulador"        element={<SimuladorCredito />} />
            <Route path="/whatsapp"         element={<WhatsappLog />} />
            <Route path="/perfil"           element={<Perfil />}     />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </MesProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/*"    element={<ProtectedRoutes />} />
              </Routes>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
