import { beforeEach, describe, expect, it, vi } from 'vitest'

// Dobles: base de datos en memoria, WhatsApp que solo anota lo enviado e IA programable
const m = vi.hoisted(() => {
  const estado = { perfiles: {}, estados: {}, logs: [], enviados: [], rpc: [], ingresos: [], wamids: new Set() }
  const A = 'user-a'
  const datos = {
    reservarMensaje: async ({ telefono, entrada, wamid }) => {
      if (wamid && estado.wamids.has(wamid)) return { logId: null, duplicado: true }
      if (wamid) estado.wamids.add(wamid)
      estado.logs.push({ telefono, entrada })
      return { logId: estado.logs.length - 1, duplicado: false }
    },
    cerrarLog: async (logId, cambios) => { if (logId != null) Object.assign(estado.logs[logId], cambios) },
    perfilPorTelefono: async (telefono) => ({ data: estado.perfiles[telefono] ?? null, error: null }),
    catalogos: async () => ({ categorias: estado.categorias, metodos: estado.metodos }),
    metodosRecientes: async () => [2, 1],
    leerEstado: async (telefono) => estado.estados[telefono] ?? null,
    guardarEstado: async (telefono, nombre, d) => { estado.estados[telefono] = { estado: nombre, datos: JSON.parse(JSON.stringify(d)) } },
    borrarEstado: async (telefono) => { delete estado.estados[telefono] },
    ejecutar: async (userId, operacion, args) => {
      estado.rpc.push({ userId, operacion, args })
      if (estado.falloRpc) return { data: null, error: { message: estado.falloRpc } }
      const respuestas = {
        registrar_gasto: { transaccion_id: 501, duplicado: false },
        actualizar_gasto: { transaccion_id: args.transaccion_id },
        eliminar_gasto: { eliminada: true },
        pagar_gasto_fijo: { transaccion_id: 502, duplicado: false },
        pagar_deuda: { monto_aplicado: args.monto, saldo_nuevo: 1400, recortado: false },
        pagar_credito: { monto_aplicado: args.monto, saldo_nuevo: 0, recortado: false },
      }
      return { data: respuestas[operacion], error: null }
    },
    registrarIngreso: async (userId, fila) => { estado.ingresos.push(fila); return { error: null } },
    categoriaPorHistorial: async (userId, descripcion) => estado.historial[descripcion.toLowerCase()] ?? null,
    ultimoGastoWhatsapp: async () => estado.ultimo,
    ultimosMovimientos: async () => [],
    datosResumen: async () => estado.resumen,
    presupuestoCategoria: async () => estado.presupuesto,
    fijosPendientes: async () => estado.fijos,
    deudasActivas: async () => estado.deudas,
    tarjetas: async () => estado.tarjetas,
  }
  const anotar = (tipo) => async (telefono, texto, opciones) => { estado.enviados.push({ tipo, telefono, texto, opciones }) }
  const meta = {
    enviarTexto: anotar('texto'),
    enviarOpciones: anotar('opciones'),
    descargarMedia: async () => ({ buffer: Buffer.from('audio'), mime: 'audio/ogg' }),
  }
  const ia = { interpretarConIA: vi.fn(), transcribirAudio: vi.fn() }
  return { estado, datos, meta, ia, A }
})

vi.mock('./datos.js', () => m.datos)
vi.mock('./meta.js', () => m.meta)
vi.mock('./groq.js', () => m.ia)

const { procesarMensaje, operacionId } = await import('./whatsapp.js')

const TEL = '5216670000001'
let n = 0
const texto = (t, extra = {}) => procesarMensaje({ telefono: TEL, wamid: `wamid.${++n}`, tipo: 'texto', texto: t, ...extra })
const ultimo = () => m.estado.enviados.at(-1)
const rpc = () => m.estado.rpc.at(-1)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-14T19:00:00Z'))   // sábado 14-nov, mediodía en Mazatlán
  Object.assign(m.estado, {
    perfiles: { [TEL]: { id: m.A, nombre: 'Diego', whatsapp_verificado: true, regla_necesidad: 0.5, regla_deseo: 0.3, regla_ahorro: 0.2 } },
    estados: {}, logs: [], enviados: [], rpc: [], ingresos: [], wamids: new Set(), falloRpc: null,
    categorias: [
      { id: 10, nombre: 'Gasolina', clasificacion: 'necesidad' },
      { id: 11, nombre: 'Café', clasificacion: 'deseo' },
      { id: 12, nombre: 'Restaurante', clasificacion: 'deseo' },
    ],
    metodos: [
      { id: 1, nombre: 'BBVA', credito_id: null },
      { id: 2, nombre: 'NU', credito_id: 7 },
      { id: 3, nombre: 'Efectivo', credito_id: null },
    ],
    historial: { tacos: { categoria_id: 12, clasificacion: 'deseo' } },
    ultimo: { id: 77, descripcion: 'Café', monto: 89, categoria_id: 11, clasificacion: 'deseo', metodo_pago_id: 2, fecha: '2026-11-14', msi_meses: null },
    presupuesto: { limite: 0, gastado: 0 },
    fijos: [{ id: 30, concepto: 'Luz', monto_previsto: 450, dia_cobro: 15 }, { id: 31, concepto: 'Internet', monto_previsto: 600, dia_cobro: 20 }],
    deudas: [{ id: 40, nombre: 'Celular', saldo_actual: 3000, fecha_proximo_pago: null }],
    tarjetas: [{ id: 7, nombre: 'NU', saldo_utilizado: 500, limite_credito: 10000, fecha_corte: 18, fecha_pago: 5 }],
  })
  m.ia.interpretarConIA.mockReset().mockResolvedValue({ tipo: 'desconocido' })
  m.ia.transcribirAudio.mockReset()
})

describe('quién puede usar el bot', () => {
  it('número sin registrar: lo dice y no guarda el texto', async () => {
    await procesarMensaje({ telefono: '5210000000000', wamid: 'x1', tipo: 'texto', texto: '89 café nu' })
    expect(ultimo().texto).toMatch(/no está registrado/)
    expect(m.estado.logs[0]).toMatchObject({ entrada: '[número sin registrar]', procesado: false })
    expect(m.estado.rpc).toHaveLength(0)
  })

  it('número sin verificar: manda un código, no registra nada y el código no queda en el log', async () => {
    m.estado.perfiles[TEL].whatsapp_verificado = false
    await texto('89 café nu')
    const codigo = /\*(\d{6})\*/.exec(ultimo().texto)[1]
    expect(m.estado.estados[TEL]).toMatchObject({ estado: 'esperando_verificacion', datos: { codigo, intentos: 0 } })
    expect(m.estado.rpc).toHaveLength(0)
    expect(JSON.stringify(m.estado.logs)).not.toContain(codigo)
    expect(m.estado.logs[0].entrada).toBe('[número sin verificar]')

    await texto('hola')   // mientras no venza, repite el mismo código
    expect(ultimo().texto).toContain(codigo)
  })

  it('mensaje repetido de Meta (mismo id): no se atiende dos veces', async () => {
    await procesarMensaje({ telefono: TEL, wamid: 'repetido', tipo: 'texto', texto: '89 café nu' })
    await procesarMensaje({ telefono: TEL, wamid: 'repetido', tipo: 'texto', texto: '89 café nu' })
    expect(m.estado.rpc).toHaveLength(1)
    expect(m.estado.enviados).toHaveLength(1)
  })
})

describe('gastos', () => {
  it('"89 café nu": se registra completo sin usar la IA', async () => {
    await procesarMensaje({ telefono: TEL, wamid: 'wamid.gasto', tipo: 'texto', texto: '89 café nu' })
    expect(rpc()).toEqual({
      userId: m.A, operacion: 'registrar_gasto',
      args: {
        descripcion: 'Café', monto: 89, categoria_id: 11, clasificacion: 'deseo', metodo_pago_id: 2,
        fecha: '2026-11-14', msi_meses: null, operacion_id: operacionId('wamid.gasto', 'gasto'), mensaje_original: '89 café nu',
      },
    })
    expect(m.ia.interpretarConIA).not.toHaveBeenCalled()
    expect(ultimo().texto).toMatch(/Gasto registrado[\s\S]*\$89 — Café[\s\S]*NU/)
    expect(m.estado.logs[0]).toMatchObject({ procesado: true, txId: 501 })
  })

  it('fecha con palabras y compra a meses', async () => {
    await texto('ayer 200 gasolina bbva')
    expect(rpc().args).toMatchObject({ fecha: '2026-11-13', categoria_id: 10, clasificacion: 'necesidad', metodo_pago_id: 1 })
    await texto('3000 tele nu a 12 meses')
    expect(rpc().args).toMatchObject({ monto: 3000, msi_meses: 12, metodo_pago_id: 2 })
    await texto('3000 tele bbva a 12 meses')   // débito: no hay plan a meses
    expect(rpc().args.msi_meses).toBeNull()
  })

  it('sin método: pregunta con opciones (el más usado primero) y guarda al elegir', async () => {
    await procesarMensaje({ telefono: TEL, wamid: 'wamid.tacos', tipo: 'texto', texto: '120 tacos' })
    expect(m.estado.rpc).toHaveLength(0)
    expect(ultimo().tipo).toBe('opciones')
    expect(ultimo().opciones.map(o => o.titulo)).toEqual(['NU', 'BBVA', 'Efectivo'])

    await procesarMensaje({ telefono: TEL, wamid: 'wamid.resp', tipo: 'opcion', opcionId: 'metodo:3', texto: 'Efectivo' })
    expect(rpc().args).toMatchObject({
      descripcion: 'Tacos', monto: 120, metodo_pago_id: 3,
      categoria_id: 12,                                   // la que usó antes para "tacos"
      operacion_id: operacionId('wamid.tacos', 'gasto'),  // el id del mensaje ORIGINAL
      mensaje_original: '120 tacos',
    })
    expect(m.estado.estados[TEL]).toBeUndefined()
  })

  it('responde el método escribiéndolo, o cancela', async () => {
    await texto('120 tacos')
    await texto('con nu')
    expect(rpc().args.metodo_pago_id).toBe(2)

    await texto('75 pan')
    await texto('cancelar')
    expect(m.estado.rpc).toHaveLength(1)
    expect(ultimo().texto).toMatch(/No guardé/)
  })

  it('si en vez de contestar manda otro gasto, el pendiente se descarta y lo avisa', async () => {
    await texto('120 tacos')
    await texto('50 pan efectivo')
    expect(m.estado.rpc).toHaveLength(1)
    expect(rpc().args).toMatchObject({ descripcion: 'Pan', monto: 50, metodo_pago_id: 3 })
    expect(ultimo().texto).toMatch(/Dejé sin guardar \*Tacos\*/)
  })

  it('con un solo método de pago no pregunta', async () => {
    m.estado.metodos = [{ id: 3, nombre: 'Efectivo', credito_id: null }]
    await texto('120 tacos')
    expect(rpc().args.metodo_pago_id).toBe(3)
  })

  it('descripción nueva: la IA solo sugiere la categoría; el monto es el del mensaje', async () => {
    m.ia.interpretarConIA.mockResolvedValue({ tipo: 'gasto', monto: 99999, descripcion: 'Otra cosa', categoria: 'Restaurante', clasificacion: 'deseo' })
    await texto('250 sushi nu')
    expect(rpc().args).toMatchObject({ monto: 250, descripcion: 'Sushi', categoria_id: 12 })
  })

  it('si la IA está caída, lo simple se registra igual (sin categoría)', async () => {
    m.ia.interpretarConIA.mockResolvedValue({ error: 'ia_error', detalle: 'model not found' })
    await texto('250 sushi nu')
    expect(rpc().args).toMatchObject({ monto: 250, categoria_id: null, clasificacion: 'deseo' })
    expect(ultimo().texto).toMatch(/Sin categoría/)
  })

  it('frase larga con la IA caída: lo explica en vez de quedarse callado', async () => {
    m.ia.interpretarConIA.mockResolvedValue({ error: 'ia_error', detalle: 'model not found' })
    await texto('le di dinero a mi hermano para la comida de su perro 300')
    expect(m.estado.rpc).toHaveLength(0)
    expect(ultimo().texto).toMatch(/no está disponible/)
    expect(m.estado.logs[0]).toMatchObject({ procesado: false, error: 'ia_error: model not found' })
  })

  it('frase larga con IA: se registra lo que la IA entendió, validado', async () => {
    m.ia.interpretarConIA.mockResolvedValue({ tipo: 'gasto', monto: 300, descripcion: 'Comida perro', categoria: 'Inventada', metodo_pago: 'bbva', fecha: '2031-01-01' })
    await texto('le di dinero a mi hermano para la comida de su perro 300 con bbva')
    expect(rpc().args).toMatchObject({ monto: 300, descripcion: 'Comida perro', categoria_id: null, metodo_pago_id: 1, fecha: '2026-11-14' })
    expect(m.ia.interpretarConIA).toHaveBeenCalledTimes(1)
  })

  it('error de la base de datos: mensaje claro', async () => {
    m.estado.falloRpc = 'OPERACION_METODO_INVALIDO'
    await texto('89 café nu')
    expect(ultimo().texto).toMatch(/método de pago ya no está disponible/)
    expect(m.estado.logs[0].procesado).toBe(false)
  })

  it('avisa cuando el presupuesto de la categoría va al 80% o más', async () => {
    m.estado.presupuesto = { limite: 1000, gastado: 850 }
    await texto('89 café nu')
    expect(ultimo().texto).toMatch(/Presupuesto al 85%/)
  })
})

describe('corregir y deshacer', () => {
  it('"era 95" cambia solo el monto del último gasto', async () => {
    await texto('era 95')
    expect(rpc()).toMatchObject({ operacion: 'actualizar_gasto', args: { transaccion_id: 77, monto: 95, descripcion: 'Café', categoria_id: 11, metodo_pago_id: 2, fecha: '2026-11-14' } })
  })
  it('cambiar categoría arrastra su clasificación; cambiar a débito quita los meses', async () => {
    await texto('cambia la categoría a gasolina')
    expect(rpc().args).toMatchObject({ categoria_id: 10, clasificacion: 'necesidad' })
    m.estado.ultimo.msi_meses = 6
    await texto('fue con efectivo')
    expect(rpc().args).toMatchObject({ metodo_pago_id: 3, msi_meses: null })
  })
  it('deshacer pide confirmación con botones y borra al aceptar', async () => {
    await texto('deshacer')
    expect(ultimo().opciones.map(o => o.id)).toEqual(['si', 'no'])
    expect(m.estado.rpc).toHaveLength(0)
    await procesarMensaje({ telefono: TEL, wamid: 'w.si', tipo: 'opcion', opcionId: 'si', texto: 'Sí, bórralo' })
    expect(rpc()).toMatchObject({ operacion: 'eliminar_gasto', args: { transaccion_id: 77 } })
    expect(ultimo().texto).toMatch(/Gasto eliminado/)
  })
  it('deshacer + "no": no borra', async () => {
    await texto('deshacer')
    await texto('no')
    expect(m.estado.rpc).toHaveLength(0)
    expect(m.estado.estados[TEL]).toBeUndefined()
  })
  it('un botón de una pregunta que ya caducó no hace nada raro', async () => {
    await procesarMensaje({ telefono: TEL, wamid: 'w.viejo', tipo: 'opcion', opcionId: 'metodo:2', texto: 'NU' })
    expect(m.estado.rpc).toHaveLength(0)
    expect(ultimo().texto).toMatch(/ya caducó/)
  })
})

describe('pagos e ingresos', () => {
  it('"pagué la luz": marca el gasto fijo con su monto previsto', async () => {
    await texto('pagué la luz')
    expect(rpc()).toMatchObject({ operacion: 'pagar_gasto_fijo', args: { gasto_id: 30, monto: 450, fecha: '2026-11-14' } })
    expect(ultimo().texto).toMatch(/queda 1 pendiente/)
  })
  it('con monto real distinto', async () => {
    await texto('ya pagué la luz 470')
    expect(rpc().args).toMatchObject({ gasto_id: 30, monto: 470 })
    expect(ultimo().texto).toMatch(/previsto \$450/)
  })
  it('abono a deuda y pago de tarjeta', async () => {
    await texto('aboné 1600 al celular')
    expect(rpc()).toMatchObject({ operacion: 'pagar_deuda', args: { id: 40, monto: 1600 } })
    await texto('aboné 500 a nu')
    expect(rpc()).toMatchObject({ operacion: 'pagar_credito', args: { id: 7, monto: 500 } })
    expect(ultimo().texto).toMatch(/liquidada/)
  })
  it('abono sin monto: lo pide', async () => {
    await texto('aboné al celular')
    expect(m.estado.rpc).toHaveLength(0)
    expect(ultimo().texto).toMatch(/Cuánto abonaste a \*Celular\*/)
  })
  it('"pagué 200 de estacionamiento" no es fijo ni deuda: gasto normal', async () => {
    await texto('pagué 200 de estacionamiento con efectivo')
    expect(rpc()).toMatchObject({ operacion: 'registrar_gasto', args: { monto: 200, descripcion: 'Estacionamiento', metodo_pago_id: 3 } })
  })
  it('ingreso: esperado = recibido, y a fin de mes cuenta para el siguiente', async () => {
    await texto('recibí 5000 nómina')
    expect(m.estado.ingresos.at(-1)).toEqual({ concepto: 'Nómina', monto: 5000, fecha: '2026-11-14', mes: 11, anio: 2026 })
    await texto('me pagaron 6000 quincena el 30 de octubre')
    expect(m.estado.ingresos.at(-1)).toEqual({ concepto: 'Quincena', monto: 6000, fecha: '2026-10-30', mes: 11, anio: 2026 })
    expect(ultimo().texto).toMatch(/Cuenta para Noviembre/)
  })
})

describe('consultas y otros mensajes', () => {
  it('resumen: mismos números que el Inicio (fijos pagados una sola vez, saldo del mes pasado)', async () => {
    m.estado.resumen = {
      ingresos: [{ monto_actual: 10000 }],
      gastosFijos: [
        { monto_previsto: 500, monto_actual: 500, clasificacion: 'necesidad', pagado: true },
        { monto_previsto: 300, monto_actual: 0, clasificacion: 'deseo', pagado: false },
      ],
      transacciones: [
        { monto: 200, clasificacion: 'deseo', origen: 'whatsapp' },
        { monto: 500, clasificacion: 'necesidad', origen: 'gastos_fijos' },   // el mismo fijo pagado: no se suma otra vez
      ],
      ingresosPrev: [{ monto_actual: 1000 }], gastosFijosPrev: [], transaccionesPrev: [{ monto: 400, origen: 'web' }],
    }
    await texto('cómo voy')
    const t = ultimo().texto
    expect(t).toMatch(/Ingresos: \$10,000/)
    expect(t).toMatch(/Sobró del mes pasado: \$600/)
    expect(t).toMatch(/Gastos: \$700/)
    expect(t).toMatch(/Disponible: \$9,900/)
    expect(t).toMatch(/Fijos por pagar: \$300 \(1\)/)
    expect(t).toMatch(/Necesidad: \$500 \(meta \$5,000\)/)
    expect(t).toMatch(/Deseo: \$200/)
  })
  it('mis deudas incluye las tarjetas con saldo', async () => {
    await texto('mis deudas')
    expect(ultimo().texto).toMatch(/Celular: \$3,000[\s\S]*NU: \$500[\s\S]*Total: \$3,500/)
  })
  it('tarjetas: días a corte y a pago, sin "mejor fecha"', async () => {
    await texto('tarjetas')
    expect(ultimo().texto).toMatch(/Corte: día 18 \(en 4 días\)[\s\S]*Pago: día 5 \(en 21 días\)/)
    expect(ultimo().texto).not.toMatch(/Mejor/)
  })
  it('pendientes y ayuda', async () => {
    await texto('pendientes')
    expect(ultimo().texto).toMatch(/Luz: \$450 \(día 15\)[\s\S]*Total: \$1,050/)
    await texto('hola')
    expect(ultimo().texto).toMatch(/Soy el bot de Finni/)
  })
  it('nota de voz: se transcribe y se atiende como texto', async () => {
    m.ia.transcribirAudio.mockResolvedValue({ texto: '89 café nu' })
    await procesarMensaje({ telefono: TEL, wamid: 'w.audio', tipo: 'audio', mediaId: 'media1' })
    expect(rpc().args).toMatchObject({ monto: 89, metodo_pago_id: 2 })
    expect(ultimo().texto).toMatch(/^🎙️ _"89 café nu"_/)
    expect(m.estado.logs[0].entrada).toBe('🎙️ 89 café nu')
  })
  it('foto u otro tipo: explica qué sí entiende', async () => {
    await procesarMensaje({ telefono: TEL, wamid: 'w.img', tipo: 'otro' })
    expect(ultimo().texto).toMatch(/solo entiendo texto y notas de voz/)
  })
  it('no entendido', async () => {
    await texto('asdf qwer')
    expect(ultimo().texto).toMatch(/No entendí/)
    expect(m.estado.logs[0]).toMatchObject({ procesado: false, error: 'No entendido' })
  })
})
