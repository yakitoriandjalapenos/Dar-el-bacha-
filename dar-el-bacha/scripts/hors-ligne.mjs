#!/usr/bin/env node
/*
  Version hors ligne de l'aperçu : npm run apercu:hors-ligne

  Produit apercu-hors-ligne/DAR-EL-BACHA-apercu/ (et un fichier ZIP) à partir de dist/ : un dossier que l'on ouvre
  en double-cliquant sur « OUVRIR-LE-SITE.html », sans serveur, sans Node.js, sans connexion Internet.
  Rien n'est publié. dist/ et le site ne sont pas modifiés.

  Adaptations, uniquement dans la copie :
  - adresses partant de la racine (« /fr/la-carte/ ») converties en chemins relatifs (« ../la-carte/index.html ») ;
  - photographies : AVIF (toutes tailles) + JPEG 800 px en secours, agrandissements en AVIF ; WebP et grands JPEG
    retirés pour alléger le dossier (environ 25 Mo au lieu de 95) ;
  - polices et motifs SVG intégrés à la feuille de style (le navigateur les refuse sinon en ouverture directe) ;
  - manifeste d'application et préchargements de polices retirés (inutiles hors ligne).
  Limites : le formulaire n'envoie rien (il l'indique), le plan Google Maps et WhatsApp nécessitent Internet.
*/
import { readFile, writeFile, mkdir, rm, cp, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'apercu-hors-ligne');
const NAME = 'DAR-EL-BACHA-apercu';
const DEST = path.join(OUT, NAME);
const SITE = path.join(DEST, 'site');
if (!existsSync(path.join(DIST, 'fr/index.html'))) { console.error('✗ dist/ absent : lancer d\'abord npm run build'); process.exit(1); }

async function list(dir, base = dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await list(p, base))); else out.push(path.relative(base, p));
  }
  return out;
}

await rm(OUT, { recursive: true, force: true });
await mkdir(SITE, { recursive: true });

// Fichiers copiés : tout sauf les variantes WebP, les JPEG de plus de 800 px et les fichiers propres à un serveur
const PHOTO = /^assets\/img\/photos\/(.+)-(\d+)\.(avif|webp|jpg)$/;
const files = (await list(DIST)).map((f) => f.split(path.sep).join('/'));
const photoWidths = new Map(); // nom → largeurs AVIF disponibles
for (const f of files) { const m = f.match(PHOTO); if (m && m[3] === 'avif') photoWidths.set(m[1], [...(photoWidths.get(m[1]) || []), Number(m[2])]); }
const fallbackWidth = (name) => { const w = (photoWidths.get(name) || []).sort((a, b) => a - b); return w.includes(800) ? 800 : w[0]; };
for (const f of files) {
  if (['_headers', 'robots.txt', 'site.webmanifest'].includes(f)) continue;
  const m = f.match(PHOTO);
  if (m && (m[3] === 'webp' || (m[3] === 'jpg' && Number(m[2]) !== fallbackWidth(m[1])))) continue;
  await mkdir(path.dirname(path.join(SITE, f)), { recursive: true });
  await cp(path.join(DIST, f), path.join(SITE, f));
}

// Chemin relatif depuis une page vers une adresse du site (« / » final → index.html)
const rel = (fromFile, url) => {
  const [p, hash = ''] = url.split('#');
  let target = p.replace(/^\//, '');
  if (target === '' || target.endsWith('/')) target += 'index.html';
  let r = path.posix.relative(path.posix.dirname(fromFile), target) || 'index.html';
  return `${r}${hash ? `#${hash}` : ''}`;
};
const photoAvif = (url) => {
  const m = url.match(/^\/assets\/img\/photos\/(.+)-(\d+)\.jpg$/);
  if (!m) return null;
  return { fallback: `/assets/img/photos/${m[1]}-${fallbackWidth(m[1])}.jpg`, large: `/assets/img/photos/${m[1]}-${Math.max(...photoWidths.get(m[1]))}.avif` };
};

// Ouvert en double-clic (file://), le navigateur refuse les polices et les masques SVG chargés depuis d'autres fichiers :
// ils sont intégrés à la feuille de style (data:), et les préchargements de polices retirés.
const MIME = { woff2: 'font/woff2', svg: 'image/svg+xml' };
for (const f of files.filter((x) => /^assets\/[^/]+\.css$/.test(x))) {
  const file = path.join(SITE, f);
  let css = await readFile(file, 'utf8');
  const urls = [...new Set([...css.matchAll(/url\("((?:fonts|img)\/[^")]+\.(woff2|svg))"\)/g)].map((m) => m[1]))];
  for (const u of urls) {
    const data = (await readFile(path.join(SITE, 'assets', u))).toString('base64');
    css = css.split(`url("${u}")`).join(`url("data:${MIME[u.split('.').pop()]};base64,${data}")`);
  }
  await writeFile(file, css);
}

let pages = 0;
for (const f of files.filter((x) => x.endsWith('.html'))) {
  const file = path.join(SITE, f);
  let html = await readFile(file, 'utf8');
  html = html
    .replace(/<link rel="manifest"[^>]*>\n?/g, '')
    .replace(/<link rel="preload"[^>]*as="font"[^>]*>\n?/g, '')
    .replace(/<source type="image\/webp"[^>]*>\s*/g, '')
    // Photo de secours : JPEG 800 px ; agrandissement (lien de la galerie) : grande version AVIF
    .replace(/(<img\b[^>]*\ssrc=")(\/assets\/img\/photos\/[^"]+\.jpg)"/g, (_, a, u) => `${a}${photoAvif(u)?.fallback || u}"`)
    .replace(/(<a\b[^>]*\shref=")(\/assets\/img\/photos\/[^"]+\.jpg)"/g, (_, a, u) => `${a}${photoAvif(u)?.large || u}"`)
    .replace(/\s(href|src|action|data-full)="(\/(?!\/)[^"]*)"/g, (_, k, u) => ` ${k}="${rel(f, u)}"`)
    .replace(/\ssrcset="([^"]+)"/g, (_, v) => ` srcset="${v.split(',').map((s) => { const [u, w] = s.trim().split(/\s+/); return `${u.startsWith('/') && !u.startsWith('//') ? rel(f, u) : u}${w ? ` ${w}` : ''}`; }).join(', ')}"`)
    .replace(/(<meta http-equiv="refresh" content="0; url=)(\/[^"]*)"/g, (_, a, u) => `${a}${rel(f, u)}"`);
  await writeFile(file, html);
  pages += 1;
}

await writeFile(path.join(DEST, 'OUVRIR-LE-SITE.html'), `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=site/fr/index.html"><title>DAR EL BACHA — aperçu</title></head>
<body style="font-family:system-ui,sans-serif;padding:2rem"><p><a href="site/fr/index.html">Ouvrir l'aperçu du site DAR EL BACHA</a></p></body></html>\n`);
await writeFile(path.join(DEST, 'LISEZ-MOI.txt'), `APERÇU HORS LIGNE — DAR EL BACHA

Pour voir le site : double-cliquer sur « OUVRIR-LE-SITE.html ».
Il s'ouvre dans votre navigateur (Chrome, Edge, Firefox ou Safari récents). Aucun logiciel à installer, rien n'est publié.

- Français, English, العربية : sélecteur de langue en haut de chaque page.
- Ceci est un APERÇU DE DÉMONSTRATION : photographies d'illustration (banques d'images libres, pas le restaurant),
  avis fictifs, prix indicatifs et horaires proposés, en attente de validation.
- Le formulaire de réservation n'envoie rien dans cette version (il l'indique).
- Le plan Google Maps et le bouton WhatsApp nécessitent une connexion Internet.
- Ne pas déplacer ni renommer les fichiers du dossier « site ».
`);

const zip = path.join(OUT, `${NAME}.zip`);
execFileSync('zip', ['-qr', zip, NAME], { cwd: OUT });
const size = (p) => Number(execFileSync('du', ['-sk', p]).toString().split('\t')[0]);
console.log(`✓ Aperçu hors ligne : ${path.relative(ROOT, DEST)}/ (${pages} pages, ${Math.round(size(DEST) / 1024)} Mo) → ${path.relative(ROOT, zip)} (${Math.round(size(zip) / 1024)} Mo)`);
