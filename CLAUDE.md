# CLAUDE.md — zapium

Portfolio personal de **Álvaro Sánchez (euZAPUS)**. Web muy animada e interactiva, pero **profesional**:
nadie tiene que "jugar" para entender quién es; lo espectacular es un extra y la información útil
siempre está a un clic. Público: reclutadores, responsables técnicos, gente de la industria.

> Mantén este archivo actualizado al cambiar decisiones, comandos o presupuestos.

## Estado

Fase 0 completada. **Fase 1 (sistema de diseño, esqueleto y hero espectacular) hecha, pendiente de OK del autor.** Giro «serio» + patata 3D con scroll hechos el 2026-10-06 (ver «Dirección visual» y «Hero 3D»). Plan por fases: 0 setup · 1 sistema de diseño + hero ·
2 secciones con contenido · 3 animaciones/interacciones · 4 proyectos, casos de estudio y demos ·
5 mascota + sección IA · 6 rendimiento/a11y/SEO · 7 despliegue.
**Al terminar cada fase: dev server, capturas (375/768/1440), resumen y esperar OK antes de seguir.**

## Dirección visual

- **Un único sistema visual**: paleta, tipografía, espaciados y easings viven como tokens CSS en un
  solo archivo (`src/styles/tokens.css`). Varía el tipo de interacción entre secciones, nunca la identidad visual.
- **Estilo «plano técnico» serio (segundo giro, 2026-10-06, referencia alche.studio)**. El autor encontró «de niños» tanto «Papel y patata»
  como la primera versión «plano» (chispas/«virutillas», doodles, mano de cursor, iconos redondeados, rebotes). Ahora: neutros casi puros
  (casi negro en oscuro, gris «plano» en claro), **líneas de 1 px**, **esquinas casi rectas** (`--radius-s: 2px`; botones, etiquetas y tarjetas
  rectos, nada de píldoras), tipografía **Inter ligera (300–400)** para títulos y **monoespaciada en mayúsculas** para etiquetas, navegación y
  botones, **marcas de esquina tipo viewfinder** en `.card`, numeración `01 / 05`, y el **naranja de la patata como único color vivo**
  (indicadores, hover, datos clave; el botón principal va invertido —tinta sobre fondo— y se enciende en naranja al pasar el cursor).
  **Eliminado y NO volver a poner:** chispas/estela de partículas (`fx.ts`), doodles (`Doodle.astro`), mano de cursor, rebotes/muelles en
  las animaciones (`--ease-pop/--ease-spring` ahora son curvas de salida sin sobrepaso), confeti de colores y la fuente Bricolage.
  El cursor es una **retícula** (anillo fino con marcas + punto naranja, colocada síncronamente) y el clic lanza un **«ping»** (anillo que se
  expande, `scripts/ping.ts`). Iconos propios **geométricos** (`Icon.astro`: líneas rectas, `stroke-linecap: square`). `--pink/--mint/--sky/--sun`
  siguen existiendo muy apagados y casi sin uso. Se mantiene el tono honesto.
- **Dos temas: claro y oscuro** (oscuro por defecto), con selector. Colores con `light-dark()`;
  ningún componente lleva colores sueltos.
- **Quiere impacto desde el primer segundo**: «que nada más abrir se cree algo abusivamente creativo, animado,
  especial». El hero se monta solo (intro coreografiada) con retícula de cursor y fondo vivo,
  pero **sobrio** (ver «plano técnico»), **sin romper legibilidad ni rendimiento**.
- **Iconos SVG a medida** (`Icon.astro`): geométricos, trazo fino, `currentColor`/tokens. Nada de librerías de iconos genéricas.
- **Cursor = retícula técnica** (SIN suavizado: se coloca síncronamente en `pointermove`; el autor notó «input lag»), solo con puntero fino (`cursor.ts`).
  **Rendimiento (norma):** nada de `backdrop-filter` sobre contenido que esté encima del WebGL (recompone el desenfoque cada fotograma);
  el mundo se deja de pintar mientras Proyectos lo tapa (`html.is-covered`); `hero/interact.ts` solo trabaja con el hero a la vista.
- **Crédito visible (pedido por el autor):** el pie de página dice «Diseño inspirado en alche.studio» (enlace, es/en) y el README lo recoge. No quitarlo.
- **Referencias del autor:** reels de Instagram de webs hiperanimadas (mano que sigue al cursor con
  resplandores, scroll que entra en portales). No se han podido ver (Instagram bloqueado); ver `docs/content-notes.md`.
- **Mascota = la patata del autor, SU dibujo ORIGINAL** (`src/assets/avatar-original.png`). Se corta en capas
  (`scripts/split-avatar.mjs`: cuerpo + 2 brazos + logo + favicon, mismos píxeles, verificado 0 de diferencia). **El autor pidió (2026-10-06)
  «un modelo 3D de ella»**: el hero la muestra como **losa 3D extruida** (ver «Hero 3D»); la cara lleva el dibujo original como textura SIN retocar
  (en reposo se ve igual) y el canto es negro lacado. La versión 2D (`Mascot.astro`) sigue en el DOM como botón de clic, texto alternativo y
  reserva sin WebGL / con reduced-motion, y en la guía de «Sobre mí». Sombreritos/accesorios por el slot `hat` (fase 5), cambian de mood según
  sección/proyecto y la patata **guía** por la web. Sin logos ni personajes de marcas existentes.
- **Easter eggs: sí**, siempre opcionales (clic en la patata = chiste + salto; 5 clics seguidos = se marea;
  un «ping» (anillo) acompaña al clic). Chistes en español **y** en inglés.

## Carga, mundo y escenas (decisiones del autor)

- **Tema oscuro por defecto** (el autor lo prefiere). El claro se elige con el selector y se recuerda (`localStorage: theme`).
  No se sigue `prefers-color-scheme`. El tema vive en `<html data-mode>` (NO `data-theme`: el Artifact de claude.ai pone el suyo y pisaba el nuestro). Ojo: **`body` no lleva fondo** (`background: transparent` explícito: el esqueleto del Artifact le pone uno blanquecino y tapaba el tema y el mundo; el de `<html>` se ve detrás del mundo).
- **Estética de la home = «factory grid» + plano** (referencia `docs/reference-alche.md`) con el toque amigable de la patata:
  - `World.astro` + `scripts/world/`: pasillo de paneles en perspectiva en un shader (OGL, ~0,6 de resolución) que avanza con el
    scroll y se inclina con el ratón; el cursor ilumina las losetas (estela) y el clic lanza una onda. **También en móvil** (más barato:
    ~0,42 de resolución; el toque lanza la onda); sin WebGL o con reduced-motion, rejilla CSS.
  - `Gizmo.astro` + `world/gizmo.ts`: gizmo de ejes X/Y/Z y texto «User Perspective» estilo Blender (decorativo). **No** habrá
    patata 3D modelada: el autor la descartó; la patata es siempre su dibujo 2D moviéndose.
  - `Hud.astro`: regla de posición con la sección actual. Navegación y etiquetas en monoespaciada.
- **Carga a modo de plano GOBERNADA POR EL SCROLL** (`Preloader.astro` + `preloader.ts`): el dibujo avanza con rueda / flechas /
  gesto táctil y solo llega al 100 % si la página ya cargó de verdad. Primero, aviso de sonido (se recuerda). Escritorio,
  una vez por sesión (`sessionStorage: zapium-intro`). `?intro` la fuerza, `?nointro` la desactiva (capturas). Esc o «Saltar».
  Mientras carga: `html.is-loading` pausa las animaciones del hero y `header/main/footer` van `inert`.
  **También en móvil** (el autor lo pidió): el gesto táctil vertical avanza la carga y el plano se ve entero (`preserveAspectRatio meet`).
  Riesgo conocido: retrasa el LCP en la primera visita (medirlo en la fase 6 y, si hace falta, acortarla en móvil).
- **Sonido minimalista, OPT-IN** (`scripts/audio.ts`, sintetizado con Web Audio, sin archivos): rueda de clics rápidos y suaves
  ligada al scroll, «tock» sutil en pulsaciones, campanilla al acabar la carga, «boing» de la patata. Aviso en la carga + botón en la
  cabecera; elección en `localStorage: zapium-sound`. Arranca apagado hasta que el visitante lo activa.
- **Escenas de contenido** (textos reales en `src/i18n/*.ts → story`, con `[TODO]` donde falta información):
  - `Works` (+ `scripts/works/{index,scene}.ts`): **pantallas flotantes** de proyectos, casi como la sección Works de alche.studio (el autor
    pidió «que estén flotando y de fondo el grid, no pegados al grid»; análisis en `docs/reference-alche.md`). Escena WebGL propia (OGL) con
    **dos capas separadas**: (1) **fondo** = pared cilíndrica de baldosas vista desde dentro, un único shader a pantalla completa (rayo →
    cilindro → baldosas con huecos, bloques 2×2 «quad-tree», cruces `+`, fundido lateral) cuyas baldosas toman el **color del proyecto activo**
    (la textura muestreada en mosaico y apagada; cruza entre el anterior y el siguiente) y que se desplaza ~⅓ de lo que se desplazan las
    pantallas (**paralaje**); (2) **paneles** = una pantalla 3D suelta por proyecto: convexa, con **lente de barril + aberración cromática**,
    viñeta, borde de cristal iridiscente, giro hacia el centro (coverflow), vaivén (flotan) y una **onda/doblez** que la recorre con la velocidad
    del scroll. Cada pantalla es un **vídeo** (`public/videos/NOMBRE.*`, textura viva, solo se reproduce la activa), una **captura**
    (`public/works/NOMBRE.webp`, la genera `node scripts/capture-works.mjs`; **regenerarla cuando cambie el aspecto de las apps**; salen sobre fondo plano y liso, SIN el mundo/grid de detrás: el autor vio el grid viejo dentro de las pantallas) o un marcador
    `[TODO]` dibujado en un canvas. Escritorio y móvil: la sección se fija (`data-gl`) y el scroll vertical recorre las pantallas con una pausa en
    cada una; el texto del proyecto activo (DOM real; el resto `visibility:hidden`) va **abajo a la izquierda** como en la referencia, con
    números 01–05 abajo a la derecha (también flechas del teclado y foco); la patata guía cruza por abajo. En vertical (móvil) la pantalla sube y el
    texto va debajo. Sin WebGL o con reduced-motion: lista apilada (captura + texto + datos). Debajo, **«Más proyectos»** (índice en filas).
    Añadir un proyecto: entrada en `story.projects.items` (es/en) + objeto en `works` de `Works.astro` (+ captura o vídeo). Los enlaces SOLO a
    repos públicos. Mandos en `scene.ts`: `PANEL_W`, `SPACING`, `FOV`, `uBow`, `uRot`, `uDepth`, `uFloat` y el GLSL del fondo/paneles.
  - `DemoDialog` (+ `scripts/demo.ts`): **demo jugable** de Zapper AIO («Zapper Huerto»: temporizador + huerto con datos de ejemplo, hecha por
    el autor con el mismo código de la app). Vive en **`public/demos/huerto/huerto.html`** (UN solo archivo con todo inline, ~890 KB; la regenera
    `npm run build:huerto -w @zapper/desktop` en el repo privado y sale como `huerto-single.html`). Sin red, sin guardar nada, ES/EN. El botón
    «Probar la demo» **solo se pinta si ese archivo existe** (`existsSync` en `Works.astro`). Al pulsarlo se abre un `<dialog>` modal, se hace
    `fetch` del HTML y se inyecta en un `<iframe srcdoc sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox">` (sin
    `allow-same-origin`: origen opaco, `localStorage` falla dentro, por eso la demo guarda en memoria); al cerrar se destruye el iframe.
    **Por qué srcdoc y no `src`**: un iframe con sandbox no lleva cookies y sus peticiones fallaban en la vista previa privada del Artifact
    («la demo no va»); con srcdoc no pide nada. La demo lee `?lang=` de `location.search`, vacío en srcdoc: `demo.ts` reemplaza
    `new URLSearchParams(location.search)` por uno con el idioma de la página (si una recompilación cambiara esa cadena, la demo usaría el idioma del navegador).
    Dentro del diálogo se usa el cursor nativo. La demo es **código compilado con todos los derechos reservados** (no MIT; ver `LICENSE-CONTENT.md`).
    Los avisos de React/Tailwind/motion están en `THIRD_PARTY_NOTICES.md` (pendiente confirmar la lista exacta con el `package.json` del repo privado).
  - `AboutTrack`: «Sobre mí» como **scroll horizontal** fijado (tarjetas: dropshipping, trading simulado, 42, ASIR, fotos).
  - `AiSection`, `StackSection`, `ContactSection` (correo montado por JS, no en claro en el HTML; botón de copiar).
  - Móvil y reduced-motion: todo apilado, sin fijados.
  - `LabTeaser` + páginas **`/lab/` y `/en/lab/`** (`LabPage`): tres mini-apps sin backend, con la lógica pura en `src/apps/lib/`
    **con tests** (`pnpm test`): `SubnetApp` (subredes IPv4/CIDR, ASIR), `BitsApp` (enteros de 32 bits, bases y operadores, C/42),
    `RiskApp` (tamaño de posición por riesgo, trading **simulado**, con aviso de que no es asesoramiento). Se describen como
    «hechas con Claude Code para practicar». Añadir apps nuevas: lógica en `lib/` + test + componente `XApp.astro` + tarjeta en `LabPage`.
  - **Visor 3D de «Contacto»** (`ContactSection.astro` + `scripts/potato/contact.ts`; sustituye al nudo toroidal, que el autor no entendía: «la figura
    esa que son dos círculos»): la MISMA patata 3D del hero en un recuadro tipo visor de modelos (marcas de esquina naranjas, rejilla fina,
    lecturas `ROT X/Y/Z` en vivo, «Vista 02 · patata.001»). Se gira **arrastrando** (inercia; en táctil, deslizar en horizontal con
    `touch-action: pan-y`), se inclina hacia el cursor, doble clic = giro + «boing», y vuelve sola a mirar de frente. Reutiliza `createPotatoScene(…, { tunnel: false })`
    y las imágenes de la patata 2D del propio recuadro (que es también la reserva sin WebGL / reduced-motion). Se carga al acercarse a la pantalla.
- El texto fijo «User Perspective» (`Gizmo.astro`) se esconde cuando el pie de página está a la vista (se solapaba con el «© 2026»).
- **Vídeos**: dejar los originales en `_originals/videos/NOMBRE.mp4`, ejecutar `pnpm videos` (WebM + MP4 + póster, sin audio,
  ≤ 1280 px, avisa si > 3 MB) y pasar `src="NOMBRE"` a `<ProofVideo>`. Sin `src` se ve un marcador `[TODO]`.
- **REGLA DEL AUTOR (no negociable): tras CADA cambio visible, republicar el Artifact y poner el ENLACE en la PRIMERA línea del mensaje**
  (https://claude.ai/artifact/V5u75LSfXy4ksy5Qh5kBBb). El autor lo prueba desde el móvil entre otras tareas y pierde tiempo si tiene que pedirlo
  o buscarlo. Si se hacen varios cambios seguidos, republicar tras cada uno; no esperar al final de la sesión.
- **Vista previa clicable para el autor** (Artifact de claude.ai, privado): `pnpm build && node scripts/preview-bundle.mjs` y publicar
  `.preview/index.html` con `root: .preview` y la lista de archivos que imprime el script. El Artifact envuelve la página (se publica
  como **fragmento**, sin `<html>/<head>/<body>`), exige rutas **relativas** y prohíbe nombres que empiecen por `_`
  (`_astro` → `assets`). Hacerlo al terminar cada entrega y **republicar a la misma URL**.
- Plan por fases del «mundo»: A) carga + hero ✅ (ahora con patata 3D y secuencia de scroll) · B) mundo + escenas ✅ (primera versión) · C) pantallas 3D curvas de proyectos
  y más escenas · pulido de rendimiento/a11y/SEO (fase 6) · despliegue (fase 7).

## Hero 3D: la patata que gira y la «otra dimensión» (2026-10-06, referencia: la «A» que gira en alche.studio)

- `src/scripts/potato/`: `scene.ts` (OGL: dos pasadas en un lienzo, 1) túnel y 2) patata), `geometry.ts` (extrusión + recorte de orejas, código
  puro con tests: `pnpm test`), `outlines.json` (contornos de las capas; los genera `node scripts/make-potato-outlines.mjs` con marching squares sobre
  el alfa de `src/assets/avatar/{body,arm-l,arm-r}.png`; **regenerarlo si cambian las capas**), `index.ts` (controlador de scroll/cursor).
- **Hero fijado** (`Hero.astro`, `.hero[data-gl]`: `--travel: 230svh`; el CSS solo fija si existe `data-gl`, que pone el script cuando el WebGL
  arranca). Progreso `p` (0-1): la patata va del escenario al centro y crece (0-0,42), gira ~2,5 vueltas, un **iris** de la otra dimensión se abre
  desde ella (0,1-0,66; túnel cebra en espiral negro/hueso con 1 franja de cada 8 en naranja y aberración cromática), se cuela por el túnel
  (0,6-0,95) y el túnel se funde al color de fondo (0,88-1) para dar paso a «Proyectos». El texto del hero se desvanece pronto (`--copy`),
  un rótulo «Dimensión 02 · Proyectos» marca la secuencia (`--dim`), el mundo se deja de pintar con el iris cubriendo (`html.is-covered`).
  Mandos: las constantes de `index.ts` (fases) y `scene.ts` (`fov 24`, grosores 62/15 px, biseles 24/12, shaders).
- Cursor: la patata se inclina hacia él; clic = giro (5 seguidos = más), brazos que se mecen. Al aparecer tras la carga entra girando + «ping».
- Sin WebGL / reduced-motion / fallo: hero apilado de siempre con la patata 2D. Móvil: misma secuencia (lienzo a dpr ≤ 1,25).
- Arreglo de paso: `main { overflow-x: clip }` (el antiguo nudo 3D de «Contacto» ensanchaba la página en móvil y «alejaba» la vista).

## Herramientas evaluadas (a petición del autor): shaders.com, Spline, Framer/Motion

Revisado el 2026-10-05 con los paquetes de npm (las webs están bloqueadas en el entorno de desarrollo). **Ninguna se usa de momento.**

- **shaders.com** (`shaders`): plataforma **propietaria** (Shader Effects License). Gratis solo para uso personal/no comercial/evaluación;
  «cualquier despliegue público» cuenta como comercial y pide licencia Pro/Team. Usa WebGPU (TypeGPU) y pesa ~27 MB sin comprimir.
  No redistribuir el código exportado (esto choca con un repo público MIT). **Alternativa elegida:** shaders propios con OGL
  (Unlicense, sin dependencias): el cursor ilumina las losetas del pasillo, onda al hacer clic, etc. (`world/factory.ts`).
  Candidata abierta si hiciera falta una librería: `@paper-design/shaders` (Apache-2.0, WebGL, ~0,9 MB).
- **Spline** (`@splinetool/runtime`): requiere que el autor **cree y exporte** la escena en el editor de Spline (yo no puedo); el
  runtime pesa ~36 MB sin comprimir, no declara licencia en npm y carga la escena desde su CDN (el Artifact lo bloquearía).
  Solo tendría sentido con una escena concreta del autor, cargada en diferido en escritorio y con fallback estático.
- **Framer**: como librería (`motion`, MIT) duplicaría lo que ya hace CSS/WAAPI (+ GSAP previsto para ScrollTrigger). El editor
  Framer (modelos 3D) es otra herramienta: no encaja con este sitio en código.

## Stack

Astro 7 (estático) + TypeScript 6 · CSS con variables (sin Tailwind) · GSAP + ScrollTrigger + Flip ·
Lenis · OGL solo en piezas aisladas con import dinámico y fallback estático · sharp para imágenes ·
pnpm. Sin frameworks de UI pesados salvo justificación escrita aquí.

- TypeScript fijado en **6.x**: `astro check` aún no soporta TS 7.
- i18n: `es` por defecto en `/`, `en` en `/en/`. Traducir también chistes y frases hechas.
- Despliegue previsto: Cloudflare Pages. Dominio propio más adelante.

## Comandos

```
pnpm dev            # servidor de desarrollo
pnpm build          # build estático a dist/
pnpm preview        # sirve dist/
pnpm check          # astro check (tipos)
pnpm lint           # ESLint
pnpm format         # Prettier (escribe)
pnpm images         # _originals/photos -> src/assets/photos (AVIF+WebP, sin EXIF)
node scripts/split-avatar.mjs  # capas del avatar original (verifica 0 de diferencia)
node scripts/make-potato-outlines.mjs  # siluetas de las capas -> src/scripts/potato/outlines.json (patata 3D)
pnpm check:exif     # falla si alguna imagen trae EXIF/XMP/IPTC
pnpm verify         # format:check + lint + check + check:exif + build
pnpm test           # tests de la lógica del laboratorio (node --test, Node ≥ 22.18)
pnpm videos         # _originals/videos -> public/videos (WebM+MP4+póster; recorta a 30 s, `-- --max N` para cambiarlo)
node scripts/capture-works.mjs  # capturas de la demo y del lab -> public/works (necesita `pnpm preview` en :4321)
pnpm shots [url] [filtro]  # capturas Playwright a .screenshots/ (1440/768/375, claro/oscuro, paletas y héroes)
```

El hook `.githooks/pre-commit` (activado por `pnpm install` vía `prepare`) ejecuta exif, format y lint.

## Cosas que ya han dado guerra

- Los estilos con scope de Astro **no llegan a los hijos**: lo que apunte a un componente hijo
  (`Icon`, `Mascot`) va con `:global(...)`.
- Colores en JS: `readColor('--token')` (`src/scripts/tokens.ts`) resuelve `light-dark()`; no leer
  `getPropertyValue` a pelo. Los colores del WebGL se refrescan al cambiar de tema.
- Los contenidos pendientes están en `docs/content-notes.md` (info dada por el autor, redactada con honestidad).

- **Propiedades de transformación individuales** (`translate`, `rotate`, `scale`) se aplican ANTES que `transform`:
  si posicionas con `transform` y animas con `rotate/scale`, el elemento se desplaza. Posiciona con `translate`.
- `svg { max-width: 100% }` (global) aplasta svgs dentro de contenedores de ancho 0: poner `max-width: none`.
- Cuando Prettier reformatea, los `replace` por texto fallan en silencio: comprobar con `grep` tras editar.
- `body` con fondo propio tapa lo que esté en `z-index: -1` (el mundo): el fondo va solo en `<html>`.
- OGL no acepta arrays de uniforms (`vec4 u[10]`) como `Float32Array`: usar uniforms sueltos.
- Una malla con el orden de triángulos al revés se ve «hueca» y oscura (se pintan las caras interiores): comprobar el sentido.
- Con varios `import()` dinámicos que comparten fragmento, Vite mete rutas absolutas `/_astro/…` en un helper de precarga:
  `preview-bundle.mjs` lo reescribe para el Artifact.
- El Artifact de claude.ai pone su propio `data-theme` en `<html>`: nuestro tema usa `data-mode`.

## Convenciones

- Commits pequeños, **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`…), al menos uno por fase.
- Rama de trabajo: `claude/blissful-shannon-clbqia`. No hacer PR ni push a otra rama sin que se pida.
- Datos personales **solo** en `src/config/site.ts`. Textos en ficheros de i18n, no incrustados.
- Contenido que falta: `[TODO]` **visible**. Si el dato es opcional (p. ej. LinkedIn) vale `null` y no se pinta.
- Componentes Astro por defecto (cero JS); `<script>` solo donde haga falta. Respetar `prefers-reduced-motion`
  con una versión estática equivalente.
- Si hay duda entre dos opciones de diseño, **enseñar las dos** en vez de elegir.

## Presupuestos de rendimiento (objetivo)

- Lighthouse móvil: rendimiento ≥ 90; accesibilidad ≥ 95; buenas prácticas ≥ 95; SEO ≥ 95. LCP < 2,5 s.
- JS inicial ≤ ~100 KB gz. Chunk WebGL (OGL) ≤ ~60 KB gz y diferido (no bloquea LCP).
- Imágenes AVIF/WebP con `srcset` y `loading="lazy"` (salvo la del LCP). Fuentes self-hosted, subset, `font-display: swap`.
- Vídeos WebM/MP4 comprimidos, silenciados, autoplay solo al entrar en pantalla, con póster.
- Demos en `<iframe sandbox>` (sin `allow-same-origin`) que cargan **solo al hacer clic**; deben funcionar sin backend.

## Privacidad y seguridad

- **EXIF/GPS fuera** de toda foto antes de commitear (`pnpm images`; el hook y CI lo comprueban).
- Sin teléfono ni dirección. Sin secretos en el repo. Sin cookies ni trackers. **Analítica: ninguna**
  (si se propone alguna, preguntar antes).
- Email de contacto provisional en `src/config/site.ts`; se pinta ofuscado. Contacto = `mailto:`, sin formulario que guarde datos.
- Originales pesados en `_originals/` (gitignored). Solo se commitean medios optimizados.

## Honestidad del contenido

- **Solo enlazar repos PÚBLICOS**: `zapper-aio` y `zapper-datos` son **privados** (404 para los visitantes; ya nos pasó con el botón «Ver el repositorio»).
  Públicos: `zapium`, `zapper-aio-releases` (descargas), `Campus42`, `zapped`. Comprobar la visibilidad antes de enlazar un repo nuevo.
- **YouTube con IA: fuera** (decisión del autor, no rentaba). **Zapper AIO lo creó él** («Mi rol: Autor»).
- **No inventar** datos, proyectos, experiencia ni resultados. Dropshipping y trading simulado
  son **proyectos/experimentos personales y de aprendizaje**, no experiencia laboral: se cuentan así,
  sin cifras ni logros que el autor no haya dado.
- Estudios: Campus 42 y DigiTech (1º de ASIR). Solo texto, sin logos.
- La sección «Cómo trabajo con IA» es concreta y honesta (qué delego, qué reviso, qué aprendí) y
  menciona que la web está hecha con Claude Code.

## NO hacer

- **No tocar el avatar**: ni redibujarlo, ni recortarlo con halos/bordes tipo pegatina, ni añadirle manchas.
  Sale siempre de `src/assets/avatar-original.png` (a través de las capas generadas). La versión 3D solo extruye sus siluetas y usa las capas
  como textura (sin retocar colores).
- **No poner círculos/discos de fondo** detrás de la patata (el autor lo rechazó). El fondo es una malla orgánica a pantalla completa.
- No usar logos, personajes ni marcas de terceros (ni imitarlos).
- No colores, tipografías ni easings fuera de los tokens.
- No añadir librerías pesadas sin justificarlo aquí; no cargar WebGL en el camino crítico.
- No commitear originales, fotos con EXIF, `.env` ni claves. No copiar código de GSAP al repo.
- No hacer `git push --force` ni tocar otra rama; no crear PR salvo petición explícita.
- No dejar animaciones sin versión `prefers-reduced-motion`.
- No actualizar a TypeScript 7 hasta que `astro check` lo soporte.

## Licencias

Código: MIT (`LICENSE`). Contenido, avatar, mascota, iconos y diseño: todos los derechos reservados
(`LICENSE-CONTENT.md`). Terceros: `THIRD_PARTY_NOTICES.md` (actualizar al añadir dependencias de runtime).
**Pendiente:** leer el texto completo de la licencia estándar de GSAP antes de publicar (fase 7).
