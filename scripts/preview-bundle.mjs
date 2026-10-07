#!/usr/bin/env node
/**
 * Convierte `dist/` en un paquete para publicar como Artifact de claude.ai (vista previa
 * privada y clicable). El Artifact:
 *   - envuelve la página principal en su propio esqueleto → se publica como FRAGMENTO
 *     (título + estilos + script inline + contenido del <body>, sin <html>/<head>/<body>);
 *   - sirve los demás archivos junto a la página → todas las rutas deben ser RELATIVAS;
 *   - reserva los nombres que empiezan por «_» → _astro se publica como assets/.
 * Las demás páginas (en/, lab/, en/lab/) se publican completas, tal cual.
 * Limitación: desde las subpáginas, «volver al inicio» apunta a la carpeta raíz del Artifact
 * (`../`), que puede no ser la página principal; en la web real (Cloudflare Pages) funciona.
 *
 * Uso: pnpm build && node scripts/preview-bundle.mjs   → escribe .preview/
 */
import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = '.preview';
const PAGES = [
  { src: 'dist/en/index.html', dest: 'en/index.html', depth: 1 },
  { src: 'dist/lab/index.html', dest: 'lab/index.html', depth: 1 },
  { src: 'dist/en/lab/index.html', dest: 'en/lab/index.html', depth: 2 },
];

await rm(OUT, { recursive: true, force: true });
for (const p of PAGES) await mkdir(join(OUT, p.dest, '..'), { recursive: true });
await cp('dist/_astro', join(OUT, 'assets'), { recursive: true });
await cp('dist/favicon.png', join(OUT, 'favicon.png'));
// Demos jugables (public/demos/*): se copian tal cual; el iframe las carga con ruta relativa.
if (existsSync('dist/demos')) await cp('dist/demos', join(OUT, 'demos'), { recursive: true });
// Capturas, vídeos y tráilers de los proyectos (public/works, public/videos, public/trailers): también relativos
for (const d of ['works', 'videos', 'trailers'])
  if (existsSync(`dist/${d}`)) await cp(`dist/${d}`, join(OUT, d), { recursive: true });

// CSS: url(/_astro/x) → url(./x) (relativo al propio CSS).
// JS: el helper de precarga de Vite antepone «/» a las rutas de los fragmentos (`/_astro/x.js`);
// se sustituye por una ruta junto al propio script (todos los fragmentos viven en la misma carpeta).
for (const f of await readdir(join(OUT, 'assets'))) {
  const p = join(OUT, 'assets', f);
  if (f.endsWith('.css'))
    await writeFile(p, (await readFile(p, 'utf8')).replaceAll('url(/_astro/', 'url(./'));
  if (f.endsWith('.js')) {
    const code = await readFile(p, 'utf8');
    const fixed = code.replace(
      /function\((\w+)\)\{return`\/`\+\1\}/g,
      'function($1){return new URL($1.split("/").pop(),import.meta.url).href}',
    );
    if (fixed !== code) await writeFile(p, fixed);
  }
}

/** Reescribe rutas absolutas a relativas. `up` = '../' repetido según la profundidad de la página. */
function localize(html, up, isMain) {
  let out = html
    .replaceAll('"/_astro/', `"${up}assets/`)
    .replaceAll('"/favicon.png"', `"${up}favicon.png"`)
    .replaceAll('data-src="/demos/', `data-src="${up}demos/`)
    .replaceAll('data-src="/trailers/', `data-src="${up}trailers/`)
    .replaceAll('data-poster="/trailers/', `data-poster="${up}trailers/`)
    .replaceAll('data-img="/works/', `data-img="${up}works/`)
    .replaceAll('src="/works/', `src="${up}works/`)
    .replaceAll('data-video="/videos/', `data-video="${up}videos/`)
    .replaceAll('data-poster="/videos/', `data-poster="${up}videos/`)
    .replaceAll('poster="/videos/', `poster="${up}videos/`)
    .replaceAll('src="/videos/', `src="${up}videos/`)
    // enlaces entre páginas (con y sin ancla), de más específico a menos
    .replace(/href="\/en\/lab\/(#[^"]*)?"/g, (_, h = '') => `href="${up}en/lab/index.html${h}"`)
    .replace(/href="\/lab\/(#[^"]*)?"/g, (_, h = '') => `href="${up}lab/index.html${h}"`)
    .replace(/href="\/en\/(#[^"]*)?"/g, (_, h = '') => `href="${up}en/index.html${h}"`);
  out = isMain
    ? out.replaceAll('href="/"', 'href="#top"').replace(/href="\/#/g, 'href="#')
    : out
        .replaceAll('href="/"', `href="${up || './'}"`)
        .replace(/href="\/#/g, `href="${up || './'}#`);
  return out;
}

// ── Página principal (es) como fragmento ──────────────────────────────
const es = await readFile('dist/index.html', 'utf8');
const title = es.match(/<title>[\s\S]*?<\/title>/)?.[0] ?? '<title>zapium</title>';
const desc = es.match(/<meta name="description"[^>]*>/)?.[0] ?? '';
const links = [...es.matchAll(/<link rel="(?:stylesheet|icon)"[^>]*>/g)]
  .map((m) => m[0])
  .join('\n');
const inline = [...es.matchAll(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/g)]
  .map((m) => m[0])
  .filter((s) => s.includes('documentElement'))
  .join('\n');
const body = es.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1] ?? '';
let main = [title, desc, links, inline, body].join('\n');
// El Artifact controla <html>: lang y data-intro se fijan desde el script inline
main = main.replace(
  'const d = document.documentElement;',
  "const d = document.documentElement;\n        d.lang = 'es';\n        d.setAttribute('data-intro', '');",
);
await writeFile(join(OUT, 'index.html'), localize(main, '', true));

// ── Páginas completas ─────────────────────────────────────────────────
for (const p of PAGES) {
  let html = await readFile(p.src, 'utf8');
  html = localize(html, '../'.repeat(p.depth), false).replace(
    /<link rel="(canonical|alternate)"[^>]*>/g,
    '',
  );
  await writeFile(join(OUT, p.dest), html);
}

const files = [];
async function walk(d) {
  for (const e of await readdir(join(OUT, d), { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) await walk(p);
    else if (p !== 'index.html') files.push(p);
  }
}
await walk('');
console.log(`Paquete en ${OUT}/ → index.html + ${files.length} archivos`);
console.log(JSON.stringify(files));
