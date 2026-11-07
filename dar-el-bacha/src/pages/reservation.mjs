import { html } from '../../scripts/lib/html.mjs';
import { pageHead, info, button } from '../components/ui.mjs';

/*
  Trois canaux distincts, jamais confondus :
  A. Formulaire  → envoie une DEMANDE (statut : en attente de confirmation).
  B. WhatsApp    → ouvre une conversation ; l'utilisateur envoie lui-même le message.
  C. Système connecté (optionnel) → n'apparaît que si site.json > reservation.bookingSystem est renseigné.
*/

export function render(ctx) {
  const p = (key) => ctx.t(`pages.reservation.${key}`);
  const f = (key) => p(`form.${key}`);
  const { site } = ctx;
  const wa = site.whatsapp?.number;
  const system = site.reservation?.bookingSystem;

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
${pageHead({ title: p('title'), lead: p('lead') })}

<section class="section">
  <div class="wrap">
    ${system && html`
    <div class="panel booking-system" aria-labelledby="system-title">
      <h2 id="system-title">${p('system.title')}</h2>
      <p>${p('system.text')}</p>
      ${button({ href: system.url, label: p('system.title'), external: true })}
    </div>`}

    <div class="booking">
      <!-- A. Demande de réservation -->
      <div class="panel" aria-labelledby="form-title">
        <h2 id="form-title">${f('title')}</h2>
        <p>${f('text')}</p>
        <form id="reservation-form" novalidate
          data-endpoint="${site.reservation?.formEndpoint || ''}"${site.reservation?.formEndpoint ? '' : html` data-provisional="form-endpoint"`}
          data-messages="${JSON.stringify(messages)}">
          <div class="form-grid">
            ${field({ id: 'name', autocomplete: 'name', full: true, extra: html` maxlength="120"` })}
            ${field({ id: 'email', type: 'email', autocomplete: 'email', extra: html` maxlength="160"` })}
            ${field({ id: 'phone', type: 'tel', autocomplete: 'tel', extra: html` maxlength="24" inputmode="tel"` })}
            ${field({ id: 'date', type: 'date' })}
            ${field({ id: 'time', type: 'time', extra: html` step="900"` })}
            ${guests}
            ${field({ id: 'message', type: 'textarea', required: false, full: true })}
          </div>
          <!-- Piège à robots : champ invisible, doit rester vide -->
          <div class="visually-hidden" aria-hidden="true">
            <label for="f-website">Website</label>
            <input id="f-website" name="website" type="text" tabindex="-1" autocomplete="off">
          </div>
          <p class="note">${f('note')}</p>
          <button class="btn" type="submit">${f('submit')}</button>
          <p class="form-status" role="status" aria-live="polite"></p>
        </form>
      </div>

      <!-- B. WhatsApp : canal de contact direct, distinct du formulaire -->
      <aside class="panel theme-dark" aria-labelledby="wa-title">
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
  </div>
</section>`;

  return { title: p('seoTitle'), description: p('seoDescription'), body };
}
