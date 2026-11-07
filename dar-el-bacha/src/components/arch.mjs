import { html, raw } from '../../scripts/lib/html.mjs';

// Même tracé que src/assets/img/arch.svg (arc outrepassé brisé), viewBox 0 0 100 140.
export const ARCH_PATH = 'M10 140V64C2 54 0 36 11 21 22 8 38 2 50 0c12 2 28 8 39 21 11 15 9 33 1 43v76Z';

/** Filet doré de l'arche (décoratif). */
export const archLine = (className = 'arch-frame__line') =>
  raw(`<svg class="${className}" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path pathLength="1" d="${ARCH_PATH}"/></svg>`);

/**
 * Contenu (média) découpé en arche, avec ou sans filet doré décalé.
 */
export function arch(content, { framed = true, className = '' } = {}) {
  const inner = html`<div class="arch">${content}</div>`;
  if (!framed) return html`<div class="${className}">${inner}</div>`;
  return html`<div class="arch-frame ${className}">${archLine()}${inner}</div>`;
}
