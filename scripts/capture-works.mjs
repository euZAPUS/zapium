#!/usr/bin/env node
/**
 * Capturas REALES de las apps para usarlas como «pantallas» del carrusel de proyectos
 * (ProjectScreens / scripts/screens). Genera public/works/NAME.webp (1280×800, sin metadatos).
 *   huerto  → public/demos/huerto/ (demo de Zapper AIO) con el huerto de ejemplo relleno
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

// ── Zapper Huerto: temporizador + huerto de ejemplo, compuestos en un 16:10 ──
{
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1.5,
  });
  const page = await ctx.newPage();
  await page.goto(`${base}/demos/huerto/index.html?lang=es`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.getByText('Rellenar con un huerto de ejemplo').click();
  await page.waitForTimeout(1500);
  const timer = await page.screenshot({
    clip: { x: 320, y: 360, width: 640, height: 620 },
    fullPage: true,
  });
  const garden = await page.screenshot({
    clip: { x: 300, y: 2040, width: 680, height: 500 },
    fullPage: true,
  });
  const bg = { r: 14, g: 15, b: 22 };
  const t = await sharp(timer).resize({ height: 760 }).toBuffer();
  const g = await sharp(garden).resize({ width: 640 }).toBuffer();
  const gm = await sharp(g).metadata();
  const tm = await sharp(t).metadata();
  const canvas = await sharp({ create: { width: 1600, height: 1000, channels: 3, background: bg } })
    .composite([
      { input: t, left: 90, top: 120 },
      { input: g, left: 90 + (tm.width ?? 0) + 70, top: Math.round(500 - (gm.height ?? 0) / 2) },
    ])
    .png()
    .toBuffer();
  await save(canvas, 'huerto');
  await ctx.close();
}

// ── Mini-apps del laboratorio ──
const apps = [
  { id: 'subnet', example: '192.168.1.130/26' },
  { id: 'bits', example: null },
  { id: 'risk', example: null },
];
{
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await page.goto(`${base}/lab/?nointro`, { waitUntil: 'networkidle' });
  await page.addStyleTag({
    content:
      '.header, .hud, .gizmo, [data-hud], .lab__head, .cursor, .fx-canvas{display:none!important}',
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
