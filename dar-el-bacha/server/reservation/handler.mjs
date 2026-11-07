/*
  Traitement d'une demande de réservation, indépendant de l'hébergeur :
  handle({ method, headers, body, ip }) → { status, headers, body }.

  - Envoi avec JavaScript (JSON) : réponse JSON lue par le site.
  - Envoi sans JavaScript (formulaire classique) : redirection 303 vers une page de résultat
    /<langue>/reservation/statut/<résultat>/ produite par le build.
  - Résultats : pending (demande transmise, EN ATTENTE de confirmation par le restaurant),
    simulated (mode test : rien n'est transmis), invalid, rate-limited, error.
    Une demande n'est jamais présentée comme une réservation confirmée.
  - Journal : identifiant de requête, résultat et codes d'erreur uniquement ; aucune donnée
    personnelle (ni nom, ni coordonnées, ni message, ni adresse IP).
*/
import { randomUUID } from 'node:crypto';
import { validateRequest, LANGS } from './rules.mjs';
import { statusPath as siteStatusPath } from '../../src/routes.mjs';
import { readFileSync } from 'node:fs';

// Textes de l'accusé de réception, dans la langue du visiteur (src/i18n › email.ack)
const I18N = Object.fromEntries(LANGS.map((l) => [l, JSON.parse(readFileSync(new URL(`../../src/i18n/${l}.json`, import.meta.url), 'utf8'))]));
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

/** Accusé de réception envoyé au client APRÈS la transmission réussie au restaurant : jamais une confirmation. */
export function composeAck(d, { siteNames = {}, replyTo } = {}) {
  const t = I18N[d.lang]?.email?.ack || I18N.fr.email.ack;
  const guests = d.guests === '12+' ? t.moreThan12 : d.guests;
  const vars = { name: d.name, date: d.date, time: d.time, guests, site: siteNames[d.lang] || siteNames.fr || '' };
  return {
    to: d.email,
    ...(replyTo && { replyTo }),
    subject: fill(t.subject, vars),
    text: [fill(t.greeting, vars), '', fill(t.received, vars), fill(t.notConfirmed, vars), '', fill(t.signature, vars)].join('\n'),
  };
}

const LANG_NAMES = { fr: 'français', en: 'anglais', ar: 'arabe' };

/** Message envoyé au restaurant (texte brut ; l'objet ne contient que des valeurs déjà validées). */
export function composeEmail(d) {
  const guests = d.guests === '12+' ? 'plus de 12' : d.guests;
  return {
    subject: `Demande de réservation à confirmer — ${d.date} à ${d.time} — ${guests} pers.`,
    replyTo: d.email,
    text: [
      'Nouvelle DEMANDE de réservation envoyée depuis le site. Elle n\'est PAS confirmée :',
      'le client attend la réponse du restaurant (confirmation ou refus).',
      '',
      `Nom : ${d.name}`,
      `E-mail : ${d.email}`,
      `Téléphone : ${d.phone}`,
      `Date souhaitée : ${d.date}`,
      `Heure souhaitée : ${d.time}`,
      `Nombre de personnes : ${guests}`,
      `Langue du client : ${LANG_NAMES[d.lang] || d.lang}`,
      `Message : ${d.message || '—'}`,
      '',
      'Répondre à ce message écrit directement au client.',
    ].join('\n'),
  };
}

const defaultLogger = (entry) => console.log(JSON.stringify({ time: new Date().toISOString(), ...entry }));

export function createReservationHandler({
  mailer,
  limiter,
  openingHours = null,
  allowedOrigins = [],
  now = () => new Date(),
  logger = defaultLogger,
  statusPath = siteStatusPath,
  maxBodyBytes = 10 * 1024,
  maxDaysAhead = 180,
  verifyHuman = null,
  ack = true,
  ackReplyTo,
  siteNames = {},
} = {}) {
  return async function handle({ method, headers = {}, body = '', ip } = {}) {
    const id = randomUUID().slice(0, 8);
    const h = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), Array.isArray(v) ? v[0] : v]));
    const isForm = (h['content-type'] || '').split(';')[0].trim() === 'application/x-www-form-urlencoded';
    let lang = 'fr';

    const finish = (status, result, payload, extra = {}) => {
      logger({ event: 'reservation', id, result, status, ...extra });
      if (isForm) return { status: 303, headers: { Location: statusPath(lang, result), 'Cache-Control': 'no-store' }, body: '' };
      return { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...(payload.retryAfter && { 'Retry-After': String(payload.retryAfter) }) }, body: JSON.stringify(payload) };
    };

    try {
      if (method !== 'POST') return { status: 405, headers: { Allow: 'POST' }, body: '' };
      if (Buffer.byteLength(body) > maxBodyBytes) return finish(413, 'error', { error: 'too-large' });
      if (h.origin && allowedOrigins.length && !allowedOrigins.includes(h.origin)) return finish(403, 'error', { error: 'origin' });

      let input;
      try {
        input = isForm ? Object.fromEntries(new URLSearchParams(body)) : JSON.parse(body || '{}');
      } catch {
        return finish(400, 'error', { error: 'malformed' });
      }
      if (LANGS.includes(input?.lang)) lang = input.lang;

      const limit = limiter.hit(ip);
      if (!limit.allowed) return finish(429, 'rate-limited', { error: 'rate-limited', retryAfter: limit.retryAfter });

      const check = validateRequest(input, { now: now(), openingHours, maxDaysAhead });
      if (check.spam) return finish(400, 'error', { error: 'rejected' }, { reason: check.spam });
      if (!check.ok) return finish(422, 'invalid', { error: 'invalid', fields: check.errors }, { fields: Object.keys(check.errors) });
      // Vérification anti-robot externe (Turnstile), uniquement si elle est configurée
      if (verifyHuman && !(await verifyHuman(String(input['cf-turnstile-response'] || ''), ip))) {
        return finish(400, 'error', { error: 'rejected' }, { reason: 'turnstile' });
      }

      let sent;
      try {
        sent = await mailer.send(composeEmail(check.data));
      } catch (e) {
        return finish(502, 'error', { error: 'delivery-failed' }, { cause: String(e?.message || e).slice(0, 120) });
      }
      if (sent.simulated) return finish(200, 'simulated', { status: 'simulated' });

      // Transmission réussie : accusé de réception au client (son échec n'annule pas la demande, déjà transmise)
      let acknowledged = false;
      if (ack) {
        try {
          acknowledged = (await mailer.send(composeAck(check.data, { siteNames, replyTo: ackReplyTo }))).delivered === true;
        } catch (e) {
          logger({ event: 'reservation-ack', id, result: 'error', cause: String(e?.message || e).slice(0, 120) });
        }
      }
      return finish(202, 'pending', { status: 'pending', acknowledged }, { acknowledged });
    } catch (e) {
      return finish(500, 'error', { error: 'server' }, { cause: String(e?.message || e).slice(0, 120) });
    }
  };
}
