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

test('prévisualisation : 20 pages, noindex partout, aucune URL absolue sans domaine officiel', async () => {
  const r = build();
  assert.equal(r.status, 0, r.stderr);
  const pages = await listHtml(path.join(dir, 'dist'));
  assert.equal(pages.length, 20);
  for (const p of pages) {
    const h = await html(p);
    assert.match(h, /<meta name="robots" content="noindex, nofollow">/, p);
    // (les liens <a hreflang> du sélecteur de langue sont légitimes : seuls les <link rel="alternate"> sont exclus)
    assert.doesNotMatch(h, /rel="canonical"|og:url|og:image|<link rel="alternate"|\.example/, p);
  }
  assert.equal(existsSync(path.join(dir, 'dist/sitemap.xml')), false);
  assert.match(await html('robots.txt'), /Disallow: \//);
  assert.match(await html('_headers'), /X-Robots-Tag: noindex/);
  assert.match(r.stdout, /À confirmer avant mise en ligne/);
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
    phone: '+212 500 000 000', email: 'contact@domaine-de-test.ma', hours: T('Horaires'), story: T('Présentation'),
    whatsapp: { number: '212600000000' }, googleMapsUrl: 'https://maps.google.com/?q=test',
    social: { instagram: 'https://www.instagram.com/test', facebook: 'https://www.facebook.com/test', tripadvisor: 'https://www.tripadvisor.com/test' },
    reservation: { formEndpoint: '/api/reservation', bookingSystem: null },
  });
  await writeJSON('src/content/site.json', site);

  const menu = await readJSON('src/content/menu.json');
  for (const c of menu.categories) {
    if (!c.items.length) c.items.push({ id: `test-${c.id}`, name: T('Plat'), description: null, price: 100, image: null });
    for (const i of c.items) { delete i.status; i.price = 120; }
  }
  await writeJSON('src/content/menu.json', menu);

  const media = await readJSON('src/content/media.json');
  const fill = (v) => { if (Array.isArray(v)) v.forEach(fill); else if (v && typeof v === 'object') { if ('image' in v) { v.image = img; v.alt = T('Image'); } Object.values(v).forEach(fill); } };
  fill(media);
  await writeJSON('src/content/media.json', media);
  const gallery = await readJSON('src/content/gallery.json');
  gallery.items.forEach((i) => { i.image = img; i.alt = T('Image'); });
  await writeJSON('src/content/gallery.json', gallery);

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
  assert.match(await html('404.html'), /<meta name="robots" content="noindex">/);

  const sitemap = await html('sitemap.xml');
  assert.equal((sitemap.match(/<loc>/g) || []).length, 18);
  assert.match(await html('robots.txt'), /Sitemap: https:\/\/www\.domaine-de-test\.ma\/sitemap\.xml/);
  assert.doesNotMatch(await html('_headers'), /X-Robots-Tag/);
});
