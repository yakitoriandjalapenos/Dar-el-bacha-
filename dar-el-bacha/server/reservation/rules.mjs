/*
  Validation côté serveur d'une demande de réservation (cahier des charges 4.5 A, section 13).
  Mêmes règles que le navigateur (src/scripts/main.js), qui ne sert qu'au confort : seul ce contrôle fait foi.
  Ne renvoie que des codes ; les messages sont traduits côté site (i18n › pages.reservation.form.errors).
*/
import { isOpenAt } from '../../scripts/lib/opening-hours.mjs';

export const LIMITS = { name: 120, email: 160, phone: 24, message: 1000 };
export const GUESTS = [...Array.from({ length: 12 }, (_, i) => String(i + 1)), '12+'];
export const LANGS = ['fr', 'en', 'ar'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^[+0-9 ().-]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/; // caractères de contrôle (retour à la ligne permis)
const CONTROL_LINE = /[\u0000-\u001f\u007f]/; // champs d'une ligne : aucun caractère de contrôle, ni retour à la ligne

/** Date du jour au Maroc (AAAA-MM-JJ), quel que soit le fuseau du serveur. */
export const todayInMorocco = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca' }).format(now);
const addDays = (iso, n) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const str = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());

/**
 * @param {Record<string, unknown>} input  champs reçus (JSON ou formulaire)
 * @param {object} o
 * @param {Date} [o.now]
 * @param {object|null} [o.openingHours]  site.json › openingHours (contrôle si renseigné)
 * @param {number} [o.maxDaysAhead]       horizon de réservation (jours)
 * @param {number} [o.minFillMs]          délai minimal de saisie (anti-robot), si le navigateur l'a mesuré
 * @returns {{ ok: boolean, spam?: string, errors: Record<string,string>, data?: object }}
 */
export function validateRequest(input, { now = new Date(), openingHours = null, maxDaysAhead = 180, minFillMs = 3000 } = {}) {
  const v = Object.fromEntries(['name', 'email', 'phone', 'date', 'time', 'guests', 'message', 'consent', 'website', 'started', 'lang'].map((k) => [k, str(input?.[k])]));

  // Anti-robot : piège invisible rempli, ou formulaire rempli en un temps impossible pour un humain
  if (v.website) return { ok: false, spam: 'honeypot', errors: {} };
  if (v.started && /^\d+$/.test(v.started)) {
    const elapsed = now.getTime() - Number(v.started);
    if (elapsed >= 0 && elapsed < minFillMs) return { ok: false, spam: 'too-fast', errors: {} };
  }

  const errors = {};
  const tooLong = (k) => v[k].length > LIMITS[k];
  for (const k of ['name', 'email', 'phone']) if (CONTROL_LINE.test(v[k])) errors[k] = 'invalid';
  if (CONTROL.test(v.message)) errors.message = 'invalid';

  if (errors.name) { /* déjà invalide */ } else if (!v.name) errors.name = 'required';
  else if (tooLong('name')) errors.name = 'tooLong';

  if (errors.email) { /* déjà invalide */ } else if (!v.email) errors.email = 'required';
  else if (tooLong('email') || !EMAIL.test(v.email)) errors.email = 'email';

  const digits = v.phone.replace(/\D/g, '');
  if (errors.phone) { /* déjà invalide */ } else if (!v.phone) errors.phone = 'required';
  else if (tooLong('phone') || !PHONE.test(v.phone) || digits.length < 8 || digits.length > 15) errors.phone = 'phone';

  const today = todayInMorocco(now);
  if (!v.date) errors.date = 'required';
  else if (!DATE.test(v.date) || Number.isNaN(Date.parse(v.date))) errors.date = 'date';
  else if (v.date < today) errors.date = 'date';
  else if (v.date > addDays(today, maxDaysAhead)) errors.date = 'dateTooFar';

  const tm = v.time.match(TIME);
  if (!v.time) errors.time = 'required';
  else if (!tm || Number(tm[2]) % 15 !== 0) errors.time = 'time';

  if (!v.guests) errors.guests = 'required';
  else if (!GUESTS.includes(v.guests)) errors.guests = 'guests';

  if (tooLong('message')) errors.message = 'tooLong';

  if (!['yes', 'on', 'true'].includes(v.consent.toLowerCase())) errors.consent = 'consent';

  // Horaires et jours de fermeture (uniquement lorsqu'ils sont fournis par le restaurant)
  if (!errors.date && !errors.time && openingHours) {
    const open = isOpenAt(openingHours, v.date, v.time);
    if (!open.ok) {
      if (open.reason === 'outside-hours') errors.time = 'outsideHours';
      else errors.date = open.reason === 'closure' ? 'closure' : 'closedDay';
    }
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    errors: {},
    data: {
      name: v.name, email: v.email, phone: v.phone, date: v.date, time: v.time, guests: v.guests,
      message: v.message, lang: LANGS.includes(v.lang) ? v.lang : 'fr',
    },
  };
}
