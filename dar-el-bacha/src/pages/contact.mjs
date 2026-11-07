import { html } from '../../scripts/lib/html.mjs';
import { pageHead, info, button } from '../components/ui.mjs';
import { media } from '../components/media.mjs';
import { eyebrow, frieze } from '../components/sections.mjs';

const SOCIAL_LABELS = { instagram: 'Instagram', facebook: 'Facebook', tripadvisor: 'Tripadvisor' };

/*
  Contact : informations pratiques, toutes issues de site.json (repère [À CONFIRMER] sinon).
  Plan d'accès chargé à la demande : rien n'est demandé à Google tant que le visiteur ne clique pas
  (performances, vie privée). Sans adresse ni coordonnées confirmées, aucun plan n'est proposé.
  Sans JavaScript, le bouton ouvre simplement Google Maps.
*/
export function render(ctx) {
  const p = (key) => ctx.t(`pages.contact.${key}`);
  const { site } = ctx;
  const wa = site.whatsapp?.number;
  const socials = Object.entries(site.social).filter(([k, url]) => !k.startsWith('_') && url);
  const directionsUrl = ctx.directionsUrl();
  const { latitude, longitude } = site.geo || {};
  const place = latitude && longitude ? `${latitude},${longitude}` : ctx.address() && `${site.name}, ${ctx.address()}`;
  const embedUrl = place ? `https://maps.google.com/maps?q=${encodeURIComponent(place)}&z=16&output=embed` : null;
  const mapSlot = ctx.media.contact.map;

  const body = html`
${pageHead({ title: p('title'), lead: p('lead'), kicker: p('kicker') })}

<section class="section">
  <div class="wrap contact-grid">
    <div class="stack stack-l">
      ${eyebrow(ctx.siteName)}
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
    </div>

    <div class="contact-map">
      <h2 class="visually-hidden" id="map-title">${p('map')}</h2>
      <div class="map-frame" id="map-embed">
        ${media(ctx, { image: mapSlot.image, alt: mapSlot.alt?.[ctx.lang] || p('map'), format: 'paysage', sizes: '(min-width: 56rem) 55vw, 100vw', eager: true, caption: place ? p('map') : ctx.t('tbc.map') })}
        ${embedUrl && html`<a class="btn map-frame__load" href="${site.googleMapsUrl || directionsUrl}" target="_blank" rel="noopener"
          data-embed="${embedUrl}" data-embed-title="${p('mapTitle')}" data-embed-target="map-embed">${p('mapLoad')}</a>`}
      </div>
      ${embedUrl && html`<p class="note">${p('mapNote')}</p>`}
      <div class="actions">
        ${button({ href: directionsUrl, label: ctx.t('cta.directions'), icon: 'pin', external: true, disabled: !directionsUrl })}
        ${button({ href: site.googleMapsUrl, label: ctx.t('cta.openMaps'), variant: 'ghost', external: true, disabled: !site.googleMapsUrl })}
      </div>
    </div>
  </div>
</section>

<section class="section section--tight theme-dark lattice cta-band">
  ${frieze('frieze--top')}
  <div class="wrap cta-band__inner">
    ${eyebrow(ctx.t('pages.home.cta.eyebrow'))}
    <div class="actions">${button({ href: ctx.path('reservation'), label: ctx.t('cta.reserve') })}</div>
  </div>
</section>`;

  return { title: p('seoTitle'), description: p('seoDescription'), body, jsonLd: [ctx.restaurantSchema()] };
}
