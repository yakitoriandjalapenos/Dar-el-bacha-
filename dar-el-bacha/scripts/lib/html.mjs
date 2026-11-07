// Petits utilitaires de rendu HTML, sans dépendance.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Échappe une valeur texte pour l'insérer dans du HTML. */
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

/** Marque une chaîne comme HTML déjà sûr (composants). */
export class Raw {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}
export const raw = (value) => new Raw(value);

/**
 * Gabarit HTML : les interpolations sont échappées, sauf les Raw
 * et les tableaux (dont chaque élément suit la même règle).
 */
export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((v, i) => {
    out += render(v) + strings[i + 1];
  });
  return raw(out);
}

function render(v) {
  if (v === null || v === undefined || v === false) return '';
  if (v instanceof Raw) return v.value;
  if (Array.isArray(v)) return v.map(render).join('');
  return esc(v);
}

/** Construit une liste d'attributs ; ignore false/null, écrit les booléens sans valeur. */
export function attrs(obj) {
  return raw(
    Object.entries(obj)
      .filter(([, v]) => v !== false && v !== null && v !== undefined)
      .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`))
      .join(''),
  );
}
