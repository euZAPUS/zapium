# CLAUDE.md — zapium

Portfolio personal de **Álvaro Sánchez (euZAPUS)**. Web muy animada e interactiva, pero **profesional**:
nadie tiene que "jugar" para entender quién es; lo espectacular es un extra y la información útil
siempre está a un clic. Público: reclutadores, responsables técnicos, gente de la industria.

> Mantén este archivo actualizado al cambiar decisiones, comandos o presupuestos.

## Estado

Fase 0 completada. **Fase 1 (sistema de diseño, esqueleto y hero espectacular) hecha, pendiente de OK del autor.** Plan por fases: 0 setup · 1 sistema de diseño + hero ·
2 secciones con contenido · 3 animaciones/interacciones · 4 proyectos, casos de estudio y demos ·
5 mascota + sección IA · 6 rendimiento/a11y/SEO · 7 despliegue.
**Al terminar cada fase: dev server, capturas (375/768/1440), resumen y esperar OK antes de seguir.**

## Dirección visual

- **Un único sistema visual**: paleta, tipografía, espaciados y easings viven como tokens CSS en un
  solo archivo (`src/styles/tokens.css`). Varía el tipo de interacción entre secciones, nunca la identidad visual.
- **Estilo «Papel y patata»** (elegido): contornos negros gruesos, sombras duras tipo pegatina, colores de
  confeti (`--accent` naranja patata, `--pink`, `--mint`, `--sky`, `--sun`). Sale del dibujo de la patata del autor.
- **Dos temas: claro y oscuro** (oscuro por defecto), con selector. Colores con `light-dark()`;
  ningún componente lleva colores sueltos.
- **Quiere impacto desde el primer segundo**: «que nada más abrir se cree algo abusivamente creativo, animado,
  especial, lleno de brillos». El hero se monta solo (intro coreografiada), con doodles, chispas, mano de cursor
  y fondo vivo. Más es mejor, **sin romper legibilidad ni rendimiento**.
- **Iconos y doodles SVG a medida** (`Icon.astro`, `Doodle.astro`): contorno negro grueso, `currentColor`/tokens.
  Nada de librerías de iconos genéricas. Temas del autor: rayo (zap), código, velas (trading), bolsa (dropshipping),
  play (vídeo/YouTube IA), terminal (shell de 42), cubo (huerto de Zapper), moneda, red (ASIR), «C».
- **Cursor = mano naranja** con resplandor y estela de chispas (`cursor.ts` + `fx.ts`), solo con puntero fino.
- **Referencias del autor:** reels de Instagram de webs hiperanimadas (mano que sigue al cursor con
  resplandores, scroll que entra en portales). No se han podido ver (Instagram bloqueado); ver `docs/content-notes.md`.
- **Mascota = la patata del autor, SU dibujo ORIGINAL** (`src/assets/avatar-original.png`). Se corta en capas
  (`scripts/split-avatar.mjs`: cuerpo + 2 brazos + logo + favicon, mismos píxeles, verificado 0 de diferencia) para
  animar brazos, saltos e inclinación. Sombreritos/accesorios por el slot `hat` (fase 5), cambian de mood según
  sección/proyecto y la patata **guía** por la web. Sin logos ni personajes de marcas existentes.
- **Easter eggs: sí**, siempre opcionales (clic en la patata = chiste + salto; 5 clics seguidos = se marea;
  clic en doodles = explotan en chispas). Chistes en español **y** en inglés.

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
  - `ProjectWall` (+ `scripts/wall.ts`): **la pared de proyectos** (sustituye a la escena fijada, que el autor encontró monótona: quería
    «lateral, 3D, en un grid, animado y flotante»). Rejilla de dos filas; el destacado (Zapper AIO) ocupa 3×2 celdas con el vídeo «real»
    delante del **mismo vídeo desenfocado de fondo** (`ProofVideo`), más 8 tarjetas (Libft, zapium, las 3 apps del lab, dropshipping,
    trading, YouTube IA, GitHub; textos en `story.projects.items`, enlaces en el `meta` del componente). Escritorio: la sección se fija y el
    scroll vertical recorre la pared; el JS escribe `--hp` (avance), `--ep` (entrada) y por tarjeta `--d` (distancia al centro, con zona
    muerta) y el CSS lo convierte en giro/profundidad/escala tipo coverflow con perspectiva compartida; las tarjetas flotan (`bob`), se
    inclinan hacia el puntero con brillo, el punto de fuga sigue al ratón y la patata guía cruza girando. Condición de fijado:
    `min-width: 60rem` + `min-height: 38rem` + sin reduced-motion (**la misma condición está en el `@media` del CSS y en `wall.ts`**;
    si se cambia una, cambiar la otra). Móvil: el destacado va apilado y las 8 tarjetas forman un carril de dos filas con scroll-snap nativo
    y la misma inclinación (con `perspective()` por tarjeta, porque `overflow` aplana el 3D). Reduced-motion: rejilla normal. Al enfocar
    con teclado una tarjeta fuera de plano, `wall.ts` recoloca el scroll. Hay que mantener `grid-template-columns: minmax(0, 1fr)` en el
    `.wall__stick`: sin eso la rejilla se ensancha al ancho de toda la pared y el punto de fuga se descentra.
  - `AboutTrack`: «Sobre mí» como **scroll horizontal** fijado (tarjetas: dropshipping, trading simulado, YouTube IA, 42, ASIR, fotos).
  - `AiSection`, `StackSection`, `ContactSection` (correo montado por JS, no en claro en el HTML; botón de copiar).
  - Móvil y reduced-motion: todo apilado, sin fijados.
  - `LabTeaser` + páginas **`/lab/` y `/en/lab/`** (`LabPage`): tres mini-apps sin backend, con la lógica pura en `src/apps/lib/`
    **con tests** (`pnpm test`): `SubnetApp` (subredes IPv4/CIDR, ASIR), `BitsApp` (enteros de 32 bits, bases y operadores, C/42),
    `RiskApp` (tamaño de posición por riesgo, trading **simulado**, con aviso de que no es asesoramiento). Se describen como
    «hechas con Claude Code para practicar». Añadir apps nuevas: lógica en `lib/` + test + componente `XApp.astro` + tarjeta en `LabPage`.
  - `Shape3D` (+ `scripts/shape3d/`): **nudo toroidal iridiscente** con shader propio (OGL), detrás de «Contacto»; gira con cursor/scroll,
    el clic le da un empujón y suena «boing». Sustituye a una escena de Spline.
- **Vídeos**: dejar los originales en `_originals/videos/NOMBRE.mp4`, ejecutar `pnpm videos` (WebM + MP4 + póster, sin audio,
  ≤ 1280 px, avisa si > 3 MB) y pasar `src="NOMBRE"` a `<ProofVideo>`. Sin `src` se ve un marcador `[TODO]`.
- **Vista previa clicable para el autor** (Artifact de claude.ai, privado): `pnpm build && node scripts/preview-bundle.mjs` y publicar
  `.preview/index.html` con `root: .preview` y la lista de archivos que imprime el script. El Artifact envuelve la página (se publica
  como **fragmento**, sin `<html>/<head>/<body>`), exige rutas **relativas** y prohíbe nombres que empiecen por `_`
  (`_astro` → `assets`). Hacerlo al terminar cada entrega y **republicar a la misma URL**.
- Plan por fases del «mundo»: A) carga + hero ✅ · B) mundo + escenas ✅ (primera versión) · C) pantallas 3D curvas de proyectos
  y más escenas · pulido de rendimiento/a11y/SEO (fase 6) · despliegue (fase 7).

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
pnpm check:exif     # falla si alguna imagen trae EXIF/XMP/IPTC
pnpm verify         # format:check + lint + check + check:exif + build
pnpm test           # tests de la lógica del laboratorio (node --test, Node ≥ 22.18)
pnpm videos         # _originals/videos -> public/videos (WebM+MP4+póster)
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

- **No inventar** datos, proyectos, experiencia ni resultados. Dropshipping, trading y YouTube con IA
  son **proyectos/experimentos personales y de aprendizaje**, no experiencia laboral: se cuentan así,
  sin cifras ni logros que el autor no haya dado.
- Estudios: Campus 42 y DigiTech (1º de ASIR). Solo texto, sin logos.
- La sección «Cómo trabajo con IA» es concreta y honesta (qué delego, qué reviso, qué aprendí) y
  menciona que la web está hecha con Claude Code.

## NO hacer

- **No tocar el avatar**: ni redibujarlo, ni recortarlo con halos/bordes tipo pegatina, ni añadirle manchas.
  Sale siempre de `src/assets/avatar-original.png` (a través de las capas generadas).
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
