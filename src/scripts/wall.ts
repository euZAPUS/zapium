/**
 * La pared de proyectos (ProjectWall.astro).
 *  - Escritorio (sección fijada): el scroll vertical recorre la pared. Escribe en la sección
 *    `--hp` (0 → 1, avance lateral), `--ep` (entrada) y `--travel` (px a recorrer).
 *  - Móvil (deslizamiento nativo con scroll-snap): el avance sale de `scrollLeft`.
 *  - En ambos casos cada tarjeta recibe `--d` (−1…1 en los bordes de la pantalla): distancia de
 *    su centro al centro de la pantalla. El CSS la convierte en giro, profundidad y escala.
 *  - Ratón: el punto de fuga se mueve un poco y cada tarjeta se inclina hacia el puntero con
 *    un brillo que la sigue. Teclado: al enfocar una tarjeta fuera de plano, se desplaza hasta ella.
 * Con prefers-reduced-motion no hace nada (el CSS muestra una rejilla normal).
 */
export {};

const wall = document.querySelector<HTMLElement>('[data-wall]');
const calm = matchMedia('(prefers-reduced-motion: reduce)');

if (wall && !calm.matches) init(wall);

function init(wall: HTMLElement) {
  const stage = wall.querySelector<HTMLElement>('[data-wall-stage]');
  const rail = wall.querySelector<HTMLElement>('[data-wall-rail]');
  const list = wall.querySelector<HTMLElement>('[data-wall-cards]');
  if (!stage || !rail || !list) return;
  const cards = [...rail.querySelectorAll<HTMLElement>('[data-wall-card]')];
  // Misma condición que el @media de ProjectWall.astro
  const pin = matchMedia('(min-width: 60rem) and (min-height: 38rem)');
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  let centers: number[] = [];
  let travel = 0;
  let frame = 0;
  const last = new Map<HTMLElement, string>();

  function measure() {
    centers = cards.map((c) => c.offsetLeft + c.offsetWidth / 2);
    travel = pin.matches
      ? Math.max(0, rail!.scrollWidth - innerWidth)
      : Math.max(0, list!.scrollWidth - list!.clientWidth);
    wall.style.setProperty('--travel', `${travel}px`);
  }

  function update() {
    frame = 0;
    let offset: number;
    let half: number;
    if (pin.matches) {
      const r = wall.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) return; // fuera de pantalla: nada que hacer
      const total = r.height - innerHeight;
      const hp = total > 0 ? clamp(-r.top / total, 0, 1) : 0;
      wall.style.setProperty('--hp', hp.toFixed(4));
      wall.style.setProperty('--ep', clamp(1 - r.top / innerHeight, 0, 1).toFixed(4));
      offset = hp * travel;
      half = innerWidth / 2;
    } else {
      offset = list!.scrollLeft;
      half = list!.clientWidth / 2;
    }
    cards.forEach((card, i) => {
      // Zona muerta en el centro: la tarjeta que ocupa el medio se ve plana
      const raw = ((centers[i] ?? 0) - offset - half) / half;
      const dz = Math.sign(raw) * Math.max(0, Math.abs(raw) - 0.14);
      const d = clamp(dz, -1.5, 1.5).toFixed(3);
      if (last.get(card) !== d) {
        last.set(card, d);
        card.style.setProperty('--d', d);
      }
    });
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  const relayout = () => {
    measure();
    schedule();
  };
  measure();
  update();
  addEventListener('scroll', schedule, { passive: true });
  list.addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', relayout, { passive: true });
  pin.addEventListener('change', () => {
    // Al cambiar de modo se limpian las variables del otro
    wall.style.removeProperty('--hp');
    wall.style.removeProperty('--ep');
    last.clear();
    relayout();
  });
  document.fonts.ready.then(relayout);
  const ro = new ResizeObserver(relayout);
  ro.observe(rail);
  ro.observe(list);

  // ── Ratón: punto de fuga + inclinación de cada tarjeta ──
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    stage.addEventListener(
      'pointermove',
      (e) => {
        if (!pin.matches) return;
        stage.style.setProperty('--mx', ((e.clientX / innerWidth) * 2 - 1).toFixed(3));
        stage.style.setProperty('--my', ((e.clientY / innerHeight) * 2 - 1).toFixed(3));
      },
      { passive: true },
    );
    for (const card of cards) {
      const face = card.querySelector<HTMLElement>('.pcard__face');
      if (!face || card.classList.contains('pcard--hero')) continue; // el destacado lleva vídeo: sin inclinar
      face.addEventListener('pointermove', (e) => {
        const b = face.getBoundingClientRect();
        const x = (e.clientX - b.left) / b.width;
        const y = (e.clientY - b.top) / b.height;
        face.style.setProperty('--ry', `${((x - 0.5) * 14).toFixed(2)}deg`);
        face.style.setProperty('--rx', `${((0.5 - y) * 12).toFixed(2)}deg`);
        face.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
        face.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
        face.style.setProperty('--glare', '1');
      });
      face.addEventListener('pointerleave', () => {
        face.style.removeProperty('--rx');
        face.style.removeProperty('--ry');
        face.style.setProperty('--glare', '0');
      });
    }
  }

  // ── Teclado: enfocar una tarjeta que está fuera de plano recoloca el scroll ──
  wall.addEventListener('focusin', (e) => {
    if (!pin.matches) return; // en móvil el navegador ya desplaza el carril nativo
    const card = (e.target as HTMLElement).closest<HTMLElement>('[data-wall-card]');
    if (!card || !travel) return;
    const b = card.getBoundingClientRect();
    if (b.left >= 0 && b.right <= innerWidth) return; // ya se ve entera
    const wanted = clamp((centers[cards.indexOf(card)] ?? 0) - innerWidth / 2, 0, travel);
    const r = wall.getBoundingClientRect();
    const total = r.height - innerHeight;
    scrollTo({ top: scrollY + r.top + (wanted / travel) * total });
  });
}
