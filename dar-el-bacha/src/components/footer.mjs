import { html } from '../../scripts/lib/html.mjs';
import { info } from './ui.mjs';
import { logoImage } from './logo.mjs';

const EXPLORE = ['histoire', 'carte', 'galerie', 'reservation', 'contact'];
const SOCIAL_LABELS = { instagram: 'Instagram', facebook: 'Facebook', tripadvisor: 'Tripadvisor' };

export function footer(ctx) {
  const { site } = ctx;
  const socials = Object.entries(site.social).filter(([, url]) => url);

  return html`<footer class="site-footer theme-dark">
    <div class="wrap">
      <div class="site-footer__grid">
        <div class="stack">
          <a class="footer-logo" href="${ctx.path('home')}">${logoImage(ctx, 'complet', { alt: ctx.t('a11y.home') })}</a>
          <p>${ctx.t('footer.tagline')}</p>
        </div>

        <div>
          <h2>${ctx.t('footer.find')}</h2>
          <address class="stack" style="--stack-gap: var(--space-3xs)">
            <p>${info(ctx, ctx.address(), 'address')}</p>
            <p>${site.phone ? html`<a href="tel:${site.phone.replace(/\s+/g, '')}">${site.phone}</a>` : info(ctx, null, 'phone')}</p>
            <p>${info(ctx, ctx.hours(), 'hours')}</p>
          </address>
        </div>

        <nav aria-labelledby="footer-explore">
          <h2 id="footer-explore">${ctx.t('footer.explore')}</h2>
          <ul role="list">
            ${EXPLORE.map((id) => html`<li><a href="${ctx.path(id)}">${ctx.t(`nav.${id}`)}</a></li>`)}
          </ul>
        </nav>

        <div>
          <h2>${ctx.t('footer.follow')}</h2>
          ${socials.length
            ? html`<ul role="list">${socials.map(([key, url]) => html`<li><a href="${url}" target="_blank" rel="noopener">${SOCIAL_LABELS[key] || key}<span class="visually-hidden"> (${ctx.t('a11y.newTab')})</span></a></li>`)}</ul>`
            : html`<p>${info(ctx, null, 'social')}</p>`}
        </div>
      </div>

      <p class="site-footer__base">${ctx.t('footer.rights', { year: ctx.year })}</p>
    </div>
  </footer>`;
}
