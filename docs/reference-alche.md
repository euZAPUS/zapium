# Referencia: alche.studio (análisis propio, solo ideas)

Analizada el 2026-10-05 renderizándola en Chromium (espejo local de solo lectura) y leyendo sus recursos públicos.
**No se copia código ni recursos** (son suyos y tienen derechos): aquí solo quedan las ideas y mecánicas,
que se reimplementan desde cero con el estilo propio (la patata, línea fina y neutros).

## Cómo está hecha (stack visible)

Astro · GSAP (+ ScrollTrigger, SplitText, Flip) · Lenis · Swup (transiciones de página) · WebGL con shaders propios
(OGL/three) · un único `scene.glb` · animaciones Lottie (carga y salida) · audio mp3 por sección · vídeos mp4 ·
imágenes AVIF · tipografías Noto Sans JP (variable), IBM Plex Mono y Google Sans Code. JS principal ≈ 1,8 MB (sin comprimir).

## Qué hace (lo que se ve)

1. **Carga como plano arquitectónico:** fondo negro, líneas finísimas blancas que se dibujan formando el logo
   (guías, círculos, diagonales); texto en monoespaciada que se «descifra» letra a letra (caracteres aleatorios → frase).
2. **Aviso de sonido:** «Esta web tiene sonido, ¿activarlo?» con dos botones (con/sin sonido). Sonidos por sección y de tecleo.
3. **Un mundo 3D fijo a pantalla completa; el scroll mueve la cámara por él.** Hero: logo metálico/cromado con refracción,
   letras gigantes del nombre con trazos de pincel, paredes de cuadrícula de «pantallas». No hay «páginas»: hay _estancias_.
4. **Proyectos = pantallas curvas en 3D** (paneles cilíndricos) en carrusel; el activo grande al centro, los vecinos girados
   a los lados; título grande, fecha, etiquetas pequeñas (chips) y «More Works ↗».
5. **Cambio de estancia:** de mundo oscuro/cromado a mundo claro tipo plano (gris azulado, cruces `+` en cuadrícula,
   logo en línea blanca), con titulares japoneses en cajas negras de texto resaltado y subtítulo inglés pequeño.
6. **Chrome mínimo, técnico:** navegación pequeña en monoespaciada, botón «Contact / Recruit» en píldora fina,
   regla de marcas verticales a la izquierda con la sección actual (`TOP`, `WORKS`, `ABOUT`, `VISION`), «scroll to explore →».
7. **Detalles «de laboratorio»:** gizmo de cuaternión y paneles de parámetros (roughness, noiseScale, color) a la vista, como en un editor 3D.
8. **Transiciones de página** con Swup; imágenes de proyectos con distorsión/refracción suave.

## Qué nos llevamos (adaptado a «zapium»)

- **Carga con dibujo de líneas** (plano/blueprint) + texto que se descifra; luego cae la patata original.
- **Mundo WebGL fijo + scroll que mueve la cámara**, con estancias (hero, proyectos, sobre mí, IA, stack, contacto).
- **Proyectos como pantallas curvas en carrusel 3D**, con capturas/vídeos del autor como textura.
- **Contraste de estancias** oscuro ↔ claro «plano», con la regla de sección a la izquierda y chrome en monoespaciada.
- **Sonido opcional** (con aviso al entrar). Mejor sintetizado con Web Audio (sin ficheros ni licencias).
- **Sello propio:** la patata y el naranja como único color vivo, que el original no tiene.

## Riesgos / decisiones

- Rendimiento: el original pesa mucho. Para cumplir Lighthouse móvil ≥ 90, el mundo 3D completo solo en escritorio;
  móvil y `prefers-reduced-motion` con versión estática equivalente (hero actual + secciones normales).
- Todo el contenido tiene que seguir siendo accesible y legible sin WebGL (texto real en el DOM, no solo en el canvas).

## Segunda pasada (2026-10-06): cómo está hecha la sección «Works / Service» (solo ideas, nada copiado)

Se volvió a renderizar la web (espejo local) y se leyó su JS minificado (three.js). Lo que importa para imitar el efecto:

- **Capas separadas.** Un `Grid` (plano con rejilla y cruces `+`, `renderOrder` muy bajo), un **fondo «quad-tree»** (mosaico de baldosas que
  muestra la imagen/vídeo del trabajo activo **difuminada**, también al fondo) y, delante, las **miniaturas** como objetos 3D sueltos
  (una malla de pantalla de un `.glb`, con grosor). Las pantallas **no van pegadas** a la rejilla: se desplazan a otra velocidad
  (las cruces se mueven ~0,3 del scroll; las miniaturas ~0,95) → paralaje.
- **Pantallas:** ligeramente convexas (`z += cos(x)…`), con **distorsión de lente** y **aberración cromática** (cada canal con su distorsión;
  4 muestras), viñeta radial, reflejo de un cubemap y la **velocidad del scroll** mueve el UV (estela). Las vecinas se ven a los lados, giradas.
- **«Ola con doblez»** en la sección Service: grid y miniaturas comparten un shader con `z = -sin(x·π + …)·amplitud` (una S suave: izquierda cerca,
  derecha lejos); la amplitud entra con el scroll. La miniatura activa puede «abrirse» a pantalla casi completa mezclando su vértice con un quad.
- **Textos** (fecha, título grande ligero, subtítulo, etiquetas) **abajo a la izquierda**, «More Works ↗» abajo a la derecha, nav mono arriba,
  regla de secciones a la izquierda, gizmo y paneles de parámetros. Cargas con Lottie y carga por scroll.
- **Adaptación en zapium** (`Works.astro` / `works/scene.ts`): fondo = pared cilíndrica de baldosas por shader (sin geometría), paneles =
  planos subdivididos deformados en el vertex shader. Sin `.glb` ni Lottie.
