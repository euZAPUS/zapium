export {};
/** Tema claro/oscuro, menú móvil y enlace de CV deshabilitado. */
const root = document.documentElement;

// ── Tema ──────────────────────────────────────────────────────────────
const dark = matchMedia('(prefers-color-scheme: dark)');
const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : dark.matches);

const themeBtn = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
function syncThemeLabel() {
  if (!themeBtn) return;
  themeBtn.setAttribute(
    'aria-label',
    (isDark() ? themeBtn.dataset.labelToLight : themeBtn.dataset.labelToDark) ?? '',
  );
}
themeBtn?.addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  root.dataset.theme = next;
  try {
    localStorage.setItem('theme', next);
  } catch {
    /* sin almacenamiento: el cambio vale solo para esta visita */
  }
  syncThemeLabel();
});
dark.addEventListener('change', syncThemeLabel);
syncThemeLabel();

// ── Menú móvil ────────────────────────────────────────────────────────
const menuBtn = document.querySelector<HTMLButtonElement>('[data-menu-btn]');
const nav = document.querySelector<HTMLElement>('[data-nav]');
function setMenu(open: boolean) {
  if (!menuBtn || !nav) return;
  nav.toggleAttribute('data-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute(
    'aria-label',
    (open ? menuBtn.dataset.labelClose : menuBtn.dataset.labelOpen) ?? '',
  );
}
menuBtn?.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
nav?.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('a.nav__link')) setMenu(false);
});
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuBtn?.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menuBtn.focus();
  }
});

// ── CV: mientras no exista el PDF, el enlace no navega ────────────────
document.querySelectorAll<HTMLAnchorElement>('a[data-cv][aria-disabled="true"]').forEach((a) => {
  a.addEventListener('click', (e) => e.preventDefault());
});
