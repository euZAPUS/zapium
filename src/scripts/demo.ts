/**
 * Demos jugables (DemoDialog.astro). El iframe NO existe hasta que se pulsa el botón y se
 * destruye al cerrar (se para el temporizador y el WebGL de la demo). Va con
 * `sandbox="allow-scripts …"` sin `allow-same-origin`: origen opaco, sin acceso a esta página.
 * `allow-popups*` solo para el enlace «Descargar» de la demo (abre una pestaña normal).
 */
export {};

const dialog = document.querySelector<HTMLDialogElement>('[data-demo-dialog]');
const body = dialog?.querySelector<HTMLElement>('[data-demo-body]');

if (dialog && body) {
  let opener: HTMLElement | null = null;

  const open = (from: HTMLElement) => {
    opener = from;
    const frame = document.createElement('iframe');
    frame.src = dialog.dataset.src ?? '';
    frame.title = dialog.dataset.title ?? '';
    frame.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox');
    frame.referrerPolicy = 'no-referrer';
    body.replaceChildren(frame);
    document.documentElement.classList.add('is-demo');
    dialog.showModal();
  };

  const clear = () => {
    body.replaceChildren();
    document.documentElement.classList.remove('is-demo');
    opener?.focus();
  };

  document.querySelectorAll<HTMLElement>('[data-demo-open]').forEach((b) => {
    b.addEventListener('click', () => open(b));
  });
  dialog.querySelector('[data-demo-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', clear); // Esc, botón o dialog.close()
  // Clic en el fondo oscuro (fuera del cuadro) = cerrar
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
}
