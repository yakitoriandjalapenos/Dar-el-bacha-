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

import { LANGS, DEFAULT_LANG, PAGES, pathFor } from '../src/routes.mjs';
import { layout } from '../src/components/layout.mjs';
import { parseSiteUrl, validateI18n, validateMenu, validateGallery, validateSite, validateMedia, collectImageRefs } from './lib/validate.mjs';
import { checkOutput } from './lib/check-output.mjs';

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
const checks = [validateI18n(dict, LANGS, DEFAULT_LANG), menuCheck, validateGallery(gallery, dict, LANGS), validateMedia(media, LANGS), validateSite(site, LANGS)];
const errors = checks.flatMap((c) => c.errors);
// Chaque photo citée dans les contenus doit exister
for (const { ref, where } of collectImageRefs({ media, gallery, menu })) {
  if (typeof ref === 'string' && !photos[ref]) errors.push(`${where} : photo « ${ref} » introuvable (lancer npm run images après avoir déposé l'original dans ressources/photos/).`);
}
const warnings = checks.flatMap((c) => c.warnings);
if (errors.length) fail('Build interrompu', errors);
const total = menuCheck.total;

// URL officielle : jamais de domaine fictif. Sans URL, la prévisualisation omet les adresses absolues.
const siteUrl = parseSiteUrl(site.siteUrl).url;

// Blocages propres à la production, complétés après le contrôle du site généré
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
const js = await readFile(path.join(SRC, 'scripts/main.js'), 'utf8');
const jsName = `main.${hash(js)}.js`;
await writeFile(path.join(OUT, 'assets', jsName), js);

// Images et polices copiées telles quelles ; fichiers statiques à la racine
await cp(path.join(SRC, 'assets/img'), path.join(OUT, 'assets/img'), { recursive: true, filter: (f) => f !== PHOTOS_MANIFEST && path.basename(f) !== '.gitkeep' });
await mkdir(path.join(OUT, 'assets/fonts'), { recursive: true });
for (const f of fontManifest) await cp(path.join(fontsDir, f.file), path.join(OUT, 'assets/fonts', f.file));
// Licences des polices publiées avec elles (SIL Open Font License)
if (existsSync(path.join(fontsDir, 'licences'))) await cp(path.join(fontsDir, 'licences'), path.join(OUT, 'assets/fonts/licences'), { recursive: true });
for (const f of await readdir(path.join(SRC, 'static'))) {
  if (f === 'robots.txt') continue;
  await cp(path.join(SRC, 'static', f), path.join(OUT, f), { recursive: true });
}

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
    mode: MODE,
    preview: !PROD,
    siteUrl,
    year: new Date().getFullYear(),
    assets: { css: `${BASE}/assets/${cssName}`, js: `${BASE}/assets/${jsName}` },
    // Préchargement : uniquement la police des titres de la langue de la page (voir fonts.json › preload)
    fontPreloads: fontManifest
      .filter((f) => (Array.isArray(f.preload) ? f.preload.includes(lang) : f.preload === true && lang !== 'ar'))
      .map((f) => ({ href: `${BASE}/assets/fonts/${f.file}`, format: f.format })),

    t: (key, vars) => tFor(lang, key, vars),
    tFor,
    tObj: (key) => get(dict[lang], key),
    path: (id, code = lang) => BASE + pathFor(id === '404' ? 'home' : id, code),
    // Adresse absolue sur le domaine officiel ; null tant que siteUrl n'est pas configurée.
    absUrl: (p) => (siteUrl ? siteUrl + (BASE && p.startsWith(BASE) ? p.slice(BASE.length) : p) : null),
    asset: (name) => `${BASE}/${name}`,
    // Fichier image présent dans src/assets/img/ (ex. logo SVG définitif déposé)
    hasAsset: (p) => p.startsWith('assets/img/') && imageFiles.includes(p.slice('assets/img/'.length)),

    address: () => {
      const a = site.address || {};
      if (!a.street) return null;
      return [a.street, a.district, [a.postalCode, site.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    },
    hours: () => (site.hours && typeof site.hours === 'object' ? site.hours[lang] : site.hours) || null,
    directionsUrl: () => {
      const { latitude, longitude } = site.geo || {};
      if (latitude && longitude) return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      const addr = ctx.address();
      return addr ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${site.name}, ${addr}`)}` : null;
    },
    formatPrice: (n) =>
      new Intl.NumberFormat(lang === 'ar' ? 'ar-MA-u-nu-latn' : `${lang}-MA`, { style: 'currency', currency: menu.currency, maximumFractionDigits: 0 }).format(n),

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
  if (site.openingHoursSpecification) data.openingHoursSpecification = site.openingHoursSpecification;
  const sameAs = Object.values(site.social || {}).filter(Boolean);
  if (sameAs.length) data.sameAs = sameAs;
  if (siteUrl && site.ogImage) data.image = ctx.absUrl(site.ogImage);
  if (siteUrl) data.logo = ctx.absUrl(`${BASE}/assets/img/logo/logo-ivoire-or.png`);
  return data;
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
for (const p of [...PAGES.map((p) => p.id), '404']) {
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
  for (const page of PAGES) {
    const ctx = makeCtx(l.code, page.id);
    const result = pageModules[page.id].render(ctx);
    const doc = layout(ctx, { ...result, jsonLd: (result.jsonLd || []).filter(Boolean) }).toString();
    const file = path.posix.join(pathFor(page.id, l.code).slice(1), 'index.html');
    await writePage(file, doc);
    pageChecks.push({ file, lang: l.code, dir: l.dir, path: pathFor(page.id, l.code), indexable: !result.noindex, alternates: alternatesFor(page.id) });
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
  const urls = PAGES.flatMap((page) =>
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

// En-têtes HTTP (format Netlify / Cloudflare Pages ; à adapter selon l'hébergeur)
await writePage('_headers', `/assets/*
  Cache-Control: public, max-age=31536000, immutable
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  X-Frame-Options: SAMEORIGIN
${PROD ? '' : '  X-Robots-Tag: noindex, nofollow\n'}`);

/* ------------------------------------------------------------------ */
/* Contrôle du site généré                                             */
/* ------------------------------------------------------------------ */

const PROVISIONAL_LABELS = {
  address: 'adresse', phone: 'téléphone', email: 'e-mail', hours: 'horaires', whatsapp: 'numéro WhatsApp',
  price: 'prix', social: 'réseaux sociaux', map: 'localisation', story: "présentation et histoire",
  photo: 'photographies provisoires', 'dish-pending': 'plats « à valider »', 'menu-empty': 'catégories de la carte vides',
  'menu-notice': 'mention « carte en cours de validation »', 'signature-pending': 'texte d\'attente des plats emblématiques',
  'form-endpoint': 'formulaire de réservation non relié',
};
const forbiddenTexts = LANGS.flatMap((l) => [...Object.values(dict[l.code].tbc || {}), get(dict[l.code], 'pages.carte.pending')]);
const allFiles = new Set(await listFiles(OUT));
const output = checkOutput({ files: textFiles, allFiles, pages: pageChecks, mode: MODE, siteUrl, base: BASE, forbiddenTexts });

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
console.log(`  Contrôles : ${pageChecks.length} pages vérifiées (langue, titres, liens, canonical, hreflang, Open Graph, sitemap, indexation)`);
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
