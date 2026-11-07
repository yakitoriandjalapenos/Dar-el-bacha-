import { html } from '../../scripts/lib/html.mjs';
import { pageHead, info, button } from '../components/ui.mjs';
import { media } from '../components/media.mjs';

const SOCIAL_LABELS = { instagram: 'Instagram', facebook: 'Facebook', tripadvisor: 'Tripadvisor' };

export function render(ctx) {
  const p = (key) => ctx.t(`pages.contact.${key}`);
  const { site } = ctx;
  const wa = site.whatsapp?.number;
  const socials = Object.entries(site.social).filter(([, url]) => url);
  const directionsUrl = ctx.directionsUrl();

  const body = html`
${pageHead({ title: p('title'), lead: p('lead') })}

<section class="section">
  <div class="wrap contact-grid">
    <dl class="info-list">
      <div><dt>${p('address')}</dt><dd>${info(ctx, ctx.address(), 'address')}</dd></div>
      <div><dt>${p('phone')}</dt><dd>${site.phone ? html`<a href="tel:${site.phone.replace(/\s+/g, '')}" dir="ltr">${site.phone}</a>` : info(ctx, null, 'phone')}</dd></div>
      <div><dt>${p('email')}</dt><dd>${site.email ? html`<a href="mailto:${site.email}">${site.email}</a>` : info(ctx, null, 'email')}</dd></div>
      <div><dt>${p('hours')}</dt><dd>${info(ctx, ctx.hours(), 'hours')}</dd></div>
      <div><dt>${p('whatsapp')}</dt><dd>${wa ? html`<a href="https://wa.me/${wa}" target="_blank" rel="noopener" dir="ltr">+${wa}</a>` : info(ctx, null, 'whatsapp')}</dd></div>
      <div><dt>${p('social')}</dt><dd>${socials.length
        ? socials.map(([k, url], i) => html`${i ? ', ' : ''}<a href="${url}" target="_blank" rel="noopener">${SOCIAL_LABELS[k] || k}</a>`)
        : info(ctx, null, 'social')}</dd></div>
    </dl>

    <div class="contact-map">
      <h2 class="visually-hidden">${p('map')}</h2>
      ${media(ctx, { image: ctx.media.contact.map.image, alt: ctx.media.contact.map.alt?.[ctx.lang] || p('map'), format: 'paysage', sizes: '(min-width: 56rem) 55vw, 100vw', caption: site.googleMapsUrl ? p('map') : ctx.t('tbc.map') })}
      <div class="actions">
        ${button({ href: directionsUrl, label: ctx.t('cta.directions'), icon: 'pin', external: true, disabled: !directionsUrl })}
        ${button({ href: site.googleMapsUrl, label: ctx.t('cta.openMaps'), variant: 'ghost', external: true, disabled: !site.googleMapsUrl })}
      </div>
    </div>
  </div>
</section>

<section class="section section--tight theme-dark cta-band">
  <div class="wrap actions">
    ${button({ href: ctx.path('reservation'), label: ctx.t('cta.reserve') })}
  </div>
</section>`;

  return { title: p('seoTitle'), description: p('seoDescription'), body, jsonLd: [ctx.restaurantSchema()] };
}
