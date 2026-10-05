# zapium

Portfolio personal de **Álvaro Sánchez ([euZAPUS](https://github.com/euZAPUS))**: una web animada e
interactiva, con tema claro y oscuro, en español e inglés. Construida con **Claude Code**.

> 🚧 En construcción (fase 0 de 7). Captura o GIF: _[TODO cuando haya diseño]_.

## Stack

Astro + TypeScript · CSS con variables · GSAP + ScrollTrigger · Lenis · OGL (WebGL ligero, carga diferida).
Detalles y decisiones en [CLAUDE.md](CLAUDE.md).

## Cómo ejecutarlo

Requisitos: Node ≥ 22.12 y [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # genera dist/
pnpm verify     # formato + lint + tipos + EXIF + build
```

## Estructura

```
src/
  config/      datos del sitio y de la persona (única fuente de verdad)
  layouts/     plantillas base
  pages/       rutas: / (es) y /en/ (en)
  assets/      medios optimizados (fotos AVIF/WebP, sin EXIF)
public/        favicon, robots.txt…
scripts/       optimize-images.mjs, check-exif.mjs
_originals/    originales sin optimizar (gitignored, nunca se suben)
.githooks/     pre-commit (EXIF, formato, lint)
```

## Imágenes y privacidad

Deja las fotos originales en `_originals/photos/` y ejecuta `pnpm images`: genera AVIF/WebP responsive
**sin EXIF ni GPS**. `pnpm check:exif` (también en el hook y en CI) falla si se cuela alguna con metadatos.
La web no usa cookies ni analítica.

## Despliegue

Previsto en Cloudflare Pages (build: `pnpm build`, salida: `dist/`). _[TODO fase 7]_

## Licencias y créditos

- **Código:** [MIT](LICENSE).
- **Contenido** (textos, fotos, avatar, mascota, iconos, diseño): todos los derechos reservados, ver
  [LICENSE-CONTENT.md](LICENSE-CONTENT.md).
- **Terceros:** [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
