/*
  Tests de bout en bout du générateur (npm test), sur une copie temporaire du projet.
  - Prévisualisation : site complet, noindex partout, aucune URL absolue sans domaine officiel.
  - Production refusée sur les contenus actuels, sans toucher à dist/.
  - Production acceptée sur une copie dont tous les contenus sont renseignés avec des DONNÉES DE TEST
    (jamais écrites dans le projet) : vérifie la sortie de production (indexation, sitemap, robots).
*/
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let dir;

const build = (...args) => spawnSync(process.execPath, ['scripts/build.mjs', ...args], { cwd: dir, encoding: 'utf8' });
const readJSON = async (p) => JSON.parse(await readFile(path.join(dir, p), 'utf8'));
const writeJSON = (p, v) => writeFile(path.join(dir, p), JSON.stringify(v, null, 2));
const html = (p) => readFile(path.join(dir, 'dist', p), 'utf8');
async function listHtml(d, prefix = '') {
  const out = [];
  for (const e of await readdir(d, { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...(await listHtml(path.join(d, e.name), `${prefix}${e.name}/`)));
    else if (e.name.endsWith('.html')) out.push(prefix + e.name);
  }
  return out;
}

before(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'dar-el-bacha-test-'));
  for (const p of ['scripts', 'src', 'package.json']) await cp(path.join(ROOT, p), path.join(dir, p), { recursive: true });
});
after(async () => {
  await rm(dir, { recursive: true, force: true });
});

test('prévisualisation : 41 pages (6 principales, 2 juridiques et 5 résultats de demande × 3 langues, 404, racine), noindex partout, aucune URL absolue sans domaine officiel', async () => {
  const r = build();
  assert.equal(r.status, 0, r.stderr);
  const pages = await listHtml(path.join(dir, 'dist'));
  assert.equal(pages.length, 41);
  assert.match(await html('en/reservations/statut/pending/index.html'), /awaiting confirmation/);
  for (const p of pages) {
    const h = await html(p);
    assert.match(h, /<meta name="robots" content="noindex, nofollow">/, p);
    // (les liens <a hreflang> du sélecteur de langue sont légitimes : seuls les <link rel="alternate"> sont exclus)
    assert.doesNotMatch(h, /rel="canonical"|og:url|og:image|<link rel="alternate"|\.example/, p);
  }
  assert.equal(existsSync(path.join(dir, 'dist/sitemap.xml')), false);
  assert.match(await html('robots.txt'), /Disallow: \//);
  const headers = await html('_headers');
  assert.match(headers, /X-Robots-Tag: noindex/);
  assert.doesNotMatch(headers, /Strict-Transport-Security/, 'HSTS réservé au domaine officiel');
  // Seuls les modules réellement présents sont autorisés en cadre (ici, le plan Google Maps de l'adresse)
  assert.match(headers, /Content-Security-Policy: default-src 'self'; script-src 'self' 'sha256-[A-Za-z0-9+/]+='; .*frame-src (?:'none'|https:\/\/maps\.google\.com https:\/\/www\.google\.com);/);
  assert.match(r.stdout, /À confirmer avant mise en ligne/);
  // Contenus de démonstration toujours signalés comme tels (dans les trois langues)
  const home = await html('fr/index.html');
  assert.match(home, /<p class="demo-banner" data-provisional="demo-banner">Aperçu de démonstration/);
  assert.match(home, /data-provisional="reviews-demo">Avis fictifs — aperçu de démonstration</);
  assert.doesNotMatch(home, /AggregateRating|"@type":"Review"/, 'aucune note ni avis dans les données structurées');
  assert.match(await html('ar/index.html'), /آراء وهمية — معاينة تجريبية/);
  assert.match(await html('en/index.html'), /Fictitious reviews — demonstration preview/);
  const carte = await html('fr/la-carte/index.html');
  assert.match(carte, /data-provisional="price-indicative"[^>]*>\d+\u00a0DH/);
  assert.match(carte, /Prix indicatifs en dirhams \(DH\), à confirmer/);
  assert.match(await html('fr/contact/index.html'), /data-provisional="hours-pending">Horaires proposés, à confirmer/);
  assert.doesNotMatch(home, /openingHoursSpecification/, 'horaires proposés jamais publiés dans les données structurées');
});

test('production refusée tant que des informations sont à confirmer, dist/ inchangé', async () => {
  const before = await html('fr/index.html');
  const r = build('--prod');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Production refusée \(dist\/ inchangé\)/);
  assert.match(r.stderr, /siteUrl : URL officielle du site non configurée/);
  assert.match(r.stderr, /reservation\.formEndpoint/);
  assert.match(r.stderr, /photographies provisoires/);
  assert.match(r.stderr, /plats « à valider »/);
  assert.match(r.stderr, /pages juridiques non validées par un juriste/);
  assert.match(r.stderr, /avis fictifs de démonstration/);
  assert.match(r.stderr, /prix indicatifs \(aperçu\)/);
  assert.match(r.stderr, /horaires proposés, à confirmer/);
  assert.equal(await html('fr/index.html'), before);
  assert.equal(existsSync(path.join(dir, '.build-tmp')), false);
});

test('production acceptée quand tous les contenus sont renseignés (données de test)', async () => {
  const T = (s) => ({ fr: `${s} (test)`, en: `${s} (test)`, ar: `${s} (اختبار)` });
  // Image de test : le logo existant, déclaré explicitement (aucune photo inventée)
  const img = { src: 'logo/logo-ivoire-or', width: 300, height: 278 };

  const site = await readJSON('src/content/site.json');
  Object.assign(site, {
    siteUrl: 'https://www.domaine-de-test.ma',
    address: { street: 'Adresse de test', postalCode: '20000', district: 'Quartier de test' },
    geo: { latitude: 33.5, longitude: -7.6 },
    phone: '+212 500 000 000', email: 'contact@domaine-de-test.ma', hours: null, story: T('Présentation'), priceRange: 'MAD 000 (test)',
    openingHours: { days: { mon: [], tue: [['12:00', '15:00']], wed: [['12:00', '15:00']], thu: [['12:00', '15:00']], fri: [['12:00', '15:00']], sat: [['19:00', '23:00']], sun: [] } },
    whatsapp: { number: '212600000000' }, googleMapsUrl: 'https://maps.google.com/?q=test',
    social: { instagram: 'https://www.instagram.com/test', facebook: 'https://www.facebook.com/test', tripadvisor: 'https://www.tripadvisor.com/test' },
    reservation: { formEndpoint: '/api/reservation', bookingSystem: null, conditions: T('Conditions') },
    legal: Object.fromEntries(['companyName', 'legalForm', 'shareCapital', 'registeredOffice', 'rc', 'ice', 'identifiantFiscal', 'publicationDirector', 'dataController', 'cndpReference', 'hosting', 'emailProvider', 'photoCredits'].map((k) => [k, `${k} (test)`])),
  });
  site.hoursConfirmed = true;
  Object.assign(site.legal, { dataContactEmail: 'donnees@domaine-de-test.ma', dataRetention: T('Durée'), dataTransfers: T('Transferts'), validated: true });
  await writeJSON('src/content/site.json', site);

  const menu = await readJSON('src/content/menu.json');
  for (const c of menu.categories) {
    if (!c.items.length) c.items.push({ id: `test-${c.id}`, name: T('Plat'), description: null, price: 100, image: null });
    for (const i of c.items) { delete i.status; delete i.signature; i.price = 120; i.image = null; }
  }
  menu.pricesStatus = 'valide';
  // Plats emblématiques désignés par le restaurant (ici, données de test), avec leur photo
  menu.categories.flatMap((c) => c.items).slice(0, 3).forEach((i) => { i.signature = true; i.image = img; });
  await writeJSON('src/content/menu.json', menu);

  const media = await readJSON('src/content/media.json');
  const fill = (v) => { if (Array.isArray(v)) v.forEach(fill); else if (v && typeof v === 'object') { if ('image' in v) { v.image = img; v.alt = T('Image'); } Object.values(v).forEach(fill); } };
  fill(media);
  await writeJSON('src/content/media.json', media);
  const gallery = await readJSON('src/content/gallery.json');
  gallery.items.forEach((i) => { i.image = img; i.alt = T('Image'); });
  await writeJSON('src/content/gallery.json', gallery);
  // Avis réels (données de test) : la mention « avis fictifs » disparaît
  const reviews = await readJSON('src/content/reviews.json');
  reviews.demo = false;
  await writeJSON('src/content/reviews.json', reviews);

  const r = build('--prod');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Build de PRODUCTION terminé/);

  const home = await html('fr/index.html');
  assert.doesNotMatch(home, /name="robots"/);
  assert.match(home, /<link rel="canonical" href="https:\/\/www\.domaine-de-test\.ma\/fr\/">/);
  assert.match(home, /hreflang="x-default" href="https:\/\/www\.domaine-de-test\.ma\/fr\/"/);
  assert.match(home, /og:image" content="https:\/\/www\.domaine-de-test\.ma\/og-image\.jpg"/);
  assert.equal((home.match(/fetchpriority="high"/g) || []).length, 1);
  assert.doesNotMatch(home, /data-provisional/);
  // Horaires structurés : liste affichée (jours traduits) et données schema.org
  assert.match(home, /<li class="hours__line is-closed">\s*<span class="hours__day">lundi<\/span>/);
  assert.match(home, /"openingHoursSpecification":\[\{"@type":"OpeningHoursSpecification","dayOfWeek":"https:\/\/schema.org\/Tuesday","opens":"12:00","closes":"15:00"\}/);
  assert.match(home, /"priceRange":"MAD 000 \(test\)"/);
  assert.match(await html('ar/index.html'), /<span class="hours__day">الاثنين<\/span>/);
  assert.match(await html('404.html'), /<meta name="robots" content="noindex">/);

  // Aperçus de partage complets dans chaque langue (réseaux sociaux, messageries), données structurées valides
  for (const [file, locale, others] of [['fr/index.html', 'fr_MA', ['en_US', 'ar_MA']], ['en/menu/index.html', 'en_US', ['fr_MA', 'ar_MA']], ['ar/reservations/index.html', 'ar_MA', ['fr_MA', 'en_US']]]) {
    const h = await html(file);
    const meta = (prop) => h.match(new RegExp(`<meta (?:property|name)="${prop}" content="([^"]*)"`))?.[1];
    assert.equal(meta('og:url'), h.match(/<link rel="canonical" href="([^"]+)"/)[1], file);
    assert.equal(meta('og:title'), h.match(/<title>([^<]+)<\/title>/)[1], file);
    assert.equal(meta('og:description'), meta('description'), file);
    assert.equal(meta('og:locale'), locale, file);
    assert.deepEqual([...h.matchAll(/og:locale:alternate" content="([^"]+)"/g)].map((m) => m[1]), others, file);
    assert.equal(meta('og:image:width'), '1200');
    assert.equal(meta('og:image:height'), '630');
    assert.ok(meta('og:image:alt'), file);
    assert.equal(meta('twitter:card'), 'summary_large_image');
    for (const [, json] of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      const data = JSON.parse(json);
      assert.equal(data['@context'], 'https://schema.org', file);
      assert.doesNotMatch(json, /null|undefined|À CONFIRMER/, file);
    }
  }
  assert.match(await html('ar/reservations/index.html'), /og:image:alt" content="دار الباشا"/);

  const sitemap = await html('sitemap.xml');
  assert.equal((sitemap.match(/<loc>/g) || []).length, 24);
  assert.match(sitemap, /<loc>https:\/\/www\.domaine-de-test\.ma\/fr\/confidentialite\/<\/loc>/);
  assert.doesNotMatch(await html('fr/mentions-legales/index.html'), /data-provisional/);
  assert.match(await html('robots.txt'), /Sitemap: https:\/\/www\.domaine-de-test\.ma\/sitemap\.xml/);
  const headers = await html('_headers');
  assert.doesNotMatch(headers, /X-Robots-Tag/);
  assert.match(headers, /Strict-Transport-Security: max-age=31536000/);
  // Carte intégrée (adresse renseignée) : seul Google Maps est autorisé en cadre
  assert.match(headers, /frame-src https:\/\/maps\.google\.com https:\/\/www\.google\.com;/);
  // Fil d'Ariane des pages intérieures et manifeste d'application
  assert.match(await html('fr/la-carte/index.html'), /"@type":"BreadcrumbList".*"item":"https:\/\/www\.domaine-de-test\.ma\/fr\/la-carte\/"/);
  assert.doesNotMatch(home, /BreadcrumbList/);
  assert.equal(JSON.parse(await html('site.webmanifest')).theme_color, '#123d32');
});
