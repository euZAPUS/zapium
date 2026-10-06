/**
 * Coreografía de las secciones con scroll:
 *  - `--hp` (carril horizontal de «Sobre mí») = progreso 0 → 1;
 *  - `--travel` = px que debe avanzar el carril horizontal;
 *  - vídeos de «prueba»: solo se reproducen mientras están en pantalla (mudos, en bucle);
 *  - correo: se monta en el navegador (no aparece en claro en el HTML) y se puede copiar.
 * Con prefers-reduced-motion los vídeos se quedan en su póster.
 */
export {};

const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const tracks = [...document.querySelectorAll<HTMLElement>('[data-track]')];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function measure() {
  for (const t of tracks) {
    const rail = t.querySelector<HTMLElement>('[data-track-rail]');
    if (!rail) continue;
    t.style.setProperty('--travel', `${Math.max(0, rail.scrollWidth - innerWidth)}px`);
  }
}

let frame = 0;
function update() {
  frame = 0;
  for (const el of tracks) {
    const r = el.getBoundingClientRect();
    const total = r.height - innerHeight;
    el.style.setProperty('--hp', (total > 0 ? clamp01(-r.top / total) : 0).toFixed(4));
  }
}
const schedule = () => {
  if (!frame) frame = requestAnimationFrame(update);
};

if (tracks.length) {
  measure();
  update();
  addEventListener('scroll', schedule, { passive: true });
  addEventListener(
    'resize',
    () => {
      measure();
      schedule();
    },
    { passive: true },
  );
  document.fonts.ready.then(() => {
    measure();
    schedule();
  });
  for (const t of tracks) {
    const rail = t.querySelector('[data-track-rail]');
    if (rail) new ResizeObserver(() => (measure(), schedule())).observe(rail);
  }
}

// ── Vídeos: solo mientras se ven ──
const videos = document.querySelectorAll<HTMLVideoElement>('[data-proof-video]');
if (videos.length && !calm) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const v = e.target as HTMLVideoElement;
        if (e.isIntersecting) {
          v.preload = 'auto';
          v.play().catch(() => undefined);
        } else v.pause();
      }
    },
    { threshold: 0.2 },
  );
  videos.forEach((v) => io.observe(v));
}

// ── Correo ──
const mail = document.querySelector<HTMLAnchorElement>('[data-email]');
if (mail) {
  const address = `${mail.dataset.user}@${mail.dataset.domain}`;
  mail.href = `mailto:${address}`;
  const text = mail.querySelector('[data-email-text]');
  if (text) text.textContent = address;
  const copy = document.querySelector<HTMLButtonElement>('[data-copy-email]');
  if (copy && navigator.clipboard) {
    copy.hidden = false;
    const label = copy.textContent;
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(address);
        copy.textContent = copy.dataset.copied ?? '✓';
        setTimeout(() => (copy.textContent = label), 1600);
      } catch {
        /* sin permiso de portapapeles: la dirección queda visible y seleccionable en el enlace */
      }
    });
  }
}
