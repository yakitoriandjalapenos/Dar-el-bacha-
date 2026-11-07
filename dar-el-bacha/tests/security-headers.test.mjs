// En-têtes de sécurité : politique CSP déduite des pages, lecture du fichier _headers par le serveur local.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildCsp, headersFile, parseHeaders, headersFor, inlineScripts, embedOrigins, TURNSTILE_ORIGIN } from '../scripts/lib/security-headers.mjs';

const page = (extra = '') => `<!doctype html><html><head><script>var a=1</script><script src="/assets/main.js" defer></script>
<script type="application/ld+json">{"@type":"Restaurant"}</script></head><body>${extra}</body></html>`;
const sha = (s) => `'sha256-${createHash('sha256').update(s).digest('base64')}'`;
const directive = (csp, name) => csp.split('; ').find((d) => d.startsWith(`${name} `));

test('scripts intégrés autorisés par empreinte, données JSON-LD et fichiers externes exclus', () => {
  assert.deepEqual(inlineScripts(page()), ['var a=1']);
  const csp = buildCsp({ pages: [page(), page()] });
  assert.equal(directive(csp, 'script-src'), `script-src 'self' ${sha('var a=1')}`);
  assert.doesNotMatch(csp, /unsafe-eval|script-src[^;]*unsafe-inline/);
  for (const d of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'self'", "frame-src 'none'", "form-action 'self'"]) assert.ok(csp.includes(d), d);
});

test('cadres autorisés seulement pour les modules présents dans les pages', () => {
  const html = page('<a data-embed="https://maps.google.com/maps?q=x&amp;output=embed">c</a><button data-embed="https://resa.exemple-de-test.ma/module">m</button><a data-embed="http://non-securise.ma/">x</a>');
  assert.deepEqual(embedOrigins(html), ['https://maps.google.com', 'https://resa.exemple-de-test.ma']);
  const csp = buildCsp({ pages: [html] });
  assert.equal(directive(csp, 'frame-src'), 'frame-src https://maps.google.com https://resa.exemple-de-test.ma https://www.google.com');
});

test('Turnstile et service de réservation sur un autre domaine : origines ajoutées aux seules directives utiles', () => {
  const csp = buildCsp({ pages: [page()], formEndpoint: 'https://api.exemple-de-test.ma/reservation', turnstile: true });
  assert.match(directive(csp, 'script-src'), new RegExp(`${TURNSTILE_ORIGIN}$`));
  assert.equal(directive(csp, 'frame-src'), `frame-src ${TURNSTILE_ORIGIN}`);
  assert.equal(directive(csp, 'connect-src'), "connect-src 'self' https://api.exemple-de-test.ma");
  assert.equal(directive(csp, 'form-action'), "form-action 'self' https://api.exemple-de-test.ma");
  // Adresse relative (même domaine) : rien à ajouter
  assert.equal(directive(buildCsp({ pages: [page()], formEndpoint: '/api/reservation' }), 'connect-src'), "connect-src 'self'");
});

test('HSTS en production uniquement, noindex en prévisualisation uniquement', () => {
  const prod = headersFile({ csp: "default-src 'self'", prod: true });
  const preview = headersFile({ csp: "default-src 'self'", prod: false });
  assert.match(prod, /Strict-Transport-Security: max-age=31536000\n/);
  assert.doesNotMatch(prod, /X-Robots-Tag|includeSubDomains|preload/);
  assert.match(preview, /X-Robots-Tag: noindex, nofollow/);
  assert.doesNotMatch(preview, /Strict-Transport-Security/);
});

test('lecture du fichier _headers et en-têtes applicables à une adresse', () => {
  const rules = parseHeaders(headersFile({ csp: "default-src 'self'", prod: false, assetsPath: '/assets/*' }));
  const html = headersFor(rules, '/fr/');
  assert.equal(html['Content-Security-Policy'], "default-src 'self'");
  assert.equal(html['X-Content-Type-Options'], 'nosniff');
  assert.equal(html['Cache-Control'], undefined);
  assert.equal(headersFor(rules, '/assets/main.123.js')['Cache-Control'], 'public, max-age=31536000, immutable');
});
