import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout({ titulo, children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const closeSidebar = () => setIsSidebarOpen(false)

  return (
    <div className="app-shell flex min-h-screen">
      <Sidebar open={isSidebarOpen} onClose={closeSidebar} />

      {/* Backdrop — solo mobile cuando el drawer está abierto */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* min-w-0: sin esto, cualquier contenido más ancho que la pantalla estira
          todo el contenedor y recorta el header en móvil (overflow horizontal) */}
      <div className="app-content flex-1 lg:ml-[248px] min-h-screen min-w-0 overflow-x-hidden">
        <Header titulo={titulo} onMenuClick={() => setIsSidebarOpen(v => !v)} />
        <main className="app-main">
          {children}
        </main>
      </div>
    </div>
  )
}
