# Plan: reacomodo y compactación de la app

> **Estado: ejecutado (17 nov 2026)** en la rama `claude/busy-ramanujan-tgpwcd`,
> una fase o pantalla por commit. Resultado medido al final (sección 9). Las
> reglas que quedaron vigentes están resumidas en `CLAUDE.md` ("Navigation" y
> "Design system"); este documento queda como registro de las decisiones.

Documento de trabajo para que lo ejecute un agente de IA (o una persona) sin más
contexto que este archivo y el repositorio. Está escrito para seguirse de arriba
abajo, una fase por commit.

- **Rama de partida:** `claude/busy-ramanujan-tgpwcd` (trae el rediseño visual
  "Libreta"; si ya se fusionó, partir de `main`).
- **Antes de empezar, leer completo `CLAUDE.md`**, en especial las secciones
  "Design system", "UI conventions" y "Making code changes".
- **Idioma:** la interfaz, los comentarios y los mensajes de commit van en español.

## 1. Qué se quiere lograr

La app ya tiene colores, tipografía y estilo nuevos. Falta lo estructural:

1. **Acomodo distinto.** Hoy hay una barra lateral con 14 entradas y cada
   pantalla es una columna de tarjetas a todo lo ancho. Se pasa a una barra
   superior con 7 secciones, pestañas dentro de cada sección y pantallas a dos
   columnas donde hay espacio.
2. **Más comprimida.** Menos aire, filas más bajas, cifras de cabecera más
   chicas y menos bloques repetidos, para ver más sin hacer scroll.

No cambia qué hace la app ni sus números. Es un cambio de presentación.

## 2. Lo que NO se toca

- `src/hooks/`, `src/utils/` (salvo agregar utilidades de presentación con su
  prueba), `src/context/`, `src/lib/`, `api/` y los archivos `supabase-*.sql`.
- Ningún cálculo, consulta, RPC ni regla de validación.
- **Las URL no cambian.** Las 14 rutas de `src/App.jsx` se quedan como están:
  hay enlaces a ellas en `components/dashboard/insights.js`,
  `hooks/useRecordatorios.js` y en varias páginas. La agrupación nueva es solo
  de navegación (pestañas que enlazan rutas existentes).
- El mecanismo de "registrar gasto" (`/control-gastos?nuevo=1` más el evento
  `finni:new-expense`, ver `Header.jsx`, `BottomNav.jsx` y `ControlGastos.jsx`).
- Las reglas del sistema visual de `CLAUDE.md`: sin degradados, sin sombras en
  tarjetas, sin MAYÚSCULAS ni antetítulos, sin recuadros de ícono, sin emojis
  decorativos, color solo para informar. Compactar no es excusa para volver a
  meter píldoras o íconos de adorno.
- Tamaño mínimo de letra: 12 px. En móvil los `input` se quedan en 16 px (si
  bajan, iOS hace zoom) y las zonas táctiles en 40 px o más.

## 3. Cómo verificar (obligatorio en cada fase)

```bash
npm run lint && npm test && npm run build
```

Capturas con datos ficticios (no usa Supabase real ni requiere cuenta):

```bash
# terminal 1
VITE_SUPABASE_URL=https://mock.supabase.co VITE_SUPABASE_ANON_KEY=x npm run dev
# terminal 2  (Playwright no es dependencia del proyecto; ver cabecera del script)
node scripts/capturas/capturar.mjs fase1
node scripts/capturas/capturar.mjs fase1 inicio,movimientos escritorio,movil
```

El script guarda en `scripts/capturas/salida/` dos imágenes por pantalla y
variante (`-pliegue.png` es lo visible sin scroll) e imprime el alto total de
cada página. **Hay que abrir y mirar las capturas**, no basta con que compile:
revisar que nada se encime, se corte o se desborde a lo ancho, en las cuatro
variantes (`escritorio` 1440, `laptop` 1280×720, `oscuro`, `movil` 390).

Si se agrega o renombra una ruta visible, actualizar la lista `PANTALLAS` del
script.

### Medición de partida (15 nov 2026, datos ficticios)

Alto total de página en px. Es la métrica de "qué tan comprimida está".

| Pantalla | Escritorio 1440 | Móvil 390 | Meta escritorio | Meta móvil |
|---|---:|---:|---:|---:|
| Inicio | 2591 | 3460 | ≤ 1400 | ≤ 2300 |
| Movimientos (17 filas) | 1776 | 4208 | ≤ 1150 | ≤ 1900 |
| Presupuesto (7 categorías) | 1549 | 2825 | ≤ 1100 | ≤ 1700 |
| Créditos (2 tarjetas) | 1234 | 2520 | ≤ 950 | ≤ 1700 |
| Deudas (4) | 958 | 1940 | ≤ 900 | ≤ 1300 |
| Tendencias | 1742 | 1898 | ≤ 1500 | ≤ 1900 |
| Configuración | 1460 | 2321 | ≤ 1200 | ≤ 2000 |

Tendencias solo gana densidad, por eso su meta baja poco.
Las demás pantallas ya caben casi en una pantalla; solo deben heredar la
densidad nueva sin romperse.

## 4. Decisiones de diseño (ya tomadas)

Marcadas con ⚠ las que cambian cómo se usa la app; conviene que el dueño las
confirme antes de ejecutar (sección 8).

### 4.1 Navegación: 14 entradas → 7 secciones con pestañas ⚠

| Sección (barra superior) | Pestañas dentro | Rutas (sin cambio) |
|---|---|---|
| Inicio | — | `/` |
| Gastos | Movimientos · Fijos · Presupuesto | `/control-gastos` · `/gastos-fijos` · `/gastos-variables` |
| Ingresos | — | `/ingresos` |
| Plan | Quincena · 12 meses | `/plan-quincena` · `/proyeccion` |
| Deudas | Deudas · Tarjetas · Simulador | `/deudas` · `/creditos` · `/simulador` |
| Ahorros | — | `/ahorros` |
| Tendencias | — | `/tendencias` |

Fuera de la barra, en un menú a la derecha (ícono de engrane o iniciales):
Configuración (`/perfil`), WhatsApp (`/whatsapp`), tema claro/oscuro y cerrar
sesión.

- **Escritorio (≥ 1024 px):** desaparece la barra lateral. Queda una sola barra
  superior fija de 52 px: logo · secciones · (espacio) · selector de mes ·
  botón Registrar · campana · menú. El título grande de página desaparece: la
  sección activa en la barra y la pestaña activa ya dicen dónde estás.
- **Móvil:** se conserva la barra inferior de 5 botones: Inicio · Gastos · (+) ·
  Plan · Más. "Más" abre el cajón actual con el resto de secciones. Arriba queda
  una barra de 48 px con el nombre de la sección, el selector de mes y la campana.
- La sección activa se decide por ruta: por ejemplo `/gastos-fijos` enciende
  "Gastos". Definir el mapa una sola vez (ver fase 1) y usarlo en la barra
  superior, la barra inferior, el cajón y las pestañas.

### 4.2 Densidad

Agregar a `src/finni-tokens.css` y usar en `src/index.css` en lugar de números
sueltos:

| Token | Valor | Hoy |
|---|---|---|
| `--pagina-max` | 1200px | 1240px, con 248px menos por la barra lateral |
| `--pagina-pad` | 20px escritorio / 12px móvil | 40px / 16px |
| `--gap` (entre bloques) | 12px | 16–22px |
| `--card-pad` | 16px escritorio / 14px móvil | 20–28px |
| `--fila-alto` (fila de lista o tabla) | 40px | 56–74px |
| `--control-alto` (botón, input, select) | 34px escritorio / 40px móvil | 38–46px |
| Texto base de listas | 13px | 14px |
| Cifra principal de cabecera | 32px (28 en móvil) | hasta 60px |
| `.stat-value` | 18px | 24px |
| `.titulo-seccion` | 15px, peso 600, fuente de texto | 18px, fuente de títulos |

Reglas de compactación:

- **Una fila, una línea.** En listas, los datos secundarios (clasificación,
  categoría, método, día) van en la misma línea en columnas, no en una segunda
  línea. Solo en móvil se permite una segunda línea, en gris.
- **Resumen en una línea.** Las cabeceras con cifra grande, barra y tres
  desgloses (`.spending-overview`, `.commitment-hero`, `.dashboard-balance`)
  pasan a una franja horizontal de unos 88 px: cifra a la izquierda, desgloses
  en línea a la derecha, barra de progreso de 3 px pegada abajo. El panel
  lateral de esas cabeceras (`SpendingSignal`, `PriorityPanel`) se vuelve una
  línea de aviso debajo de la franja, o desaparece si no hay nada que avisar.
- **Sin encabezado duplicado.** Quitar los `SectionHeader` que repiten el nombre
  de la pestaña ("Movimientos / 17 movimientos" debajo de la pestaña
  Movimientos). El conteo va en la barra de filtros.
- **Acciones a la mano, no en fila propia.** Botones de fila con
  `.acciones-hover` en escritorio. En móvil, ver 4.4.

### 4.3 Inicio a dos columnas

Hoy son 9 bloques apilados (2591 px). Queda así en escritorio; en móvil se
apila en el mismo orden de lectura (columna principal primero).

Columna principal (2/3):

1. **Disponible** — franja compacta: "Disponible este mes" + cifra de 32 px;
   a la derecha Ingresos · Gastado · Ahorrado; debajo la barra de ingreso
   utilizado. Si hay saldo del mes anterior, una línea gris dentro de esta
   misma tarjeta ("Incluye $9,490.04 que sobraron de octubre" o "Arrastra un
   déficit de …"). Desaparece la tarjeta aparte de saldo anterior.
2. **Cierre del mes** — una barra y la cifra proyectada en la misma tarjeta.
3. **Regla 50/30/20** — tres filas de 28 px (etiqueta · barra · gastado/meta).
4. **Últimos movimientos** — 6 filas de 40 px, una línea cada una.

Columna lateral (1/3):

1. **Por atender** — lista de avisos (`insights`), todos del mismo tamaño (ya no
   hay uno "destacado" con cifra grande). No mostrar el aviso "Disponible real"
   cuando su valor es el mismo que la cifra de Disponible: es un duplicado.
   Ese filtro va en `DashboardOverview.jsx`, no en `insights.js`.
2. **Pagos fijos pendientes** — filas de 32 px.
3. **Categorías cerca del límite** — filas de 32 px.
4. **Gastos hormiga** — una línea.
5. **Gasto por categoría** — la dona se queda en Inicio (decisión del dueño,
   17 nov 2026), más chica (≈ 160 px) y con la leyenda como lista de
   categoría · monto a un lado o debajo.

Se quita de Inicio la gráfica de barras "Meta contra gasto real": repite la
Regla 50/30/20. La dona sigue cargándose aparte (`React.lazy`).

### 4.4 Listas en móvil ⚠

Hoy cada movimiento ocupa 4 renglones en móvil (≈ 230 px) porque los botones
de editar y borrar tienen su propio renglón. Queda en 2 renglones (≈ 60 px):

```
Cinépolis                         $342.00
14 nov · Deseo · Entretenimiento · Nu
```

Tocar la fila abre el mismo panel de edición (`Sheet`) que hoy abre el lápiz, y
el botón "Eliminar" va dentro de ese panel (pie, a la izquierda, en rojo, con el
`ConfirmModal` de siempre). Las filas bloqueadas (origen gasto fijo, deuda o
ahorro) no abren nada y muestran el candado. En escritorio siguen el lápiz y el
bote al pasar el cursor. Aplicar el mismo patrón a Gastos fijos, Ingresos y
Presupuesto en móvil.

### 4.5 Por pantalla

- **Movimientos:** resumen en franja; filtros en una sola fila (buscar ·
  clasificación · categoría · origen · hormiga · exportar · conteo y total);
  tabla con filas de 40 px y columnas Fecha · Movimiento · Clasificación ·
  Categoría · Método · Monto.
- **Fijos:** quitar `.stat-strip` y la barra aparte; poner "Por pagar $X ·
  pagado $Y · 2 de 6" en una línea sobre la lista, con el botón Agregar a la
  derecha. Filas de 40 px.
- **Presupuesto:** resumen en franja; filas de 44 px con columnas Categoría ·
  barra · gastado de límite · disponible · editar límite (el límite se edita
  en línea, sin recuadro propio). La gráfica "Límite contra gasto" repite la
  tabla: quitarla.
- **Deudas:** resumen en franja; filas en dos líneas como máximo; el campo de
  monto y el botón Pagar se quedan en la fila (es la acción principal).
- **Tarjetas (`/creditos`):** cada tarjeta deja de ser una ficha de 590 px.
  Pasa a un bloque de unos 200 px: nombre y estado · saldo/línea con barra ·
  una fila de 4 datos (corte, pago, pago para no generar intereses, compras del
  periodo) · una línea de "mejor ventana / evita comprar". El aviso amarillo de
  saldo no registrado pasa a una línea de texto gris con ícono de información.
  Las tres cifras de arriba (facturado, periodo, MSI) se integran a la franja.
- **Simulador:** formulario y resultado lado a lado ya existen; solo densidad.
- **Plan (Quincena):** el selector "Esta quincena / Próximos 12 meses" que hoy
  es estado interno (`vista` en `PlanQuincena.jsx`) se sustituye por las
  pestañas de sección que enlazan `/plan-quincena` y `/proyeccion`. Borrar ese
  estado y el `ProyeccionView` incrustado en `PlanQuincena.jsx` (se queda solo
  en `pages/Proyeccion.jsx`).
- **Ingresos, Ahorros, WhatsApp:** solo densidad. En Ahorros, las metas pasan
  de fichas a filas (nombre · barra · ahorrado de meta · depositar).
- **Configuración:** dos columnas con índice lateral fijo (Tus datos · Regla ·
  Nómina · Métodos de pago · Categorías · WhatsApp · Seguridad) en escritorio;
  secciones apiladas en móvil. El historial de WhatsApp (`/whatsapp`) se
  enlaza desde la sección WhatsApp.
- **Tendencias:** solo densidad (la dona se queda en Inicio).

## 5. Fases

Cada fase termina con lint, pruebas, build, capturas revisadas y **un commit**.
No empezar la siguiente con la anterior a medias.

### Fase 0 — Línea base

1. `node scripts/capturas/capturar.mjs antes` y conservar las imágenes para
   comparar (no se suben al repo).
2. Confirmar que los altos coinciden con la tabla de la sección 3.

### Fase 1 — Navegación

Archivos: `src/components/layout/*`, `src/index.css`, las páginas solo para el
título y las pestañas.

1. Crear `src/components/layout/secciones.js` con el mapa único: lista de
   secciones (`clave`, `etiqueta`, `icono`, `rutas[]` con `{ to, etiqueta }`) y
   una función pura `seccionDeRuta(pathname)`. Agregar
   `secciones.test.js` (cada ruta de `App.jsx` cae en una sección; `/` solo
   coincide exacto).
2. Crear `TopNav.jsx` (escritorio) y `SeccionTabs.jsx` (pestañas con `NavLink`,
   clases `.tabs` / `.tab` que ya existen). `SeccionTabs` no pinta nada si la
   sección tiene una sola ruta.
3. `Layout.jsx`: quitar el margen `lg:ml-[248px]`; pintar `TopNav` en
   escritorio y la barra compacta en móvil; pintar `SeccionTabs` arriba del
   contenido. `Sidebar.jsx` se queda solo como cajón de móvil (ya no es fijo en
   escritorio) y lee sus grupos de `secciones.js`.
4. `Header.jsx`: se funde en la barra superior. El selector de mes, el botón
   Registrar y `ReminderBell` conservan su comportamiento. Quitar
   `TITULO_CORTO` si ya no se usa.
5. Quitar `SpendingNav` y `CommitmentNav` de `components/spending/SpendingUI.jsx`
   y `components/commitments/CommitmentUI.jsx` y de las páginas que los usan:
   los reemplaza `SeccionTabs`. Borrar su CSS (`.spending-nav*`,
   `.commitment-nav*`, `.spending-module-bar`, `.commitment-module-bar`); el
   botón de acción de cada página ("Registrar gasto", "Nueva deuda"…) se alinea
   a la derecha de las pestañas.
6. `BottomNav.jsx`: marcar activo por sección, no por ruta exacta.
7. `PlanQuincena.jsx`: quitar el estado `vista` (ver 4.5).
8. Borrar el CSS que queda huérfano de la barra lateral fija de escritorio.

Criterio: todas las rutas siguen abriendo; en 1280 px la barra superior no se
parte en dos renglones; con teclado se puede recorrer la barra y las pestañas;
`aria-current="page"` en la sección y la pestaña activas.

### Fase 2 — Tokens de densidad y componentes compartidos

Archivos: `src/finni-tokens.css`, `src/index.css`.

1. Agregar los tokens de 4.2.
2. Aplicarlos a: `.app-main`, `.card`, `.btn-*`, `.input`, `.label`,
   `.stat-strip`, `.stat-value`, `.titulo-seccion`, `.tabs`, `.btn-check`,
   `.icon-button`, `.celda`, filas de `.spending-*`, `.budget-*`,
   `.commitment-*`, `.credit-*`.
3. Reescribir las tres cabeceras (`.dashboard-balance`, `.spending-overview`,
   `.commitment-hero`) como una sola pieza compartida: componente
   `components/ui/Resumen.jsx` con props `titulo`, `cifra`, `tono`,
   `desgloses[]`, `progreso`, `aviso`. `SpendingOverview` y `CommitmentHero`
   pasan a usarlo (o se eliminan y las páginas usan `Resumen` directo). Borrar
   el CSS viejo de las tres.

`src/index.css` tiene ~3100 líneas con mucha regla por componente. Al terminar
esta fase y la 3 debe **bajar** de tamaño: borrar lo que deje de usarse
(comprobar con una búsqueda del nombre de clase en `src/` antes de borrar).

Criterio: ninguna pantalla se rompe (revisar las 14 en las 4 variantes); los
altos ya bajan aunque el acomodo de cada pantalla siga igual.

### Fase 3 — Pantallas, una por commit

Orden sugerido, de más usada a menos: Inicio → Movimientos → Fijos →
Presupuesto → Deudas → Tarjetas → Ahorros → Ingresos → Plan → Configuración →
Simulador → WhatsApp. Para cada una aplicar 4.3–4.5 y comparar su alto contra la
meta de la tabla.

Notas:

- Inicio: `pages/Dashboard.jsx` (≈ 480 líneas) y
  `components/dashboard/DashboardOverview.jsx`. Conviene partir `Dashboard.jsx`
  en componentes dentro de `components/dashboard/` (uno por bloque) al
  reacomodar. Conservar el caso de usuario nuevo (`sinNada`) y el de
  `porAsignar === null` ("Sin ingresos aún").
- Movimientos en móvil (4.4): el borrado dentro del panel debe seguir usando
  `eliminar` del hook y el `ConfirmModal`; no cambiar la lógica de
  `ControlGastos.jsx`, solo desde dónde se dispara.
- Cualquier fila que hoy esconda acciones con `.acciones-hover` debe seguir
  siendo usable en táctil.

### Fase 4 — Tendencias y limpieza

1. Densidad en Tendencias (4.5).
2. Buscar y borrar CSS y componentes huérfanos.
3. Actualizar `CLAUDE.md`: sección "Design system" (tokens de densidad, regla
   "una fila, una línea", componente `Resumen`), y describir la navegación por
   secciones (`components/layout/secciones.js`).
4. Capturas finales de todo y tabla de altos antes/después en el mensaje del
   último commit o en la descripción del PR.

## 6. Criterios de aceptación globales

- `npm run lint`, `npm test` y `npm run build` pasan; el import de
  `api/webhook.js` sigue funcionando (lo revisa el CI).
- Los altos de la tabla de la sección 3 cumplen su meta.
- En 1280×720, Inicio muestra sin scroll: disponible, cierre del mes, por
  atender y al menos el inicio de pagos pendientes.
- Sin scroll horizontal en 390 px en ninguna pantalla.
- Tema oscuro revisado en al menos Inicio, Movimientos, Tarjetas y Configuración.
- Los mismos números que antes en todas las pantallas (comparar capturas
  `antes` contra las finales: cambian posiciones y tamaños, no cifras).
- No reaparece nada de lo prohibido en "Design system" de `CLAUDE.md`.

## 7. Riesgos conocidos

- **Tailwind descarta clases armadas con plantillas** (`badge-${x}`): las tres
  `badge-*` están en `safelist` de `tailwind.config.js`. Si se crea otra clase
  dinámica, agregarla ahí o usar un mapa de nombres completos.
- **Capturas con el reloj fijo:** el script fija la fecha en 15 nov 2026 con
  `clock.setFixedTime`. No cambiarlo por `clock.install`: congela las
  animaciones y las gráficas salen vacías.
- **Barra superior con 7 secciones** en anchos de 1024–1180 px: si no caben,
  bajar el espacio entre ellas u ocultar los íconos antes que partir la barra.
- **`ReminderBell`** se posiciona respecto a su botón; revisar que el panel no
  se salga de la pantalla con la barra nueva.
- **`Sheet` y `ConfirmModal`** usan `position: fixed` con `z-index` 50–100; la
  barra superior debe quedar por debajo.
- El archivo `src/index.css` es grande; para cambios masivos seguir la nota de
  "Making code changes" de `CLAUDE.md`.

## 8. Decisiones del dueño

Confirmadas el 17 nov 2026: todas con su valor por defecto, salvo la 2.

1. **Barra superior en lugar de barra lateral** en escritorio. Por defecto: sí.
   Alternativa: conservar la lateral pero angosta (64 px, solo íconos).
2. ~~Quitar las gráficas de Inicio~~ — **decidido (17 nov 2026): la dona se
   queda en Inicio**; solo se quita la gráfica de barras.
3. **En móvil, tocar la fila para editar y borrar desde el panel**, en vez de
   botones en cada fila. Por defecto: sí.
4. **Quitar la gráfica "Límite contra gasto" de Presupuesto.** Por defecto: sí.
5. **Tarjetas como bloque compacto** en vez de ficha grande. Por defecto: sí.

## 9. Resultado (17 nov 2026)

Alto total de página en px, datos ficticios (`scripts/capturas/capturar.mjs`).
"900" en escritorio y "844" en móvil significan que la pantalla cabe sin scroll.

| Pantalla | Escritorio antes → después | Meta | Móvil antes → después | Meta |
|---|---:|---:|---:|---:|
| Inicio | 2591 → 900 | ≤ 1400 | 3460 → 1699 | ≤ 2300 |
| Movimientos (17 filas) | 1776 → 1118 | ≤ 1150 | 4208 → 1727 | ≤ 1900 |
| Presupuesto | 1549 → 900 | ≤ 1100 | 2825 → 1168 | ≤ 1700 |
| Tarjetas | 1234 → 900 | ≤ 950 | 2520 → 1087 | ≤ 1700 |
| Deudas | 958 → 900 | ≤ 900 | 1940 → 1113 | ≤ 1300 |
| Tendencias | 1742 → 1124 | ≤ 1500 | 1898 → 1525 | ≤ 1900 |
| Configuración | 1460 → 1138 | ≤ 1200 | 2321 → 1970 | ≤ 2000 |
| Fijos | 900 → 900 | — | 1316 → 844 | — |
| Plan (quincena) | 900 → 900 | — | 1040 → 844 | — |
| WhatsApp | 900 → 900 | — | 1038 → 844 | — |

En 1280×720, Inicio cabe completo (881 px). Ninguna pantalla desborda a lo
ancho en 390 px.

Diferencias con el plan:

- La dona se quedó en Inicio (decisión del dueño); Tendencias solo ganó
  densidad (sus dos primeras gráficas van lado a lado).
- El bloque aparte de gastos hormiga en Inicio se quitó: ya sale como aviso en
  "Por atender" cuando hay 3 o más.
- "Por atender" omite los avisos que Inicio ya muestra (disponible, pagos
  fijos, categoría); para eso `buildDashboardInsights` acepta `{ omitir }`.
- En Movimientos se quitó el botón "Registrar gasto" de la página: repetía el
  "Registrar" de la barra superior y el (+) de la barra inferior.
- `SpendingOverview` y `CommitmentHero` quedaron como envoltorios de `Resumen`
  en vez de borrarse, para no tocar dos veces cada página.
