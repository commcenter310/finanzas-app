import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMes } from '../context/MesContext'
import { useSupabaseQuery } from './useSupabaseQuery'

export function useTransacciones() {
  const { user } = useAuth()
  const { mes, anio } = useMes()
  const [saving, setSaving] = useState(false)

  const inicioMes = `${anio}-${String(mes).padStart(2,'0')}-01`
  const finMes = new Date(anio, mes, 0).toISOString().split('T')[0]
  const uid = user?.id

  const { data: transacciones, loading, error, refetch } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('transacciones')
      .select(`
        id, descripcion, monto, clasificacion, fecha, origen, msi_meses, created_at,
        categorias(id, nombre, icono, clasificacion),
        metodos_pago(id, nombre, credito_id)
      `)
      .eq('user_id', user.id)
      .gte('fecha', inicioMes).lte('fecha', finMes)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }, [uid, mes, anio], `tx:lista:${uid}:${mes}:${anio}`)

  const { data: categorias } = useSupabaseQuery(async () => {
    const { data } = await supabase.from('categorias')
      .select('id, nombre, icono, clasificacion')
      .eq('user_id', user.id).eq('activa', true)
      .order('clasificacion').order('nombre')
    return data ?? []
  }, [uid], `categorias:${uid}`)

  const { data: metodos } = useSupabaseQuery(async () => {
    const { data } = await supabase.from('metodos_pago')
      .select('id, nombre, tipo, credito_id').eq('user_id', user.id).eq('activo', true)
    return data ?? []
  }, [uid], `metodos:${uid}`)

  const actualizarSaldoCredito = (creditoId, delta) => {
    if (!creditoId) return Promise.resolve({ error: null })
    return supabase.rpc('update_saldo_credito', { p_credito_id: creditoId, p_delta: delta })
  }

  const agregar = async (datos) => {
    setSaving(true)
    const creditoId = metodos.find(m => m.id === Number(datos.metodo_pago_id))?.credito_id ?? null
    const [{ data, error: errTx }, { error: errSaldo }] = await Promise.all([
      supabase.from('transacciones').insert({ ...datos, user_id: user.id }).select().single(),
      actualizarSaldoCredito(creditoId, Number(datos.monto)),
    ])
    setSaving(false)
    if (!errTx && !errSaldo) refetch()
    return { data, error: errTx || errSaldo }
  }

  const eliminar = async (transaccion) => {
    const metodoId = transaccion.metodos_pago?.id ?? transaccion.metodo_pago_id
    const creditoId = metodos.find(m => m.id === metodoId)?.credito_id ?? null
    await Promise.all([
      supabase.from('transacciones').delete().eq('id', transaccion.id),
      actualizarSaldoCredito(creditoId, -Number(transaccion.monto)),
    ])
    refetch()
  }

  const actualizar = async (id, nuevosDatos, transaccionOriginal) => {
    setSaving(true)
    const metodoAntId = transaccionOriginal?.metodos_pago?.id ?? transaccionOriginal?.metodo_pago_id
    const creditoAnt  = metodos.find(m => m.id === metodoAntId)?.credito_id ?? null
    const creditoNvo  = metodos.find(m => m.id === Number(nuevosDatos.metodo_pago_id))?.credito_id ?? null
    const montoAnt    = Number(transaccionOriginal?.monto ?? 0)
    const montoNvo    = Number(nuevosDatos.monto)

    const ajustes = []
    if (creditoAnt !== creditoNvo) {
      if (creditoAnt) ajustes.push(actualizarSaldoCredito(creditoAnt, -montoAnt))
      if (creditoNvo) ajustes.push(actualizarSaldoCredito(creditoNvo, +montoNvo))
    } else if (creditoNvo && montoAnt !== montoNvo) {
      ajustes.push(actualizarSaldoCredito(creditoNvo, montoNvo - montoAnt))
    }

    const [{ error }, ...resAjustes] = await Promise.all([
      supabase.from('transacciones').update(nuevosDatos).eq('id', id),
      ...ajustes,
    ])
    setSaving(false)
    const errorAjuste = resAjustes.find(r => r?.error)?.error ?? null
    if (!error && !errorAjuste) refetch()
    return { error: error || errorAjuste }
  }

  const totales = {
    total:     transacciones?.reduce((s, t) => s + Number(t.monto), 0) ?? 0,
    necesidad: transacciones?.filter(t => t.clasificacion === 'necesidad').reduce((s, t) => s + Number(t.monto), 0) ?? 0,
    deseo:     transacciones?.filter(t => t.clasificacion === 'deseo').reduce((s, t) => s + Number(t.monto), 0) ?? 0,
    ahorro:    transacciones?.filter(t => t.clasificacion === 'ahorro').reduce((s, t) => s + Number(t.monto), 0) ?? 0,
  }

  return { transacciones: transacciones ?? [], categorias: categorias ?? [], metodos: metodos ?? [], loading, error, refetch, saving, totales, agregar, actualizar, eliminar }
}
