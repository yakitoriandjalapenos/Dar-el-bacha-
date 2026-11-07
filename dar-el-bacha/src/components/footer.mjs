import { html } from '../../scripts/lib/html.mjs';
import { info } from './ui.mjs';
import { logoImage } from './logo.mjs';
import { frieze } from './sections.mjs';

const EXPLORE = ['histoire', 'carte', 'galerie', 'reservation', 'contact'];
const SOCIAL_LABELS = { instagram: 'Instagram', facebook: 'Facebook', tripadvisor: 'Tripadvisor' };

/*
  Pied de page : logo complet ivoire et or (fond émeraude), informations essentielles du restaurant
  (toujours issues de site.json, repère [À CONFIRMER] sinon), navigation, réseaux sociaux et
  changement de langue (accessible en bas de chaque page, y compris sur mobile).
*/
export function footer(ctx) {
  const { site } = ctx;
  const socials = Object.entries(site.social).filter(([k, url]) => !k.startsWith('_') && url);
  const wa = site.whatsapp?.number;

  return html`<footer class="site-footer theme-dark">
    ${frieze('frieze--footer')}
    <div class="wrap">
      <div class="site-footer__grid">
        <div class="site-footer__brand">
          <a class="footer-logo" href="${ctx.path('home')}">${logoImage(ctx, 'complet', { alt: ctx.t('a11y.home') })}</a>
          <p>${ctx.t('footer.tagline')}</p>
        </div>

        <div>
          <h2>${ctx.t('footer.find')}</h2>
          <address class="stack" style="--stack-gap: var(--space-3xs)">
            <p>${info(ctx, ctx.address(), 'address')}</p>
            <p>${site.phone ? html`<a href="tel:${site.phone.replace(/\s+/g, '')}" dir="ltr">${site.phone}</a>` : info(ctx, null, 'phone')}</p>
            ${site.email && html`<p><a href="mailto:${site.email}">${site.email}</a></p>`}
            ${wa && html`<p><a href="https://wa.me/${wa}" target="_blank" rel="noopener">WhatsApp<span class="visually-hidden"> (${ctx.t('a11y.newTab')})</span></a></p>`}
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
          <h2 class="site-footer__langs-title" id="footer-langs">${ctx.t('a11y.languages')}</h2>
          <ul class="site-footer__langs" role="list" aria-labelledby="footer-langs">
            ${ctx.langs.map((l) => html`<li><a href="${ctx.path(ctx.pageId, l.code)}" hreflang="${l.hreflang}" lang="${l.code}"${l.code === ctx.lang ? html` aria-current="true"` : ''}>${ctx.tFor(l.code, 'lang.name')}</a></li>`)}
          </ul>
        </div>
      </div>

      <p class="site-footer__base">${ctx.t('footer.rights', { year: ctx.year })}</p>
    </div>
  </footer>`;
}
