// Datos ficticios + intercepción de las llamadas a Supabase, para capturar
// pantallas sin una cuenta real (ver capturar.mjs). La app debe levantarse con
// VITE_SUPABASE_URL=https://mock.supabase.co. Los datos son de junio a
// noviembre de 2026; capturar.mjs fija el reloj del navegador en el 15 de
// noviembre de 2026 para que siempre se vea lo mismo.
const UID = '11111111-1111-4111-8111-111111111111'
const cats = [
  [1,'Súper','variable','necesidad','🛒'],[2,'Transporte','variable','necesidad','🚗'],[3,'Restaurantes','variable','deseo','🍽️'],
  [4,'Café','variable','deseo','☕'],[5,'Salud','variable','necesidad','💊'],[6,'Entretenimiento','variable','deseo','🎬'],
  [7,'Renta','fijo','necesidad','🏠'],[8,'Servicios','fijo','necesidad','💡'],[9,'Suscripciones','fijo','deseo','📺'],[10,'Ropa','variable','deseo','👕'],
].map(([id,nombre,tipo_gasto,clasificacion,icono])=>({id,user_id:UID,nombre,tipo_gasto,clasificacion,icono,color:'#1a3faa',activa:true,es_default:true,created_at:'2026-01-01T00:00:00Z'}))
const metodos = [
  {id:1,nombre:'Débito BBVA',tipo:'debito',credito_id:null},{id:2,nombre:'Nu',tipo:'credito',credito_id:1},
  {id:3,nombre:'Efectivo',tipo:'efectivo',credito_id:null},{id:4,nombre:'Banamex Oro',tipo:'credito',credito_id:2},
].map(m=>({...m,user_id:UID,activo:true,created_at:'2026-01-01T00:00:00Z'}))
const creditos = [
  {id:1,nombre:'Nu',fecha_corte:20,fecha_pago:8,limite_credito:45000,saldo_utilizado:12840.5,pagos_credito:[{id:1,credito_id:1,monto:4200,fecha:'2026-11-06',notas:null}]},
  {id:2,nombre:'Banamex Oro',fecha_corte:5,fecha_pago:25,limite_credito:30000,saldo_utilizado:6310,pagos_credito:[]},
].map(c=>({...c,user_id:UID,activo:true,mejor_fecha_inicio:null,mejor_fecha_fin:null,created_at:'2026-01-01T00:00:00Z'}))
const tx = []
let tid = 1
const addTx = (fecha,descripcion,monto,cat,met,origen='web',extra={}) => {
  const c = cats.find(x=>x.id===cat); const m = metodos.find(x=>x.id===met)
  tx.push({id:tid++,user_id:UID,descripcion,monto,categoria_id:cat,clasificacion:c.clasificacion,metodo_pago_id:met,fecha,origen,msi_meses:null,ahorro_id:null,created_at:fecha+'T18:00:00Z',categorias:c,metodos_pago:m,...extra})
}
const base = [['Walmart',1284.6,1,2],['Uber',96,2,2],['Tacos El Güero',240,3,3],['Café Punta del Cielo',89,4,2],['Farmacia Guadalajara',312.5,5,1],['Cinépolis',380,6,2],['Gasolina',900,2,1],['Oxxo',64,4,3],['Sushi Roll',620,3,4],['Soriana',842.3,1,1],['Spotify café',75,4,2],['Zara',1299,10,4],['Didi',118,2,2],['La Parroquia',145,4,3]]
for (const [mes,dias] of [['2026-11',14],['2026-10',28],['2026-09',27],['2026-08',26],['2026-07',25],['2026-06',25]]) {
  base.forEach((b,i)=>{ const d = String(1+((i*2+3)%dias)).padStart(2,'0'); addTx(`${mes}-${d}`,b[0],Math.round(b[1]*(0.8+((i*7+Number(mes.slice(5)))%5)/10)*100)/100,b[2],b[3], i%5===0?'whatsapp':'web') })
}
addTx('2026-11-03','Renta',9500,7,1,'gastos_fijos'); addTx('2026-11-05','Netflix',299,9,2,'gastos_fijos')
addTx('2026-11-10','Fondo de emergencia',2000,1,1,'ahorro',{ahorro_id:1,clasificacion:'ahorro'})
const fijos = []
let fid=1
for (const [mes,anio] of [[11,2026],[10,2026],[9,2026],[8,2026],[7,2026],[6,2026]]) {
  [['Renta',9500,7,'necesidad',3,1],['CFE Luz',680,8,'necesidad',12,1],['Internet Telmex',599,8,'necesidad',18,1],['Netflix',299,9,'deseo',5,2],['Gimnasio',750,9,'deseo',22,1],['Seguro auto',1450,8,'necesidad',28,4]].forEach(([concepto,monto,cat,clas,dia,met],i)=>{
    const pagado = mes<11 || dia<=5
    fijos.push({id:fid++,user_id:UID,concepto,categoria_id:cat,monto_previsto:monto,monto_actual:pagado?monto:0,clasificacion:clas,pagado,fecha_pago:pagado?`${anio}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`:null,mes,anio,es_recurrente:true,dia_cobro:dia,metodo_pago_id:met,transaccion_id:null,categorias:cats.find(c=>c.id===cat),created_at:'2026-01-01T00:00:00Z'})
  })
}
const ingresos=[]; let iid=1
for (const [mes,anio] of [[11,2026],[10,2026],[9,2026],[8,2026],[7,2026],[6,2026]]) {
  const mm=String(mes).padStart(2,'0')
  ingresos.push({id:iid++,user_id:UID,concepto:'Nómina 1ª quincena',monto_presupuesto:14500,monto_actual:14500,mes,anio,fecha_recepcion:`${anio}-${mm}-01`,notas:null,created_at:`${anio}-${mm}-01T10:00:00Z`})
  if (mes<11) ingresos.push({id:iid++,user_id:UID,concepto:'Nómina 2ª quincena',monto_presupuesto:14500,monto_actual:14500,mes,anio,fecha_recepcion:`${anio}-${mm}-15`,notas:null,created_at:`${anio}-${mm}-15T10:00:00Z`})
  if (mes%2) ingresos.push({id:iid++,user_id:UID,concepto:'Freelance diseño',monto_presupuesto:3500,monto_actual:3500,mes,anio,fecha_recepcion:`${anio}-${mm}-09`,notas:'Logo cliente',created_at:`${anio}-${mm}-09T10:00:00Z`})
}
const T = {
  profiles:[{id:UID,nombre:'Ana',telefono:'5216671234567',whatsapp_verificado:true,regla_necesidad:0.5,regla_deseo:0.3,regla_ahorro:0.2,umbral_hormiga:150,onboarding_completado:!process.env.BIENVENIDA,created_at:'2026-01-01T00:00:00Z'}],
  categorias:cats, metodos_pago:metodos, creditos, transacciones:tx, gastos_fijos:fijos, ingresos,
  presupuestos:[[1,5000],[2,2500],[3,1800],[4,600],[5,1000],[6,900],[10,1200]].map(([c,m],i)=>({id:i+1,user_id:UID,categoria_id:c,monto_limite:m,mes:11,anio:2026,categorias:cats.find(x=>x.id===c)})),
  deudas:[
    {id:1,nombre:'Préstamo auto',saldo_original:180000,saldo_actual:96400,pago_mensual:4850,frecuencia_pago:'mensual',tasa_interes:13.9,fecha_proximo_pago:'2026-11-20',notas:null,liquidada:false,abonos_deuda:[{id:1,deuda_id:1,monto:4850,fecha:'2026-10-20',notas:null},{id:2,deuda_id:1,monto:4850,fecha:'2026-09-20',notas:null}]},
    {id:2,nombre:'Coppel',saldo_original:12000,saldo_actual:3600,pago_mensual:600,frecuencia_pago:'quincenal',tasa_interes:0,fecha_proximo_pago:'2026-11-12',notas:'Refrigerador',liquidada:false,abonos_deuda:[{id:3,deuda_id:2,monto:600,fecha:'2026-10-30',notas:null}]},
  ].map(d=>({...d,user_id:UID,created_at:'2026-01-01T00:00:00Z'})),
  abonos_deuda:[], pagos_credito:[],
  ahorros:[
    {id:1,concepto:'Fondo de emergencia',monto_meta:60000,monto_actual:27500},{id:2,concepto:'Viaje a Oaxaca',monto_meta:18000,monto_actual:6200},{id:3,concepto:'Laptop',monto_meta:32000,monto_actual:30100},
  ].map(a=>({...a,user_id:UID,clasificacion:'ahorro',mes:1,anio:2026,created_at:'2026-01-0'+a.id+'T00:00:00Z'})),
  nominas:[{id:1,user_id:UID,nombre:'Empresa',es_principal:true,tipo:'sueldo',frecuencia:'quincenal',monto_neto:14500,sueldo_base_mensual:32000,tiene_aguinaldo:true,dias_aguinaldo:15,mes_aguinaldo:12,tiene_prima_vacacional:false,tiene_utilidades:false,created_at:'2026-01-01T00:00:00Z'}],
  apartados:[{id:1,user_id:UID,concepto:'CFE Luz',monto:680,tipo:'gasto_fijo',origen_id:2,mes:11,anio:2026,quincena:1,apartado:true,fecha_apartado:'2026-11-02'}],
  whatsapp_log:[['89 café nu','✅ Registré $89.00 en Café con Nu',true],['resumen','Noviembre: llevas $9,840 de $29,000',true],['pagué la luz','✅ Marqué CFE Luz como pagado',true],['foto','Todavía no leo fotos de tickets',false]].map(([m,r,p],i)=>({id:i+1,telefono:'5216671234567',mensaje_entrante:m,respuesta_bot:r,procesado:p,error:null,transaccion_id:null,transacciones:null,created_at:`2026-11-1${4-i}T1${i}:20:00Z`})),
}
function filtra(rows, params) {
  let out = rows
  for (const [k,v] of params) {
    if (['select','order','limit','offset','on_conflict','columns'].includes(k) || k.includes('.')) continue
    const [op, ...rest] = v.split('.'); const val = rest.join('.')
    const cmp = (a) => (typeof a === 'number' ? Number(val) : val)
    out = out.filter(r => {
      const a = r[k]
      if (op==='eq') return String(a)===val
      if (op==='neq') return String(a)!==val
      if (op==='gte') return a>=cmp(a); if (op==='lte') return a<=cmp(a)
      if (op==='gt') return a>cmp(a); if (op==='lt') return a<cmp(a)
      if (op==='in') return val.replace(/[()"]/g,'').split(',').includes(String(a))
      if (op==='is') return val==='null' ? a==null : String(a)===val
      if (op==='not') return val==='is.null' ? a!=null : true
      return true
    })
  }
  const order = params.get('order')
  if (order) for (const o of order.split(',').reverse()) { const [c,dir]=o.split('.'); out=[...out].sort((x,y)=>(x[c]>y[c]?1:x[c]<y[c]?-1:0)*(dir==='desc'?-1:1)) }
  const lim = params.get('limit'); if (lim) out = out.slice(0, Number(lim))
  return out
}
export async function instalarMock(context, { tema = 'light', vacio = false } = {}) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const jwt = `${b64({alg:'HS256',typ:'JWT'})}.${b64({sub:UID,role:'authenticated',exp:4102444800,email:'demo@finni.mx',aud:'authenticated'})}.x`
  const user = {id:UID,aud:'authenticated',role:'authenticated',email:'demo@finni.mx',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'}
  const session = {access_token:jwt,refresh_token:'r',expires_in:99999999,expires_at:4102444800,token_type:'bearer',user}
  await context.addInitScript(([s,t,v]) => { if(!v) localStorage.setItem('sb-mock-auth-token', JSON.stringify(s)); localStorage.setItem('finni-theme', t) }, [session, tema, vacio])
  await context.route('https://mock.supabase.co/**', async (route) => {
    const req = route.request(); const url = new URL(req.url())
    const h = { 'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','content-type':'application/json' }
    if (req.method()==='OPTIONS') return route.fulfill({status:204,headers:h})
    if (url.pathname.startsWith('/auth/v1/user')) return route.fulfill({status:200,headers:h,body:JSON.stringify(user)})
    if (url.pathname.startsWith('/auth/')) return route.fulfill({status:200,headers:h,body:JSON.stringify(session)})
    if (url.pathname.startsWith('/rest/v1/rpc/')) return route.fulfill({status:200,headers:h,body:'null'})
    const tabla = url.pathname.split('/').pop()
    if (req.method()!=='GET') return route.fulfill({status:200,headers:h,body:'[]'})
    const rows = filtra(T[tabla] ?? [], url.searchParams)
    const single = (req.headers()['accept']||'').includes('vnd.pgrst.object')
    return route.fulfill({status:200,headers:h,body:JSON.stringify(single ? rows[0] ?? null : rows)})
  })
}
