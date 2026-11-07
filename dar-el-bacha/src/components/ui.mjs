import { html, attrs } from '../../scripts/lib/html.mjs';
import { icons } from './icons.mjs';
import { archLine } from './arch.mjs';

/** Bouton-lien. disabled → rendu inactif et non focalisable (information manquante). */
export function button({ href, label, variant = 'primary', small = false, icon = null, external = false, disabled = false, className = '', extra = {} }) {
  const cls = ['btn', variant !== 'primary' && `btn--${variant}`, small && 'btn--small', className].filter(Boolean).join(' ');
  if (disabled) {
    return html`<span class="${cls}" aria-disabled="true"${attrs(extra)}>${icon && icons[icon]()}${label}</span>`;
  }
  return html`<a class="${cls}"${attrs({
    href,
    target: external ? '_blank' : false,
    rel: external ? 'noopener' : false,
    ...extra,
  })}>${icon && icons[icon]()}${label}</a>`;
}

/** Valeur officielle ou repère « À CONFIRMER » localisé. */
export function info(ctx, value, tbcKey) {
  if (value === null || value === undefined || value === '') {
    return html`<span class="tbc">${ctx.t(`tbc.${tbcKey}`)}</span>`;
  }
  return html`${value}`;
}

/** Ornement : étoile entre deux filets. */
export const ornament = (center = false) =>
  html`<div class="ornament${center ? ' ornament--center' : ''}" aria-hidden="true">${icons.star()}</div>`;

/** En-tête des pages intérieures (fond émeraude, filet d'arche en écho au hero). */
export function pageHead({ title, lead }) {
  return html`<header class="page-head theme-dark">
    ${archLine('page-head__arch arch-frame__line')}
    <div class="wrap page-head__inner stack">
      <h1>${title}</h1>
      ${lead && html`<p class="lead">${lead}</p>`}
    </div>
  </header>`;
}
