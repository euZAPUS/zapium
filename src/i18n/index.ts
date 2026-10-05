import type { Locale } from '~/config/site';
import { es, type Dict } from './es';
import { en } from './en';

const dictionaries: Record<Locale, Dict> = { es, en };

export const useT = (locale: Locale): Dict => dictionaries[locale];

/** Ruta de la home en cada idioma (es en la raíz, en bajo /en/). */
export const homePath = (locale: Locale): string => (locale === 'es' ? '/' : '/en/');
export const otherLocale = (locale: Locale): Locale => (locale === 'es' ? 'en' : 'es');

export const labPath = (locale: Locale): string => (locale === 'es' ? '/lab/' : '/en/lab/');
