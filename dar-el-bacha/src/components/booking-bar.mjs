import { html } from '../../scripts/lib/html.mjs';
import { button } from './ui.mjs';

/**
 * Accès permanent à la réservation sur petit écran : barre fixée en bas de l'écran
 * (masquée à partir de 40rem, où le bouton de l'en-tête prend le relais, et sur la page Réservation).
 * Fonctionne sans JavaScript.
 */
export function bookingBar(ctx) {
  if (ctx.pageId === 'reservation' || ctx.pageId.startsWith('statut:')) return '';
  return html`<div class="booking-bar theme-dark">
    ${button({ href: ctx.path('reservation'), label: ctx.t('cta.reserve'), className: 'btn--block' })}
  </div>`;
}
