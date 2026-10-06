/**
 * Demos jugables (DemoDialog.astro). Al pulsar el botón se descarga el HTML ÚNICO de la demo (todo
 * inline, sin más peticiones) y se inyecta en un <iframe srcdoc> con
 * `sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"`, SIN `allow-same-origin`:
 * origen opaco, sin acceso a esta página. Por qué srcdoc y no `src`: así la demo no necesita pedir
 * ningún archivo (un iframe con sandbox no lleva cookies, y en sitios protegidos —como la vista previa
 * privada— sus peticiones fallan). El iframe no existe hasta el clic y se destruye al cerrar (se
 * para el temporizador y el WebGL de la demo).
 * Idioma: la demo lee `?lang=` de `location.search`, que en srcdoc está vacío; se le pasa el de la página.
 */
export {};

const dialog = document.querySelector<HTMLDialogElement>('[data-demo-dialog]');
const body = dialog?.querySelector<HTMLElement>('[data-demo-body]');

if (dialog && body) {
  let opener: HTMLElement | null = null;
  let run = 0; // cada apertura/cierre invalida la carga anterior

  const message = (text: string | undefined) => {
    const p = document.createElement('p');
    p.className = 'demo__msg';
    p.textContent = text ?? '';
    return p;
  };

  const open = async (from: HTMLElement) => {
    opener = from;
    const mine = ++run;
    body.replaceChildren(message(dialog.dataset.loading));
    document.documentElement.classList.add('is-demo');
    dialog.showModal();
    try {
      const res = await fetch(dialog.dataset.src ?? '', { credentials: 'same-origin' });
      if (!res.ok) throw new Error(String(res.status));
      let html = await res.text();
      if (mine !== run) return; // se cerró (o se reabrió) mientras cargaba
      const lang = dialog.dataset.lang ?? 'es';
      html = html.replace(
        'new URLSearchParams(location.search)',
        `new URLSearchParams(${JSON.stringify(`?lang=${lang}`)})`,
      );
      const frame = document.createElement('iframe');
      frame.title = dialog.dataset.title ?? '';
      frame.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox');
      frame.referrerPolicy = 'no-referrer';
      frame.srcdoc = html;
      body.replaceChildren(frame);
    } catch (err) {
      console.warn('[demo] no se pudo cargar', err);
      if (mine === run) body.replaceChildren(message(dialog.dataset.error));
    }
  };

  const clear = () => {
    run++;
    body.replaceChildren();
    document.documentElement.classList.remove('is-demo');
    opener?.focus();
  };

  document.querySelectorAll<HTMLElement>('[data-demo-open]').forEach((b) => {
    b.addEventListener('click', () => void open(b));
  });
  dialog.querySelector('[data-demo-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', clear); // Esc, botón o dialog.close()
  // Clic en el fondo oscuro (fuera del cuadro) = cerrar
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
}
