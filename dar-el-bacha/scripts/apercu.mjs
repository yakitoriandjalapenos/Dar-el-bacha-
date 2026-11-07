#!/usr/bin/env node
/*
  Dossier de livraison de l'aperçu : npm run apercu

  Produit DAR-EL-BACHA-APERÇU/ à partir des fichiers qui font foi (jamais l'inverse) :
    02-PHOTOS/      copie de chaque photographie utilisée (JPEG 1200 px), rangée par section, et CORRESPONDANCE.md
                    (photo → section → fichier source → auteur → licence)
    03-CONTENUS/    CARTE.md (25 propositions, trois langues, prix), INFORMATIONS-RESTAURANT.md
    04-AVIS-DEMO/   AVIS.md (avis fictifs, trois langues) et copie de reviews.json
  Les documents rédigés à la main (01-CAHIER-DES-CHARGES, 05-DOCUMENTATION, direction artistique) ne sont pas modifiés.
  Les fichiers du site restent à leur place : modifier src/content/*.json, puis relancer cette commande.
*/
import { readFile, writeFile, mkdir, rm, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hoursLines } from './lib/opening-hours.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'DAR-EL-BACHA-APERÇU');
const read = async (p) => JSON.parse(await readFile(path.join(ROOT, p), 'utf8'));
const [site, menu, media, gallery, reviews, fr, en, ar] = await Promise.all([
  read('src/content/site.json'), read('src/content/menu.json'), read('src/content/media.json'), read('src/content/gallery.json'),
  read('src/content/reviews.json'), read('src/i18n/fr.json'), read('src/i18n/en.json'), read('src/i18n/ar.json'),
]);
const credits = existsSync(path.join(ROOT, 'src/content/photo-credits.json')) ? (await read('src/content/photo-credits.json')).items : [];
const manifest = existsSync(path.join(ROOT, 'src/assets/img/photos/manifest.json')) ? await read('src/assets/img/photos/manifest.json') : {};
const cell = (s) => String(s ?? '—').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const price = (n) => (n == null ? 'à confirmer' : `${n} DH${menu.pricesStatus === 'indicatif' ? ' (indicatif)' : ''}`);
const categoryName = (id) => fr.pages.carte.categories[id];

/* ---------- Photographies : section → photo ---------- */
const slots = [];
const add = (section, emplacement, ref, fichier) => slots.push({ section, emplacement, ref, fichier });
add('accueil', 'Grand visuel (hero)', media.home.hero.image, 'src/content/media.json › home.hero');
add('accueil', 'Philosophie', media.home.philosophy.image, 'src/content/media.json › home.philosophy');
media.home.mosaic.forEach((m, i) => add('accueil', `Mosaïque ${i + 1}`, m.image, `src/content/media.json › home.mosaic[${i}]`));
for (const [k, v] of Object.entries(media.histoire)) add('notre-histoire', k, v.image, `src/content/media.json › histoire.${k}`);
add('contact', 'Visuel du plan d\'accès', media.contact.map.image, 'src/content/media.json › contact.map');
gallery.items.forEach((g) => add('galerie', `${g.id} (${fr.pages.galerie.themes[g.theme] || g.theme})`, g.image, `src/content/gallery.json › ${g.id}`));
for (const c of menu.categories) for (const it of c.items) add(`carte/${c.id}`, it.name.fr, it.image, `src/content/menu.json › ${it.id}`);

await rm(path.join(OUT, '02-PHOTOS'), { recursive: true, force: true });
await mkdir(path.join(OUT, '02-PHOTOS'), { recursive: true });
const rows = [];
for (const s of slots) {
  if (typeof s.ref !== 'string') { rows.push({ ...s, copie: '— (emplacement provisoire, aucune photo)' }); continue; }
  const m = manifest[s.ref];
  const w = m ? (m.widths.includes(1200) ? 1200 : m.widths.at(-1)) : null;
  const src = w && path.join(ROOT, 'src/assets/img/photos', `${s.ref}-${w}.jpg`);
  const slug = s.emplacement.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const copie = `02-PHOTOS/${s.section}/${slug}.jpg`;
  if (src && existsSync(src)) {
    await mkdir(path.dirname(path.join(OUT, copie)), { recursive: true });
    await copyFile(src, path.join(OUT, copie));
  }
  rows.push({ ...s, copie, credit: credits.find((c) => c.name === s.ref), source: m?.source });
}
const used = rows.filter((r) => r.credit);
await writeFile(path.join(OUT, '02-PHOTOS/CORRESPONDANCE.md'), `# Photographies de l'aperçu — correspondance

Document généré par \`npm run apercu\` (ne pas modifier à la main).

**Toutes ces photographies sont des illustrations** issues de Wikimedia Commons, sous licence libre. Elles ne représentent
**pas** le restaurant DAR EL BACHA : le site les signale par la mention « Photo d'illustration », un bandeau d'aperçu et
leurs crédits dans les mentions légales. La mise en production est refusée tant qu'il en reste une.

- Copies de consultation (JPEG 1200 px) : ce dossier, rangées par section.
- Fichiers sources utilisés par le site : \`ressources/photos/illustrations/\` (à ne pas déplacer).
- Versions optimisées publiées (AVIF, WebP, JPEG, 480 à 2000 px) : \`src/assets/img/photos/illustrations/\`.

| Section | Emplacement | Photo (nom dans le site) | Copie | Réglage | Auteur | Licence | Source |
|---|---|---|---|---|---|---|---|
${rows.map((r) => `| ${cell(r.section)} | ${cell(r.emplacement)} | ${cell(typeof r.ref === 'string' ? `\`${r.ref}\`` : '—')} | ${cell(r.copie)} | \`${cell(r.fichier)}\` | ${cell(r.credit?.author)} | ${r.credit ? `[${cell(r.credit.license)}](${r.credit.licenseUrl})` : '—'} | ${r.credit ? `[Wikimedia Commons](${r.credit.source})` : '—'} |`).join('\n')}

${used.length} emplacement(s) illustré(s) sur ${rows.length} ; ${new Set(used.map((r) => r.ref)).size} photographie(s) différente(s).

## Obligations des licences

- **CC BY** et **CC BY-SA** : citer l'auteur, la licence (avec son lien) et la source, et signaler toute modification. Le site le fait
  dans les mentions légales (« Photographies d'illustration de l'aperçu ») ; les images ont seulement été redimensionnées et
  converties (AVIF, WebP, JPEG), sans recadrage ni retouche.
- **Domaine public / CC0** : aucune obligation ; la source est tout de même citée.
- Aucune de ces images ne doit être présentée comme une photographie du restaurant, ni utilisée hors de cet aperçu sans
  relire sa licence sur Wikimedia Commons.
`);

/* ---------- Carte ---------- */
await mkdir(path.join(OUT, '03-CONTENUS'), { recursive: true });
const total = menu.categories.reduce((a, c) => a + c.items.length, 0);
await writeFile(path.join(OUT, '03-CONTENUS/CARTE.md'), `# La carte — ${total} propositions (aperçu)

Document généré par \`npm run apercu\` à partir de \`src/content/menu.json\` (le fichier qui fait foi : c'est lui qu'il faut modifier).

- Statut : **propositions à valider par le restaurant** (noms, descriptions, ingrédients, prix).
- Prix : **${menu.pricesStatus === 'indicatif' ? 'indicatifs, en dirhams (DH), à confirmer' : 'validés, en dirhams (DH)'}**.
- Plafonds du cahier des charges : 6 entrées, 10 plats principaux, 4 desserts, 5 boissons, 25 au total (contrôlés à chaque compilation).
- ★ = plat emblématique mis en avant sur l'accueil.

${menu.categories.map((c) => `## ${categoryName(c.id)} (${c.items.length})

| | Plat (FR) | Description (FR) | Ingrédients (FR) | Prix | English | العربية | Photo |
|---|---|---|---|---|---|---|---|
${c.items.map((i) => `| ${i.signature ? '★' : ''} | **${cell(i.name.fr)}** | ${cell(i.description?.fr)} | ${cell(i.ingredients?.fr)} | ${price(i.price)} | ${cell(i.name.en)} — ${cell(i.description?.en)} | ${cell(i.name.ar)} — ${cell(i.description?.ar)} | ${typeof i.image === 'string' ? `\`${i.image}\`` : '—'} |`).join('\n')}
`).join('\n')}`);

/* ---------- Informations du restaurant ---------- */
const v = (x) => (x == null || x === '' ? '**à fournir**' : x);
const hours = hoursLines(site.openingHours, 'fr-MA');
await writeFile(path.join(OUT, '03-CONTENUS/INFORMATIONS-RESTAURANT.md'), `# Informations du restaurant (aperçu)

Document généré par \`npm run apercu\` à partir de \`src/content/site.json\` (le fichier qui fait foi).
La liste complète de ce qui reste à fournir est dans \`INFORMATIONS-A-FOURNIR.md\` (\`npm run contenus\`).

| Information | Valeur | Où la modifier |
|---|---|---|
| Nom | ${site.name} (${site.nameAr}) | \`site.json › name, nameAr\` |
| Adresse | ${v(site.address?.street)}, ${site.city} | \`site.json › address\` (code postal et quartier : ${site.address?.postalCode ? site.address.postalCode : 'à fournir'}) |
| Téléphone | ${v(site.phone)} | \`site.json › phone\` |
| E-mail | ${v(site.email)} | \`site.json › email\` |
| WhatsApp | ${v(site.whatsapp?.number)} | \`site.json › whatsapp.number\` |
| Horaires | ${hours ? hours.map((l) => `${l.day} : ${l.closed ? 'fermé' : l.ranges.join(' et ')}`).join(' ; ') : '**à fournir**'} | \`site.json › openingHours\` |
| Statut des horaires | ${site.hoursConfirmed === false ? '**proposés, à confirmer** (affichés avec cette mention)' : 'confirmés'} | \`site.json › hoursConfirmed\` |
| Réseaux sociaux | ${Object.entries(site.social || {}).map(([k, x]) => `${k} : ${x || 'à fournir'}`).join(' ; ')} | \`site.json › social\` |
`);

/* ---------- Avis de démonstration ---------- */
await mkdir(path.join(OUT, '04-AVIS-DEMO'), { recursive: true });
await copyFile(path.join(ROOT, 'src/content/reviews.json'), path.join(OUT, '04-AVIS-DEMO/reviews.json'));
const starsTxt = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
await writeFile(path.join(OUT, '04-AVIS-DEMO/AVIS.md'), `# Témoignages — ${reviews.demo ? 'AVIS FICTIFS DE DÉMONSTRATION' : 'avis réels'}

Document généré par \`npm run apercu\` à partir de \`src/content/reviews.json\` (le fichier qui fait foi ; copie dans ce dossier).

${reviews.demo ? `Ces ${reviews.items.length} avis sont **inventés pour l'aperçu**. Ils ne citent aucun client réel, aucune date de visite, aucune note
Google ni statistique. Le site les affiche sous la mention « ${fr.pages.home.reviews.demo} » (EN : « ${en.pages.home.reviews.demo} » ;
AR : « ${ar.pages.home.reviews.demo} ») et la mise en production est refusée tant que \`"demo": true\`.` : 'Avis réels publiés avec l\'accord de leurs auteurs.'}

## Remplacer par de vrais avis

1. Ouvrir \`src/content/reviews.json\`.
2. Remplacer chaque élément de \`items\` : \`text\` et \`context\` en français, anglais et arabe, \`rating\` (1 à 5),
   \`author\` facultatif (ex. prénom et initiale, avec l'accord de la personne).
3. Passer \`"demo"\` à \`false\` : la mention « avis fictifs » disparaît.
4. \`npm run build\` vérifie le fichier ; \`npm run apercu\` met ce document à jour.

## Les avis

${reviews.items.map((r, i) => `### ${i + 1}. ${r.context.fr} — ${starsTxt(r.rating)}

- FR : « ${r.text.fr} »
- EN : “${r.text.en}” (${r.context.en})
- AR : « ${r.text.ar} » (${r.context.ar})
`).join('\n')}`);

console.log(`✓ Dossier de livraison mis à jour : ${path.relative(ROOT, OUT)}/ (${used.length} photo(s) illustrée(s), ${total} propositions, ${reviews.items.length} avis)`);
