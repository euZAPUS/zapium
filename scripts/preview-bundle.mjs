#!/usr/bin/env node
/**
 * Convierte `dist/` en un paquete para publicar como Artifact de claude.ai (vista previa
 * privada y clicable). El Artifact:
 *   - envuelve la página principal en su propio esqueleto → se publica como FRAGMENTO
 *     (título + estilos + script inline + contenido del <body>, sin <html>/<head>/<body>);
 *   - sirve los demás archivos junto a la página → todas las rutas deben ser RELATIVAS.
 * La página en inglés se publica como página completa aparte (en/index.html).
 *
 * Uso: pnpm build && node scripts/preview-bundle.mjs   → escribe .preview/
 */
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = '.preview';
await rm(OUT, { recursive: true, force: true });
await mkdir(join(OUT, 'en'), { recursive: true });
// El servicio de Artifacts reserva los nombres que empiezan por «_»: _astro → assets
await cp('dist/_astro', join(OUT, 'assets'), { recursive: true });
await cp('dist/favicon.png', join(OUT, 'favicon.png'));

// CSS: url(/_astro/x) → url(./x) (relativo al propio CSS)
for (const f of await readdir(join(OUT, 'assets'))) {
  if (!f.endsWith('.css')) continue;
  const p = join(OUT, 'assets', f);
  await writeFile(p, (await readFile(p, 'utf8')).replaceAll('url(/_astro/', 'url(./'));
}

const rel = (html, up) =>
  html.replaceAll('"/_astro/', `"${up}assets/`).replaceAll('"/favicon.png"', `"${up}favicon.png"`);

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
main = rel(main, '')
  .replaceAll('href="/en/"', 'href="en/index.html"')
  .replaceAll('href="/"', 'href="#top"');
await writeFile(join(OUT, 'index.html'), main);

// ── Página en inglés: HTML completo (se sirve tal cual), un nivel más abajo ──
let en = await readFile('dist/en/index.html', 'utf8');
en = rel(en, '../').replaceAll('href="/"', 'href="../"').replaceAll('href="/en/"', 'href="#top"');
en = en.replace(/<link rel="(canonical|alternate)"[^>]*>/g, '');
await writeFile(join(OUT, 'en', 'index.html'), en);

const files = [];
async function walk(d) {
  for (const e of await readdir(join(OUT, d), { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) await walk(p);
    else if (p !== 'index.html') files.push(p);
  }
  return files;
}
await walk('');
console.log(`Paquete en ${OUT}/ → index.html + ${files.length} archivos`);
console.log(JSON.stringify(files));
