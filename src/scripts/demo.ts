/**
 * Demos jugables y tráilers (DemoDialog.astro + DemoButton.astro). Un único <dialog> compartido:
 *  - `data-kind="page"`: al pulsar el botón se descarga el HTML ÚNICO de la demo (todo inline, sin más peticiones)
 *    y se inyecta en un <iframe srcdoc> con `sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"`,
 *    SIN `allow-same-origin`: origen opaco, sin acceso a esta página. Por qué srcdoc y no `src`: así la demo no
 *    necesita pedir ningún archivo (un iframe con sandbox no lleva cookies, y en sitios protegidos —como la vista
 *    previa privada— sus peticiones fallan). El iframe no existe hasta el clic y se destruye al cerrar (se paran
 *    el temporizador, los bucles y el audio de la demo).
 *    Idioma: las demos leen `lang` de `new URLSearchParams(location.search)`, vacío en srcdoc: se sustituye por
 *    el idioma de la página. Al cargar, el iframe recibe el foco (para escribir/jugar sin hacer clic antes).
 *  - `data-kind="video"`: tráiler con sonido (public/trailers/NOMBRE.webm|mp4), con controles; se descarga al pulsar.
 */
export {};

const dialog = document.querySelector<HTMLDialogElement>('[data-demo-dialog]');
const body = dialog?.querySelector<HTMLElement>('[data-demo-body]');
const titleEl = dialog?.querySelector<HTMLElement>('[data-demo-title]');
const noteEl = dialog?.querySelector<HTMLElement>('[data-demo-note]');

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
    const d = from.dataset;
    const kind = d.kind === 'video' ? 'video' : 'page';
    dialog.dataset.kind = kind;
    if (titleEl) titleEl.textContent = d.title ?? '';
    if (noteEl) noteEl.textContent = d.note ?? '';
    document.documentElement.classList.add('is-demo');

    if (kind === 'video') {
      const video = document.createElement('video');
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      video.preload = 'auto';
      if (d.poster) video.poster = d.poster;
      // `src` es la ruta sin extensión: WebM (VP9 + Opus) y MP4 (H.264 + AAC) como alternativas
      for (const [ext, type] of [
        ['webm', 'video/webm'],
        ['mp4', 'video/mp4'],
      ] as const) {
        const source = document.createElement('source');
        source.src = `${d.src}.${ext}`;
        source.type = type;
        video.append(source);
      }
      video.setAttribute('aria-label', d.title ?? '');
      body.replaceChildren(video);
      dialog.showModal();
      void video.play().catch(() => undefined); // si el navegador exige gesto, quedan los controles
      return;
    }

    body.replaceChildren(message(dialog.dataset.loading));
    dialog.showModal();
    try {
      const res = await fetch(d.src ?? '', { credentials: 'same-origin' });
      if (!res.ok) throw new Error(String(res.status));
      let html = await res.text();
      if (mine !== run) return; // se cerró (o se reabrió) mientras cargaba
      const lang = dialog.dataset.lang ?? 'es';
      html = html.replace(
        'new URLSearchParams(location.search)',
        `new URLSearchParams(${JSON.stringify(`?lang=${lang}`)})`,
      );
      const frame = document.createElement('iframe');
      frame.title = d.title ?? '';
      frame.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox');
      frame.referrerPolicy = 'no-referrer';
      frame.addEventListener('load', () => frame.focus(), { once: true });
      frame.srcdoc = html;
      body.replaceChildren(frame);
    } catch (err) {
      console.warn('[demo] no se pudo cargar', err);
      if (mine === run) body.replaceChildren(message(dialog.dataset.error));
    }
  };

  const clear = () => {
    run++;
    body.replaceChildren(); // destruye el iframe / el vídeo (para el audio)
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
