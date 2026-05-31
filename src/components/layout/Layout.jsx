import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout({ titulo, children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const closeSidebar = () => setIsSidebarOpen(false)

  return (
    <div className="flex">
      <Sidebar open={isSidebarOpen} onClose={closeSidebar} />

      {/* Backdrop — solo mobile cuando el drawer está abierto */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <div className="flex-1 lg:ml-[248px] min-h-screen">
        <Header titulo={titulo} onMenuClick={() => setIsSidebarOpen(v => !v)} />
        <main className="p-4 lg:p-7">
          {children}
        </main>
      </div>
    </div>
  )
}
