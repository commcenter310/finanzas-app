import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'
import { ChartEmptyState, ChartLegend, ChartTooltip } from '../ui/Chart'
import { chartAxisProps, chartGridProps, formatCompactCurrency } from '../../utils/chart'

// Finni chart palette — usa la secuencia de tokens (se recolorea con el tema)
const COLORES_CATEGORIA = [
  'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)',
  'var(--chart-5)', 'var(--chart-6)', 'var(--chart-7)', 'var(--chart-8)',
]

// Gráficas del Dashboard. Viven en su propio archivo para cargarse aparte
// (React.lazy): recharts pesa ~400 KB y no debe frenar la primera pantalla.
export default function DashboardCharts({ datosDona, totalDona, datos5030 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Donut categorías */}
      <div className="card p-5">
        <h2 className="font-bold mb-4" style={{ color: 'var(--fg-1)', fontSize: 17, letterSpacing: 0 }}>
          Gastos por Categoría
        </h2>
        {datosDona.length === 0
          ? (
            <ChartEmptyState>Sin gastos este mes</ChartEmptyState>
          )
          : (
            <>
              <ResponsiveContainer width="100%" height={228}>
                <PieChart margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                  <Pie
                    data={datosDona}
                    cx="50%" cy="50%"
                    innerRadius={58} outerRadius={88}
                    dataKey="value" nameKey="name"
                    paddingAngle={3}
                    cornerRadius={5}
                    stroke="var(--surface)"
                    strokeWidth={3}
                  >
                    {datosDona.map((_, i) => (
                      <Cell key={i} fill={COLORES_CATEGORIA[i % COLORES_CATEGORIA.length]} />
                    ))}
                  </Pie>
                  <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle"
                    style={{ fill: 'var(--fg-3)', fontSize: 11, fontWeight: 700 }}>
                    Total
                  </text>
                  <text x="50%" y="57%" textAnchor="middle" dominantBaseline="middle"
                    style={{ fill: 'var(--fg-1)', fontSize: 16, fontWeight: 800 }}>
                    {formatCompactCurrency(totalDona)}
                  </text>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <ChartLegend
                payload={datosDona.map((item, i) => ({
                  value: item.name,
                  color: COLORES_CATEGORIA[i % COLORES_CATEGORIA.length],
                }))}
              />
            </>
          )}
      </div>

      {/* Barras presupuesto vs actual */}
      <div className="card p-5">
        <h2 className="font-bold mb-4" style={{ color: 'var(--fg-1)', fontSize: 17, letterSpacing: 0 }}>
          Presupuesto vs Actual
        </h2>
        <ResponsiveContainer width="100%" height={248}>
          <BarChart data={datos5030} barSize={20} barGap={7} barCategoryGap="26%" margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid {...chartGridProps} />
            <XAxis dataKey="name" {...chartAxisProps} />
            <YAxis {...chartAxisProps} width={52} tickFormatter={formatCompactCurrency} />
            <Tooltip content={<ChartTooltip nameMap={{ meta: 'Meta', actual: 'Actual' }} />} />
            <Legend content={<ChartLegend nameMap={{ meta: 'Meta', actual: 'Actual' }} />} />
            <Bar dataKey="meta"   name="Meta"   fill="var(--surface-3)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="actual" name="Actual" fill="var(--primary-600)" radius={[6, 6, 0, 0]}>
              {datos5030.map((e, i) => (
                <Cell key={i} fill={e.actual > e.meta ? 'var(--negative)' : e.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
