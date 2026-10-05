# Avisos de terceros / Third-party notices

Última verificación: 2026-10-05. Las licencias se leen del propio paquete o repositorio, no de memoria.
Este archivo se actualiza cada vez que se añade o quita una dependencia que llega al navegador
(ver CLAUDE.md).

## Que llegan al navegador (runtime)

| Librería / recurso                                                                       | Versión            | Licencia                                                                            | Estado                                   | Notas                                                                              |
| ---------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------- |
| [OGL](https://github.com/oframe/ogl)                                                     | 1.0.11             | Unlicense (dominio público)                                                         | **En uso** (hero WebGL, import dinámico) | Declarado en `package.json` y README del paquete.                                  |
| [Bricolage Grotesque](https://github.com/ateliertriay/bricolage) (fuente, subset latino) | 5.3.0 (Fontsource) | SIL OFL 1.1 © 2022 The Bricolage Grotesque Project Authors                          | **En uso**                               | Texto: [licenses/OFL-BricolageGrotesque.txt](licenses/OFL-BricolageGrotesque.txt). |
| [Inter](https://github.com/rsms/inter) (fuente, subset latino)                           | 5.3.0 (Fontsource) | SIL OFL 1.1 © 2016 The Inter Project Authors                                        | **En uso**                               | Texto: [licenses/OFL-Inter.txt](licenses/OFL-Inter.txt).                           |
| [GSAP](https://gsap.com) (+ ScrollTrigger, Flip)                                         | 3.15.0             | GreenSock «Standard "no charge" license» (propietaria, **no es de código abierto**) | Prevista (fases 3-4)                     | Ver nota GSAP abajo.                                                               |
| [Lenis](https://github.com/darkroomengineering/lenis)                                    | 1.3.26             | MIT © darkroom.engineering                                                          | Prevista (fase 3)                        | Texto leído de `LICENSE` del paquete.                                              |

Las licencias de las fuentes se leyeron de los archivos `LICENSE` de cada paquete (campo `license`: OFL-1.1).
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
