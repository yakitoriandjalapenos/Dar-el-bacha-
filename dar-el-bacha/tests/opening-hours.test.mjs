// Horaires structurés : format, contrôle d'ouverture, affichage localisé, données schema.org (npm test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateOpeningHours, isOpenAt, hoursLines, openingHoursSchema, dayKey } from '../scripts/lib/opening-hours.mjs';

// Horaires DE TEST (fictifs) : jamais utilisés dans le contenu du site
const OH = {
  days: { mon: [], tue: [['12:00', '15:00'], ['19:00', '23:00']], wed: [['12:00', '15:00']], thu: [['19:00', '01:00']], fri: [['12:00', '15:00']], sat: [['12:00', '15:00']], sun: [] },
  closures: ['2026-12-31'],
};

test('format : horaires valides acceptés, erreurs détectées', () => {
  assert.deepEqual(validateOpeningHours(OH), []);
  assert.deepEqual(validateOpeningHours(null), []);
  const bad = validateOpeningHours({ days: { ...OH.days, mon: [['25:00', '15:00']], xyz: [] }, closures: ['31/12/2026'] }).join('\n');
  assert.match(bad, /days\.mon : plage invalide/);
  assert.match(bad, /jour inconnu « xyz »/);
  assert.match(bad, /closures : liste de dates/);
  assert.match(validateOpeningHours({ days: { ...OH.days, sun: undefined } }).join(), /days\.sun : liste de plages/);
});

test('contrôle d\'ouverture : jour fermé, fermeture exceptionnelle, hors horaires, passage de minuit', () => {
  assert.equal(dayKey('2026-11-09'), 'mon');
  assert.deepEqual(isOpenAt(OH, '2026-11-09', '13:00'), { ok: false, reason: 'closed-day' });
  assert.deepEqual(isOpenAt(OH, '2026-11-10', '13:00'), { ok: true });
  assert.deepEqual(isOpenAt(OH, '2026-11-10', '16:30'), { ok: false, reason: 'outside-hours' });
  assert.deepEqual(isOpenAt(OH, '2026-11-10', '15:00'), { ok: false, reason: 'outside-hours' });
  assert.deepEqual(isOpenAt(OH, '2026-11-12', '00:30'), { ok: true });
  assert.deepEqual(isOpenAt(OH, '2026-12-31', '13:00'), { ok: false, reason: 'closure' });
  assert.deepEqual(isOpenAt(null, '2026-11-09', '13:00'), { ok: true, unchecked: true });
});

test('affichage : jours traduits par la langue de la page, jours fermés signalés', () => {
  const fr = hoursLines(OH, 'fr-MA');
  assert.equal(fr[0].day, 'lundi');
  assert.equal(fr[0].closed, true);
  assert.deepEqual(fr[1].ranges, ['12:00–15:00', '19:00–23:00']);
  assert.equal(hoursLines(OH, 'en-MA')[1].day, 'Tuesday');
  assert.equal(hoursLines(OH, 'ar-MA')[1].day, 'الثلاثاء');
  assert.equal(hoursLines(null, 'fr-MA'), null);
});

test('données schema.org : une spécification par plage', () => {
  const s = openingHoursSchema(OH);
  assert.equal(s.length, 6);
  assert.deepEqual(s[0], { '@type': 'OpeningHoursSpecification', dayOfWeek: 'https://schema.org/Tuesday', opens: '12:00', closes: '15:00' });
});
