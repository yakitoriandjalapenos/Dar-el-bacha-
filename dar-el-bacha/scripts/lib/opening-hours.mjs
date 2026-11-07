/*
  Horaires d'ouverture structurés (site.json › openingHours), partagés par le build (affichage,
  données structurées schema.org) et par le service des demandes de réservation (contrôle serveur).
  Le navigateur applique les mêmes règles (src/scripts/main.js) à partir des données publiées dans la page.

  Format :
    {
      "days": { "mon": [["12:00", "15:00"], ["19:00", "23:30"]], "tue": [], … "sun": [] },
      "closures": ["2026-12-31"]                 ← fermetures exceptionnelles (dates AAAA-MM-JJ)
    }
  Un jour sans plage ([]) est fermé. Une plage dont la fin est inférieure ou égale au début
  passe minuit (ex. ["19:00", "01:00"]).
*/

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const SCHEMA_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Contrôle du format ; renvoie la liste des erreurs. */
export function validateOpeningHours(oh, where = 'site.json › openingHours') {
  const errors = [];
  if (oh === null || oh === undefined) return errors;
  if (!isObj(oh) || !isObj(oh.days)) return [`${where} : objet { "days": { "mon": [["12:00", "15:00"]], … } } attendu.`];
  for (const d of DAYS) {
    const ranges = oh.days[d];
    if (!Array.isArray(ranges)) { errors.push(`${where} › days.${d} : liste de plages attendue ([] si fermé).`); continue; }
    for (const r of ranges) {
      if (!Array.isArray(r) || r.length !== 2 || !r.every((t) => TIME.test(t))) errors.push(`${where} › days.${d} : plage invalide ${JSON.stringify(r)} (format ["HH:MM", "HH:MM"]).`);
      else if (r[0] === r[1]) errors.push(`${where} › days.${d} : plage vide ${JSON.stringify(r)}.`);
    }
  }
  for (const k of Object.keys(oh.days)) if (!DAYS.includes(k)) errors.push(`${where} › days : jour inconnu « ${k} » (${DAYS.join(', ')}).`);
  if (oh.closures !== undefined && (!Array.isArray(oh.closures) || !oh.closures.every((x) => DATE.test(x) && !Number.isNaN(Date.parse(x))))) {
    errors.push(`${where} › closures : liste de dates AAAA-MM-JJ attendue.`);
  }
  return errors;
}

const minutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
/** Jour de la semaine (clé de DAYS) d'une date AAAA-MM-JJ, sans dépendre du fuseau du serveur. */
export const dayKey = (dateISO) => DAYS[(new Date(`${dateISO}T12:00:00Z`).getUTCDay() + 6) % 7];

/**
 * Le restaurant est-il ouvert à cette date et à cette heure ?
 * Renvoie { ok: true } ou { ok: false, reason: 'closure' | 'closed-day' | 'outside-hours' }.
 * Sans horaires renseignés, aucun contrôle n'est possible : { ok: true, unchecked: true }.
 */
export function isOpenAt(oh, dateISO, time) {
  if (!oh?.days) return { ok: true, unchecked: true };
  if ((oh.closures || []).includes(dateISO)) return { ok: false, reason: 'closure' };
  const ranges = oh.days[dayKey(dateISO)] || [];
  if (!ranges.length) return { ok: false, reason: 'closed-day' };
  const t = minutes(time);
  const inside = ranges.some(([a, b]) => {
    const s = minutes(a);
    const e = minutes(b);
    return e > s ? t >= s && t < e : t >= s || t < e;
  });
  return inside ? { ok: true } : { ok: false, reason: 'outside-hours' };
}

/** Lignes d'horaires localisées pour l'affichage : [{ day: 'lundi', ranges: ['12:00–15:00'], closed: false }]. */
export function hoursLines(oh, locale) {
  if (!oh?.days) return null;
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' });
  // 1er janvier 2024 : un lundi
  return DAYS.map((d, i) => {
    const ranges = oh.days[d] || [];
    return { day: fmt.format(new Date(Date.UTC(2024, 0, 1 + i))), ranges: ranges.map(([a, b]) => `${a}–${b}`), closed: !ranges.length };
  });
}

/** Spécification schema.org (OpeningHoursSpecification) dérivée des horaires. */
export function openingHoursSchema(oh) {
  if (!oh?.days) return null;
  return DAYS.flatMap((d, i) => (oh.days[d] || []).map(([opens, closes]) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: `https://schema.org/${SCHEMA_DAYS[i]}`,
    opens,
    closes: closes === '24:00' ? '23:59' : closes,
  })));
}
