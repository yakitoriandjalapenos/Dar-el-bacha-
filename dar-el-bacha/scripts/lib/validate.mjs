/*
  Contrôles des contenus et des traductions, exécutés avant toute génération.
  Chaque fonction renvoie { errors, warnings } : une erreur interrompt le build,
  un avertissement est seulement affiché.
*/

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

export function validateMenu(menu, dict, langs) {
  const errors = [];
  const warnings = [];
  const where = 'menu.json';

  if (!/^[A-Z]{3}$/.test(menu.currency || '')) errors.push(`${where} : « currency » doit être un code de devise ISO (ex. MAD).`);
  if (!isPosInt(menu.maxTotal)) errors.push(`${where} : « maxTotal » doit être un entier positif.`);
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
    if (!isPosInt(cat.max)) errors.push(`${c} : « max » doit être un entier positif.`);
    if (!Array.isArray(cat.items)) { errors.push(`${c} : « items » doit être une liste.`); continue; }
    if (isPosInt(cat.max) && cat.items.length > cat.max) errors.push(`${c} : ${cat.items.length} propositions (maximum ${cat.max}).`);
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
      if (item.price !== null && item.price !== undefined && !(typeof item.price === 'number' && Number.isFinite(item.price) && item.price >= 0)) {
        errors.push(`${i} : « price » doit être un nombre positif ou null.`);
      }
      if (item.status !== undefined && item.status !== null && !DISH_STATUS.includes(item.status)) {
        errors.push(`${i} : statut inconnu « ${item.status} » (valeurs possibles : ${DISH_STATUS.join(', ')}, ou supprimer le champ).`);
      }
      checkImage(item.image, i, errors);
    }
  }

  if (isPosInt(menu.maxTotal) && total > menu.maxTotal) errors.push(`${where} : ${total} propositions au total (maximum ${menu.maxTotal}).`);
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
  if (system !== null && system !== undefined && !(isObj(system) && isHttpsUrl(system.url))) {
    errors.push(`${s} › reservation.bookingSystem : null ou { "url": "https://…" } attendu.`);
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
    'home.hero': 1, 'home.philosophy': 1, 'home.signature': 3, 'home.mosaic': 3,
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
