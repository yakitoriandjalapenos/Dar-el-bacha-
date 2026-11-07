import { html } from '../../scripts/lib/html.mjs';
import { info } from './ui.mjs';

/**
 * Horaires d'ouverture : texte libre (site.json › hours) s'il est fourni, sinon liste produite à partir
 * des horaires structurés (site.json › openingHours, jours traduits automatiquement), sinon repère
 * [HORAIRES À CONFIRMER]. Rien n'est jamais déduit ni inventé.
 */
export function hoursBlock(ctx) {
  const text = ctx.hours();
  if (text) return html`${text}`;
  const lines = ctx.hoursLines();
  if (!lines) return info(ctx, null, 'hours');
  return html`<ul class="hours" role="list">
    ${lines.map((l) => html`<li class="hours__line${l.closed ? ' is-closed' : ''}">
      <span class="hours__day">${l.day}</span>
      ${l.closed ? html`<span class="hours__time">${ctx.t('hours.closed')}</span>` : html`<span class="hours__time" dir="ltr">${l.ranges.join(' · ')}</span>`}
    </li>`)}
  </ul>`;
}
