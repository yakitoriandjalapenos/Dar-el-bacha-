import { html } from '../../scripts/lib/html.mjs';
import { info } from './ui.mjs';
import { media } from './media.mjs';
import { arch } from './arch.mjs';

/*
  Carte de plat, alimentée exclusivement par src/content/menu.json.
  Rien n'est inventé : la description, les ingrédients ou particularités, le prix et la photo
  n'apparaissent que s'ils sont renseignés ; un prix manquant affiche le repère [PRIX À CONFIRMER].

  variant :
    'line'    → ligne de carte (page La carte) : nom, filet pointillé, prix, description, ingrédients,
                vignette en arche si une photo existe ;
    'feature' → plat emblématique (accueil) : photo en arche (ou emplacement provisoire), nom, description.
*/

const price = (ctx, value) => (value === null || value === undefined ? null : ctx.formatPrice(value));

export function dishLine(ctx, item) {
  const t = (k) => ctx.t(`pages.carte.${k}`);
  const desc = item.description?.[ctx.lang];
  const ingredients = item.ingredients?.[ctx.lang];
  return html`<li class="dish${item.image ? ' dish--photo' : ''}" id="plat-${item.id}">
    ${item.image && html`<div class="dish__photo">${arch(media(ctx, { image: item.image, alt: item.name[ctx.lang], format: null, sizes: '6rem' }), { framed: false })}</div>`}
    <div class="dish__body">
      <div class="dish__row">
        <h3 class="dish__name">${item.name[ctx.lang]}</h3>
        <span class="dish__leader" aria-hidden="true"></span>
        <span class="dish__price">${item.price != null && ctx.pricesIndicative
          ? html`<span data-provisional="price-indicative" title="${ctx.t('pages.carte.indicative')}">${price(ctx, item.price)}<span class="dish__mark" aria-hidden="true">*</span></span>`
          : info(ctx, price(ctx, item.price), 'price')}</span>
      </div>
      ${item.status === 'a-valider' && (ctx.menuAllPending
        // Toute la carte est à valider : la note en tête de carte le dit, le repère reste pour les lecteurs d'écran
        ? html`<span class="visually-hidden" data-provisional="dish-pending">${t('pending')}</span>`
        : html`<p class="dish__meta"><span class="badge" data-provisional="dish-pending">${t('pending')}</span></p>`)}
      ${desc && html`<p class="dish__desc">${desc}</p>`}
      ${ingredients && html`<p class="dish__ingredients"><span class="visually-hidden">${t('ingredients')} : </span>${ingredients}</p>`}
    </div>
  </li>`;
}

export function dishFeature(ctx, item, { index = 0 } = {}) {
  const desc = item.description?.[ctx.lang];
  return html`<article class="dish-feature" data-reveal style="--reveal-i:${index}">
    <a class="dish-feature__link" href="${ctx.path('carte')}#plat-${item.id}">
      ${arch(media(ctx, { image: item.image, alt: item.name[ctx.lang], format: null, sizes: '(min-width: 48rem) 28vw, 72vw' }), { framed: false })}
      <h3 class="dish-feature__name">${item.name[ctx.lang]}</h3>
    </a>
    ${desc && html`<p class="dish-feature__desc">${desc}</p>`}
  </article>`;
}
