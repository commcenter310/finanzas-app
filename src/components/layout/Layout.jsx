import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout({ titulo, children }) {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-60 min-h-screen">
        <Header titulo={titulo} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
