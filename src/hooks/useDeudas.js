import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useSupabaseQuery } from './useSupabaseQuery'
import { ensureCategoria } from '../utils/categorias'

export function useDeudas() {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)

  const uid = user?.id
  // ── Deudas manuales ──────────────────────────────────────────────────────
  const { data: deudas, loading, error, refetch } = useSupabaseQuery(async () => {
    const { data, error } = await supabase.from('deudas')
      .select('*, abonos_deuda(*)')
      .eq('user_id', user.id).eq('liquidada', false)
      .order('saldo_actual', { ascending: false })
    if (error) throw error
    return data ?? []
  }, [uid], `deudas:${uid}`)

  // ── Tarjetas con saldo pendiente (se muestran automáticamente como deudas) ──
  const { data: creditosConSaldo, refetch: refetchCreditos } = useSupabaseQuery(async () => {
    const { data } = await supabase
      .from('creditos')
      .select('id, nombre, saldo_utilizado, limite_credito, fecha_pago, pagos_credito(*)')
      .eq('user_id', user.id)
      .eq('activo', true)
      .gt('saldo_utilizado', 0)
      .order('saldo_utilizado', { ascending: false })
    return data ?? []
  }, [uid], `deudas:creditos:${uid}`)

  // Mapear créditos al mismo "shape" que una deuda para unificar la lista
  const tarjetasComoDeuda = (creditosConSaldo ?? []).map(c => ({
    id:                 `credito_${c.id}`,   // ID sintético para no colisionar
    credito_id:         c.id,
    nombre:             c.nombre,
    saldo_original:     c.limite_credito ?? c.saldo_utilizado,
    saldo_actual:       Number(c.saldo_utilizado),
    pago_mensual:       null,
    tasa_interes:       null,
    fecha_proximo_pago: c.fecha_pago ? `día ${c.fecha_pago}` : null,
    notas:              null,
    liquidada:          false,
    tipo:               'credito',           // flag que usa la UI
    // Reutilizamos el campo abonos_deuda para el historial de pagos de la TDC
    abonos_deuda:       (c.pagos_credito ?? []).map(p => ({
      id: p.id, monto: p.monto, fecha: p.fecha, notas: p.notas,
    })),
  }))

  // Lista unificada: deudas manuales primero, luego tarjetas
  const todasDeudas = [...(deudas ?? []), ...tarjetasComoDeuda]

  // ── CRUD deudas manuales ─────────────────────────────────────────────────
  const agregar = async (datos) => {
    setSaving(true)
    const { error } = await supabase.from('deudas').insert({ ...datos, user_id: user.id })
    setSaving(false)
    if (!error) refetch()
    return { error }
  }

  const abonar = async (deuda_id, monto, notas = '') => {
    const hoy = new Date().toISOString().split('T')[0]
    const deuda = deudas?.find(d => d.id === deuda_id)
    const nuevo = deuda ? Math.max(0, Number(deuda.saldo_actual) - Number(monto)) : null
    const catId = await ensureCategoria(user.id, { nombre: 'Deudas', icono: '💳', clasificacion: 'necesidad' })

    await Promise.all([
      supabase.from('abonos_deuda').insert({ deuda_id, monto: Number(monto), fecha: hoy, notas }),
      deuda && supabase.from('deudas').update({ saldo_actual: nuevo, liquidada: nuevo === 0 }).eq('id', deuda_id),
      supabase.from('transacciones').insert({
        user_id: user.id,
        descripcion: `Pago deuda: ${deuda?.nombre ?? 'Deuda'}`,
        monto: Number(monto),
        clasificacion: 'necesidad',
        categoria_id: catId,
        fecha: hoy,
        origen: 'deuda',
      }),
    ])
    refetch()
  }

  // Pagar saldo de tarjeta de crédito → actualiza saldo_utilizado Y guarda historial
  const abonarCredito = async (creditoId, monto) => {
    const credito = creditosConSaldo?.find(c => c.id === creditoId)
    if (!credito) return
    const nuevoSaldo = Math.max(0, Number(credito.saldo_utilizado) - Number(monto))
    const hoy = new Date().toISOString().split('T')[0]
    const catId = await ensureCategoria(user.id, { nombre: 'Deudas', icono: '💳', clasificacion: 'necesidad' })
    await Promise.all([
      supabase.from('creditos').update({ saldo_utilizado: nuevoSaldo }).eq('id', creditoId),
      supabase.from('pagos_credito').insert({ credito_id: creditoId, user_id: user.id, monto: Number(monto), fecha: hoy }),
      supabase.from('transacciones').insert({
        user_id: user.id,
        descripcion: `Pago tarjeta: ${credito.nombre}`,
        monto: Number(monto),
        clasificacion: 'necesidad',
        categoria_id: catId,
        fecha: hoy,
        origen: 'deuda',
      }),
    ])
    refetchCreditos()
  }

  const actualizar = async (id, datos) => {
    setSaving(true)
    const { error } = await supabase.from('deudas').update({
      nombre:             datos.nombre,
      saldo_actual:       Number(datos.saldo_actual),
      saldo_original:     Number(datos.saldo_original) || null,
      pago_mensual:       Number(datos.pago_mensual)   || null,
      tasa_interes:       Number(datos.tasa_interes)   || null,
      fecha_proximo_pago: datos.fecha_proximo_pago     || null,
      notas:              datos.notas                  || null,
    }).eq('id', id)
    setSaving(false)
    if (!error) refetch()
    return { error }
  }

  const eliminar = async (id) => {
    await supabase.from('deudas').delete().eq('id', id)
    refetch()
  }

  // ── Totales y calculadora (usando la lista unificada) ────────────────────
  const totalDeuda       = todasDeudas.reduce((s, d) => s + Number(d.saldo_actual), 0)
  const totalPagoMensual = todasDeudas.reduce((s, d) => s + Number(d.pago_mensual ?? 0), 0)
  const snowball  = [...todasDeudas].sort((a, b) => Number(a.saldo_actual) - Number(b.saldo_actual))
  const avalanche = [...todasDeudas].sort((a, b) => Number(b.tasa_interes ?? 0) - Number(a.tasa_interes ?? 0))

  return {
    deudas: todasDeudas,
    loading,
    error,
    refetch,
    saving,
    totalDeuda,
    totalPagoMensual,
    snowball,
    avalanche,
    agregar,
    actualizar,
    abonar,
    abonarCredito,
    eliminar,
  }
}
