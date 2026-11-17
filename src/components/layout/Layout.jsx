import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import BottomNav from './BottomNav'
import SeccionTabs from './SeccionTabs'

// titulo: nombre de la página (encabezado para lectores de pantalla; a la
//   vista ya lo dicen la sección activa y la pestaña).
// acciones: botón(es) principales de la página, a la derecha de las pestañas.
export default function Layout({ titulo, acciones, children }) {
  const [cajonAbierto, setCajonAbierto] = useState(false)
  const cerrarCajon = () => setCajonAbierto(false)

  return (
    <div className="app-shell min-h-screen">
      <Header titulo={titulo} onMenuClick={() => setCajonAbierto(v => !v)} />

      <Sidebar open={cajonAbierto} onClose={cerrarCajon} />
      {cajonAbierto && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={cerrarCajon} aria-hidden="true" />
      )}

      {/* min-w-0 + overflow-x: clip: nada más ancho que la pantalla estira la página.
          clip y no hidden: hidden lo vuelve contenedor de scroll y rompe position: sticky */}
      <main className="app-main min-w-0 [overflow-x:clip]">
        <h1 className="sr-only">{titulo}</h1>
        <div className="page-bar">
          <SeccionTabs />
          {acciones && <div className="page-bar-acciones">{acciones}</div>}
        </div>
        {children}
      </main>

      <BottomNav onMore={() => setCajonAbierto(true)} />
    </div>
  )
}
