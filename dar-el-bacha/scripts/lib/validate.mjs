/*
  Contrôles des contenus et des traductions, exécutés avant toute génération.
  Chaque fonction renvoie { errors, warnings } : une erreur interrompt le build,
  un avertissement est seulement affiché.
*/

import { validateOpeningHours } from './opening-hours.mjs';

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isPosInt = (n) => Number.isInteger(n) && n > 0;
const isNonEmpty = (s) => typeof s === 'string' && s.trim() !== '';
const get = (obj, key) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

/* ------------------------------------------------------------------ */
/* URL officielle du site                                              */
/* ------------------------------------------------------------------ */

// Domaines réservés aux exemples et aux tests, adresses locales : jamais une URL définitive.
const RESERVED_HOST = /(^|\.)(example|test|invalid|localhost|local)$|^(example\.(com|net|org)|localhost|0\.0\.0\.0|127(\.\d{1,3}){3})$/i;

/** Analyse site.siteUrl. Renvoie { url } (normalisée, sans / final, ou null si absente) ou { error }. */
export function parseSiteUrl(value) {
  if (value === null || value === undefined || value === '') return { url: null };
  let u;
  try {
    u = new URL(value);
  } catch {
    return { error: `siteUrl invalide : « ${value} ». Adresse complète attendue, par exemple https://www.domaine.ma` };
  }
  if (u.protocol !== 'https:') return { error: `siteUrl doit commencer par https:// (valeur actuelle : « ${value} »).` };
  if (RESERVED_HOST.test(u.hostname)) return { error: `siteUrl utilise un domaine fictif ou local (« ${u.hostname} ») : renseigner le domaine officiel.` };
  if (u.search || u.hash || u.username || u.password) return { error: `siteUrl ne doit contenir ni paramètres, ni ancre, ni identifiants (« ${value} »).` };
  return { url: (u.origin + u.pathname).replace(/\/+$/, '') };
}

const isHttpsUrl = (v) => {
  try { return new URL(v).protocol === 'https:'; } catch { return false; }
};

/* ------------------------------------------------------------------ */
/* Traductions                                                         */
/* ------------------------------------------------------------------ */

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) => (isObj(v) ? flatten(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]]));
const varsOf = (s) => (typeof s === 'string' ? (s.match(/\{\w+\}/g) || []).sort().join(' ') : '');

/** Mêmes clés, textes non vides et mêmes variables {x} dans toutes les langues. */
export function validateI18n(dict, langs, defaultLang) {
  const errors = [];
  const ref = new Map(flatten(dict[defaultLang]));
  for (const { code } of langs) {
    const entries = new Map(flatten(dict[code]));
    for (const [key, refValue] of ref) {
      if (!entries.has(key)) { errors.push(`Traduction ${code} : clé manquante « ${key} ».`); continue; }
      const v = entries.get(key);
      if (!isNonEmpty(v)) errors.push(`Traduction ${code} : texte vide ou invalide pour « ${key} ».`);
      else if (varsOf(v) !== varsOf(refValue)) errors.push(`Traduction ${code} : variables différentes de ${defaultLang} pour « ${key} » (${varsOf(v) || 'aucune'} au lieu de ${varsOf(refValue) || 'aucune'}).`);
    }
    for (const key of entries.keys()) if (!ref.has(key)) errors.push(`Traduction ${code} : clé inconnue « ${key} ».`);
  }
  return { errors, warnings: [] };
}

/* ------------------------------------------------------------------ */
/* Champs multilingues et images                                       */
/* ------------------------------------------------------------------ */

/** Texte traduit : objet { fr, en, ar } complet. */
function checkLocalized(value, langs, label, errors, { nullable = true } = {}) {
  if (value === null || value === undefined) {
    if (!nullable) errors.push(`${label} : texte manquant.`);
    return;
  }
  if (!isObj(value)) { errors.push(`${label} : objet attendu, une entrée par langue (${langs.map((l) => l.code).join(', ')}).`); return; }
  for (const { code } of langs) if (!isNonEmpty(value[code])) errors.push(`${label} : version ${code} manquante.`);
  for (const k of Object.keys(value)) if (!langs.some((l) => l.code === k)) errors.push(`${label} : langue inconnue « ${k} ».`);
}

/** Référence de photo : nom préparé par « npm run images » (ex. "restaurant/salle") ou { src, width, height }. */
export const PHOTO_NAME = /^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)*$/;
function checkImage(image, label, errors) {
  if (image === null || image === undefined) return;
  if (typeof image === 'string') {
    if (!PHOTO_NAME.test(image)) errors.push(`${label} : nom de photo invalide « ${image} » (minuscules, chiffres, tirets, ex. "restaurant/salle").`);
    return;
  }
  if (!isObj(image) || !isNonEmpty(image.src) || !isPosInt(image.width) || !isPosInt(image.height)) {
    errors.push(`${label} : image invalide, nom de photo attendu (ex. "restaurant/salle") ou { "src": "photos/nom", "width": 1600, "height": 1067 }.`);
  }
}

/* ------------------------------------------------------------------ */
/* Carte : menu.json est la seule source des catégories et des limites */
/* ------------------------------------------------------------------ */

const DISH_STATUS = ['a-valider'];

/**
 * Plafonds du cahier des charges (section 5.2) : limites strictes, jamais des minimums.
 * menu.json reste la source des données et peut seulement les abaisser ; toute autre catégorie est refusée.
 */
export const MENU_CEILINGS = Object.freeze({
  total: 25,
  categories: Object.freeze({ entrees: 6, plats: 10, desserts: 4, boissons: 5 }),
});

export function validateMenu(menu, dict, langs) {
  const errors = [];
  const warnings = [];
  const where = 'menu.json';

  if (!/^[A-Z]{3}$/.test(menu.currency || '')) errors.push(`${where} : « currency » doit être un code de devise ISO (ex. MAD).`);
  if (!isPosInt(menu.maxTotal)) errors.push(`${where} : « maxTotal » doit être un entier positif.`);
  else if (menu.maxTotal > MENU_CEILINGS.total) errors.push(`${where} : « maxTotal » (${menu.maxTotal}) dépasse le plafond du cahier des charges (${MENU_CEILINGS.total}).`);
  if (!Array.isArray(menu.categories) || !menu.categories.length) {
    errors.push(`${where} : « categories » doit contenir au moins une catégorie.`);
    return { errors, warnings, total: 0 };
  }

  const catIds = new Set();
  const itemIds = new Set();
  let total = 0;

  for (const cat of menu.categories) {
    const c = `${where} › catégorie « ${cat.id} »`;
    if (!/^[a-z0-9-]+$/.test(cat.id || '')) errors.push(`${where} : identifiant de catégorie invalide « ${cat.id} » (minuscules, chiffres, tirets).`);
    if (catIds.has(cat.id)) errors.push(`${c} : identifiant en double.`);
    catIds.add(cat.id);
    const ceiling = MENU_CEILINGS.categories[cat.id];
    if (ceiling === undefined) errors.push(`${c} : catégorie non autorisée par le cahier des charges (catégories autorisées : ${Object.keys(MENU_CEILINGS.categories).join(', ')} ; les tajines et spécialités fassies vont dans « plats »).`);
    if (!isPosInt(cat.max)) errors.push(`${c} : « max » doit être un entier positif.`);
    else if (ceiling !== undefined && cat.max > ceiling) errors.push(`${c} : « max » (${cat.max}) dépasse le plafond du cahier des charges (${ceiling}).`);
    if (!Array.isArray(cat.items)) { errors.push(`${c} : « items » doit être une liste.`); continue; }
    const limit = Math.min(isPosInt(cat.max) ? cat.max : Infinity, ceiling ?? Infinity);
    if (cat.items.length > limit) errors.push(`${c} : ${cat.items.length} propositions (maximum ${limit}).`);
    total += cat.items.length;

    for (const { code } of langs) {
      if (!isNonEmpty(get(dict[code], `pages.carte.categories.${cat.id}`))) {
        errors.push(`${c} : intitulé manquant dans i18n/${code}.json (pages.carte.categories.${cat.id}).`);
      }
    }

    for (const item of cat.items) {
      const i = `${where} › « ${item.id} »`;
      if (!/^[a-z0-9-]+$/.test(item.id || '')) errors.push(`${c} : identifiant de proposition invalide « ${item.id} ».`);
      if (itemIds.has(item.id)) errors.push(`${i} : identifiant en double.`);
      itemIds.add(item.id);
      checkLocalized(item.name, langs, `${i} › name`, errors, { nullable: false });
      checkLocalized(item.description, langs, `${i} › description`, errors);
      checkLocalized(item.ingredients, langs, `${i} › ingredients`, errors);
      if (item.signature !== undefined && typeof item.signature !== 'boolean') errors.push(`${i} : « signature » doit valoir true ou false.`);
      if (item.price !== null && item.price !== undefined && !(typeof item.price === 'number' && Number.isFinite(item.price) && item.price >= 0)) {
        errors.push(`${i} : « price » doit être un nombre positif ou null.`);
      }
      if (item.status !== undefined && item.status !== null && !DISH_STATUS.includes(item.status)) {
        errors.push(`${i} : statut inconnu « ${item.status} » (valeurs possibles : ${DISH_STATUS.join(', ')}, ou supprimer le champ).`);
      }
      checkImage(item.image, i, errors);
    }
  }

  const signatures = menu.categories.flatMap((c) => (Array.isArray(c.items) ? c.items : [])).filter((i) => i.signature === true).length;
  if (signatures > 4) errors.push(`${where} : ${signatures} plats emblématiques (« signature »: true), 4 au plus.`);
  const totalLimit = Math.min(isPosInt(menu.maxTotal) ? menu.maxTotal : Infinity, MENU_CEILINGS.total);
  if (total > totalLimit) errors.push(`${where} : ${total} propositions au total (maximum ${totalLimit}).`);
  for (const id of Object.keys(MENU_CEILINGS.categories)) {
    if (!catIds.has(id)) warnings.push(`${where} : catégorie « ${id} » absente (prévue par le cahier des charges).`);
  }
  const sumMax = menu.categories.reduce((s, c) => s + (isPosInt(c.max) ? c.max : 0), 0);
  if (isPosInt(menu.maxTotal) && sumMax > menu.maxTotal) {
    warnings.push(`${where} : la somme des maximums par catégorie (${sumMax}) dépasse « maxTotal » (${menu.maxTotal}) ; c'est « maxTotal » qui s'applique.`);
  }

  // Intitulés traduits pour des catégories qui n'existent plus dans la carte
  for (const { code } of langs) {
    for (const id of Object.keys(get(dict[code], 'pages.carte.categories') || {})) {
      if (!catIds.has(id)) warnings.push(`i18n/${code}.json : intitulé pour une catégorie absente de menu.json (pages.carte.categories.${id}).`);
    }
  }

  return { errors, warnings, total };
}

/* ------------------------------------------------------------------ */
/* Galerie                                                             */
/* ------------------------------------------------------------------ */

const GALLERY_FORMATS = ['portrait', 'paysage', 'carre'];

export function validateGallery(gallery, dict, langs) {
  const errors = [];
  const warnings = [];
  if (!Array.isArray(gallery.items)) return { errors: ['gallery.json : « items » doit être une liste.'], warnings };
  const ids = new Set();
  for (const item of gallery.items) {
    const g = `gallery.json › « ${item.id} »`;
    if (!isNonEmpty(item.id)) errors.push('gallery.json : emplacement sans identifiant.');
    if (ids.has(item.id)) errors.push(`${g} : identifiant en double.`);
    ids.add(item.id);
    if (!GALLERY_FORMATS.includes(item.format)) errors.push(`${g} : format « ${item.format} » inconnu (${GALLERY_FORMATS.join(', ')}).`);
    for (const { code } of langs) {
      if (!isNonEmpty(get(dict[code], `pages.galerie.themes.${item.theme}`))) errors.push(`${g} : thème « ${item.theme} » sans intitulé dans i18n/${code}.json.`);
    }
    checkLocalized(item.alt, langs, `${g} › alt`, errors);
    checkImage(item.image, g, errors);
    if (item.image && !item.alt) warnings.push(`${g} : photo sans texte alternatif (le thème est utilisé à la place).`);
  }
  return { errors, warnings };
}

/* ------------------------------------------------------------------ */
/* Informations officielles                                            */
/* ------------------------------------------------------------------ */

export function validateSite(site, langs) {
  const errors = [];
  const s = 'site.json';
  for (const key of ['name', 'nameAr', 'city', 'countryCode']) if (!isNonEmpty(site[key])) errors.push(`${s} : « ${key} » manquant.`);

  const { error } = parseSiteUrl(site.siteUrl);
  if (error) errors.push(`${s} : ${error}`);

  if (site.hours !== null && site.hours !== undefined && typeof site.hours !== 'string') checkLocalized(site.hours, langs, `${s} › hours`, errors);
  checkLocalized(site.story, langs, `${s} › story`, errors);
  errors.push(...validateOpeningHours(site.openingHours));
  if (site.priceRange !== null && site.priceRange !== undefined && !isNonEmpty(site.priceRange)) errors.push(`${s} › priceRange : texte attendu ou null.`);

  // Informations juridiques : textes simples, sauf durée de conservation et transferts (traduits)
  const legal = site.legal || {};
  for (const [k, v] of Object.entries(legal)) {
    if (k.startsWith('_') || k === 'validated' || k === 'dataRetention' || k === 'dataTransfers') continue;
    if (v !== null && !isNonEmpty(v)) errors.push(`${s} › legal.${k} : texte attendu ou null.`);
  }
  checkLocalized(legal.dataRetention, langs, `${s} › legal.dataRetention`, errors);
  checkLocalized(legal.dataTransfers, langs, `${s} › legal.dataTransfers`, errors);
  if (legal.dataContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(legal.dataContactEmail)) errors.push(`${s} › legal.dataContactEmail : adresse invalide.`);
  if (typeof (legal.validated ?? false) !== 'boolean') errors.push(`${s} › legal.validated : true ou false attendu.`);

  const wa = site.whatsapp?.number;
  if (wa !== null && wa !== undefined && !/^[1-9]\d{7,14}$/.test(String(wa))) {
    errors.push(`${s} › whatsapp.number : format international en chiffres uniquement, sans + ni espaces (ex. 2125XXXXXXXX).`);
  }
  if (site.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(site.email)) errors.push(`${s} › email : adresse invalide.`);
  if (site.phone !== null && site.phone !== undefined && !/^\+?[0-9 ().-]{8,20}$/.test(site.phone)) errors.push(`${s} › phone : numéro invalide.`);

  for (const [k, url] of Object.entries(site.social || {})) {
    if (k.startsWith('_')) continue;
    if (url && !isHttpsUrl(url)) errors.push(`${s} › social.${k} : adresse https:// attendue.`);
  }
  if (site.googleMapsUrl && !isHttpsUrl(site.googleMapsUrl)) errors.push(`${s} › googleMapsUrl : adresse https:// attendue.`);

  const endpoint = site.reservation?.formEndpoint;
  if (endpoint && !isHttpsUrl(endpoint) && !/^\/[^/]/.test(endpoint)) errors.push(`${s} › reservation.formEndpoint : adresse https:// ou chemin du site (/api/…) attendu.`);
  const system = site.reservation?.bookingSystem;
  if (system !== null && system !== undefined) {
    if (!(isObj(system) && isHttpsUrl(system.url))) errors.push(`${s} › reservation.bookingSystem : null ou { "url": "https://…" } attendu.`);
    else if (system.embedUrl !== undefined && system.embedUrl !== null && !isHttpsUrl(system.embedUrl)) errors.push(`${s} › reservation.bookingSystem.embedUrl : adresse https:// attendue.`);
  }
  checkLocalized(site.reservation?.conditions, langs, `${s} › reservation.conditions`, errors);
  const antiSpam = site.reservation?.antiSpam;
  if (antiSpam !== null && antiSpam !== undefined && !(isObj(antiSpam) && antiSpam.provider === 'turnstile' && isNonEmpty(antiSpam.siteKey))) {
    errors.push(`${s} › reservation.antiSpam : null ou { "provider": "turnstile", "siteKey": "…" } attendu.`);
  }

  if (!['symbole', 'complet'].includes(site.logo?.header || 'symbole')) errors.push(`${s} › logo.header : « symbole » ou « complet » attendu.`);
  const { latitude, longitude } = site.geo || {};
  if (latitude != null && !(typeof latitude === 'number' && Math.abs(latitude) <= 90)) errors.push(`${s} › geo.latitude : nombre attendu.`);
  if (longitude != null && !(typeof longitude === 'number' && Math.abs(longitude) <= 180)) errors.push(`${s} › geo.longitude : nombre attendu.`);
  if (site.ogImage && !String(site.ogImage).startsWith('/')) errors.push(`${s} › ogImage : chemin depuis la racine du site attendu (ex. /og-image.jpg).`);

  return { errors, warnings: [] };
}

/* ------------------------------------------------------------------ */
/* Emplacements photo des pages (media.json)                           */
/* ------------------------------------------------------------------ */

const SLOT_FORMATS = ['portrait', 'paysage', 'carre'];

/** Structure attendue : celle de media.json livré (mêmes emplacements, mêmes listes). */
export function validateMedia(media, langs) {
  const errors = [];
  const warnings = [];
  const slot = (value, label) => {
    if (!isObj(value) || !('image' in value)) { errors.push(`media.json › ${label} : emplacement invalide, { "image": null, "alt": null } attendu.`); return; }
    checkImage(value.image, `media.json › ${label}`, errors);
    checkLocalized(value.alt, langs, `media.json › ${label} › alt`, errors);
    if ('format' in value && !SLOT_FORMATS.includes(value.format)) errors.push(`media.json › ${label} : format « ${value.format} » inconnu.`);
    if (value.image && !value.alt) warnings.push(`media.json › ${label} : photo sans texte alternatif (considérée comme décorative).`);
  };
  const expect = {
    'home.hero': 1, 'home.philosophy': 1, 'home.mosaic': 3,
    'histoire.presentation': 1, 'histoire.philosophie': 1, 'histoire.inspiration': 1, 'histoire.savoirFaire': 1,
    'histoire.recevoir': 1, 'histoire.ambiance': 1, 'contact.map': 1,
  };
  for (const [key, n] of Object.entries(expect)) {
    const v = get(media, key);
    if (n > 1) {
      if (!Array.isArray(v) || v.length !== n) { errors.push(`media.json › ${key} : liste de ${n} emplacements attendue.`); continue; }
      v.forEach((x, i) => slot(x, `${key}[${i}]`));
    } else slot(v, key);
  }
  return { errors, warnings };
}

/** Toutes les références de photos utilisées dans les contenus : [{ ref, where }]. */
export function collectImageRefs({ media, gallery, menu }) {
  const refs = [];
  const visit = (v, where) => {
    if (Array.isArray(v)) v.forEach((x, i) => visit(x, `${where}[${i}]`));
    else if (isObj(v)) {
      if ('image' in v && v.image) refs.push({ ref: v.image, where });
      for (const [k, x] of Object.entries(v)) if (k !== 'image' && !k.startsWith('_')) visit(x, where ? `${where}.${k}` : k);
    }
  };
  visit(media, 'media.json');
  visit(gallery.items, 'gallery.json');
  menu.categories.forEach((c) => visit(c.items, `menu.json › ${c.id}`));
  return refs;
}
