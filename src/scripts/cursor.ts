/**
 * Cursor: una mano naranja (como la patata) pegada al puntero, con un pequeño resplandor y una
 * estela discreta de destellos. Se inclina según la velocidad, crece sobre lo clicable y se encoge
 * al pulsar. Solo con puntero fino y sin prefers-reduced-motion; en táctil o con menos movimiento
 * queda el cursor nativo.
 * Rendimiento (el autor notó «input lag»): la mano y el resplandor se colocan SÍNCRONAMENTE en el
 * `pointermove` (sin suavizado: cero retraso); el bucle de animación solo calcula la inclinación y
 * se apaga solo cuando el puntero se queda quieto. La estela suelta pocas chispas.
 */
import { burst, trail } from './fx';
import { hasFinePointer, prefersReducedMotion } from './tokens';

const root = document.querySelector<HTMLElement>('[data-cursor-root]');

if (root && hasFinePointer() && !prefersReducedMotion()) {
  const glow = root.querySelector<HTMLElement>('.cursor__glow');
  const hand = root.querySelector<HTMLElement>('.cursor__hand');
  const html = document.documentElement;
  let x = innerWidth / 2;
  let y = innerHeight / 2;
  let px = x; // posición en el fotograma anterior (para la velocidad)
  let tilt = 0;
  let trailDist = 0;
  let lastX = x;
  let lastY = y;
  let raf = 0;
  let still = 0; // fotogramas seguidos sin movimiento

  const place = () => {
    const t = `${x}px ${y}px`;
    if (hand) hand.style.translate = t; // `translate` (no `transform`): rotate/scale se componen bien con él
    if (glow) glow.style.translate = t;
  };

  const loop = () => {
    const vx = x - px;
    px = x;
    tilt += (Math.max(-18, Math.min(18, vx * 0.8)) - tilt) * 0.3;
    if (hand) hand.style.rotate = `${tilt.toFixed(1)}deg`;
    still = Math.abs(vx) < 0.1 && Math.abs(tilt) < 0.2 ? still + 1 : 0;
    raf = still > 20 ? 0 : requestAnimationFrame(loop); // sin movimiento, el bucle se apaga
  };
  const wake = () => {
    if (!raf) raf = requestAnimationFrame(loop);
  };

  addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX;
      y = e.clientY;
      if (!html.classList.contains('has-cursor')) {
        px = lastX = x;
        lastY = y;
        html.classList.add('has-cursor');
      }
      place();
      wake();
      const d = Math.hypot(x - lastX, y - lastY);
      trailDist += d;
      lastX = x;
      lastY = y;
      if (trailDist > 56) {
        trailDist = 0;
        trail(x, y);
      }
      const hot = (e.target as Element | null)?.closest('a, button, [data-cursor], [data-doodle]');
      const state = hot ? 'link' : '';
      if (root.dataset.state !== state && root.dataset.state !== 'down') root.dataset.state = state;
    },
    { passive: true },
  );
  addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    root.dataset.state = 'down';
    burst(e.clientX, e.clientY, 7, 0.7);
  });
  addEventListener('pointerup', () => (root.dataset.state = ''));
  document.addEventListener('mouseleave', () => html.classList.remove('has-cursor'));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  });
}

// En táctil no hay mano: cada toque suelta una pequeña ráfaga de chispas
if (!hasFinePointer() && !prefersReducedMotion()) {
  addEventListener(
    'pointerdown',
    (e) => {
      if (e.pointerType === 'mouse') return;
      burst(e.clientX, e.clientY, 7, 0.6);
    },
    { passive: true },
  );
}
