// Lógica pura de Plan de Quincena y Proyección 12 meses. Los hooks
// (usePlanQuincena, useProyeccion) solo consultan datos y llaman a estas
// funciones; aquí se pueden probar sin Supabase ni React.
import { calcNomina, parseMesesPrima, quincenaActual, rangoQuincena, MESES } from './constantes'
import { finMesISO, inicioMesISO } from './fecha'
import { normalizarFrecuenciaPago } from './pagosProgramados'

// Quincena (1 o 2) a la que pertenece un día del mes
const quincenaPorDia = (dia) => (dia <= 15 ? 1 : 2)
// 'YYYY-MM-DD' → día del mes (o null)
const diaDeFecha = (fechaStr) => (fechaStr ? Number(fechaStr.split('-')[2]) : null)

// ── Plan de Quincena ─────────────────────────────────────────────────────────

// Rango de fechas del periodo elegido. modo: 'q1' | 'q2' | 'mes'
export const rangoPeriodo = (modo, mes, anio) => {
  if (modo !== 'mes') return rangoQuincena(mes, anio, modo === 'q2' ? 2 : 1)
  return {
    diaInicio: 1,
    diaFin: new Date(anio, mes, 0).getDate(),
    fechaInicio: inicioMesISO(mes, anio),
    fechaFin: finMesISO(mes, anio),
  }
}

// Construye la lista de compromisos del periodo (gastos fijos, pagos de deuda
// y apartados manuales) y los totales que muestra la página.
export const construirPlanQuincena = ({
  modo, mes, anio,
  ingresos = [], gastosFijos = [], deudas = [], apartados = [],
  nominaPrincipal = null, hoy = new Date(),
}) => {
  const esMes = modo === 'mes'
  const quincenaSel = modo === 'q2' ? 2 : 1
  const ultimoDia = new Date(anio, mes, 0).getDate()
  const rango = rangoPeriodo(modo, mes, anio)

  // Ingreso del periodo: lo esperado de lo registrado, o un estimado de la
  // nómina principal (solo ordinario, sin aguinaldo/prima) si no hay registros
  const ingresoRegistrado = ingresos.reduce(
    (s, i) => s + Number(i.monto_presupuesto || i.monto_actual || 0), 0)
  const ingresoRecibido = ingresos.reduce((s, i) => s + Number(i.monto_actual || 0), 0)
  const ordinarioMensual = nominaPrincipal ? calcNomina(nominaPrincipal).ingresoOrdinarioAnual / 12 : 0
  const ingresoEstimado = esMes ? ordinarioMensual : ordinarioMensual / 2
  const usandoEstimado = ingresoRegistrado === 0 && ingresoEstimado > 0
  const ingresoEsperado = ingresoRegistrado > 0 ? ingresoRegistrado : ingresoEstimado

  // Un compromiso sin día solo aparece en la vista de 1ª quincena (ver
  // incluirPorDia), así que se aparta en la 1ª. Antes usaba la quincena de
  // HOY: apartado el día 20 quedaba en la 2ª y la vista de 1ª no lo
  // encontraba, permitiendo apartarlo dos veces.
  const quincenaDeDia = (dia) => (dia != null ? quincenaPorDia(dia) : 1)
  const quincenaManual = esMes ? quincenaActual(hoy) : quincenaSel

  const incluirPorDia = (dia) => {
    if (esMes) return true
    if (dia == null) return quincenaSel === 1
    return dia >= rango.diaInicio && dia <= rango.diaFin
  }

  // quincena null (compromiso sin día) acepta cualquier quincena, para
  // reconocer también apartados guardados con la regla anterior
  const findApartado = (tipo, origenId, quincena) =>
    apartados.find(a =>
      a.tipo === tipo && a.origen_id === origenId
      && (quincena == null || Number(a.quincena) === quincena)
    ) ?? null
  const quincenaParaBuscar = (dia) => (dia != null ? quincenaPorDia(dia) : null)

  const itemsFijos = gastosFijos
    .filter(g => incluirPorDia(g.dia_cobro))
    .map(g => ({
      key: `gf-${g.id}`, tipo: 'gasto_fijo', origen_id: g.id,
      concepto: g.concepto, montoSugerido: Number(g.monto_previsto),
      dia_cobro: g.dia_cobro, sinFecha: g.dia_cobro == null,
      pagado: g.pagado, apartadoRow: findApartado('gasto_fijo', g.id, quincenaParaBuscar(g.dia_cobro)),
    }))

  const itemsDeudas = deudas.flatMap(d => {
    const pago = Number(d.pago_mensual)
    let restante = Number(d.saldo_actual)

    // Quincenal: un pago el 15 y otro el 30 (o último día), sin pasar del saldo
    if (normalizarFrecuenciaPago(d.frecuencia_pago) === 'quincenal') {
      const dias = esMes
        ? [15, Math.min(30, ultimoDia)]
        : [quincenaSel === 1 ? 15 : Math.min(30, ultimoDia)]
      return dias.map(dia => {
        const quincena = quincenaPorDia(dia)
        const montoSugerido = Math.min(pago, restante)
        restante -= montoSugerido
        return {
          key: `de-${d.id}-q${quincena}`, tipo: 'deuda', origen_id: d.id,
          concepto: esMes ? `${d.nombre} · ${quincena}ª quincena` : d.nombre,
          montoSugerido, dia_cobro: dia, sinFecha: false, pagado: false,
          apartadoRow: findApartado('deuda', d.id, quincena),
        }
      }).filter(item => item.montoSugerido > 0)
    }

    const dia = diaDeFecha(d.fecha_proximo_pago)
    if (!incluirPorDia(dia)) return []
    return [{
      key: `de-${d.id}`, tipo: 'deuda', origen_id: d.id,
      concepto: d.nombre, montoSugerido: Math.min(pago, restante),
      dia_cobro: dia, sinFecha: d.fecha_proximo_pago == null,
      pagado: false, apartadoRow: findApartado('deuda', d.id, quincenaParaBuscar(dia)),
    }]
  })

  const itemsManuales = apartados
    .filter(a => a.tipo === 'ahorro' || a.tipo === 'otro')
    .map(a => ({
      key: `ap-${a.id}`, tipo: a.tipo, origen_id: a.origen_id,
      concepto: a.concepto, montoSugerido: Number(a.monto),
      dia_cobro: null, sinFecha: true, pagado: false, apartadoRow: a,
    }))

  const compromisos = [...itemsFijos, ...itemsDeudas, ...itemsManuales]

  // Si un compromiso ya está apartado, cuenta el monto apartado (puede diferir del sugerido)
  const totalCompromisos = compromisos.reduce(
    (s, c) => s + Number(c.apartadoRow ? c.apartadoRow.monto : c.montoSugerido), 0)
  const apartadosHechos = apartados.filter(a => a.apartado)
  const totalApartado = apartadosHechos.reduce((s, a) => s + Number(a.monto), 0)

  return {
    esMes, quincenaSel, rango,
    ingresoRegistrado, ingresoRecibido, ingresoEstimado, usandoEstimado, ingresoEsperado,
    quincenaDeDia, quincenaManual,
    compromisos,
    totalCompromisos,
    totalApartado,
    libreSiApartasTodo: ingresoEsperado - totalCompromisos,
    disponibleAhora: ingresoEsperado - totalApartado,
    countApartados: apartadosHechos.length,
  }
}

// ── Proyección 12 meses ──────────────────────────────────────────────────────

// Proyecta ingresos vs compromisos mes a mes (y por quincena) a partir de
// las nóminas, la plantilla de gastos fijos recurrentes y las deudas activas.
// Las deudas se van pagando mes a mes hasta liquidarse.
export const proyectarMeses = ({
  nominas = [], fijosRecurrentes = [], deudas = [], mes, anio, horizonte = 12,
}) => {
  const ordinarioMensual = nominas.reduce((s, n) => s + calcNomina(n).ingresoOrdinarioAnual / 12, 0)

  // Extraordinarios por mes del año (1..12): aguinaldo, prima(s), utilidades
  const extraordinariosPorMes = {}
  const pushExtra = (m, concepto, monto) => {
    if (!m || monto <= 0) return
    ;(extraordinariosPorMes[m] ??= []).push({ concepto, monto })
  }
  nominas.forEach(n => {
    const c = calcNomina(n)
    if (n.tiene_aguinaldo) pushExtra(n.mes_aguinaldo, `Aguinaldo · ${n.nombre}`, c.aguinaldo)
    if (n.tiene_prima_vacacional) parseMesesPrima(n.meses_prima).forEach(m => pushExtra(m, `Prima vacacional · ${n.nombre}`, c.primaPorEvento))
    if (n.tiene_utilidades) pushExtra(n.mes_utilidades, `Utilidades · ${n.nombre}`, c.utilidades)
  })

  // Sin día de cobro → 1ª quincena
  const qDeDia = (dia) => (dia != null && dia >= 16 ? 2 : 1)
  const sumaFijos = (q) => fijosRecurrentes
    .filter(g => qDeDia(g.dia_cobro) === q)
    .reduce((s, g) => s + Number(g.monto_previsto), 0)
  const fijosQ1 = sumaFijos(1)
  const fijosQ2 = sumaFijos(2)

  const restantes = deudas.map(d => ({
    pago: Number(d.pago_mensual),
    restante: Number(d.saldo_actual),
    frecuencia: normalizarFrecuenciaPago(d.frecuencia_pago),
    quincena: qDeDia(diaDeFecha(d.fecha_proximo_pago)),
  }))

  const meses = []
  for (let i = 0; i < horizonte; i++) {
    const idx = mes - 1 + i
    const mesNum = (idx % 12) + 1
    const anioM = anio + Math.floor(idx / 12)

    const extras = extraordinariosPorMes[mesNum] ?? []
    const totalExtra = extras.reduce((s, e) => s + e.monto, 0)

    let deudaQ1 = 0, deudaQ2 = 0
    restantes.forEach(d => {
      if (d.restante <= 0) return
      if (d.frecuencia === 'quincenal') {
        const pagoQ1 = Math.min(d.pago, d.restante)
        d.restante -= pagoQ1
        deudaQ1 += pagoQ1
        const pagoQ2 = Math.min(d.pago, d.restante)
        d.restante -= pagoQ2
        deudaQ2 += pagoQ2
        return
      }
      const pagoMensual = Math.min(d.pago, d.restante)
      d.restante -= pagoMensual
      if (d.quincena === 1) deudaQ1 += pagoMensual
      else deudaQ2 += pagoMensual
    })

    const q1Compromisos = fijosQ1 + deudaQ1
    const q2Compromisos = fijosQ2 + deudaQ2
    const compromisos = q1Compromisos + q2Compromisos
    const ingresoTotal = ordinarioMensual + totalExtra
    // Ordinario mitad y mitad; los extraordinarios caen en la 2ª quincena
    const q1Ingreso = ordinarioMensual / 2
    const q2Ingreso = ordinarioMensual / 2 + totalExtra

    meses.push({
      key: `${anioM}-${mesNum}`,
      mesNum, anioM,
      label: MESES[mesNum - 1],
      labelCorto: MESES[mesNum - 1].slice(0, 3),
      esActual: i === 0,
      ingresoOrdinario: ordinarioMensual, extras, totalExtra, ingresoTotal,
      compromisos,
      libre: ingresoTotal - compromisos,
      q1: { ingreso: q1Ingreso, compromisos: q1Compromisos, libre: q1Ingreso - q1Compromisos },
      q2: { ingreso: q2Ingreso, compromisos: q2Compromisos, libre: q2Ingreso - q2Compromisos },
    })
  }

  const totalIngreso = meses.reduce((s, m) => s + m.ingresoTotal, 0)
  const totalCompromisos = meses.reduce((s, m) => s + m.compromisos, 0)
  return {
    meses,
    ordinarioMensual,
    fijosMensual: fijosQ1 + fijosQ2,
    totalIngreso,
    totalCompromisos,
    totalLibre: totalIngreso - totalCompromisos,
  }
}
