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

// Pages juridiques (pied de page) : hors navigation principale, mais traduites, indexables et dans le sitemap.
export const LEGAL_PAGES = [
  { id: 'confidentialite', slug: { fr: 'confidentialite', en: 'privacy', ar: 'privacy' } },
  { id: 'mentions', slug: { fr: 'mentions-legales', en: 'legal-notice', ar: 'legal-notice' } },
];

// Résultats d'une demande de réservation envoyée sans JavaScript (pages non indexées, produites par le build) :
// le service redirige vers /<langue>/<page réservation>/statut/<résultat>/.
export const RESERVATION_RESULTS = ['pending', 'simulated', 'invalid', 'rate-limited', 'error'];
export const statusPath = (lang, result) => `${pathFor('reservation', lang)}statut/${result}/`;

export function pathFor(pageId, lang) {
  if (pageId.startsWith('statut:')) return statusPath(lang, pageId.slice('statut:'.length));
  const page = [...PAGES, ...LEGAL_PAGES].find((p) => p.id === pageId);
  if (!page) throw new Error(`Page inconnue : ${pageId}`);
  const slug = page.slug[lang];
  return slug ? `/${lang}/${slug}/` : `/${lang}/`;
}
