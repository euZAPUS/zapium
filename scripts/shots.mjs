#!/usr/bin/env node
/**
 * Capturas de revisión con Playwright (Chromium). Guarda en .screenshots/.
 * Uso: node scripts/shots.mjs [baseUrl] [filtro]
 * Variables: CHROME_PATH (ejecutable de Chromium).
 */
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:4321';
const only = process.argv[3];
const viewports = {
  1440: { width: 1440, height: 900 },
  768: { width: 768, height: 1024 },
  375: { width: 375, height: 812 },
};
// [nombre, tema, anchos]
const shots = [
  ['light', 'light', [1440, 768, 375]],
  ['dark', 'dark', [1440, 375]],
];

await mkdir('.screenshots', { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: [
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
  ],
});

for (const [name, scheme, widths] of shots) {
  if (only && !name.includes(only)) continue;
  for (const w of widths) {
    const ctx = await browser.newContext({
      viewport: viewports[w],
      colorScheme: scheme,
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => ['error', 'warning'].includes(m.type()) && errors.push(m.text()));
    await page.goto(`${base}/?nointro`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3600); // deja terminar la intro
    const ready = await page.evaluate(() => !!document.querySelector('.world[data-ready]'));
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    );
    await page.screenshot({ path: `.screenshots/${name}-${w}.png` });
    console.log(
      `${name}-${w}  webgl=${ready}  overflowX=${overflow}${errors.length ? '  ERRORES: ' + errors.join(' | ') : ''}`,
    );
    await ctx.close();
  }
}
await browser.close();
