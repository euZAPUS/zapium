# Avisos de terceros / Third-party notices

Última verificación: 2026-10-07. Las licencias se leen del propio paquete o repositorio, no de memoria.
Este archivo se actualiza cada vez que se añade o quita una dependencia que llega al navegador
(ver CLAUDE.md).

## Que llegan al navegador (runtime)

| Librería / recurso                                             | Versión            | Licencia                                                                            | Estado                                   | Notas                                                    |
| -------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------- |
| [OGL](https://github.com/oframe/ogl)                           | 1.0.11             | Unlicense (dominio público)                                                         | **En uso** (hero WebGL, import dinámico) | Declarado en `package.json` y README del paquete.        |
| [Inter](https://github.com/rsms/inter) (fuente, subset latino) | 5.3.0 (Fontsource) | SIL OFL 1.1 © 2016 The Inter Project Authors                                        | **En uso**                               | Texto: [licenses/OFL-Inter.txt](licenses/OFL-Inter.txt). |
| [GSAP](https://gsap.com) (+ ScrollTrigger, Flip)               | 3.15.0             | GreenSock «Standard "no charge" license» (propietaria, **no es de código abierto**) | Prevista (fases 3-4)                     | Ver nota GSAP abajo.                                     |
| [Lenis](https://github.com/darkroomengineering/lenis)          | 1.3.26             | MIT © darkroom.engineering                                                          | Prevista (fase 3)                        | Texto leído de `LICENSE` del paquete.                    |

### Demos compiladas (`public/demos/*/*.html`)

Cada demo es el **código de mi propia app** (todos los derechos reservados, ver `LICENSE-CONTENT.md`) compilado en UN archivo HTML
con todo inline. Un bundle minificado no conserva los avisos de sus dependencias, así que se dejan aquí. Datos leídos de los
`package.json`/`LICENSE` instalados y del lockfile de cada proyecto, **verificados el 2026-10-07** por la sesión que construyó cada app.

#### Zapper Huerto (`public/demos/huerto/huerto.html`, ~888 KB, SHA-256 `407c116b…7dd0`)

| Componente (dependencia)                                         | Versión | Licencia | Copyright                                      |
| ---------------------------------------------------------------- | ------- | -------- | ---------------------------------------------- |
| react, react-dom, scheduler (dependencia de react-dom: 0.28.0)   | 19.3.0  | MIT      | Copyright (c) Meta Platforms, Inc. y afiliados |
| zustand                                                          | 5.0.15  | MIT      | Copyright (c) 2019 Paul Henschel               |
| motion, motion-dom, motion-utils                                 | 14.0.0  | MIT      | Copyright (c) 2024 Motion B.V.                 |
| framer-motion (dependencia de motion)                            | 14.0.0  | MIT      | Copyright (c) 2018 Framer B.V.                 |
| tailwindcss (solo su CSS base y utilidades; no hay código en JS) | 4.3.3   | MIT      | Copyright (c) Tailwind Labs, Inc.              |

Sin fuentes propias (usa las del sistema), sin sonidos (síntesis Web Audio) y con iconos SVG propios. Una imagen de montaña dentro del
CSS (Liquid Glass y Cristal): dibujo propio generado por script, sin licencia de terceros. `perfect-freehand` (MIT) es dependencia de
la app de escritorio, pero **no** va en esta demo.

#### Zapped (`public/demos/zapped/zapped.html`, ~511 KB)

Sin dependencias de runtime en la web. Lo único de terceros son **fuentes** (latin 400/700; Space Grotesk 400/500/700), sin modificar, tal
como las distribuye Fontsource (5.3.0), todas **SIL OFL 1.1**: JetBrains Mono (© 2020 The JetBrains Mono Project Authors), Fira Code
(© 2014-2020 The Fira Code Project Authors), IBM Plex Mono (© 2017 IBM Corp.), Space Mono (© 2016 The Space Mono Project Authors), Space
Grotesk (© 2020 The Space Grotesk Project Authors), Source Code Pro (© 2010, 2012, 2014 Adobe Systems Incorporated, con el nombre de fuente
reservado «Source»), Roboto Mono (© 2015 The Roboto Mono Project Authors) e Inconsolata (© 2006 The Inconsolata Project Authors). El
aviso completo y el texto íntegro de la OFL **van dentro de la demo** (botón «Third-party licenses»). Iconos SVG y sonidos propios.

#### ZAP Arcade (`public/demos/arcade/arcade.html`, ~415 KB)

Sin librerías ni motor (JS propio). Terceros: dos fuentes **SIL OFL 1.1** incrustadas (subconjunto latin, woff2, vía Fontsource 5.3.0):
Silkscreen (© 2001 The Silkscreen Project Authors) y JetBrains Mono (© 2020 The JetBrains Mono Project Authors). Aviso y texto de la OFL en
el propio HTML y en [`public/demos/arcade/THIRD_PARTY_LICENSES.txt`](public/demos/arcade/THIRD_PARTY_LICENSES.txt). Sprites (matrices de
píxeles en código), sonidos (Web Audio) e iconos: obra propia.

#### Texto de la licencia MIT (aplica a las dependencias MIT de la tabla de Zapper Huerto, con su copyright respectivo)

> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the
> "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish,
> distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject
> to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
> MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
> FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
> WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

Las licencias de las fuentes de la propia web se leyeron de los archivos `LICENSE` de cada paquete (campo `license`: OFL-1.1).
Las fuentes se sirven desde el propio dominio (self-hosted) y el texto de la OFL se conserva en `licenses/`.

### Nota sobre GSAP

- GSAP **no es MIT**. El campo `license` del paquete npm y la cabecera de cada archivo remiten a
  <https://gsap.com/standard-license>. El repositorio oficial no incluye un archivo `LICENSE`.
- **Verificación pendiente:** al preparar este documento el sitio `gsap.com` no era accesible desde el
  entorno de desarrollo, así que **no se ha podido leer el texto completo** de esa licencia. Antes de
  publicar (fase 7) hay que leerla y confirmar que este uso (web de portfolio personal, plugins
  ScrollTrigger y Flip incluidos) está cubierto, y anotar aquí las condiciones exactas.
- GSAP **no se copia** al repositorio: se instala como dependencia npm, por lo que la licencia MIT del
  código propio no se ve afectada.

## Solo en desarrollo / build (no se distribuyen)

| Herramienta                                             | Licencia                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Astro, @astrojs/sitemap, @astrojs/check                 | MIT                                                                             |
| TypeScript 6                                            | Apache-2.0                                                                      |
| ESLint, typescript-eslint, eslint-plugin-astro, globals | MIT                                                                             |
| Prettier, prettier-plugin-astro                         | MIT                                                                             |
| sharp                                                   | Apache-2.0 (incluye binarios de libvips, LGPL-3.0, solo en la máquina de build) |

## Recursos gráficos, vídeo y sonido

Ninguno de terceros por ahora. Los iconos, la mascota y las ilustraciones son obra propia y
están bajo [LICENSE-CONTENT.md](LICENSE-CONTENT.md). No se usan logotipos ni personajes de marcas
existentes (ni de empresas, ni de centros de estudio).
