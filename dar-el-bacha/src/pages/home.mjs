import { html } from '../../scripts/lib/html.mjs';
import { button, ornament } from '../components/ui.mjs';
import { arch } from '../components/arch.mjs';
import { media } from '../components/media.mjs';

// Emplacements photo de l'accueil : src/content/media.json (home).

export function render(ctx) {
  const p = (key) => ctx.t(`pages.home.${key}`);
  const { hero: HERO, philosophy: PHILOSOPHY, signature: SIGNATURE, mosaic: MOSAIC } = ctx.media.home;
  const alt = (slot) => slot.alt?.[ctx.lang] || '';
  // Le texte « présentée ici dès que… » n'a de sens que tant que les plats emblématiques ne sont pas illustrés.
  const signaturePending = SIGNATURE.some((s) => !s.image);

  const body = html`
<section class="hero theme-dark" aria-labelledby="hero-title">
  <div class="wrap hero__grid">
    <div class="hero__text">
      <h1 id="hero-title">${p('hero.title')}</h1>
      <p class="lead">${p('hero.text')}</p>
      <div class="actions">
        ${button({ href: ctx.path('reservation'), label: ctx.t('cta.reserve') })}
        ${button({ href: ctx.path('carte'), label: ctx.t('cta.viewMenu'), variant: 'ghost' })}
      </div>
    </div>
    <div class="hero__visual">
      ${arch(media(ctx, { image: HERO.image, alt: alt(HERO), format: null, dark: true, eager: true, priority: 'high', sizes: '(min-width: 56rem) 25rem, 78vw' }))}
    </div>
  </div>
</section>

<section class="section" aria-labelledby="intro-title">
  <div class="wrap split">
    <div class="stack">
      ${ornament()}
      <h2 id="intro-title">${p('intro.title')}</h2>
    </div>
    <div class="stack stack-l">
      <p class="lead">${p('intro.text')}</p>
      <p><a class="text-link" href="${ctx.path('histoire')}">${ctx.t('cta.readStory')}</a></p>
    </div>
  </div>
</section>

<section class="section section--sand" aria-labelledby="philo-title">
  <div class="wrap feature">
    ${media(ctx, { image: PHILOSOPHY.image, alt: alt(PHILOSOPHY), format: 'paysage', sizes: '(min-width: 56rem) 55vw, 100vw' })}
    <div class="stack stack-l">
      <h2 id="philo-title">${p('philosophy.title')}</h2>
      <p>${p('philosophy.text')}</p>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="signature-title">
  <div class="wrap">
    <div class="section-head">
      <div>
        <h2 id="signature-title">${p('signature.title')}</h2>
        ${signaturePending && html`<p data-provisional="signature-pending">${p('signature.text')}</p>`}
      </div>
      <a class="text-link" href="${ctx.path('carte')}">${ctx.t('cta.viewMenu')}</a>
    </div>
    <div class="arcade">
      ${SIGNATURE.map((s, i) => html`<div data-reveal style="--reveal-i:${i}">${arch(media(ctx, { image: s.image, alt: alt(s), format: null, sizes: '(min-width: 40rem) 30vw, 72vw' }), { framed: false })}</div>`)}
    </div>
  </div>
</section>

<section class="section section--raised" aria-labelledby="experience-title">
  <div class="wrap split">
    <h2 id="experience-title">${p('experience.title')}</h2>
    <p class="lead">${p('experience.text')}</p>
  </div>
</section>

<section class="section" aria-labelledby="photos-title">
  <div class="wrap">
    <div class="section-head">
      <h2 id="photos-title">${p('photos.title')}</h2>
      <a class="text-link" href="${ctx.path('galerie')}">${ctx.t('cta.viewGallery')}</a>
    </div>
    <div class="mosaic">
      ${MOSAIC.map((m) => media(ctx, { image: m.image, alt: alt(m), format: m.format, sizes: '(min-width: 48rem) 50vw, 100vw' }))}
    </div>
  </div>
</section>

<section class="section cta-band theme-dark" aria-labelledby="cta-title">
  <div class="wrap split">
    <h2 id="cta-title">${p('cta.title')}</h2>
    <div>
      <p>${p('cta.text')}</p>
      <div class="actions">
        ${button({ href: ctx.path('reservation'), label: ctx.t('cta.reserve') })}
        ${button({ href: ctx.path('carte'), label: ctx.t('cta.viewMenu'), variant: 'ghost' })}
      </div>
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
