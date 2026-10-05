import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import globals from 'globals';

export default defineConfig(
  globalIgnores([
    'dist/',
    '.astro/',
    'node_modules/',
    '_originals/',
    'public/',
    '.preview/',
    '.screenshots/',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  astro.configs.recommended,
  astro.configs['jsx-a11y-recommended'],
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node, astroHTML: 'readonly' } },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
);
