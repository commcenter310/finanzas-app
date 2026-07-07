import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout({ titulo, children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const closeSidebar = () => setIsSidebarOpen(false)

  return (
    <div className="flex min-h-screen">
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
      <div className="flex-1 lg:ml-[248px] min-h-screen min-w-0 overflow-x-hidden">
        <Header titulo={titulo} onMenuClick={() => setIsSidebarOpen(v => !v)} />
        <main className="w-full max-w-[1500px] mx-auto p-4 pb-24 lg:p-7 lg:pb-10">
          {children}
        </main>
      </div>
    </div>
  )
}
