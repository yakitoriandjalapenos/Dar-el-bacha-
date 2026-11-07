#!/usr/bin/env node
/*
  DAR EL BACHA — générateur de site statique (Node ≥ 18, aucune dépendance).

  Usage :
    node scripts/build.mjs            → génère dist/
    BASE=/sous-dossier node scripts/build.mjs   → site servi depuis un sous-dossier

  Étapes : contrôles (carte, traductions) → CSS/JS empreintés → pages × langues
           → sitemap, robots, 404, redirection racine → rapport des infos à confirmer.
*/
import { readFile, writeFile, mkdir, rm, cp, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { LANGS, DEFAULT_LANG, PAGES, pathFor } from '../src/routes.mjs';
import { layout } from '../src/components/layout.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const BASE = (process.env.BASE || '').replace(/\/$/, '');
const PLACEHOLDER_URL = 'https://dar-el-bacha.example';

const CSS_ORDER = ['tokens.css', 'base.css', 'layout.css', 'components.css', 'pages.css'];

const readJSON = async (p) => JSON.parse(await readFile(p, 'utf8'));
const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 10);
const kb = (n) => `${(n / 1024).toFixed(1)} ko`;

/* ------------------------------------------------------------------ */
/* Chargement                                                          */
/* ------------------------------------------------------------------ */

const site = await readJSON(path.join(SRC, 'content/site.json'));
const menu = await readJSON(path.join(SRC, 'content/menu.json'));
const gallery = await readJSON(path.join(SRC, 'content/gallery.json'));
const dict = Object.fromEntries(
  await Promise.all(LANGS.map(async (l) => [l.code, await readJSON(path.join(SRC, `i18n/${l.code}.json`))])),
);
const siteUrl = (site.siteUrl || PLACEHOLDER_URL).replace(/\/$/, '');

/* ------------------------------------------------------------------ */
/* Contrôles qualité (le build échoue plutôt que publier une erreur)   */
/* ------------------------------------------------------------------ */

const errors = [];

// Carte : limites strictes par catégorie et au total
const LIMITS = { entrees: 6, plats: 10, desserts: 4, boissons: 5 };
let total = 0;
for (const cat of menu.categories) {
  const limit = LIMITS[cat.id];
  if (limit === undefined) errors.push(`Carte : catégorie non prévue « ${cat.id} » (catégories autorisées : ${Object.keys(LIMITS).join(', ')}).`);
  else if (cat.items.length > limit) errors.push(`Carte : ${cat.items.length} propositions en « ${cat.id} » (maximum ${limit}).`);
  total += cat.items.length;
  for (const item of cat.items) {
    for (const l of LANGS) if (!item.name?.[l.code]) errors.push(`Carte : nom ${l.code} manquant pour « ${item.id} ».`);
  }
}
if (total > 25) errors.push(`Carte : ${total} propositions au total (maximum 25).`);

// Traductions : mêmes clés dans toutes les langues
const keys = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
const refKeys = new Set(keys(dict[DEFAULT_LANG]));
for (const l of LANGS) {
  const k = new Set(keys(dict[l.code]));
  for (const key of refKeys) if (!k.has(key)) errors.push(`Traduction ${l.code} : clé manquante « ${key} ».`);
  for (const key of k) if (!refKeys.has(key)) errors.push(`Traduction ${l.code} : clé inconnue « ${key} ».`);
}

if (errors.length) {
  console.error('\n✗ Build interrompu :\n  - ' + errors.join('\n  - ') + '\n');
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Ressources : polices, CSS, JS, images                               */
/* ------------------------------------------------------------------ */

await rm(DIST, { recursive: true, force: true });
await mkdir(path.join(DIST, 'assets'), { recursive: true });

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
await writeFile(path.join(DIST, 'assets', cssName), css);

// JS
const js = await readFile(path.join(SRC, 'scripts/main.js'), 'utf8');
const jsName = `main.${hash(js)}.js`;
await writeFile(path.join(DIST, 'assets', jsName), js);

// Images et polices copiées telles quelles ; fichiers statiques à la racine
await cp(path.join(SRC, 'assets/img'), path.join(DIST, 'assets/img'), { recursive: true });
await mkdir(path.join(DIST, 'assets/fonts'), { recursive: true });
for (const f of fontManifest) await cp(path.join(fontsDir, f.file), path.join(DIST, 'assets/fonts', f.file));
for (const f of await readdir(path.join(SRC, 'static'))) {
  if (f === 'robots.txt') continue;
  await cp(path.join(SRC, 'static', f), path.join(DIST, f), { recursive: true });
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
    year: new Date().getFullYear(),
    assets: { css: `${BASE}/assets/${cssName}`, js: `${BASE}/assets/${jsName}` },
    fontPreloads: lang === 'ar' ? [] : fontManifest.filter((f) => f.preload).map((f) => ({ href: `${BASE}/assets/fonts/${f.file}`, format: f.format })),

    t: (key, vars) => tFor(lang, key, vars),
    tFor,
    tObj: (key) => get(dict[lang], key),
    path: (id, code = lang) => BASE + pathFor(id === '404' ? 'home' : id, code),
    absUrl: (p) => siteUrl + (BASE && p.startsWith(BASE) ? p.slice(BASE.length) : p),
    asset: (name) => `${BASE}/${name}`,

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

    picture: (image) => pictureSources(image),

    restaurantSchema: () => restaurantSchema(ctx),
    menuSchema: () => menuSchema(ctx),
  };
  return ctx;
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

/* Données structurées : uniquement les informations confirmées */
function restaurantSchema(ctx) {
  const a = site.address || {};
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: site.name,
    url: ctx.absUrl(ctx.path('home')),
    servesCuisine: 'Moroccan',
    acceptsReservations: true,
    hasMenu: ctx.absUrl(ctx.path('carte')),
    address: {
      '@type': 'PostalAddress',
      addressLocality: site.city,
      addressCountry: site.countryCode,
      ...(a.street && { streetAddress: a.street }),
      ...(a.postalCode && { postalCode: a.postalCode }),
    },
  };
  if (site.phone) data.telephone = site.phone;
  if (site.email) data.email = site.email;
  if (site.geo?.latitude && site.geo?.longitude) data.geo = { '@type': 'GeoCoordinates', latitude: site.geo.latitude, longitude: site.geo.longitude };
  if (site.openingHoursSpecification) data.openingHoursSpecification = site.openingHoursSpecification;
  const sameAs = Object.values(site.social || {}).filter(Boolean);
  if (sameAs.length) data.sameAs = sameAs;
  if (site.ogImage) data.image = ctx.absUrl(site.ogImage);
  data.logo = ctx.absUrl(`${BASE}/assets/img/logo/logo-ivoire-or.png`);
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
  return { '@context': 'https://schema.org', '@type': 'Menu', inLanguage: ctx.lang, url: ctx.absUrl(ctx.path('carte')), hasMenuSection: sections };
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

const pageModules = {};
for (const p of [...PAGES.map((p) => p.id), '404']) {
  pageModules[p] = await import(pathToFileURL(path.join(SRC, 'pages', `${p}.mjs`)).href);
}

const written = [];
async function writePage(relPath, content) {
  const out = path.join(DIST, relPath);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, content);
  written.push({ relPath, size: Buffer.byteLength(content) });
}

for (const l of LANGS) {
  for (const page of PAGES) {
    const ctx = makeCtx(l.code, page.id);
    const result = pageModules[page.id].render(ctx);
    const doc = layout(ctx, { ...result, jsonLd: (result.jsonLd || []).filter(Boolean) }).toString();
    await writePage(path.join(pathFor(page.id, l.code), 'index.html'), doc);
  }
}

// 404 (langue par défaut)
{
  const ctx = makeCtx(DEFAULT_LANG, '404');
  const result = pageModules['404'].render(ctx);
  await writePage('404.html', layout(ctx, result).toString());
}

// Racine : redirection vers la langue par défaut (à doubler d'une redirection 301 côté hébergeur)
const home = `${BASE}${pathFor('home', DEFAULT_LANG)}`;
await writePage('index.html', `<!doctype html><html lang="${DEFAULT_LANG}"><head><meta charset="utf-8"><title>${site.name}</title><meta http-equiv="refresh" content="0; url=${home}"><link rel="canonical" href="${siteUrl}${pathFor('home', DEFAULT_LANG)}"></head><body><a href="${home}">${site.name}</a></body></html>\n`);

// Sitemap avec alternatives linguistiques
const urls = PAGES.flatMap((page) =>
  LANGS.map((l) => {
    const alts = LANGS.map((a) => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${siteUrl}${pathFor(page.id, a.code)}"/>`).join('\n');
    return `  <url>\n    <loc>${siteUrl}${pathFor(page.id, l.code)}</loc>\n${alts}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${siteUrl}${pathFor(page.id, DEFAULT_LANG)}"/>\n  </url>`;
  }),
);
await writePage('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`);

const robots = (await readFile(path.join(SRC, 'static/robots.txt'), 'utf8')).replace('{{SITE_URL}}', siteUrl);
await writePage('robots.txt', robots);

// En-têtes HTTP (format Netlify / Cloudflare Pages ; à adapter selon l'hébergeur)
await writePage('_headers', `/assets/*
  Cache-Control: public, max-age=31536000, immutable
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  X-Frame-Options: SAMEORIGIN
`);

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
const photos = gallery.items.filter((i) => !i.image).length;

const htmlPages = written.filter((w) => w.relPath.endsWith('.html'));
console.log(`\n✓ Build terminé → dist/  (${htmlPages.length} pages HTML, ${LANGS.length} langues)`);
console.log(`  CSS ${cssName} : ${kb(Buffer.byteLength(css))}   JS ${jsName} : ${kb(Buffer.byteLength(js))}`);
console.log(`  Polices : ${fontManifest.map((f) => f.file).join(', ') || 'aucune (polices système)'}`);
console.log(`  Carte : ${total}/25 propositions (${menu.categories.map((c) => `${c.id} ${c.items.length}/${LIMITS[c.id]}`).join(', ')})`);
console.log(`\n⚠ À confirmer avant mise en ligne :`);
console.log(`  - site.json : ${missing.join(', ')}`);
if (pendingDishes.length) console.log(`  - Plats à valider : ${pendingDishes.join(', ')}`);
if (prices.length) console.log(`  - Prix manquants : ${prices.length}`);
if (photos) console.log(`  - Photos de galerie manquantes : ${photos}`);
if (!site.siteUrl) console.log(`  - Nom de domaine : URL provisoire ${PLACEHOLDER_URL} utilisée pour canonical, sitemap et Open Graph`);
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
