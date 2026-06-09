import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMes } from '../context/MesContext'
import { useSupabaseQuery } from './useSupabaseQuery'
import { calcNomina, parseMesesPrima, MESES } from '../utils/constantes'

// Proyección hacia adelante de ingresos vs compromisos por mes (y quincena).
export function useProyeccion(horizonte = 12) {
  const { user } = useAuth()
  const { mes, anio } = useMes()

  const { data: nominas, loading: loadingN } = useSupabaseQuery(async () => {
    const { data } = await supabase.from('nominas').select('*').eq('user_id', user.id)
    return data ?? []
  }, [user?.id])

  // Plantilla de gastos fijos recurrentes (se repiten cada mes)
  const { data: fijosRec, loading: loadingF } = useSupabaseQuery(async () => {
    const { data } = await supabase
      .from('gastos_fijos')
      .select('concepto, monto_previsto, dia_cobro')
      .eq('user_id', user.id).eq('mes', mes).eq('anio', anio).eq('es_recurrente', true)
    return data ?? []
  }, [user?.id, mes, anio])

  const { data: deudas, loading: loadingD } = useSupabaseQuery(async () => {
    const { data } = await supabase
      .from('deudas')
      .select('nombre, saldo_actual, pago_mensual, fecha_proximo_pago')
      .eq('user_id', user.id).eq('liquidada', false).gt('pago_mensual', 0)
    return data ?? []
  }, [user?.id])

  const loading = loadingN || loadingF || loadingD

  // ── Ingreso ordinario mensual (suma de todas las nóminas) ──────────────────
  const ordinarioMensual = (nominas ?? []).reduce(
    (s, n) => s + calcNomina(n).ingresoOrdinarioAnual / 12, 0)

  // Extraordinarios por mes-del-año (1..12): aguinaldo, prima(s), utilidades
  const extraordinariosPorMes = {} // { [mesNum]: [{concepto, monto}] }
  const pushExtra = (m, concepto, monto) => {
    if (!m || monto <= 0) return
    ;(extraordinariosPorMes[m] ??= []).push({ concepto, monto })
  }
  ;(nominas ?? []).forEach(n => {
    const c = calcNomina(n)
    if (n.tiene_aguinaldo)        pushExtra(n.mes_aguinaldo, `Aguinaldo · ${n.nombre}`, c.aguinaldo)
    if (n.tiene_prima_vacacional) parseMesesPrima(n.meses_prima).forEach(m => pushExtra(m, `Prima vacacional · ${n.nombre}`, c.primaPorEvento))
    if (n.tiene_utilidades)       pushExtra(n.mes_utilidades, `Utilidades · ${n.nombre}`, c.utilidades)
  })

  // ── Compromisos recurrentes fijos, separados por quincena ─────────────────
  const qDeDia = (dia) => (dia != null && dia >= 16) ? 2 : 1
  const fijosQ1 = (fijosRec ?? []).filter(g => qDeDia(g.dia_cobro) === 1).reduce((s, g) => s + Number(g.monto_previsto), 0)
  const fijosQ2 = (fijosRec ?? []).filter(g => qDeDia(g.dia_cobro) === 2).reduce((s, g) => s + Number(g.monto_previsto), 0)
  const fijosMensual = fijosQ1 + fijosQ2

  // ── Construir los meses de la proyección ──────────────────────────────────
  // Saldo restante por deuda para modelar el pago hasta liquidar
  const restantes = (deudas ?? []).map(d => ({
    nombre: d.nombre,
    pago: Number(d.pago_mensual),
    restante: Number(d.saldo_actual),
    quincena: qDeDia(d.fecha_proximo_pago ? Number(d.fecha_proximo_pago.split('-')[2]) : null),
  }))

  const meses = []
  for (let i = 0; i < horizonte; i++) {
    const idx = (mes - 1 + i)
    const mesNum = (idx % 12) + 1
    const anioM = anio + Math.floor(idx / 12)

    const extras = extraordinariosPorMes[mesNum] ?? []
    const totalExtra = extras.reduce((s, e) => s + e.monto, 0)

    // Pago de deuda de este mes (modelando el saldo restante)
    let deudaQ1 = 0, deudaQ2 = 0
    restantes.forEach(d => {
      if (d.restante <= 0) return
      const pago = Math.min(d.pago, d.restante)
      d.restante -= pago
      if (d.quincena === 1) deudaQ1 += pago; else deudaQ2 += pago
    })

    const q1Compromisos = fijosQ1 + deudaQ1
    const q2Compromisos = fijosQ2 + deudaQ2
    const compromisos = q1Compromisos + q2Compromisos

    const ingresoOrdinario = ordinarioMensual
    const ingresoTotal = ingresoOrdinario + totalExtra
    // Quincena: ordinario mitad/mitad, extraordinarios a la 2ª quincena
    const q1Ingreso = ingresoOrdinario / 2
    const q2Ingreso = ingresoOrdinario / 2 + totalExtra

    meses.push({
      key: `${anioM}-${mesNum}`,
      mesNum, anioM,
      label: MESES[mesNum - 1],
      labelCorto: MESES[mesNum - 1].slice(0, 3),
      esActual: i === 0,
      ingresoOrdinario, extras, totalExtra, ingresoTotal,
      compromisos,
      libre: ingresoTotal - compromisos,
      q1: { ingreso: q1Ingreso, compromisos: q1Compromisos, libre: q1Ingreso - q1Compromisos },
      q2: { ingreso: q2Ingreso, compromisos: q2Compromisos, libre: q2Ingreso - q2Compromisos },
    })
  }

  // Totales del horizonte
  const totalIngreso = meses.reduce((s, m) => s + m.ingresoTotal, 0)
  const totalCompromisos = meses.reduce((s, m) => s + m.compromisos, 0)
  const totalLibre = totalIngreso - totalCompromisos

  return {
    loading,
    meses,
    ordinarioMensual,
    fijosMensual,
    sinDatos: (nominas ?? []).length === 0,
    totalIngreso, totalCompromisos, totalLibre,
  }
}
