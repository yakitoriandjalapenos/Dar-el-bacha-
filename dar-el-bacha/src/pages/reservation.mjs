import { html } from '../../scripts/lib/html.mjs';
import { pageHead, info, button } from '../components/ui.mjs';
import { eyebrow } from '../components/sections.mjs';

/*
  Trois parcours distincts, jamais confondus (cahier des charges, section 4.5) :
  A. Formulaire  → envoie une DEMANDE (statut : en attente de confirmation par le restaurant).
  B. WhatsApp    → ouvre une conversation ; le visiteur envoie lui-même le message.
  C. Système connecté (optionnel) → n'apparaît que si site.json › reservation.bookingSystem est
     réellement configuré : lien, et module intégré chargé uniquement à la demande (embedUrl).
     Aucune disponibilité ni confirmation n'est jamais simulée.
  Les conditions de réservation (site.json › reservation.conditions) s'affichent dès qu'elles sont
  validées par le restaurant ; d'ici là, un repère [À CONFIRMER].
*/
export function render(ctx) {
  const p = (key) => ctx.t(`pages.reservation.${key}`);
  const f = (key) => p(`form.${key}`);
  const { site } = ctx;
  const wa = site.whatsapp?.number;
  const system = site.reservation?.bookingSystem;
  const endpoint = site.reservation?.formEndpoint;
  const conditions = site.reservation?.conditions?.[ctx.lang] ?? null;

  // Parcours effectivement proposés (le système connecté seulement s'il est configuré)
  const paths = [
    system && { id: 'system-title', title: p('system.title'), text: p('paths.system') },
    { id: 'form-title', title: f('title'), text: p('paths.form') },
    { id: 'wa-title', title: p('whatsapp.title'), text: p('paths.whatsapp') },
  ].filter(Boolean);

  const field = ({ id, type = 'text', required = true, autocomplete, full = false, extra = '' }) => html`
    <div class="field${full ? ' field--full' : ''}">
      <label for="f-${id}">${f(id)}${required
        ? html` <span class="visually-hidden">(${ctx.t('a11y.required')})</span><span aria-hidden="true">*</span>`
        : html` <span class="field__hint">(${f('optional')})</span>`}</label>
      ${type === 'textarea'
        ? html`<textarea id="f-${id}" name="${id}" rows="4" maxlength="1000" aria-describedby="e-${id}"></textarea>`
        : html`<input id="f-${id}" name="${id}" type="${type}"${required ? html` required` : ''}${autocomplete ? html` autocomplete="${autocomplete}"` : ''} aria-describedby="e-${id}"${extra}>`}
      <p class="field__error" id="e-${id}"></p>
    </div>`;

  const guests = html`
    <div class="field">
      <label for="f-guests">${f('guests')} <span class="visually-hidden">(${ctx.t('a11y.required')})</span><span aria-hidden="true">*</span></label>
      <select id="f-guests" name="guests" required aria-describedby="e-guests">
        <option value=""></option>
        ${Array.from({ length: 12 }, (_, i) => html`<option value="${i + 1}">${i + 1}</option>`)}
        <option value="12+">${f('guestsMore')}</option>
      </select>
      <p class="field__error" id="e-guests"></p>
    </div>`;

  const messages = {
    ...ctx.tObj('pages.reservation.form.status'),
    errors: ctx.tObj('pages.reservation.form.errors'),
    whatsapp: { intro: p('whatsapp.message'), fields: ctx.tObj('pages.reservation.whatsapp.fields') },
  };

  const body = html`
${pageHead({ title: p('title'), lead: p('lead'), kicker: ctx.t('pages.home.cta.eyebrow') })}

<section class="section section--tight paths-section" aria-labelledby="paths-title">
  <div class="wrap">
    <h2 class="visually-hidden" id="paths-title">${p('paths.title')}</h2>
    <ol class="paths" role="list">
      ${paths.map((path, i) => html`<li class="path">
        <a class="path__link" href="#${path.id}">
          <span class="path__number" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
          <span class="path__title">${path.title}</span>
          <span class="path__text">${path.text}</span>
        </a>
      </li>`)}
    </ol>
  </div>
</section>

<section class="section booking-section">
  <div class="wrap">
    ${system && html`
    <section class="panel booking-system" aria-labelledby="system-title">
      ${eyebrow(p('paths.system'))}
      <h2 id="system-title">${p('system.title')}</h2>
      <p>${p('system.text')}</p>
      <div class="actions">
        ${button({ href: system.url, label: p('system.title'), external: true })}
        ${system.embedUrl && html`<button class="btn btn--ghost" type="button" data-embed="${system.embedUrl}" data-embed-title="${p('system.frameTitle')}" data-embed-target="booking-embed">${p('system.load')}</button>`}
      </div>
      ${system.embedUrl && html`<div class="embed-frame" id="booking-embed" hidden></div>`}
    </section>`}

    <div class="booking">
      <!-- A. Demande de réservation -->
      <section class="panel" aria-labelledby="form-title">
        ${eyebrow(p('paths.form'))}
        <h2 id="form-title">${f('title')}</h2>
        <p>${f('text')}</p>
        <!-- Sans JavaScript, le navigateur valide les champs et envoie la demande au service (s'il est relié) ;
             avec JavaScript, main.js prend le relais (messages traduits, mêmes règles que le serveur). -->
        <form id="reservation-form"${endpoint ? html` method="post" action="${endpoint}"` : ''}
          data-endpoint="${endpoint || ''}"${endpoint ? '' : html` data-provisional="form-endpoint"`}
          data-max-days="${ctx.reservationMaxDays}"${site.openingHours ? html` data-opening-hours="${JSON.stringify(site.openingHours)}"` : ''}
          data-messages="${JSON.stringify(messages)}">
          <input type="hidden" name="lang" value="${ctx.lang}">
          <input type="hidden" name="started" value="">
          <div class="form-grid">
            ${field({ id: 'name', autocomplete: 'name', full: true, extra: html` maxlength="120"` })}
            ${field({ id: 'email', type: 'email', autocomplete: 'email', extra: html` maxlength="160"` })}
            ${field({ id: 'phone', type: 'tel', autocomplete: 'tel', extra: html` maxlength="24" inputmode="tel"` })}
            ${field({ id: 'date', type: 'date' })}
            ${field({ id: 'time', type: 'time', extra: html` step="900"` })}
            ${guests}
            ${field({ id: 'message', type: 'textarea', required: false, full: true })}
          </div>
          <!-- Piège à robots : champ invisible, doit rester vide (protection serveur à prévoir avant la mise en ligne) -->
          <div class="visually-hidden" aria-hidden="true">
            <label for="f-website">Website</label>
            <input id="f-website" name="website" type="text" tabindex="-1" autocomplete="off">
          </div>
          <div class="field field--consent">
            <div class="consent">
              <input id="f-consent" name="consent" type="checkbox" value="yes" required aria-describedby="e-consent consent-info">
              <label for="f-consent">${f('consent')} <span class="visually-hidden">(${ctx.t('a11y.required')})</span><span aria-hidden="true">*</span></label>
            </div>
            <p class="note" id="consent-info">${f('privacyInfo')} <a href="${ctx.path('confidentialite')}">${ctx.t('legal.privacy')}</a></p>
            <p class="field__error" id="e-consent"></p>
          </div>
          ${site.reservation?.antiSpam?.provider === 'turnstile' && html`<div class="cf-turnstile" data-sitekey="${site.reservation.antiSpam.siteKey}" data-language="${ctx.lang}" data-theme="light" data-action="reservation"></div>`}
          <p class="note">${f('note')}</p>
          ${(!endpoint || site.reservation?.antiSpam) && html`<p class="note no-js-only">${f('noScript')}</p>`}
          <button class="btn" type="submit">${f('submit')}</button>
          <p class="form-status" role="status" aria-live="polite"></p>
        </form>
      </section>

      <!-- B. WhatsApp : canal de contact direct, distinct du formulaire -->
      <aside class="panel theme-dark lattice" aria-labelledby="wa-title">
        ${eyebrow(p('paths.whatsapp'))}
        <h2 id="wa-title">${p('whatsapp.title')}</h2>
        <p>${p('whatsapp.text')}</p>
        ${wa
          ? button({ href: `https://wa.me/${wa}?text=${encodeURIComponent(p('whatsapp.message'))}`, label: ctx.t('cta.whatsapp'), icon: 'chat', external: true, extra: { 'data-whatsapp': wa } })
          : button({ label: ctx.t('cta.whatsapp'), icon: 'chat', disabled: true })}
        ${!wa && html`<p>${info(ctx, null, 'whatsapp')}</p>`}
        <p class="note">${p('whatsapp.useForm')}</p>
        <p class="note">${p('whatsapp.note')}</p>
      </aside>
    </div>

    <section class="conditions" aria-labelledby="conditions-title">
      <h2 id="conditions-title">${p('conditions.title')}</h2>
      <p>${info(ctx, conditions, 'conditions')}</p>
    </section>
  </div>
</section>`;

  return { title: p('seoTitle'), description: p('seoDescription'), body };
}
