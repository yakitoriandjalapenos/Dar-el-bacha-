import { html, raw } from '../../scripts/lib/html.mjs';

/* Éléments éditoriaux communs à toutes les pages : surtitre, en-tête de section, frise. */

/** Surtitre discret au-dessus d'un titre (petites capitales espacées en latin, sobre en arabe). */
export const eyebrow = (text) => (text ? html`<p class="eyebrow">${text}</p>` : '');

/**
 * En-tête de section : surtitre, titre, introduction, lien éventuel.
 * align : 'start' (par défaut) ou 'center'. level : niveau du titre (2 par défaut).
 */
export function sectionHead({ id, kicker, title, lead, link, align = 'start', level = 2 }) {
  const tag = `h${level}`;
  return html`<div class="section-head section-head--${align}">
    <div class="section-head__text">
      ${eyebrow(kicker)}
      ${raw(`<${tag}${id ? ` id="${id}"` : ''}>`)}${title}${raw(`</${tag}>`)}
      ${lead && html`<p class="section-head__lead">${lead}</p>`}
    </div>
    ${link && html`<a class="text-link" href="${link.href}">${link.label}</a>`}
  </div>`;
}

/** Frise inspirée du bois sculpté : séparateur décoratif, purement visuel. */
export const frieze = (className = '') => html`<div class="frieze ${className}" aria-hidden="true"></div>`;
