import { html } from '../../scripts/lib/html.mjs';
import { button, ornament } from '../components/ui.mjs';
import { arch } from '../components/arch.mjs';
import { media } from '../components/media.mjs';
import { hero } from '../components/hero.mjs';
import { eyebrow, sectionHead, frieze } from '../components/sections.mjs';
import { dishFeature } from '../components/dish.mjs';
import { signature } from '../components/logo.mjs';
import { reviewsSection } from '../components/reviews.mjs';

/*
  Accueil. Photographies : src/content/media.json (home). Plats emblématiques : propositions de
  src/content/menu.json marquées « signature »: true (choix du restaurant, 4 au plus) ; tant
  qu'aucune n'est désignée, un emplacement provisoire signalé l'indique.
*/
const MAX_SIGNATURE = 4;

export function render(ctx) {
  const p = (key) => ctx.t(`pages.home.${key}`);
  const { hero: HERO, philosophy: PHILOSOPHY, mosaic: MOSAIC } = ctx.media.home;
  const alt = (slot) => slot.alt?.[ctx.lang] || '';
  const signatureDishes = ctx.menu.categories.flatMap((c) => c.items).filter((i) => i.signature).slice(0, MAX_SIGNATURE);

  const body = html`
${hero(ctx, {
  slot: HERO,
  kicker: p('hero.eyebrow'),
  title: p('hero.title'),
  text: p('hero.text'),
  actions: [
    { href: ctx.path('reservation'), label: ctx.t('cta.reserve') },
    { href: ctx.path('carte'), label: ctx.t('cta.viewMenu'), variant: 'ghost' },
  ],
})}

<section class="section maison" aria-labelledby="intro-title">
  <div class="wrap maison__inner">
    <div class="maison__seal" data-reveal>${signature(ctx)}</div>
    <div class="maison__text stack stack-l" data-reveal style="--reveal-i:1">
      ${eyebrow(p('intro.eyebrow'))}
      <h2 id="intro-title">${p('intro.title')}</h2>
      <p class="lead">${p('intro.text')}</p>
      <p><a class="text-link" href="${ctx.path('histoire')}">${ctx.t('cta.readStory')}</a></p>
    </div>
  </div>
</section>

<section class="section theme-sand texture" aria-labelledby="philo-title">
  <div class="wrap editorial">
    <div class="editorial__media" data-reveal>
      ${arch(media(ctx, { image: PHILOSOPHY.image, alt: alt(PHILOSOPHY), format: null, sizes: '(min-width: 56rem) 34vw, 86vw' }))}
    </div>
    <div class="editorial__text stack stack-l" data-reveal style="--reveal-i:1">
      ${eyebrow(p('philosophy.eyebrow'))}
      <h2 id="philo-title">${p('philosophy.title')}</h2>
      <p>${p('philosophy.text')}</p>
      ${ornament()}
    </div>
  </div>
</section>

<section class="section theme-dark lattice recevoir" aria-labelledby="experience-title">
  <div class="wrap recevoir__inner" data-reveal>
    ${eyebrow(p('experience.eyebrow'))}
    <h2 id="experience-title">${p('experience.title')}</h2>
    <p class="lead">${p('experience.text')}</p>
  </div>
</section>

<section class="section" aria-labelledby="specialties-title">
  <div class="wrap">
    ${sectionHead({ id: 'specialties-title', kicker: p('specialties.eyebrow'), title: p('specialties.title'), lead: p('specialties.text'), link: { href: ctx.path('carte'), label: ctx.t('cta.viewMenu') } })}
    <ul class="specialties" role="list">
      ${ctx.menu.categories.map((c, i) => html`<li data-reveal style="--reveal-i:${i}">
        <a class="specialty" href="${ctx.path('carte')}#${c.id}">
          <span class="specialty__index" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
          <span class="specialty__name">${ctx.t(`pages.carte.categories.${c.id}`)}</span>
          <span class="specialty__desc">${p(`specialties.items.${c.id}`)}</span>
        </a>
      </li>`)}
    </ul>
  </div>
</section>

<section class="section theme-sand texture" aria-labelledby="signature-title">
  <div class="wrap">
    ${sectionHead({ id: 'signature-title', kicker: p('signature.eyebrow'), title: p('signature.title'), align: 'center' })}
    ${signatureDishes.length
      ? html`<div class="arcade">${signatureDishes.map((d, i) => dishFeature(ctx, d, { index: i }))}</div>`
      : html`<p class="section-note" data-provisional="signature-pending">${p('signature.text')}</p>
        <div class="arcade">${[0, 1, 2].map((i) => html`<div class="dish-feature" data-reveal style="--reveal-i:${i}">${arch(media(ctx, { image: null, format: null }), { framed: false })}</div>`)}</div>`}
  </div>
</section>

<section class="section" aria-labelledby="photos-title">
  <div class="wrap">
    ${sectionHead({ id: 'photos-title', kicker: p('photos.eyebrow'), title: p('photos.title'), link: { href: ctx.path('galerie'), label: ctx.t('cta.viewGallery') } })}
    <div class="mosaic">
      ${MOSAIC.map((m, i) => html`<div class="mosaic__item" data-reveal style="--reveal-i:${i}">${media(ctx, { image: m.image, alt: alt(m), format: m.format, sizes: i === 0 ? '(min-width: 48rem) 55vw, 100vw' : '(min-width: 48rem) 45vw, 100vw' })}</div>`)}
    </div>
  </div>
</section>

${reviewsSection(ctx)}

<section class="section cta-band theme-dark lattice" aria-labelledby="cta-title">
  ${frieze('frieze--top')}
  <div class="wrap cta-band__inner">
    ${eyebrow(p('cta.eyebrow'))}
    <h2 id="cta-title">${p('cta.title')}</h2>
    <p>${p('cta.text')}</p>
    <div class="actions">
      ${button({ href: ctx.path('reservation'), label: ctx.t('cta.reserve') })}
      ${button({ href: ctx.path('carte'), label: ctx.t('cta.viewMenu'), variant: 'ghost' })}
    </div>
  </div>
</section>`;

  return {
    title: p('seoTitle'),
    description: p('seoDescription'),
    body,
    jsonLd: [ctx.restaurantSchema()],
  };
}
