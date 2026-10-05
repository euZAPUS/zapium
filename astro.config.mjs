// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// TODO: sustituir por el dominio definitivo cuando exista (Cloudflare Pages
// da zapium.pages.dev mientras tanto). Una sola fuente de verdad: src/config/site.ts
// importa esta misma URL desde la variable de entorno SITE_URL o este valor.
const site = process.env.SITE_URL ?? 'https://zapium.pages.dev';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  compressHTML: true,
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'es', locales: { es: 'es-ES', en: 'en' } },
    }),
  ],
  build: { inlineStylesheets: 'auto' },
});
