// Langues et pages du site. Ajouter une langue = l'ajouter ici + créer src/i18n/<code>.json.

export const LANGS = [
  { code: 'fr', dir: 'ltr', ogLocale: 'fr_MA', hreflang: 'fr' },
  { code: 'en', dir: 'ltr', ogLocale: 'en_US', hreflang: 'en' },
  { code: 'ar', dir: 'rtl', ogLocale: 'ar_MA', hreflang: 'ar' },
];

export const DEFAULT_LANG = 'fr';

// id = clé de traduction (nav.<id>, pages.<id>) et nom du module dans src/pages/.
// Les URL arabes reprennent les slugs anglais : adresses lisibles et partageables partout.
export const PAGES = [
  { id: 'home',        slug: { fr: '',               en: '',          ar: '' } },
  { id: 'histoire',    slug: { fr: 'notre-histoire', en: 'our-story', ar: 'our-story' } },
  { id: 'carte',       slug: { fr: 'la-carte',       en: 'menu',      ar: 'menu' } },
  { id: 'galerie',     slug: { fr: 'galerie',        en: 'gallery',   ar: 'gallery' } },
  { id: 'reservation', slug: { fr: 'reservation',    en: 'reservations', ar: 'reservations' } },
  { id: 'contact',     slug: { fr: 'contact',        en: 'contact',   ar: 'contact' } },
];

export function pathFor(pageId, lang) {
  const page = PAGES.find((p) => p.id === pageId);
  if (!page) throw new Error(`Page inconnue : ${pageId}`);
  const slug = page.slug[lang];
  return slug ? `/${lang}/${slug}/` : `/${lang}/`;
}
