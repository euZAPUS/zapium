# Notas de contenido (fuente: el propio autor)

Material en bruto para redactar las secciones (fase 2) y el CV. **No añadir nada que no esté aquí o que el autor
no confirme.** Lo ambiguo va marcado con ❓ para preguntar.

## Identidad

- Nombre: Álvaro Sánchez · alias/GitHub: euZAPUS (<https://github.com/euZAPUS>)
- Estudia: **Campus 42** (programación) y **DigiTech, 1.º de ASIR**.
- LinkedIn: no tiene todavía. CV: lo redactaremos juntos con esta info.
- Idiomas: español nativo; inglés que él considera **C1 sin titulación** → decir «inglés C1 (autoevaluado)», no «certificado».
- Contacto provisional: el email de `src/config/site.ts` (cambiará al del dominio propio).

## Proyecto principal: Zapper AIO (<https://github.com/euZAPUS/zapper-aio>)

Datos extraídos del README/docs públicos del repo (no inventados):

- App personal «todo en uno» de escritorio (Windows y Linux): **hoy**, notas, tareas, calendario, horario, asignaturas,
  foco con huerto de plantas 3D, hábitos y recordatorios. Local-first, privada, sin suscripciones.
- Sincronización cifrada entre equipos con un repositorio privado de GitHub del propio usuario.
- Stack: Tauri 2 (Rust), React + TypeScript, Tailwind, Vite; lógica separada en `packages/core` con tests. **Sin SQLite** (verificado 2026-10-07: la persistencia es `localStorage` + `zapper-data.json`; el README antiguo lo decía mal).
- 20 temas, huerto en 3D de plantas hechas de cubitos (vóxeles) que crecen según el tiempo de foco, paleta de comandos `Ctrl+K`.
- Descargas: <https://github.com/euZAPUS/zapper-aio-releases/releases/latest> · licencia: todos los derechos reservados (código visible).
- ❓ Estado real de la app (versión publicada, qué falta), rol exacto en el desarrollo y qué parte hizo la IA / cuál revisó él
  (para «Cómo trabajo con IA»). Vídeo o mini demo: necesita backend/app de escritorio → **vídeo**, no iframe.

## Experiencia previa — proyectos personales y de aprendizaje, NO experiencia laboral

- **Dropshipping:** aprendió a usar varias aplicaciones del nicho para montar una buena tienda en **Shopify**; intentó vender
  un **secador de pelo para mujeres**: investigó, creó animaciones, recortó la imagen «mil veces», hizo distintos modelos.
  ❓ Resultado (ventas, gasto): no lo ha dicho → **no afirmar ninguno**; contarlo como aprendizaje.
- **Trading:** **+2.000 € en una cuenta de _paper trading_ de 100.000 €** (≈ 2 %). Es dinero **simulado**: la web debe decir
  «paper trading (simulado)» de forma explícita. ❓ Periodo de tiempo y estrategia.
- **YouTube con IA:** el autor lo **descartó** («no renta»): se quitó de la web (muro de proyectos y «Sobre mí»). No volver a ponerlo.
- **IA:** mencionada como experiencia; el detalle va en «Cómo trabajo con IA».

## Estudios

- **42:** (2026-10-07) el autor acaba de empezar; **no mostrar proyectos de 42 (Libft…) ni enlazar el repo `Campus42`** (filtración + muy básico). En la web solo «estudiante en Campus 42, acabo de empezar». Objetivos del curso: shell de Linux, GitHub, programar en **C**,
  trabajar en equipo, respeto.
- **ASIR (1.º, DigiTech):** redes/IP, HTML, «cosas» más. ❓ Asignaturas concretas para listarlas bien.

## Ideas del autor para la web

- Cursor con **mano** que sigue al puntero con resplandores; scroll que entra en **portales** (hero ya tiene opción portal).
- **Mascota = su patata** con **sombreritos** que cambian de mood (vendedor para dropshipping, logo de Zapper AIO, etc.)
  y que **guía** por el portfolio. Easter eggs y animaciones escondidas, tema claro/oscuro, iconos SVG a medida.
- Traducir al inglés también las frases hechas y los chistes.

## Referencias visuales (reels de Instagram del autor)

- <https://www.instagram.com/reel/DdhcSJ7IHlZ/> y <https://www.instagram.com/reel/DaqsZgFxUcP/>
- <https://alche.studio/> — «bro, esto» (el autor la señala como referencia clave).
- **No se han podido ver** (Instagram y alche.studio bloqueados en el entorno de desarrollo). Pendiente: que el autor describa o capture
  los efectos concretos que le gustan.

## Decisiones del autor (ronda 3)

- **Oscuro por defecto.** «Factory grid» de la referencia para la home, con el toque amigable de la carga.
- **Sonido sí, minimalista:** rueda antiestrés de clics rápidos e inmolestos al hacer scroll + clic sutil pero notorio y placentero.
- **Animación 3D de la patata «como un tutorial»:** se mueve y gira por la pantalla resumiendo lo que ha hecho.
- **Vídeos de fondo desenfocados** de lo que ha hecho (p. ej. usando Zapper AIO) con el «real» delante. **Pendiente: que el autor aporte los vídeos.**
- **La carga se controla con scroll.** «Vista de Blender» sí (gizmo/HUD); patata 3D modelada **descartada**.
- Quiere recibir **una tarjeta clicable** tras cada entrega para probar la web (Artifact).

## Ronda 4 (2026-10-07): material de las sesiones de cada app (verificado con sus repos)

**Zapper AIO** (repo privado; enlazar solo `zapper-aio-releases`): v0.11.0 (6 oct), 363 pruebas del núcleo (+8 de Rust), CI que ejecuta las pruebas, **sin lint**, Windows
(instalador NSIS, portátil) y Linux (AppImage, .deb), **sin macOS**, 20 temas (todos oscuros), paleta Ctrl+K, sincronización AES-256-GCM + PBKDF2-SHA256 (600 000 iteraciones),
actualizador propio con SHA-256. «3D» = plantas de cubitos en isométrica con **Canvas 2D** (no WebGL). Licencia propietaria. 58 commits en 3 días: 47 con autor «Claude», 11 «euZAPUS», todos con
`Co-Authored-By`. ⚠️ **Pendiente del autor:** (1) la app incluye en `presets/asir1.ts` el **nombre real del tutor de la clase** (tercero) y va dentro de los binarios públicos: quitarlo y publicar
una versión nueva; la sesión de Zapper se ofreció a hacerlo; (2) el Horario viene bloqueado a la plantilla de ASIR1 en las builds publicadas (no decir que cada persona monta el suyo).

**Zapped** (público `euZAPUS/zapped`): v1.0.2, test de mecanografía inspirado en Monkeytype (web estática + Electron), modos tiempo/palabras/código/texto propio, 8 temas, **no hay selector de
distribución de teclado**, interfaz solo en español (la demo trae un traductor EN del DOM; la búsqueda de la barra de comandos sigue en español), 38 tests, TypeScript 7 + Vite 8 + Vitest 5 +
Electron 44. Licencia «todos los derechos reservados» (código visible). La demo online del README da 404 (GitHub Pages sin activar): **activarla** o no enlazarla. Vídeo promo ya integrado (carrusel + tráiler). ⚠️ El vídeo muestra **cifras de ejemplo** (148 ppm, perfil «Ada Lovelace»): la tarjeta lo avisa («las cifras del vídeo son de ejemplo»).

**ZAP Arcade** (repo público **`euZAPUS/retro-zapp`**, carpeta `demos/arcade/`): 13 juegos, **51 modos**, 45 logros, perfil con récords/XP, HTML+CSS+JS plano + Canvas 2D + Web Audio (0 librerías),
Electron 44 para escritorio, v1.0.2. En `main` **no hay `LICENSE`** (la rama sin fusionar sí) y no hay tests ni CI de calidad. No hay versión jugable online (404 en Pages). Los récords y capturas del
material salen de bots: no presentarlos como marcas personales.
