/**
 * Cursor: retícula técnica (anillo fino con marcas + punto naranja) que sigue al puntero.
 * El anillo crece sobre lo clicable y se encoge al pulsar; el clic lanza un «ping» (anillo que se
 * expande). Solo con puntero fino y sin prefers-reduced-motion; en táctil o con menos movimiento queda
 * el cursor nativo.
 * Rendimiento (el autor notó «input lag»): anillo y punto se colocan SÍNCRONAMENTE en el `pointermove`
 * (sin suavizado ni bucle de animación: cero retraso y cero coste en reposo).
 */
import { ping } from './ping';
import { hasFinePointer, prefersReducedMotion } from './tokens';

const root = document.querySelector<HTMLElement>('[data-cursor-root]');

if (root && hasFinePointer() && !prefersReducedMotion()) {
  const ring = root.querySelector<HTMLElement>('.cursor__ring');
  const dot = root.querySelector<HTMLElement>('.cursor__dot');
  const html = document.documentElement;

  addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      const t = `${e.clientX}px ${e.clientY}px`;
      if (ring) ring.style.translate = t; // `translate` (no `transform`): `scale` se compone bien con él
      if (dot) dot.style.translate = t;
      if (!html.classList.contains('has-cursor')) html.classList.add('has-cursor');
      const hot = (e.target as Element | null)?.closest('a, button, [data-cursor], summary, label');
      const state = hot ? 'link' : '';
      if (root.dataset.state !== state && root.dataset.state !== 'down') root.dataset.state = state;
    },
    { passive: true },
  );
  addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    root.dataset.state = 'down';
    ping(e.clientX, e.clientY, 64);
  });
  addEventListener('pointerup', () => (root.dataset.state = ''));
  document.addEventListener('mouseleave', () => html.classList.remove('has-cursor'));
}
