/** La mirada de la patata sigue al cursor (suave, solo con puntero fino). */
import { hasFinePointer, prefersReducedMotion } from './tokens';

const potatoes = document.querySelectorAll<SVGElement>('.hero__potato[data-potato]');

if (potatoes.length && hasFinePointer() && !prefersReducedMotion()) {
  addEventListener(
    'pointermove',
    (e) => {
      for (const p of potatoes) {
        const r = p.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / innerWidth;
        const dy = (e.clientY - (r.top + r.height / 2)) / innerHeight;
        p.style.setProperty('--look-x', String(Math.max(-1, Math.min(1, dx * 2.4))));
        p.style.setProperty('--look-y', String(Math.max(-1, Math.min(1, dy * 2.4))));
      }
    },
    { passive: true },
  );
}
