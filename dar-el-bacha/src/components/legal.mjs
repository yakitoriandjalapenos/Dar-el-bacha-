import { html } from '../../scripts/lib/html.mjs';
import { info, pageHead } from './ui.mjs';

/*
  Éléments communs aux pages juridiques (Mentions légales, Politique de confidentialité).
  Toutes les informations viennent de site.json › legal (et des coordonnées du restaurant) ;
  rien n'est déduit ni inventé : une valeur absente affiche [INFORMATION JURIDIQUE À CONFIRMER].
  Tant que legal.validated n'est pas true (validation par un juriste), un bandeau l'indique
  et la mise en production est refusée.
*/

const LOCALIZED = ['dataRetention', 'dataTransfers'];

export function legalValue(ctx, key) {
  const { site } = ctx;
  if (key === 'phone') return site.phone ? html`<span dir="ltr">${site.phone}</span>` : info(ctx, null, 'phone');
  if (key === 'email') return site.email ? html`<a href="mailto:${site.email}">${site.email}</a>` : info(ctx, null, 'email');
  const raw = site.legal?.[key];
  const value = LOCALIZED.includes(key) ? raw?.[ctx.lang] : raw;
  if (key === 'dataContactEmail' && value) return html`<a href="mailto:${value}">${value}</a>`;
  return info(ctx, value ?? null, 'legal');
}

export const legalFields = (ctx, keys) => html`<dl class="legal-fields">
  ${keys.map((k) => html`<div><dt>${ctx.t(`legal.fields.${k}`)}</dt><dd>${legalValue(ctx, k)}</dd></div>`)}
</dl>`;

/** Page juridique : en-tête, bandeau de validation, sections { id, title, text?, fields?, extra? }. */
export function legalPage(ctx, { title, lead, sections }) {
  const validated = ctx.site.legal?.validated === true;
  return html`
${pageHead({ title, lead })}
<section class="section legal">
  <div class="wrap wrap--narrow stack stack-l">
    ${!validated && html`<p class="legal-draft" role="note" data-provisional="legal-draft">${ctx.t('legal.draft')}</p>`}
    ${sections.map((s) => html`<section class="legal__section" aria-labelledby="legal-${s.id}">
      <h2 id="legal-${s.id}">${s.title}</h2>
      ${s.text && html`<p>${s.text}</p>`}
      ${s.extra || ''}
      ${s.fields && legalFields(ctx, s.fields)}
    </section>`)}
  </div>
</section>`;
}
