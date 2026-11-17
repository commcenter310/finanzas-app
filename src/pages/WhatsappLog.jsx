import Layout from '../components/layout/Layout'
import { useWhatsappLog } from '../hooks/useWhatsappLog'
import { useAuth } from '../context/AuthContext'
import { CheckCircle, XCircle, MessageSquare } from 'lucide-react'
import { formatMXN } from '../utils/constantes'
import { Link } from 'react-router-dom'
import EmptyState from '../components/ui/EmptyState'

export default function WhatsappLog() {
  const { logs, loading } = useWhatsappLog()
  const { profile } = useAuth()

  const procesados = logs.filter(l => l.procesado).length
  const errores = logs.filter(l => !l.procesado).length

  return (
    <Layout titulo="WhatsApp">
      <div className="space-y-3">

        {/* Stats */}
        <div className="stat-strip grid grid-cols-3">
          <div className="card p-4">
            <p className="stat-label">Mensajes</p>
            <p className="stat-value">{logs.length}</p>
          </div>
          <div className="card p-4">
            <p className="stat-label">Procesados</p>
            <p className="stat-value">{procesados}</p>
          </div>
          <div className="card p-4">
            <p className="stat-label">Errores</p>
            <p className="stat-value" style={{ color: 'var(--negative-fg)' }}>{errores}</p>
          </div>
        </div>

        {/* El bot solo atiende (y el historial solo se ve con) números verificados */}
        {profile && !profile.whatsapp_verificado && (
          <div className="card p-4 border text-sm" style={{ borderColor: 'var(--warning-fg)', color: 'var(--fg-2)' }}>
            <strong>Tu número aún no está verificado.</strong>{' '}
            {profile.telefono
              ? 'Mándale un mensaje al bot: te responderá un código. '
              : 'Guarda tu número de WhatsApp y después mándale un mensaje al bot. '}
            <Link to="/perfil" className="underline font-semibold">Verificar en Perfil</Link>
          </div>
        )}

        {/* Info de uso */}
        <div className="card p-4">
          <h3 className="titulo-seccion mb-2">Cómo usar el bot de WhatsApp</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
            {[
              ['Registrar gasto', '"89 café nu" o "ayer 200 gasolina"'],
              ['Compra a meses', '"3000 tele nu a 12 meses"'],
              ['Ingreso', '"recibí 5000 nómina"'],
              ['Pagar un gasto fijo', '"pagué la luz"'],
              ['Abonar a deuda o tarjeta', '"aboné 500 a nu"'],
              ['Corregir el último', '"era 95" o "deshacer"'],
              ['Consultar', '"resumen", "pendientes", "mis deudas", "tarjetas"'],
              ['Nota de voz', 'también puedes dictarle el gasto'],
            ].map(([label, ejemplo]) => (
              <div key={label}>
                <span className="font-semibold">{label}:</span>{' '}
                <code className="px-1 rounded text-xs bg-[var(--surface-3)] text-[var(--fg-2)]">{ejemplo}</code>
              </div>
            ))}
          </div>
        </div>

        {/* Tabla de logs */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--divider)]">
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
                      <tr className="border-b border-[var(--divider)]">
                        {['Estado','Fecha','Mensaje','Respuesta del Bot','Transacción'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[13px] font-normal text-gray-500">{h}</th>
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
                          <td className="px-4 py-3 font-mono text-[13px] text-gray-500 whitespace-nowrap">
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
