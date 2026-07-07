import Layout from '../components/layout/Layout'
import { useWhatsappLog } from '../hooks/useWhatsappLog'
import { CheckCircle, XCircle, MessageSquare } from 'lucide-react'
import { formatMXN } from '../utils/constantes'
import { Link } from 'react-router-dom'
import EmptyState from '../components/ui/EmptyState'

export default function WhatsappLog() {
  const { logs, loading } = useWhatsappLog()

  const procesados = logs.filter(l => l.procesado).length
  const errores = logs.filter(l => !l.procesado).length

  return (
    <Layout titulo="WhatsApp Log">
      <div className="space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Total Mensajes</p>
            <p className="text-xl font-bold font-mono text-primary-700">{logs.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Procesados</p>
            <p className="text-xl font-bold font-mono" style={{ color: 'var(--positive-fg)' }}>{procesados}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Errores</p>
            <p className="text-xl font-bold font-mono" style={{ color: 'var(--negative-fg)' }}>{errores}</p>
          </div>
        </div>

        {/* Info de uso */}
        <div className="card p-4 bg-primary-50 border-primary-200 border">
          <h3 className="font-bold text-primary-900 mb-2">Cómo usar el bot de WhatsApp</h3>
          <div className="grid grid-cols-2 gap-2 text-sm text-primary-800">
            {[
              ['Registrar gasto', '"350 gasolina costco" o "89 starbucks bbva"'],
              ['Gasto con tarjeta', '"120 tacos liverpool"'],
              ['Ver resumen', '"cómo voy" o "resumen del mes"'],
              ['Ver deudas', '"mis deudas" o "cuánto debo"'],
              ['Ver créditos', '"mis créditos" o "fecha de corte"'],
            ].map(([label, ejemplo]) => (
              <div key={label}>
                <span className="font-semibold">{label}:</span>{' '}
                <code className="bg-primary-100 px-1 rounded text-xs">{ejemplo}</code>
              </div>
            ))}
          </div>
        </div>

        {/* Tabla de logs */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50">
            <p className="text-sm text-gray-500">Últimos 50 mensajes</p>
          </div>
          {loading
            ? <div className="p-5 space-y-2">{Array(5).fill(0).map((_,i) => <div key={i} className="h-16 bg-gray-50 rounded animate-pulse" />)}</div>
            : logs.length === 0
              ? (
                <div className="p-4">
                  <EmptyState
                    icon={MessageSquare}
                    title="Sin mensajes todavia"
                    description="Cuando vincules WhatsApp, aqui podras revisar lo que el bot entendio y si creo movimientos."
                    action={<Link to="/perfil" className="btn-primary text-sm">Abrir Perfil</Link>}
                  />
                </div>
              )
              : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px]">
                    <thead>
                      <tr className="border-b border-gray-50">
                        {['Estado','Fecha','Mensaje','Respuesta del Bot','Transacción'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {logs.map(log => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {log.procesado
                              ? <CheckCircle className="w-4 h-4" style={{ color: 'var(--positive-fg)' }} />
                              : <XCircle className="w-4 h-4" style={{ color: 'var(--negative-fg)' }} />}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                              <p className="text-sm text-gray-700">{log.mensaje_entrante}</p>
                            </div>
                            {log.error && <p className="text-xs text-red-400 mt-0.5">Error: {log.error}</p>}
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <p className="text-xs text-gray-500 whitespace-pre-line line-clamp-3">{log.respuesta_bot ?? '—'}</p>
                          </td>
                          <td className="px-4 py-3">
                            {log.transacciones
                              ? <div className="text-sm">
                                  <p className="font-medium text-gray-700">{log.transacciones.descripcion}</p>
                                  <p className="text-xs font-mono text-primary-700">-{formatMXN(log.transacciones.monto)}</p>
                                </div>
                              : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
        </div>

      </div>
    </Layout>
  )
}
