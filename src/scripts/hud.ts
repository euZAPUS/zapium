export {};
/** Regla lateral: marca de progreso del scroll y nombre de la sección actual. */
const hud = document.querySelector<HTMLElement>('[data-hud]');

if (hud) {
  const labels: Record<string, string> = JSON.parse(hud.dataset.labels ?? '{}');
  const label = hud.querySelector<HTMLElement>('[data-hud-label]');
  const ids = ['top', 'projects', 'about', 'ai', 'stack', 'lab', 'contact'];
  const sections = ids
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => !!el);
  let frame = 0;

  const update = () => {
    frame = 0;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    hud.style.setProperty('--p', String(Math.min(1, Math.max(0, scrollY / max))));
    let current = sections[0];
    for (const s of sections) if (s.getBoundingClientRect().top <= innerHeight * 0.4) current = s;
    const text = current ? (labels[current.id] ?? '') : '';
    if (label && label.textContent !== text) label.textContent = text;
  };
  addEventListener(
    'scroll',
    () => {
      if (!frame) frame = requestAnimationFrame(update);
    },
    { passive: true },
  );
  addEventListener('resize', update, { passive: true });
  update();
}
