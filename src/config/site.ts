/**
 * Datos del sitio y de la persona. Fuente única de verdad: nada de esto debe
 * repetirse a mano en componentes. Lo que no existe aún es `null` (no se pinta
 * el enlace) o un [TODO] visible.
 */
export const SITE = {
  name: 'zapium',
  url: import.meta.env.SITE ?? 'https://zapium.pages.dev',
  locales: ['es', 'en'] as const,
  defaultLocale: 'es' as const,
} as const;

export type Locale = (typeof SITE.locales)[number];

export const PERSON = {
  name: 'Álvaro Sánchez',
  handle: 'euZAPUS',
  // Correo de contacto provisional. Cambiará al del dominio propio.
  // Se pinta ofuscado en el HTML (ver componente de contacto, fase 2).
  email: 'sangonzalezalvaro@gmail.com',
  github: 'https://github.com/euZAPUS',
  // [TODO] Aún no tiene LinkedIn: mientras sea null no se muestra ningún enlace.
  linkedin: null as string | null,
  // Sin teléfono ni dirección personal. Nunca.
} as const;
