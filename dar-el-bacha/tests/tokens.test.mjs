// Contrastes de la palette (WCAG 2.2) : chaque couple utilisé pour du texte doit rester lisible (npm test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const root = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
const token = (short) => {
  const name = short.startsWith('c-') ? short : `c-${short}`;
  const m = root.match(new RegExp(`--${name}:\\s*([^;]+);`));
  assert.ok(m, `jeton --${name} absent`);
  const v = m[1].trim();
  return v.startsWith('var(') ? token(v.slice(6, -1)) : v;
};
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('palette de référence validée', () => {
  assert.deepEqual(['emerald', 'gold', 'sand', 'ivory', 'walnut'].map(token), ['#123d32', '#b99a62', '#e9dfcc', '#f7f3ea', '#38291f']);
});

test('texte courant et titres : au moins 4,5:1', () => {
  const pairs = [
    ['walnut', 'ivory'], ['walnut', 'sand-100'], ['walnut', 'sand'], ['ink-soft', 'ivory'], ['ink-soft', 'sand'],
    ['emerald', 'ivory'], ['emerald', 'sand'], ['ivory', 'emerald'], ['ivory-soft', 'emerald'], ['ivory-soft', 'emerald-700'],
    ['gold-300', 'emerald'], ['gold-300', 'emerald-700'], ['gold-700', 'ivory'], ['gold-700', 'sand'],
    ['danger', 'ivory'], ['success', 'ivory'], ['walnut', 'gold'],
  ];
  for (const [fg, bg] of pairs) {
    const r = ratio(token(fg), token(bg));
    assert.ok(r >= 4.5, `--${fg} sur --${bg} : ${r.toFixed(2)}:1`);
  }
});

test('or patiné : jamais de texte sur fond clair (2,4:1), réservé aux filets et ornements', () => {
  assert.ok(ratio(token('gold'), token('ivory')) < 3);
  // Bordures et focus sur fond clair : au moins 3:1 (éléments non textuels)
  assert.ok(ratio(token('emerald-600'), token('ivory')) >= 3);
});
