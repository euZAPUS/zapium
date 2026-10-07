#!/usr/bin/env node
/**
 * Capturas REALES de las apps para usarlas como «pantallas» del carrusel de proyectos
 * (ProjectScreens / scripts/screens). Genera public/works/NAME.webp (1280×800, sin metadatos).
 *   subnet / bits / risk → las mini-apps del laboratorio (/lab/)
 * Cuando el autor aporte vídeos (pnpm videos), el vídeo sustituye a la captura (misma pantalla).
 * Uso: pnpm build && pnpm preview &  →  node scripts/capture-works.mjs [baseUrl]
 * Variables: CHROME_PATH (ejecutable de Chromium).
 */
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const base = process.argv[2] ?? 'http://localhost:4321';
const OUT = 'public/works';
const W = 1280;
const H = 800;
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

const save = (buf, name) =>
  sharp(buf)
    .resize(W, H, { fit: 'cover' })
    .webp({ quality: 82 })
    .toFile(`${OUT}/${name}.webp`)
    .then((i) => console.log(`${name}.webp  ${(i.size / 1024).toFixed(0)} KB`));

// ── Mini-apps del laboratorio ──
const apps = [
  { id: 'subnet', example: '192.168.1.130/26' },
  { id: 'bits', example: null },
  { id: 'risk', example: null },
];
{
  // 1060×662 (16:10) a 1,21× → 1283×801; el contenedor mide ~980 px y el margen es mínimo
  const ctx = await browser.newContext({
    viewport: { width: 1060, height: 662 },
    deviceScaleFactor: 1.21,
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await page.goto(`${base}/lab/?nointro`, { waitUntil: 'networkidle' });
  await page.addStyleTag({
    content:
      // Sin el «mundo» (rejilla/pasillo del fondo) ni nada fijo: la app queda sobre un fondo plano y liso
      '.header, .hud, .gizmo, [data-hud], .lab__head, .cursor, .fx-canvas, .world, [data-world]{display:none!important} html, body{background:#09090a!important}',
  });
  for (const a of apps) {
    const el = page.locator(`#${a.id}`);
    if (a.example) {
      // Sin clics (dejarían chispas del cursor): se escribe el ejemplo y se avisa a la app
      const input = el.locator('input').first();
      await input.fill(a.example);
      await input.dispatchEvent('input');
    }
    await el.scrollIntoViewIfNeeded();
    await page.evaluate((id) => {
      const r = document.getElementById(id).getBoundingClientRect();
      scrollTo(0, scrollY + r.top - 24);
    }, a.id);
    await page.waitForTimeout(600);
    await save(await page.screenshot(), a.id);
  }
  await ctx.close();
}

await browser.close();
