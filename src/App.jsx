import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { MesProvider } from './context/MesContext'
import { ToastProvider } from './components/ui/Toast'
import Auth from './pages/Auth'

// Páginas cargadas bajo demanda → divide el bundle.
// Las páginas con Recharts (Dashboard, Tendencias, Patrimonio, Presupuesto)
// ya no pesan en la carga inicial de las demás.
const Dashboard       = lazy(() => import('./pages/Dashboard'))
const Ingresos        = lazy(() => import('./pages/Ingresos'))
const GastosFijos     = lazy(() => import('./pages/GastosFijos'))
const GastosVariables = lazy(() => import('./pages/GastosVariables'))
const ControlGastos   = lazy(() => import('./pages/ControlGastos'))
const Creditos        = lazy(() => import('./pages/Creditos'))
const Deudas          = lazy(() => import('./pages/Deudas'))
const Ahorros         = lazy(() => import('./pages/Ahorros'))
const PlanQuincena    = lazy(() => import('./pages/PlanQuincena'))
const Tendencias      = lazy(() => import('./pages/Tendencias'))
const Perfil          = lazy(() => import('./pages/Perfil'))
const WhatsappLog     = lazy(() => import('./pages/WhatsappLog'))
const Patrimonio      = lazy(() => import('./pages/Patrimonio'))
const SimuladorCredito = lazy(() => import('./pages/SimuladorCredito'))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-700 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ProtectedRoutes() {
  const { user, loading } = useAuth()

  if (loading) return <PageLoader />

  if (!user) return <Navigate to="/auth" />

  return (
    <MesProvider>
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
          <Route path="/patrimonio"       element={<Patrimonio />} />
          <Route path="/simulador"        element={<SimuladorCredito />} />
          <Route path="/whatsapp"         element={<WhatsappLog />} />
          <Route path="/perfil"           element={<Perfil />}     />
        </Routes>
      </Suspense>
    </MesProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/*"    element={<ProtectedRoutes />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
