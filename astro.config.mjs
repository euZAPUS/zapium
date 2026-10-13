// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Dominio del autor (hosting cPanel en Namecheap): el portfolio vive en el subdominio alvaro.sangon.eu
// para dejar sangon.eu libre a la familia. Se puede cambiar con la variable de entorno SITE_URL.
// Se usa para canonical, hreflang, sitemap y robots.txt. Ojo: la web asume que se sirve en la RAÍZ de esa URL.
const site = process.env.SITE_URL ?? 'https://alvaro.sangon.eu';

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
