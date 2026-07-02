import Layout from '../components/layout/Layout'
import ProyeccionView from '../components/plan/ProyeccionView'

// Página delgada: expone la proyección 12 meses (antes solo accesible
// como tab dentro de Plan de Quincena) con su propia entrada en el menú.
export default function Proyeccion() {
  return (
    <Layout titulo="Proyección 12 Meses">
      <ProyeccionView />
    </Layout>
  )
}
