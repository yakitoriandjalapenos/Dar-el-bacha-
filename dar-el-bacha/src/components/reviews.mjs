import { html, raw } from '../../scripts/lib/html.mjs';
import { sectionHead } from './sections.mjs';

/*
  Témoignages (src/content/reviews.json). Tant que « demo » vaut true, ce sont des AVIS FICTIFS :
  la mention « Avis fictifs — aperçu de démonstration » est affichée et balisée comme provisoire
  (production refusée). Étoiles dessinées, sans note moyenne ni donnée structurée d'avis.
*/
const STAR = '<path d="M12 2.8l2.7 6 6.5.6-4.9 4.3 1.5 6.4L12 16.8 6.2 20.1l1.5-6.4-4.9-4.3 6.5-.6Z"/>';
const star = (filled) => raw(`<svg class="stars__star${filled ? ' is-filled' : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${STAR}</svg>`);

export function stars(ctx, rating) {
  return html`<p class="stars" role="img" aria-label="${ctx.t('pages.home.reviews.stars', { n: rating })}">${[1, 2, 3, 4, 5].map((i) => star(i <= rating))}</p>`;
}

export function reviewsSection(ctx) {
  const { reviews } = ctx;
  if (!reviews?.items?.length) return '';
  const p = (k) => ctx.t(`pages.home.reviews.${k}`);
  return html`<section class="section theme-sand texture reviews" aria-labelledby="reviews-title">
  <div class="wrap">
    ${sectionHead({ id: 'reviews-title', kicker: p('eyebrow'), title: p('title'), align: 'center' })}
    ${reviews.demo && html`<p class="reviews__demo" data-provisional="reviews-demo">${p('demo')}</p>`}
    <ul class="reviews__list" role="list">
      ${reviews.items.map((r, i) => html`<li class="review" data-reveal style="--reveal-i:${i % 3}">
        <figure>
          ${stars(ctx, r.rating)}
          <blockquote class="review__text"><p>${r.text[ctx.lang]}</p></blockquote>
          <figcaption class="review__by">${r.author?.[ctx.lang] ? html`<span class="review__author">${r.author[ctx.lang]}</span> · ` : ''}${r.context[ctx.lang]}</figcaption>
        </figure>
      </li>`)}
    </ul>
  </div>
</section>`;
}
