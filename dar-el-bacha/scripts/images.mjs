#!/usr/bin/env node
/*
  Préparation des photographies : npm run images

  Source  : ressources/photos/<catégorie>/<nom>.(jpg|jpeg|png|tif|tiff|webp|avif)
            (originaux en haute définition fournis par le restaurant ; jamais publiés tels quels)
  Sortie  : src/assets/img/photos/<catégorie>/<nom>-<largeur>.(avif|webp|jpg)
            + src/assets/img/photos/manifest.json (dimensions, largeurs, couleur dominante)

  - Largeurs : 480, 800, 1200, 1600 et 2000 px, sans jamais agrandir l'original.
  - Formats : AVIF (le plus léger), WebP, puis JPEG pour les navigateurs anciens.
  - Orientation appliquée, couleurs converties en sRGB, métadonnées supprimées
    (dont la position GPS éventuellement enregistrée par l'appareil photo).
  - Incrémental : une photo déjà traitée et inchangée n'est pas recalculée.
  - Les fichiers générés qui ne correspondent plus à aucun original sont signalés, jamais supprimés.

  Dans les contenus, une photo est ensuite désignée par son nom : "restaurant/salle-principale".
  Le build en déduit la balise <picture> complète (srcset, sizes, dimensions, couleur de fond).

  Nécessite la bibliothèque sharp, utilisée uniquement ici (le build et le site n'en dépendent pas).
*/
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'ressources/photos');
const OUT = path.join(ROOT, 'src/assets/img/photos');
const MANIFEST = path.join(OUT, 'manifest.json');

const WIDTHS = [480, 800, 1200, 1600, 2000];
const SETTINGS = {
  avif: { quality: 50, effort: 4 },
  webp: { quality: 74, effort: 4 },
  jpg: { quality: 78, mozjpeg: true, progressive: true },
};
const VERSION = 1; // à incrémenter si les réglages changent : toutes les photos seront recalculées
const INPUT = /\.(jpe?g|png|tiff?|webp|avif)$/i;

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error(`✗ La bibliothèque « sharp » n'est pas installée.
  Elle sert uniquement à préparer les photos (AVIF, WebP, JPEG en plusieurs tailles).
  Installation (une fois) : npm install --save-dev sharp`);
  process.exit(2);
}

// Nom publié : minuscules, sans accents ni espaces (ex. « Salle principale.JPG » → « salle-principale »)
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function listFiles(dir, prefix = '') {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of (await readdir(dir)).sort()) {
    if (entry.startsWith('.')) continue;
    const full = path.join(dir, entry);
    if ((await stat(full)).isDirectory()) out.push(...(await listFiles(full, `${prefix}${entry}/`)));
    else out.push(prefix + entry);
  }
  return out;
}

const previous = existsSync(MANIFEST) ? JSON.parse(await readFile(MANIFEST, 'utf8')) : {};
const manifest = {};
const sources = (await listFiles(SOURCE)).filter((f) => INPUT.test(f));
const seen = new Map();
let generated = 0;
let skipped = 0;
let bytes = { source: 0, avif: 0 };

if (!sources.length) {
  console.log(`Aucune photo à préparer dans ${path.relative(ROOT, SOURCE)}/ (voir ressources/README.md).`);
}

for (const rel of sources) {
  const dir = path.dirname(rel) === '.' ? '' : path.dirname(rel).split('/').map(slug).join('/');
  const name = [dir, slug(path.basename(rel, path.extname(rel)))].filter(Boolean).join('/');
  if (seen.has(name)) {
    console.error(`✗ « ${rel} » et « ${seen.get(name)} » donnent le même nom « ${name} » : renommer l'un des deux.`);
    process.exit(1);
  }
  seen.set(name, rel);

  const input = await readFile(path.join(SOURCE, rel));
  bytes.source += input.length;
  const hash = createHash('sha256').update(input).update(String(VERSION)).digest('hex').slice(0, 16);
  const prev = previous[name];
  const expected = (entry) => entry.widths.flatMap((w) => entry.formats.map((ext) => path.join(OUT, `${name}-${w}.${ext}`)));
  if (prev && prev.hash === hash && expected(prev).every((f) => existsSync(f))) {
    manifest[name] = prev;
    skipped += 1;
    continue;
  }

  const meta = await sharp(input).metadata();
  const rotated = (meta.orientation || 1) >= 5;
  const width = rotated ? meta.height : meta.width;
  const height = rotated ? meta.width : meta.height;
  const widths = [...new Set([...WIDTHS.filter((w) => w < width), Math.min(width, WIDTHS.at(-1))])].sort((a, b) => a - b);
  const { dominant } = await sharp(input).rotate().stats();
  const color = `#${[dominant.r, dominant.g, dominant.b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;

  await mkdir(path.dirname(path.join(OUT, name)), { recursive: true });
  for (const w of widths) {
    const base = sharp(input).rotate().resize({ width: w, withoutEnlargement: true }).toColorspace('srgb');
    for (const ext of Object.keys(SETTINGS)) {
      const file = path.join(OUT, `${name}-${w}.${ext}`);
      const pipeline = ext === 'jpg' ? base.clone().flatten({ background: '#ffffff' }).jpeg(SETTINGS.jpg) : base.clone()[ext](SETTINGS[ext]);
      const info = await pipeline.toFile(file);
      if (ext === 'avif' && w === widths.at(-1)) bytes.avif += info.size;
    }
  }
  // Dimensions de référence = la plus grande variante produite (proportions de l'original conservées)
  const refWidth = widths.at(-1);
  const refHeight = Math.round((height * refWidth) / width);
  manifest[name] = { width: refWidth, height: refHeight, widths, formats: Object.keys(SETTINGS), color, source: `ressources/photos/${rel}`, hash };
  generated += 1;
  console.log(`  ✓ ${name}  (${width}×${height} → ${widths.join(', ')} px × AVIF/WebP/JPEG)`);
}

await mkdir(OUT, { recursive: true });
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

// Fichiers générés qui ne correspondent plus à aucun original : signalés, non supprimés
const keep = new Set(Object.entries(manifest).flatMap(([name, e]) => e.widths.flatMap((w) => e.formats.map((ext) => `${name}-${w}.${ext}`))));
const orphans = (await listFiles(OUT)).filter((f) => f !== 'manifest.json' && !keep.has(f));

console.log(`\n✓ Photos : ${generated} préparée(s), ${skipped} déjà à jour, ${Object.keys(manifest).length} au total → ${path.relative(ROOT, OUT)}/`);
if (generated && bytes.avif) console.log(`  Poids : originaux ${(bytes.source / 1048576).toFixed(1)} Mo → plus grande variante AVIF ${(bytes.avif / 1024).toFixed(0)} ko au total`);
if (orphans.length) console.log(`\n⚠ Fichiers sans original correspondant (à supprimer manuellement s'ils ne servent plus) :\n  - ${orphans.join('\n  - ')}`);
console.log('');
