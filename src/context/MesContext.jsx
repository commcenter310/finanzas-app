import { createContext, useContext, useState } from 'react'

const MesContext = createContext(null)

export function MesProvider({ children }) {
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [anio, setAnio] = useState(hoy.getFullYear())

  const irMesAnterior = () => {
    if (mes === 1) { setMes(12); setAnio(a => a - 1) }
    else setMes(m => m - 1)
  }

  const irMesSiguiente = () => {
    if (mes === 12) { setMes(1); setAnio(a => a + 1) }
    else setMes(m => m + 1)
  }

  return (
    <MesContext.Provider value={{ mes, anio, setMes, setAnio, irMesAnterior, irMesSiguiente }}>
      {children}
    </MesContext.Provider>
  )
}

export const useMes = () => useContext(MesContext)
