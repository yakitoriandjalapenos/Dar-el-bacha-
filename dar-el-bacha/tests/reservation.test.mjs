// Service des demandes de réservation : validation serveur, anti-abus, e-mail, réponses, journal (npm test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRequest, todayInMorocco } from '../server/reservation/rules.mjs';
import { createRateLimiter } from '../server/reservation/rate-limit.mjs';
import { createMailer, MailerConfigError } from '../server/reservation/mailer.mjs';
import { createReservationHandler, composeEmail } from '../server/reservation/handler.mjs';

// Données DE TEST (fictives), jamais utilisées sur le site
const NOW = new Date('2026-11-10T10:00:00Z'); // mardi 10 novembre 2026, 11:00 à Casablanca
const VALID = { name: 'Client Test', email: 'client@exemple-test.ma', phone: '+212 600 000 000', date: '2026-11-20', time: '20:00', guests: '2', message: '', consent: 'yes', website: '', lang: 'fr' };
const OH = { days: { mon: [], tue: [['19:00', '23:00']], wed: [['19:00', '23:00']], thu: [['19:00', '23:00']], fri: [['19:00', '23:00']], sat: [['12:00', '15:00'], ['19:00', '23:00']], sun: [] }, closures: ['2026-12-31'] };
const check = (over = {}, opts = {}) => validateRequest({ ...VALID, ...over }, { now: NOW, ...opts });

test('validation : demande valide acceptée, champs nettoyés, langue par défaut', () => {
  const r = check({ name: '  Client Test  ', lang: 'de' });
  assert.equal(r.ok, true);
  assert.equal(r.data.name, 'Client Test');
  assert.equal(r.data.lang, 'fr');
  assert.equal(todayInMorocco(NOW), '2026-11-10');
});

test('validation : chaque champ obligatoire et chaque format', () => {
  const r = check({ name: '', email: 'x@', phone: '12', date: '2026-11-09', time: '20:10', guests: '13', consent: '' });
  assert.deepEqual(r.errors, { name: 'required', email: 'email', phone: 'phone', date: 'date', time: 'time', guests: 'guests', consent: 'consent' });
  assert.equal(check({ date: '2027-06-01' }).errors.date, 'dateTooFar');
  assert.equal(check({ message: 'x'.repeat(1001) }).errors.message, 'tooLong');
  assert.equal(check({ name: 'Client\nTest' }).errors.name, 'invalid');
  assert.equal(check({ message: 'ligne 1\nligne 2' }).ok, true);
  assert.equal(check({ guests: '12+' }).ok, true);
});

test('validation : horaires et fermetures (uniquement lorsqu\'ils sont fournis)', () => {
  assert.equal(check({ date: '2026-11-16' }, { openingHours: OH }).errors.date, 'closedDay'); // lundi
  assert.equal(check({ time: '16:00' }, { openingHours: OH }).errors.time, 'outsideHours');
  assert.equal(check({ date: '2026-12-31' }, { openingHours: OH }).errors.date, 'closure');
  assert.equal(check({}, { openingHours: OH }).ok, true);
  assert.equal(check({ date: '2026-11-16' }).ok, true); // sans horaires fournis : aucun contrôle inventé
});

test('anti-robot : piège rempli ou saisie trop rapide', () => {
  assert.equal(check({ website: 'http://spam' }).spam, 'honeypot');
  assert.equal(check({ started: String(NOW.getTime() - 800) }).spam, 'too-fast');
  assert.equal(check({ started: String(NOW.getTime() - 60000) }).ok, true);
});

test('limite d\'envois : 5 par fenêtre, puis refus avec délai, remise à zéro', () => {
  let t = 0;
  const lim = createRateLimiter({ max: 5, windowMs: 600000, now: () => t });
  for (let i = 0; i < 5; i++) assert.equal(lim.hit('203.0.113.7').allowed, true);
  const sixth = lim.hit('203.0.113.7');
  assert.equal(sixth.allowed, false);
  assert.equal(sixth.retryAfter, 600);
  assert.equal(lim.hit('198.51.100.1').allowed, true);
  t = 600001;
  assert.equal(lim.hit('203.0.113.7').allowed, true);
});

test('e-mail : simulation explicite, adaptateurs, configuration incomplète', async () => {
  const sim = createMailer();
  assert.deepEqual(await sim.send({ subject: 's' }), { delivered: false, simulated: true });
  assert.throws(() => createMailer({ provider: 'resend' }), MailerConfigError);
  assert.throws(() => createMailer({ provider: 'inconnu', apiKey: 'k', to: 't', from: 'f' }), /inconnu/);

  const calls = [];
  const fakeFetch = async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200 }; };
  const cfg = { apiKey: 'CLE-TEST', to: 'restaurant@exemple-test.ma', from: 'site@exemple-test.ma', fetch: fakeFetch };
  const msg = { subject: 'Sujet', text: 'Texte', replyTo: 'client@exemple-test.ma' };
  assert.deepEqual(await createMailer({ provider: 'resend', ...cfg }).send(msg), { delivered: true, simulated: false });
  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer CLE-TEST');
  assert.deepEqual(JSON.parse(calls[0].init.body).to, ['restaurant@exemple-test.ma']);
  await createMailer({ provider: 'brevo', ...cfg }).send(msg);
  assert.equal(calls[1].url, 'https://api.brevo.com/v3/smtp/email');
  assert.equal(calls[1].init.headers['api-key'], 'CLE-TEST');
  const failing = createMailer({ provider: 'resend', ...cfg, fetch: async () => ({ ok: false, status: 500 }) });
  await assert.rejects(failing.send(msg), /HTTP 500/);
});

test('e-mail au restaurant : demande signalée « à confirmer », réponse directe au client', () => {
  const m = composeEmail({ ...VALID, guests: '12+' });
  assert.match(m.subject, /^Demande de réservation à confirmer — 2026-11-20 à 20:00 — plus de 12 pers\.$/);
  assert.match(m.text, /n'est PAS confirmée/);
  assert.equal(m.replyTo, VALID.email);
});

const setup = (over = {}) => {
  const logs = [];
  const mailer = over.mailer || createMailer();
  const handle = createReservationHandler({
    mailer, limiter: over.limiter || createRateLimiter(), now: () => NOW, logger: (e) => logs.push(e),
    allowedOrigins: ['https://www.exemple-test.ma'], openingHours: over.openingHours || null,
  });
  return { handle, logs, mailer };
};
const post = (handle, payload, { form = false, origin = 'https://www.exemple-test.ma', ip = '203.0.113.7' } = {}) =>
  handle({
    method: 'POST',
    headers: { 'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json', Origin: origin },
    body: form ? new URLSearchParams(payload).toString() : JSON.stringify(payload),
    ip,
  });

test('réponses : simulation, demande transmise (en attente), invalide, robot, panne d\'e-mail', async () => {
  const sim = setup();
  let r = await post(sim.handle, VALID);
  assert.equal(r.status, 200);
  assert.deepEqual(JSON.parse(r.body), { status: 'simulated' });
  assert.equal(sim.mailer.outbox.length, 1);

  const live = setup({ mailer: { simulated: false, send: async () => ({ delivered: true, simulated: false }) } });
  r = await post(live.handle, VALID);
  assert.equal(r.status, 202);
  assert.deepEqual(JSON.parse(r.body), { status: 'pending' }); // jamais « confirmée »

  r = await post(live.handle, { ...VALID, email: 'faux', consent: '' });
  assert.equal(r.status, 422);
  assert.deepEqual(JSON.parse(r.body), { error: 'invalid', fields: { email: 'email', consent: 'consent' } });

  r = await post(live.handle, { ...VALID, website: 'robot' });
  assert.equal(r.status, 400);
  assert.deepEqual(JSON.parse(r.body), { error: 'rejected' });

  const down = setup({ mailer: { simulated: false, send: async () => { throw new Error('panne'); } } });
  r = await post(down.handle, VALID);
  assert.equal(r.status, 502);
  assert.deepEqual(JSON.parse(r.body), { error: 'delivery-failed' });
});

test('sans JavaScript : redirection vers la page de résultat dans la langue du visiteur', async () => {
  const { handle } = setup();
  let r = await post(handle, { ...VALID, lang: 'ar' }, { form: true });
  assert.equal(r.status, 303);
  assert.equal(r.headers.Location, '/ar/reservation/statut/simulated/');
  r = await post(handle, { ...VALID, lang: 'en', email: '' }, { form: true });
  assert.equal(r.headers.Location, '/en/reservation/statut/invalid/');
});

test('protections : origine étrangère, méthode, requête mal formée ou trop grosse, limite d\'envois', async () => {
  const { handle } = setup({ limiter: createRateLimiter({ max: 2 }) });
  assert.equal((await post(handle, VALID, { origin: 'https://site-tiers.example' })).status, 403);
  assert.equal((await handle({ method: 'GET', headers: {} })).status, 405);
  assert.equal((await handle({ method: 'POST', headers: { 'content-type': 'application/json' }, body: '{oups' })).status, 400);
  assert.equal((await handle({ method: 'POST', headers: {}, body: 'x'.repeat(11 * 1024) })).status, 413);
  await post(handle, VALID); await post(handle, VALID);
  const r = await post(handle, VALID);
  assert.equal(r.status, 429);
  assert.match(r.headers['Retry-After'], /^\d+$/);
});

test('journal : aucune donnée personnelle enregistrée', async () => {
  const { handle, logs } = setup();
  await post(handle, { ...VALID, message: 'Allergie aux noix' });
  await post(handle, { ...VALID, email: 'faux' });
  const dump = JSON.stringify(logs);
  for (const secret of ['Client Test', 'client@exemple-test.ma', '600 000 000', 'Allergie', '203.0.113.7', 'faux']) assert.ok(!dump.includes(secret), `« ${secret} » présent dans le journal`);
  assert.deepEqual(logs.map((l) => l.result), ['simulated', 'invalid']);
});
