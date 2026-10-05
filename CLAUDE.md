# CLAUDE.md — zapium

Portfolio personal de **Álvaro Sánchez (euZAPUS)**. Web muy animada e interactiva, pero **profesional**:
nadie tiene que "jugar" para entender quién es; lo espectacular es un extra y la información útil
siempre está a un clic. Público: reclutadores, responsables técnicos, gente de la industria.

> Mantén este archivo actualizado al cambiar decisiones, comandos o presupuestos.

## Estado

Fase 0 completada. **Fase 1 (sistema de diseño, esqueleto y hero) hecha, pendiente de OK y de elegir paleta A/B y hero orbe/portal.** Plan por fases: 0 setup · 1 sistema de diseño + hero ·
2 secciones con contenido · 3 animaciones/interacciones · 4 proyectos, casos de estudio y demos ·
5 mascota + sección IA · 6 rendimiento/a11y/SEO · 7 despliegue.
**Al terminar cada fase: dev server, capturas (375/768/1440), resumen y esperar OK antes de seguir.**

## Dirección visual

- **Un único sistema visual**: paleta, tipografía, espaciados y easings viven como tokens CSS en un
  solo archivo (`src/styles/tokens.css`, fase 1). Varía el tipo de interacción entre secciones, nunca
  la identidad visual.
- **Dos temas: claro y oscuro**, con selector y respeto a `prefers-color-scheme`. Todo color sale de
  tokens; ningún componente lleva colores sueltos.
- **Iconos SVG a medida**, dibujados para este proyecto, que usan `currentColor`/tokens y cambian con
  el tema. Nada de librerías de iconos genéricas.
- **Referencia de espíritu:** webs hiperanimadas con detalles de cursor (mano que sigue al puntero con
  resplandor), scroll que entra en "portales", mucho detalle creativo. Craft tipo bruno-simon.com pero
  legible y profesional.
- **Mascota = la patata** (el avatar del autor, `avatar.png`), versión SVG propia con **sombreritos que
  cambian su mood según la sección/proyecto** (vendedor para dropshipping, el logo de Zapper AIO,
  etc.) y que **guía** por el portfolio. Sencilla, con personalidad. Sin logos ni personajes de marcas
  existentes (tampoco de 42, DigiTech, YouTube…): los accesorios son diseños genéricos propios.
- **Easter eggs y animaciones escondidas: sí**, con criterio y siempre opcionales (nunca bloquean
  contenido ni cuentan como contenido imprescindible).

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
pnpm check:exif     # falla si alguna imagen trae EXIF/XMP/IPTC
pnpm verify         # format:check + lint + check + check:exif + build
pnpm shots [url] [filtro]  # capturas Playwright a .screenshots/ (1440/768/375, claro/oscuro, paletas y héroes)
```

El hook `.githooks/pre-commit` (activado por `pnpm install` vía `prepare`) ejecuta exif, format y lint.

## Decisiones de diseño abiertas (fase 1)

- **Paleta A «Papel y patata»** (por defecto: contornos negros gruesos y sombras duras, a juego con el dibujo
  de la patata) **vs B «Neón nocturno»** (cristal, bordes finos, brillos). Se previsualiza con `?p=b`.
  Al elegir una, **borrar la otra** (bloque `[data-palette='b']` de `tokens.css`, el script de `Base.astro`
  y las reglas `:global(:root[data-palette='b'])` de Header/Footer).
- **Hero 3D: orbe vs portal** (`?hero=portal`). Al elegir, borrar el otro módulo de `src/scripts/hero/`
  y el parámetro en `hero/index.ts`.

## Cosas que ya han dado guerra

- Los estilos con scope de Astro **no llegan a los hijos**: lo que apunte a un componente hijo
  (`Icon`, `Potato`) va con `:global(...)`.
- Colores en JS: `readColor('--token')` (`src/scripts/tokens.ts`) resuelve `light-dark()`; no leer
  `getPropertyValue` a pelo. Los colores del WebGL se refrescan al cambiar de tema.
- El avatar vive en `src/assets/avatar.png` (PNG ya optimizado y sin metadatos); el SVG de la mascota
  (`Potato.astro`) está calcado de él. Los sombreritos van en el slot `hat` (fase 5).
- Los contenidos pendientes están en `docs/content-notes.md` (info dada por el autor, redactada con honestidad).

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
