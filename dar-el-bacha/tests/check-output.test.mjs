// Tests du contrôle du site généré (npm test), sur de petites pages construites pour l'occasion.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkOutput } from '../scripts/lib/check-output.mjs';

const SITE = 'https://www.dar-el-bacha.ma';
const alternates = [
  { hreflang: 'fr', path: '/fr/' },
  { hreflang: 'en', path: '/en/' },
  { hreflang: 'x-default', path: '/fr/' },
];
const head = ({ robots = 'noindex, nofollow', canonical = `${SITE}/fr/`, alts = alternates } = {}) =>
  [
    robots && `<meta name="robots" content="${robots}">`,
    canonical && `<link rel="canonical" href="${canonical}">`,
    ...alts.map((a) => `<link rel="alternate" hreflang="${a.hreflang}" href="${SITE}${a.path}">`),
    canonical && `<meta property="og:url" content="${canonical}">`,
  ].filter(Boolean).join('\n');
const page = (body, opts) => `<!doctype html><html lang="fr" dir="ltr"><head>${head(opts)}</head><body><h1>Titre</h1>${body}</body></html>`;

const run = (html, { mode = 'preview', siteUrl = SITE, extraFiles = {}, robotsTxt = 'User-agent: *\nDisallow: /\n' } = {}) => {
  const files = new Map([['fr/index.html', html], ['robots.txt', robotsTxt], ...Object.entries(extraFiles)]);
  if (siteUrl) files.set('sitemap.xml', `<urlset><url><loc>${SITE}/fr/</loc>${alternates.map((a) => `<xhtml:link hreflang="${a.hreflang}"/>`).join('')}</url></urlset>`);
  const allFiles = new Set([...files.keys(), 'en/index.html', 'assets/a.css']);
  return checkOutput({
    files, allFiles, mode, siteUrl, base: '', forbiddenTexts: ['[PRIX À CONFIRMER]'],
    pages: [{ file: 'fr/index.html', lang: 'fr', dir: 'ltr', path: '/fr/', indexable: true, alternates }],
  });
};

test('page conforme : aucune erreur', () => {
  const r = run(page('<a href="/en/">EN</a><link href="/assets/a.css"><a href="#x">x</a><p id="x"></p>'));
  assert.deepEqual(r.errors, []);
  assert.equal(r.provisional.size, 0);
  assert.equal(r.stray.size, 0);
});

test('structure : langue, h1, identifiants en double', () => {
  const html = page('<h1>Deux</h1><p id="a"></p><p id="a"></p>').replace('lang="fr"', 'lang="en"');
  const errors = run(html).errors.join('\n');
  assert.match(errors, /lang="en"/);
  assert.match(errors, /2 titres h1/);
  assert.match(errors, /identifiants en double \(a\)/);
});

test('liens : page, ressource et ancre introuvables', () => {
  const errors = run(page('<a href="/de/">x</a><img src="/assets/absent.png" width="1" height="1" alt=""><a href="#nulle-part">y</a>')).errors.join('\n');
  assert.match(errors, /introuvable « \/de\/ »/);
  assert.match(errors, /introuvable « \/assets\/absent\.png »/);
  assert.match(errors, /ancre introuvable « #nulle-part »/);
});

test('indexation : noindex obligatoire en prévisualisation, interdit en production', () => {
  assert.match(run(page('', { robots: null })).errors.join(), /noindex absente en prévisualisation/);
  const prod = run(page('', { robots: 'noindex' }), { mode: 'production', robotsTxt: `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n` });
  assert.match(prod.errors.join(), /noindex présente en production/);
  const robotsBlocked = run(page('', { robots: null }), { mode: 'production', robotsTxt: 'User-agent: *\nDisallow: /\n' });
  assert.match(robotsBlocked.errors.join(), /site entier est bloqué en production/);
});

test('référencement : canonical, hreflang et URL absolue sans domaine officiel', () => {
  assert.match(run(page('', { canonical: `${SITE}/fr/autre/` })).errors.join(), /canonical/);
  assert.match(run(page('', { alts: alternates.slice(0, 2) })).errors.join(), /hreflang incorrects/);
  assert.match(run(page(''), { siteUrl: null }).errors.join(), /URL absolue publiée alors qu'aucune URL officielle/);
});

test('images : une seule image prioritaire, dimensions et alt obligatoires', () => {
  const img = (extra) => `<img src="/assets/a.css" ${extra}>`;
  const errors = run(page(img('width="1" height="1" alt="" fetchpriority="high"') + img('width="1" height="1" alt="" fetchpriority="high"') + img('alt=""') + img('width="1" height="1"'))).errors.join('\n');
  assert.match(errors, /2 images en priorité haute/);
  assert.match(errors, /sans largeur ni hauteur/);
  assert.match(errors, /sans attribut alt/);
});

test('contenus provisoires : balisés comptés, non balisés détectés', () => {
  const r = run(page('<span class="tbc" data-provisional="price">[PRIX À CONFIRMER]</span><span class="tbc" data-provisional="price">[PRIX À CONFIRMER]</span><p>Prix : [PRIX À CONFIRMER]</p><p>Lorem ipsum</p><a href="https://dar-el-bacha.example">x</a>'));
  assert.equal(r.provisional.get('price').count, 2);
  const stray = [...r.stray.keys()].join(' | ');
  assert.match(stray, /\[PRIX À CONFIRMER\]/);
  assert.match(stray, /Lorem ipsum/);
  assert.match(stray, /dar-el-bacha\.example/);
});
