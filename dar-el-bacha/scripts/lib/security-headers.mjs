/*
  En-têtes de sécurité HTTP, produits par le build à partir des pages générées (aucune liste tenue à la main) :

  - Content-Security-Policy stricte : seuls les fichiers du site s'exécutent ; les scripts intégrés aux pages
    (script de repli JavaScript) sont autorisés par leur empreinte SHA-256, recalculée à chaque build ;
    les cadres externes (carte, module de réservation) et l'anti-robot Turnstile ne sont autorisés
    que s'ils sont réellement configurés.
  - Strict-Transport-Security uniquement en production (HTTPS obligatoire sur le domaine officiel).

  Le fichier dist/_headers suit le format Netlify / Cloudflare Pages ; HEBERGEMENT.md explique comment
  reporter les mêmes valeurs chez un autre hébergeur. Le serveur local l'applique aussi (tests).
*/
import { createHash } from 'node:crypto';

export const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com';
// La carte intégrée (maps.google.com) peut rediriger vers www.google.com
const MAP_ORIGINS = { 'https://maps.google.com': ['https://maps.google.com', 'https://www.google.com'] };

const sha256 = (s) => `'sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}'`;
const originOf = (url) => { try { const u = new URL(url); return u.protocol === 'https:' ? u.origin : null; } catch { return null; } };
const unescapeAttr = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** Scripts exécutables écrits dans les pages (hors données JSON-LD, que le navigateur n'exécute pas). */
export function inlineScripts(html) {
  const out = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1];
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const type = attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i)?.[1]?.toLowerCase();
    if (type && type !== 'text/javascript' && type !== 'module') continue;
    out.push(m[2]);
  }
  return out;
}

/** Origines des modules chargés à la demande (attribut data-embed). */
export function embedOrigins(html) {
  return [...html.matchAll(/\bdata-embed="([^"]+)"/g)].map((m) => originOf(unescapeAttr(m[1]))).filter(Boolean);
}

/**
 * @param {object} o
 * @param {string[]} o.pages        HTML des pages publiées
 * @param {string|null} o.formEndpoint  adresse du service de réservation (relative ou https)
 * @param {boolean} o.turnstile     anti-robot Cloudflare Turnstile configuré
 */
export function buildCsp({ pages, formEndpoint = null, turnstile = false }) {
  const hashes = new Set();
  const frames = new Set();
  for (const html of pages) {
    inlineScripts(html).forEach((s) => hashes.add(sha256(s)));
    embedOrigins(html).forEach((o) => (MAP_ORIGINS[o] || [o]).forEach((x) => frames.add(x)));
  }
  const endpoint = formEndpoint && /^https:/i.test(formEndpoint) ? originOf(formEndpoint) : null;
  if (turnstile) frames.add(TURNSTILE_ORIGIN);

  const list = (...items) => [...new Set(items.flat().filter(Boolean))].join(' ');
  const directives = [
    ['default-src', "'self'"],
    ['script-src', list("'self'", [...hashes].sort(), turnstile && TURNSTILE_ORIGIN)],
    // Attributs style="--variable:…" (décalages d'animation, largeur du logo) : pas de feuille externe ni de script
    ['style-src', "'self' 'unsafe-inline'"],
    ['img-src', "'self' data:"],
    ['font-src', "'self'"],
    ['connect-src', list("'self'", endpoint)],
    ['form-action', list("'self'", endpoint)],
    ['frame-src', frames.size ? [...frames].sort().join(' ') : "'none'"],
    ['manifest-src', "'self'"],
    ['object-src', "'none'"],
    ['base-uri', "'self'"],
    ['frame-ancestors', "'self'"],
  ];
  return directives.map(([k, v]) => `${k} ${v}`).join('; ');
}

/** Contenu de dist/_headers (format Netlify / Cloudflare Pages). */
export function headersFile({ csp, prod, assetsPath = '/assets/*' }) {
  const lines = [
    assetsPath,
    '  Cache-Control: public, max-age=31536000, immutable',
    '/*',
    `  Content-Security-Policy: ${csp}`,
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    '  X-Frame-Options: SAMEORIGIN',
    '  Cross-Origin-Opener-Policy: same-origin',
    // HTTPS obligatoire, seulement sur le domaine officiel ; sous-domaines et liste « preload » : décision du propriétaire
    prod && '  Strict-Transport-Security: max-age=31536000',
    !prod && '  X-Robots-Tag: noindex, nofollow',
  ];
  return `${lines.filter(Boolean).join('\n')}\n`;
}

/** Lecture d'un fichier _headers : [{ pattern, headers: [[nom, valeur]] }]. */
export function parseHeaders(text) {
  const rules = [];
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) { rules.push({ pattern: line.trim(), headers: [] }); continue; }
    const i = line.indexOf(':');
    if (i > 0 && rules.length) rules.at(-1).headers.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]);
  }
  return rules;
}

/** En-têtes applicables à une adresse (motifs « /chemin/* » ou exacts, dans l'ordre du fichier). */
export function headersFor(rules, pathname) {
  const out = {};
  for (const { pattern, headers } of rules) {
    const match = pattern.endsWith('*') ? pathname.startsWith(pattern.slice(0, -1)) : pathname === pattern;
    if (match) for (const [k, v] of headers) out[k] = v;
  }
  return out;
}
