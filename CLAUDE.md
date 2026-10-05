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
- **Dos temas: claro y oscuro**, con selector y respeto a `prefers-color-scheme`. Colores con `light-dark()`;
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
