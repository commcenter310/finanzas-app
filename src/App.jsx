import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { MesProvider } from './context/MesContext'
import { ToastProvider } from './components/ui/Toast'
import Auth from './pages/Auth'
import Dashboard       from './pages/Dashboard'
import Ingresos        from './pages/Ingresos'
import GastosFijos     from './pages/GastosFijos'
import GastosVariables from './pages/GastosVariables'
import ControlGastos   from './pages/ControlGastos'
import Creditos        from './pages/Creditos'
import Deudas          from './pages/Deudas'
import Ahorros         from './pages/Ahorros'
import Tendencias      from './pages/Tendencias'
import Perfil          from './pages/Perfil'
import WhatsappLog     from './pages/WhatsappLog'
import Patrimonio       from './pages/Patrimonio'
import SimuladorCredito from './pages/SimuladorCredito'

function ProtectedRoutes() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-700 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!user) return <Navigate to="/auth" />

  return (
    <MesProvider>
      <Routes>
        <Route path="/"                 element={<Dashboard />} />
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
