// Tests des contrôles de contenus (npm test). Aucune dépendance : module node:test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSiteUrl, validateI18n, validateMenu, validateGallery, validateSite, validateMedia, collectImageRefs, MENU_CEILINGS } from '../scripts/lib/validate.mjs';
import { LANGS, DEFAULT_LANG } from '../src/routes.mjs';

const read = (p) => JSON.parse(readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8'));
const clone = (o) => structuredClone(o);
const dict = Object.fromEntries(LANGS.map((l) => [l.code, read(`i18n/${l.code}.json`)]));
const menu = read('content/menu.json');
const gallery = read('content/gallery.json');
const site = read('content/site.json');
const media = read('content/media.json');

test('les contenus livrés sont valides', () => {
  assert.deepEqual(validateI18n(dict, LANGS, DEFAULT_LANG).errors, []);
  assert.deepEqual(validateMenu(menu, dict, LANGS).errors, []);
  assert.deepEqual(validateGallery(gallery, dict, LANGS).errors, []);
  assert.deepEqual(validateSite(site, LANGS).errors, []);
  assert.deepEqual(validateMedia(media, LANGS).errors, []);
});

test('siteUrl : domaines fictifs, locaux et non sécurisés refusés', () => {
  for (const bad of ['https://dar-el-bacha.example', 'https://site.test', 'https://localhost:3000', 'http://www.dar-el-bacha.ma', 'https://example.com', 'pas une url', 'https://127.0.0.1']) {
    assert.ok(parseSiteUrl(bad).error, bad);
  }
  assert.deepEqual(parseSiteUrl(null), { url: null });
  assert.deepEqual(parseSiteUrl('https://www.dar-el-bacha.ma/'), { url: 'https://www.dar-el-bacha.ma' });
});

test('carte : les limites viennent de menu.json', () => {
  const m = clone(menu);
  m.categories[0].max = 3; // 4 entrées présentes
  assert.match(validateMenu(m, dict, LANGS).errors.join(), /4 propositions \(maximum 3\)/);

  const m2 = clone(menu);
  m2.maxTotal = 4; // 5 propositions présentes
  assert.match(validateMenu(m2, dict, LANGS).errors.join(), /5 propositions au total \(maximum 4\)/);

  const m3 = clone(menu);
  m3.categories[0].max = 5; // abaissé (sous le plafond du cahier) : accepté
  assert.deepEqual(validateMenu(m3, dict, LANGS).errors, []);
});

test('carte : plafonds du cahier des charges infranchissables (6/10/4/5, 25 au total, 4 catégories)', () => {
  const m = clone(menu);
  m.categories[0].max = 8;
  m.maxTotal = 30;
  const errors = validateMenu(m, dict, LANGS).errors.join('\n');
  assert.match(errors, /« max » \(8\) dépasse le plafond du cahier des charges \(6\)/);
  assert.match(errors, /« maxTotal » \(30\) dépasse le plafond du cahier des charges \(25\)/);

  // 7 entrées : refusé même si « max » n'est pas renseigné correctement
  const m2 = clone(menu);
  const entrees = m2.categories[0];
  while (entrees.items.length < 7) entrees.items.push({ ...clone(entrees.items[0]), id: `entree-${entrees.items.length}` });
  assert.match(validateMenu(m2, dict, LANGS).errors.join(), /7 propositions \(maximum 6\)/);

  // Catégorie supplémentaire, même traduite et même sous le total : refusée
  const m3 = clone(menu);
  m3.categories.push({ id: 'tajines', max: 2, items: [] });
  const d = clone(dict);
  for (const l of ['fr', 'en', 'ar']) d[l].pages.carte.categories.tajines = 'Tajines';
  assert.match(validateMenu(m3, d, LANGS).errors.join(), /catégorie non autorisée par le cahier des charges/);

  // 26 propositions réparties sous les plafonds par catégorie : impossible (6+10+4+5 = 25), et le total reste contrôlé
  assert.equal(MENU_CEILINGS.total, 25);
  assert.deepEqual({ ...MENU_CEILINGS.categories }, { entrees: 6, plats: 10, desserts: 4, boissons: 5 });
});

test('carte : ingrédients traduits, mise en avant booléenne', () => {
  const m = clone(menu);
  m.categories[0].items[0].ingredients = { fr: 'Aubergine' };
  m.categories[0].items[1].signature = 'oui';
  const errors = validateMenu(m, dict, LANGS).errors.join('\n');
  assert.match(errors, /ingredients : version en manquante/);
  assert.match(errors, /« signature » doit valoir true ou false/);
});

test('carte : catégorie sans intitulé traduit, plat incomplet, statut ou prix invalide', () => {
  const m = clone(menu);
  m.categories.push({ id: 'tajines', max: 2, items: [] });
  const item = m.categories[0].items[0];
  delete item.name.ar;
  item.description = { fr: 'x' };
  item.price = -5;
  item.status = 'brouillon';
  const errors = validateMenu(m, dict, LANGS).errors.join('\n');
  for (const l of ['fr', 'en', 'ar']) assert.match(errors, new RegExp(`intitulé manquant dans i18n/${l}\\.json`));
  assert.match(errors, /name : version ar manquante/);
  assert.match(errors, /description : version en manquante/);
  assert.match(errors, /« price » doit être un nombre positif/);
  assert.match(errors, /statut inconnu « brouillon »/);
});

test('carte : identifiant en double', () => {
  const m = clone(menu);
  m.categories[3].items.push(clone(m.categories[0].items[0]));
  assert.match(validateMenu(m, dict, LANGS).errors.join(), /identifiant en double/);
});

test('traductions : clé manquante, clé inconnue, texte vide, variable différente', () => {
  const d = clone(dict);
  delete d.en.cta.reserve;
  d.ar.cta.extra = 'x';
  d.ar.nav.home = ' ';
  d.en.footer.rights = '© Dar el Bacha';
  const errors = validateI18n(d, LANGS, DEFAULT_LANG).errors.join('\n');
  assert.match(errors, /en : clé manquante « cta\.reserve »/);
  assert.match(errors, /ar : clé inconnue « cta\.extra »/);
  assert.match(errors, /ar : texte vide ou invalide pour « nav\.home »/);
  assert.match(errors, /en : variables différentes de fr pour « footer\.rights »/);
});

test('informations officielles : formats contrôlés', () => {
  const s = clone(site);
  s.whatsapp.number = '+212 6 00';
  s.email = 'pas-un-email';
  s.story = { fr: 'Texte' };
  s.social.instagram = 'http://instagram.com/x';
  s.reservation.bookingSystem = { url: 'ftp://x' };
  s.reservation.conditions = { fr: 'Conditions' };
  const errors = validateSite(s, LANGS).errors.join('\n');
  assert.match(errors, /reservation\.conditions : version en manquante/);
  const s2 = clone(site);
  s2.reservation.bookingSystem = { url: 'https://reservation.example.ma', embedUrl: 'http://x' };
  assert.match(validateSite(s2, LANGS).errors.join(), /embedUrl : adresse https/);
  assert.match(errors, /whatsapp\.number/);
  assert.match(errors, /email : adresse invalide/);
  assert.match(errors, /story : version en manquante/);
  assert.match(errors, /social\.instagram/);
  assert.match(errors, /bookingSystem/);
});

test('emplacements photo : structure, nom de photo, texte alternatif', () => {
  const m = clone(media);
  m.home.signature.pop();
  m.histoire.ambiance.image = 'Photo Salle.JPG';
  m.contact.map.alt = { fr: 'Plan' };
  const errors = validateMedia(m, LANGS).errors.join('\n');
  assert.match(errors, /home\.signature : liste de 3 emplacements attendue/);
  assert.match(errors, /nom de photo invalide/);
  assert.match(errors, /contact\.map › alt : version en manquante/);

  const m2 = clone(media);
  m2.home.hero.image = 'restaurant/salle';
  const refs = collectImageRefs({ media: m2, gallery, menu });
  assert.deepEqual(refs.map((r) => r.ref), ['restaurant/salle']);
});

test('galerie : format et thème contrôlés', () => {
  const g = clone(gallery);
  g.items[0].format = 'panorama';
  g.items[1].theme = 'inconnu';
  const errors = validateGallery(g, dict, LANGS).errors.join('\n');
  assert.match(errors, /format « panorama » inconnu/);
  assert.match(errors, /thème « inconnu » sans intitulé/);
});
