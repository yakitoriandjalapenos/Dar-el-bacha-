import { html } from '../../scripts/lib/html.mjs';
import { media } from './media.mjs';
import { button } from './ui.mjs';
import { eyebrow } from './sections.mjs';
import { archLine } from './arch.mjs';

/**
 * Hero photographique plein écran (accueil).
 *
 * - Avec une photographie (media.json › home.hero) : image plein cadre, cadrage centré, chargée en
 *   priorité haute ; un voile dégradé garantit la lisibilité du texte.
 * - Sans photographie : emplacement provisoire « lumière de lanterne » (dégradés, moucharabieh,
 *   arche), clairement signalé « Photographie officielle à venir » et balisé comme provisoire.
 *   Il n'imite jamais une photographie du restaurant.
 *
 * Le titre (élément le plus grand affiché en premier) n'est jamais masqué ni animé : il porte le LCP.
 */
export function hero(ctx, { slot, kicker, title, text, actions = [] }) {
  const photo = slot?.image;
  return html`<section class="hero theme-dark${photo ? ' hero--photo' : ' hero--placeholder'}" aria-labelledby="hero-title">
    <div class="hero__media">
      ${photo
        ? media(ctx, { image: photo, alt: slot.alt?.[ctx.lang] || '', format: null, eager: true, priority: 'high', sizes: '100vw', className: 'hero__image' })
        : html`<div class="hero__lantern" role="img" aria-label="${ctx.t('tbc.photo')}" data-provisional="photo">
            <span class="hero__caption" aria-hidden="true">${ctx.t('tbc.photo')}</span>
          </div>`}
    </div>
    <div class="hero__veil" aria-hidden="true"></div>
    ${archLine('hero__arch')}
    <div class="wrap hero__content">
      ${eyebrow(kicker)}
      <h1 id="hero-title">${title}</h1>
      ${text && html`<p class="hero__text">${text}</p>`}
      ${actions.length ? html`<div class="actions">${actions.map((a) => button(a))}</div>` : ''}
    </div>
  </section>`;
}
