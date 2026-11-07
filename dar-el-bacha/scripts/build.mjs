#!/usr/bin/env node
/*
  DAR EL BACHA — générateur de site statique (Node ≥ 18, aucune dépendance).

  Usage :
    node scripts/build.mjs           → prévisualisation : dist/ en noindex, contenus provisoires signalés
    node scripts/build.mjs --prod    → production : refusée tant qu'il reste une information à confirmer
                                       ou que l'URL officielle du site n'est pas configurée
    BASE=/sous-dossier node scripts/build.mjs   → site servi depuis un sous-dossier

  Étapes : contrôles des contenus (carte, traductions, informations officielles)
           → génération dans un dossier temporaire (CSS/JS empreintés, pages × langues,
             sitemap, robots, 404, redirection racine)
           → contrôle du site généré (référencement, liens, contenus provisoires)
           → remplacement de dist/ uniquement si tout est conforme.
*/
import { readFile, writeFile, mkdir, rm, cp, readdir, stat, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { LANGS, DEFAULT_LANG, PAGES, LEGAL_PAGES, RESERVATION_RESULTS, pathFor } from '../src/routes.mjs';

// Pages générées et référencées : les six pages principales et les pages juridiques
const SITE_PAGES = [...PAGES, ...LEGAL_PAGES];
import { layout } from '../src/components/layout.mjs';
import { parseSiteUrl, validateI18n, validateMenu, validateGallery, validateSite, validateMedia, validateReviews, collectImageRefs } from './lib/validate.mjs';
import { checkOutput, collectForeignTexts } from './lib/check-output.mjs';
import { hoursLines, openingHoursSchema } from './lib/opening-hours.mjs';
import { buildCsp, headersFile } from './lib/security-headers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, '.build-tmp'); // génération ici, puis remplacement de dist/ si tout est conforme
const BASE = (process.env.BASE || '').replace(/\/$/, '');

const args = process.argv.slice(2);
const MODE = args.includes('--prod') || args.includes('--production') || process.env.BUILD_MODE === 'production' ? 'production' : 'preview';
const PROD = MODE === 'production';

const CSS_ORDER = ['tokens.css', 'base.css', 'layout.css', 'components.css', 'pages.css'];

const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 10);
const kb = (n) => `${(n / 1024).toFixed(1)} ko`;
const fail = (title, list) => {
  console.error(`\n✗ ${title} :\n  - ${list.join('\n  - ')}\n`);
  process.exit(1);
};
const readJSON = async (p) => {
  const text = await readFile(p, 'utf8');
  try {
    return JSON.parse(text);
  } catch (e) {
    return fail('Build interrompu', [`${path.relative(ROOT, p)} : JSON invalide (${e.message}).`]);
  }
};

/* ------------------------------------------------------------------ */
/* Chargement                                                          */
/* ------------------------------------------------------------------ */

const site = await readJSON(path.join(SRC, 'content/site.json'));
const menu = await readJSON(path.join(SRC, 'content/menu.json'));
const gallery = await readJSON(path.join(SRC, 'content/gallery.json'));
const media = await readJSON(path.join(SRC, 'content/media.json'));
const reviews = await readJSON(path.join(SRC, 'content/reviews.json'));
// Crédits des photographies d'illustration (aperçu) : source, auteur, licence de chaque image « illustrations/… »
const photoCredits = existsSync(path.join(SRC, 'content/photo-credits.json')) ? await readJSON(path.join(SRC, 'content/photo-credits.json')) : { items: [] };
// Manifeste des photos préparées par « npm run images » (dimensions, variantes, couleur dominante)
const PHOTOS_MANIFEST = path.join(SRC, 'assets/img/photos/manifest.json');
const photos = existsSync(PHOTOS_MANIFEST) ? await readJSON(PHOTOS_MANIFEST) : {};
const dict = Object.fromEntries(
  await Promise.all(LANGS.map(async (l) => [l.code, await readJSON(path.join(SRC, `i18n/${l.code}.json`))])),
);

/* ------------------------------------------------------------------ */
/* Contrôles des contenus (le build échoue plutôt que publier une erreur) */
/* ------------------------------------------------------------------ */

// Les catégories et les limites de la carte viennent exclusivement de menu.json.
const menuCheck = validateMenu(menu, dict, LANGS);
const checks = [validateI18n(dict, LANGS, DEFAULT_LANG), menuCheck, validateGallery(gallery, dict, LANGS), validateMedia(media, LANGS), validateSite(site, LANGS), validateReviews(reviews, LANGS)];
const errors = checks.flatMap((c) => c.errors);
// Chaque photo citée dans les contenus doit exister
for (const { ref, where } of collectImageRefs({ media, gallery, menu })) {
  if (typeof ref === 'string' && !photos[ref]) errors.push(`${where} : photo « ${ref} » introuvable (lancer npm run images après avoir déposé l'original dans ressources/photos/).`);
}
// Photos utilisées ; toute illustration (banque d'images) doit avoir ses crédits : source, auteur, licence
const usedImages = new Set(collectImageRefs({ media, gallery, menu }).map((r) => r.ref).filter((r) => typeof r === 'string'));
for (const name of usedImages) {
  if (!name.startsWith('illustrations/')) continue;
  const c = photoCredits.items.find((x) => x.name === name);
  if (!c || !c.source || !c.author || !c.license || !c.licenseUrl) errors.push(`photo-credits.json : crédits incomplets pour « ${name} » (source, auteur, licence et lien de licence obligatoires).`);
}
const warnings = checks.flatMap((c) => c.warnings);
if (errors.length) fail('Build interrompu', errors);
const total = menuCheck.total;

// URL officielle : jamais de domaine fictif. Sans URL, la prévisualisation omet les adresses absolues.
const siteUrl = parseSiteUrl(site.siteUrl).url;

// Blocages propres à la production, complétés après le contrôle du site généré
// Point d'envoi du formulaire : en prévisualisation seulement, FORM_ENDPOINT peut le remplacer (npm run dev branche
// le service local en mode simulation) ; en production, seule la valeur de site.json compte.
if (!PROD && process.env.FORM_ENDPOINT) site.reservation = { ...site.reservation, formEndpoint: process.env.FORM_ENDPOINT };
const RESERVATION_MAX_DAYS = Number(process.env.RESERVATION_MAX_DAYS) || 180;

const prodBlockers = [];
if (PROD && !siteUrl) prodBlockers.push('siteUrl : URL officielle du site non configurée dans src/content/site.json.');
if (PROD && !site.reservation?.formEndpoint) prodBlockers.push('reservation.formEndpoint : aucun service ne reçoit les demandes du formulaire de réservation.');

/* ------------------------------------------------------------------ */
/* Ressources : polices, CSS, JS, images                               */
/* ------------------------------------------------------------------ */

await rm(OUT, { recursive: true, force: true });
await mkdir(path.join(OUT, 'assets'), { recursive: true });

// Polices déclarées dans fonts.json et réellement présentes
const fontsDir = path.join(SRC, 'assets/fonts');
const fontManifest = (await readJSON(path.join(fontsDir, 'fonts.json'))).filter((f) => existsSync(path.join(fontsDir, f.file)));
const fontFaces = fontManifest
  .map((f) => `@font-face{font-family:"${f.family}";src:url("fonts/${f.file}") format("${f.format}");font-weight:${f.weight};font-style:${f.style};font-display:swap;${f.unicodeRange ? `unicode-range:${f.unicodeRange};` : ''}}`)
  .join('');

// CSS : concaténation + minification prudente
const cssRaw = (await Promise.all(CSS_ORDER.map((f) => readFile(path.join(SRC, 'styles', f), 'utf8')))).join('\n');
const css = fontFaces + minifyCss(cssRaw);
const cssName = `site.${hash(css)}.css`;
await writeFile(path.join(OUT, 'assets', cssName), css);

// JS
const js = minifyJs(await readFile(path.join(SRC, 'scripts/main.js'), 'utf8'));
const jsName = `main.${hash(js)}.js`;
await writeFile(path.join(OUT, 'assets', jsName), js);

// Images et polices copiées telles quelles ; fichiers statiques à la racine
await cp(path.join(SRC, 'assets/img'), path.join(OUT, 'assets/img'), { recursive: true, filter: (f) => f !== PHOTOS_MANIFEST && path.basename(f) !== '.gitkeep' });
await mkdir(path.join(OUT, 'assets/fonts'), { recursive: true });
for (const f of fontManifest) await cp(path.join(fontsDir, f.file), path.join(OUT, 'assets/fonts', f.file));
// Licences des polices publiées avec elles (SIL Open Font License)
if (existsSync(path.join(fontsDir, 'licences'))) await cp(path.join(fontsDir, 'licences'), path.join(OUT, 'assets/fonts/licences'), { recursive: true });
const staticFiles = await readdir(path.join(SRC, 'static'));
for (const f of staticFiles) {
  if (f === 'robots.txt') continue;
  await cp(path.join(SRC, 'static', f), path.join(OUT, f), { recursive: true });
}
// Favicon vectoriel officiel : utilisé automatiquement dès qu'il est déposé (src/static/favicon.svg)
const hasSvgFavicon = staticFiles.includes('favicon.svg');

// Manifeste d'application (écran d'accueil des téléphones) : icônes de src/static/ (provisoires tant que l'icône
// officielle 1024 px n'est pas fournie, voir INFORMATIONS-A-FOURNIR.md)
await writeFile(path.join(OUT, 'site.webmanifest'), `${JSON.stringify({
  name: site.name,
  short_name: site.name,
  lang: DEFAULT_LANG,
  start_url: `${BASE}${pathFor('home', DEFAULT_LANG)}`,
  display: 'browser',
  background_color: '#f7f3ea',
  theme_color: '#123d32',
  icons: [
    staticFiles.includes('icon-512.png') && { src: `${BASE}/icon-512.png`, sizes: '512x512', type: 'image/png' },
    staticFiles.includes('apple-touch-icon.png') && { src: `${BASE}/apple-touch-icon.png`, sizes: '180x180', type: 'image/png' },
  ].filter(Boolean),
}, null, 2)}\n`);

// Index des images disponibles (pour <picture> : AVIF / WebP / JPEG, variantes nom-800.webp…)
const imageFiles = await listFiles(path.join(SRC, 'assets/img'));

/* ------------------------------------------------------------------ */
/* Contexte de rendu                                                   */
/* ------------------------------------------------------------------ */

const get = (obj, key) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

function makeCtx(lang, pageId) {
  const L = LANGS.find((l) => l.code === lang);
  const tFor = (code, key, vars = {}) => {
    const v = get(dict[code], key);
    if (typeof v !== 'string') throw new Error(`Clé de traduction absente : ${code}.${key}`);
    return v.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  };

  const ctx = {
    lang,
    dir: L.dir,
    langs: LANGS,
    defaultLang: DEFAULT_LANG,
    pageId,
    site,
    menu,
    gallery,
    media,
    reviews,
    // Crédits des seules illustrations réellement utilisées
    photoCredits: photoCredits.items.filter((c) => usedImages.has(c.name)),
    // Contenus de démonstration présents (bandeau d'aperçu sur toutes les pages)
    demo: Boolean(reviews.demo || menu.pricesStatus === 'indicatif' || [...usedImages].some((n) => n.startsWith('illustrations/'))),
    reservationMaxDays: RESERVATION_MAX_DAYS,
    mode: MODE,
    preview: !PROD,
    siteUrl,
    year: new Date().getFullYear(),
    assets: { css: `${BASE}/assets/${cssName}`, js: `${BASE}/assets/${jsName}` },
    // Préchargement : uniquement la police des titres de la langue de la page (voir fonts.json › preload)
    fontPreloads: fontManifest
      .filter((f) => (Array.isArray(f.preload) ? f.preload.includes(lang) : f.preload === true && lang !== 'ar'))
      .map((f) => ({ href: `${BASE}/assets/fonts/${f.file}`, format: f.format })),

    // Nom de la maison dans l'écriture de la page (jamais de latin isolé dans une page arabe)
    siteName: lang === 'ar' ? site.nameAr : site.name,
    t: (key, vars) => tFor(lang, key, vars),
    tFor,
    tObj: (key) => get(dict[lang], key),
    path: (id, code = lang) => BASE + pathFor(id === '404' ? 'home' : id, code),
    // Adresse absolue sur le domaine officiel ; null tant que siteUrl n'est pas configurée.
    absUrl: (p) => (siteUrl ? siteUrl + (BASE && p.startsWith(BASE) ? p.slice(BASE.length) : p) : null),
    asset: (name) => `${BASE}/${name}`,
    // Fichier image présent dans src/assets/img/ (ex. logo SVG définitif déposé)
    hasSvgFavicon,
    hasAsset: (p) => p.startsWith('assets/img/') && imageFiles.includes(p.slice('assets/img/'.length)),

    address: () => {
      const a = site.address || {};
      if (!a.street) return null;
      return [a.street, a.district, [a.postalCode, site.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    },
    hours: () => (site.hours && typeof site.hours === 'object' ? site.hours[lang] : site.hours) || null,
    // Horaires structurés (site.json › openingHours) : jours traduits par Intl, dans la langue de la page
    hoursLines: () => hoursLines(site.openingHours, `${lang}-MA`),
    directionsUrl: () => {
      const { latitude, longitude } = site.geo || {};
      if (latitude && longitude) return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      const addr = ctx.address();
      return addr ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${site.name}, ${addr}`)}` : null;
    },
    // Prix en dirhams, notés « DH » (usage marocain) ; chiffres latins dans les trois langues
    formatPrice: (n) => `${new Intl.NumberFormat(`${lang === 'ar' ? 'fr' : lang}-MA`, { maximumFractionDigits: 0 }).format(n)}\u00a0${get(dict[lang], 'pages.carte.currency')}`,
    pricesIndicative: menu.pricesStatus === 'indicatif',
    menuAllPending: menu.categories.every((c) => c.items.every((i) => i.status === 'a-valider')),

    resolveImage: (ref) => resolveImage(ref),
    picture: (image) => pictureSources(image),

    restaurantSchema: () => restaurantSchema(ctx),
    menuSchema: () => menuSchema(ctx),
  };
  return ctx;
}

/** Référence de photo → { src, width, height, color } (nom du manifeste ou objet explicite). */
function resolveImage(ref) {
  if (typeof ref !== 'string') return ref;
  const p = photos[ref];
  if (!p) throw new Error(`Photo introuvable : ${ref}`);
  return { src: `photos/${ref}`, width: p.width, height: p.height, color: p.color };
}

function pictureSources(image) {
  const base = image.src.replace(/^\/+/, '');
  const matches = imageFiles
    .map((f) => {
      const m = f.match(/^(.*?)(?:-(\d+))?\.(avif|webp|jpe?g|png)$/i);
      return m && m[1] === base ? { file: f, width: Number(m[2]) || image.width, ext: m[3].toLowerCase() } : null;
    })
    .filter(Boolean);
  if (!matches.length) throw new Error(`Image introuvable : src/assets/img/${base}.(avif|webp|jpg)`);
  const url = (f) => `${BASE}/assets/img/${f}`;
  const srcset = (list) => list.sort((a, b) => a.width - b.width).map((m) => `${url(m.file)} ${m.width}w`).join(', ');
  const of = (...exts) => matches.filter((m) => exts.includes(m.ext));
  const sources = [
    { type: 'image/avif', list: of('avif') },
    { type: 'image/webp', list: of('webp') },
  ].filter((s) => s.list.length).map((s) => ({ type: s.type, srcset: srcset(s.list) }));
  const fallbackList = of('jpg', 'jpeg', 'png').length ? of('jpg', 'jpeg', 'png') : matches;
  const fallback = url(fallbackList.sort((a, b) => b.width - a.width)[0].file);
  return { sources, fallback };
}

/* Données structurées : uniquement les informations confirmées (et aucune adresse absolue sans URL officielle) */
function restaurantSchema(ctx) {
  const a = site.address || {};
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: site.name,
    servesCuisine: 'Moroccan',
    acceptsReservations: true,
    address: {
      '@type': 'PostalAddress',
      addressLocality: site.city,
      addressCountry: site.countryCode,
      ...(a.street && { streetAddress: a.street }),
      ...(a.postalCode && { postalCode: a.postalCode }),
    },
  };
  if (siteUrl) {
    data.url = ctx.absUrl(ctx.path('home'));
    data.hasMenu = ctx.absUrl(ctx.path('carte'));
  }
  if (site.phone) data.telephone = site.phone;
  if (site.email) data.email = site.email;
  if (site.geo?.latitude && site.geo?.longitude) data.geo = { '@type': 'GeoCoordinates', latitude: site.geo.latitude, longitude: site.geo.longitude };
  // Horaires seulement proposés : jamais publiés dans les données structurées
  const opening = site.hoursConfirmed === false ? null : openingHoursSchema(site.openingHours);
  if (opening?.length) data.openingHoursSpecification = opening;
  if (site.priceRange) data.priceRange = site.priceRange;
  const sameAs = Object.values(site.social || {}).filter(Boolean);
  if (sameAs.length) data.sameAs = sameAs;
  if (siteUrl && site.ogImage) data.image = ctx.absUrl(site.ogImage);
  if (siteUrl) data.logo = ctx.absUrl(`${BASE}/assets/img/logo/logo-ivoire-or.png`);
  return data;
}

/* Fil d'Ariane des pages intérieures (Accueil › Page), uniquement sur le domaine officiel */
function breadcrumbSchema(ctx, pageId) {
  if (!siteUrl || pageId === 'home') return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: ctx.t('nav.home'), item: ctx.absUrl(ctx.path('home')) },
      { '@type': 'ListItem', position: 2, name: ctx.t(`pages.${pageId}.title`), item: ctx.absUrl(ctx.path(pageId)) },
    ],
  };
}

function menuSchema(ctx) {
  // Les propositions « à valider » ne sont pas publiées dans les données structurées.
  const sections = menu.categories
    .map((c) => ({
      '@type': 'MenuSection',
      name: ctx.t(`pages.carte.categories.${c.id}`),
      hasMenuItem: c.items
        .filter((i) => i.status !== 'a-valider')
        .map((i) => ({
          '@type': 'MenuItem',
          name: i.name[ctx.lang],
          ...(i.description?.[ctx.lang] && { description: i.description[ctx.lang] }),
          ...(i.price != null && { offers: { '@type': 'Offer', price: i.price, priceCurrency: menu.currency } }),
        })),
    }))
    .filter((s) => s.hasMenuItem.length);
  if (!sections.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    inLanguage: ctx.lang,
    ...(siteUrl && { url: ctx.absUrl(ctx.path('carte')) }),
    hasMenuSection: sections,
  };
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

const pageModules = {};
for (const p of [...SITE_PAGES.map((p) => p.id), '404', 'statut']) {
  pageModules[p] = await import(pathToFileURL(path.join(SRC, 'pages', `${p}.mjs`)).href);
}

const written = [];
const textFiles = new Map(); // contenus texte publiés, pour le contrôle final
async function writePage(relPath, content) {
  const out = path.join(OUT, relPath);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, content);
  written.push({ relPath, size: Buffer.byteLength(content) });
  textFiles.set(relPath.split(path.sep).join('/'), content);
}

const pageChecks = [];
const alternatesFor = (id) => [
  ...LANGS.map((a) => ({ hreflang: a.hreflang, path: pathFor(id, a.code) })),
  { hreflang: 'x-default', path: pathFor(id, DEFAULT_LANG) },
];

for (const l of LANGS) {
  for (const page of SITE_PAGES) {
    const ctx = makeCtx(l.code, page.id);
    const result = pageModules[page.id].render(ctx);
    const doc = layout(ctx, { ...result, jsonLd: [...(result.jsonLd || []), breadcrumbSchema(ctx, page.id)].filter(Boolean) }).toString();
    const file = path.posix.join(pathFor(page.id, l.code).slice(1), 'index.html');
    await writePage(file, doc);
    pageChecks.push({ file, lang: l.code, dir: l.dir, path: pathFor(page.id, l.code), indexable: !result.noindex, alternates: alternatesFor(page.id) });
  }
}

// Résultats des demandes de réservation envoyées sans JavaScript (non indexés)
for (const l of LANGS) {
  for (const result of RESERVATION_RESULTS) {
    const id = `statut:${result}`;
    const ctx = makeCtx(l.code, id);
    const page = pageModules.statut.render(ctx);
    const file = path.posix.join(pathFor(id, l.code).slice(1), 'index.html');
    await writePage(file, layout(ctx, page).toString());
    pageChecks.push({ file, lang: l.code, dir: l.dir, path: pathFor(id, l.code), indexable: false, alternates: [] });
  }
}

// 404 (langue par défaut)
{
  const ctx = makeCtx(DEFAULT_LANG, '404');
  const result = pageModules['404'].render(ctx);
  await writePage('404.html', layout(ctx, result).toString());
  pageChecks.push({ file: '404.html', lang: DEFAULT_LANG, dir: LANGS.find((l) => l.code === DEFAULT_LANG).dir, path: null, indexable: false, alternates: [] });
}

// Racine : redirection vers la langue par défaut (à doubler d'une redirection 301 côté hébergeur)
const home = `${BASE}${pathFor('home', DEFAULT_LANG)}`;
const rootHead = [
  `<meta charset="utf-8">`,
  `<title>${site.name}</title>`,
  !PROD && `<meta name="robots" content="noindex, nofollow">`,
  `<meta http-equiv="refresh" content="0; url=${home}">`,
  siteUrl && `<link rel="canonical" href="${siteUrl}${pathFor('home', DEFAULT_LANG)}">`,
].filter(Boolean).join('');
await writePage('index.html', `<!doctype html><html lang="${DEFAULT_LANG}"><head>${rootHead}</head><body><a href="${home}">${site.name}</a></body></html>\n`);

// Sitemap avec alternatives linguistiques (uniquement sur le domaine officiel)
if (siteUrl) {
  const urls = SITE_PAGES.flatMap((page) =>
    LANGS.map((l) => {
      const alts = alternatesFor(page.id).map((a) => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${siteUrl}${a.path}"/>`).join('\n');
      return `  <url>\n    <loc>${siteUrl}${pathFor(page.id, l.code)}</loc>\n${alts}\n  </url>`;
    }),
  );
  await writePage('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`);
}

// robots.txt : tout est bloqué en prévisualisation
const robots = PROD
  ? (await readFile(path.join(SRC, 'static/robots.txt'), 'utf8')).replace('{{SITE_URL}}', siteUrl)
  : 'User-agent: *\nDisallow: /\n';
await writePage('robots.txt', robots);

// En-têtes HTTP (format Netlify / Cloudflare Pages ; voir HEBERGEMENT.md pour les autres hébergeurs).
// La politique de sécurité (CSP) est déduite des pages générées : empreintes des scripts intégrés, cadres configurés.
const csp = buildCsp({
  pages: [...textFiles].filter(([f]) => f.endsWith('.html')).map(([, c]) => c),
  formEndpoint: site.reservation?.formEndpoint,
  turnstile: site.reservation?.antiSpam?.provider === 'turnstile',
});
await writePage('_headers', headersFile({ csp, prod: PROD, assetsPath: `${BASE}/assets/*` }));

/* ------------------------------------------------------------------ */
/* Contrôle du site généré                                             */
/* ------------------------------------------------------------------ */

const PROVISIONAL_LABELS = {
  address: 'adresse', phone: 'téléphone', email: 'e-mail', hours: 'horaires', whatsapp: 'numéro WhatsApp',
  price: 'prix', social: 'réseaux sociaux', map: 'localisation', story: "présentation et histoire",
  photo: 'photographies provisoires', 'dish-pending': 'plats « à valider »', 'menu-empty': 'catégories de la carte vides',
  'menu-notice': 'mention « carte en cours de validation »', 'signature-pending': 'texte d\'attente des plats emblématiques',
  'form-endpoint': 'formulaire de réservation non relié',
  'hours-pending': 'horaires proposés, à confirmer',
  'price-indicative': 'prix indicatifs (aperçu)',
  'reviews-demo': 'avis fictifs de démonstration',
  'photo-illustration': "photographies d'illustration (banques d'images)",
  'legal-draft': 'pages juridiques non validées par un juriste',
  legal: 'informations juridiques',
  conditions: 'conditions de réservation',
};
const forbiddenTexts = LANGS.flatMap((l) => [...Object.values(dict[l.code].tbc || {}), get(dict[l.code], 'pages.carte.pending')]);
const allFiles = new Set(await listFiles(OUT));
// Textes propres à chaque langue : traductions (même clé) et contenus localisés { fr, en, ar } des fichiers de contenu
const LANG_CODES = LANGS.map((l) => l.code);
const flat = (obj, prefix = '', out = {}) => {
  for (const [k, v] of Object.entries(obj || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, `${prefix}${k}.`, out);
    else if (typeof v === 'string') out[prefix + k] = v;
  }
  return out;
};
const flatDicts = Object.fromEntries(LANG_CODES.map((c) => [c, flat(dict[c])]));
const localized = [];
const walkLocalized = (v) => {
  if (Array.isArray(v)) return v.forEach(walkLocalized);
  if (!v || typeof v !== 'object') return;
  if (LANG_CODES.every((c) => typeof v[c] === 'string')) return localized.push(v);
  Object.values(v).forEach(walkLocalized);
};
walkLocalized([site, menu, gallery, media, reviews]);
const foreignTexts = collectForeignTexts([
  ...Object.keys(flatDicts[DEFAULT_LANG]).map((k) => Object.fromEntries(LANG_CODES.map((c) => [c, flatDicts[c][k]]))),
  ...localized,
], LANG_CODES);
const output = checkOutput({ files: textFiles, allFiles, pages: pageChecks, mode: MODE, siteUrl, base: BASE, forbiddenTexts, foreignTexts });

const provisionalLines = [...output.provisional].map(
  ([type, { count, files }]) => `${PROVISIONAL_LABELS[type] || type} : ${count} repère${count > 1 ? 's' : ''} sur ${files.size} page${files.size > 1 ? 's' : ''}`,
);
const strayLines = [...output.stray].map(([text, files]) => `texte provisoire ou interdit « ${text} » hors balisage : ${[...files].slice(0, 3).join(', ')}${files.size > 3 ? '…' : ''}`);

if (output.errors.length) {
  await rm(OUT, { recursive: true, force: true });
  fail('Site généré non conforme (dist/ inchangé)', output.errors);
}
if (PROD) {
  if (provisionalLines.length) prodBlockers.push(`Contenus provisoires encore affichés :\n      ${provisionalLines.join('\n      ')}`);
  prodBlockers.push(...strayLines);
  if (prodBlockers.length) {
    await rm(OUT, { recursive: true, force: true });
    fail('Production refusée (dist/ inchangé)', prodBlockers);
  }
}

// Tout est conforme : le nouveau site remplace dist/
await rm(DIST, { recursive: true, force: true });
await rename(OUT, DIST);

/* ------------------------------------------------------------------ */
/* Rapport                                                             */
/* ------------------------------------------------------------------ */

const missing = [];
const walk = (obj, prefix) => {
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('_')) continue;
    if (v === null) missing.push(prefix + k);
    else if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, `${prefix}${k}.`);
  }
};
walk(site, '');
const pendingDishes = menu.categories.flatMap((c) => c.items.filter((i) => i.status === 'a-valider').map((i) => i.id));
const prices = menu.categories.flatMap((c) => c.items.filter((i) => i.price == null).map((i) => i.id));
const missingGalleryPhotos = gallery.items.filter((i) => !i.image).length;

// Ressources définitives encore absentes (non bloquant : signalé à chaque compilation)
const resources = [];
if (!imageFiles.some((f) => /^logo\/.+\.svg$/.test(f))) resources.push('logo définitif vectoriel (SVG : avec et sans couronne, vert et or, ivoire et or, monochrome) : découpes de la planche officielle utilisées en attendant (333 px au plus, affichées à mi-taille)');
const provisionalFonts = fontManifest.filter((f) => f.provisional).map((f) => f.file);
if (provisionalFonts.length) resources.push(`police de titres définitive (police provisoire : ${provisionalFonts.join(', ')})`);
if (!fontManifest.some((f) => /Arabic/.test(f.family))) resources.push('police arabe (les polices du système sont utilisées)');
const emptySlots = [];
const countSlots = (v) => { if (Array.isArray(v)) v.forEach(countSlots); else if (v && typeof v === 'object') { if ('image' in v && !v.image) emptySlots.push(v); Object.entries(v).forEach(([k, x]) => { if (!k.startsWith('_') && k !== 'image') countSlots(x); }); } };
countSlots(media); countSlots(gallery.items);
if (emptySlots.length) resources.push(`photographies : ${emptySlots.length} emplacements sans photo (media.json, gallery.json)`);

const htmlPages = written.filter((w) => w.relPath.endsWith('.html'));
console.log(`\n✓ Build ${PROD ? 'de PRODUCTION' : 'de prévisualisation (noindex)'} terminé → dist/  (${htmlPages.length} pages HTML, ${LANGS.length} langues)`);
console.log(`  CSS ${cssName} : ${kb(Buffer.byteLength(css))}   JS ${jsName} : ${kb(Buffer.byteLength(js))}`);
console.log(`  Polices : ${fontManifest.map((f) => f.file).join(', ') || 'aucune (polices système)'}`);
console.log(`  Carte : ${total}/${menu.maxTotal} propositions (${menu.categories.map((c) => `${c.id} ${c.items.length}/${c.max}`).join(', ')})`);
console.log(`  Contrôles : ${pageChecks.length} pages vérifiées (langue, textes d'une autre langue, titres et descriptions, liens, canonical, hreflang, Open Graph, sitemap, indexation) ; en-têtes de sécurité (CSP) générés`);
if (warnings.length) console.log(`\n⚠ Avertissements :\n  - ${warnings.join('\n  - ')}`);

if (!PROD) {
  console.log(`\n⚠ À confirmer avant mise en ligne (bloquant pour npm run build:prod) :`);
  if (missing.length) console.log(`  - site.json : ${missing.join(', ')}`);
  if (pendingDishes.length) console.log(`  - Plats à valider : ${pendingDishes.join(', ')}`);
  if (prices.length) console.log(`  - Prix manquants : ${prices.length}`);
  if (missingGalleryPhotos) console.log(`  - Photos de galerie manquantes : ${missingGalleryPhotos}`);
  if (!siteUrl) console.log(`  - URL officielle (siteUrl) non configurée : canonical, hreflang, Open Graph et sitemap sont omis`);
  if (provisionalLines.length) console.log(`  - Repères provisoires affichés :\n      ${provisionalLines.join('\n      ')}`);
  if (strayLines.length) console.log(`  - ${strayLines.join('\n  - ')}`);
}
if (resources.length) console.log(`\n⚠ Ressources définitives à fournir (voir ressources/README.md) :\n  - ${resources.join('\n  - ')}`);
console.log('');

/* ------------------------------------------------------------------ */

/*
  Minification prudente du JavaScript (cahier des charges 10.2), sans dépendance : retire les commentaires
  occupant des lignes entières, l'indentation et les lignes vides. Le code et les chaînes ne sont jamais
  modifiés, et les retours à la ligne sont conservés (aucun changement d'interprétation du script).
*/
function minifyJs(s) {
  return s
    .replace(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*$/gm, '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('//'))
    .join('\n');
}

function minifyCss(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

async function listFiles(dir, prefix = '') {
  const out = [];
  for (const entry of await readdir(dir)) {
    const full = path.join(dir, entry);
    if ((await stat(full)).isDirectory()) out.push(...(await listFiles(full, `${prefix}${entry}/`)));
    else out.push(prefix + entry);
  }
  return out;
}
