import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { ChartTooltip } from '../ui/Chart'
import { formatMXN } from '../../utils/constantes'
import { formatCompactCurrency } from '../../utils/chart'
import { Bloque } from './BloquesInicio'

const COLORES = [
  'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)',
  'var(--chart-5)', 'var(--chart-6)', 'var(--chart-7)', 'var(--chart-8)',
]

// Dona de gasto por categoría (Inicio). Archivo aparte para cargarse con
// React.lazy: recharts pesa ~400 KB y no debe frenar la primera pantalla.
export default function DonaCategorias({ datos, total }) {
  if (datos.length === 0) return null
  return (
    <Bloque titulo="Gasto por categoría">
      <div className="dona">
        <div className="dona-grafica">
          <ResponsiveContainer width="100%" height={124}>
            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Pie data={datos} cx="50%" cy="50%" innerRadius={40} outerRadius={60}
                dataKey="value" nameKey="name" paddingAngle={1} stroke="var(--surface)" strokeWidth={1}>
                {datos.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
              </Pie>
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
                style={{ fill: 'var(--fg-1)', fontSize: 14, fontWeight: 600 }}>
                {formatCompactCurrency(total)}
              </text>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="dona-leyenda">
          {datos.slice(0, 6).map((d, i) => (
            <li key={d.name}>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORES[i % COLORES.length] }} aria-hidden="true" />
              <span className="truncate">{d.name}</span>
              <span className="tabular">{formatMXN(d.value)}</span>
            </li>
          ))}
          {datos.length > 6 && <li className="nota-chica">y {datos.length - 6} más</li>}
        </ul>
      </div>
    </Bloque>
  )
}
