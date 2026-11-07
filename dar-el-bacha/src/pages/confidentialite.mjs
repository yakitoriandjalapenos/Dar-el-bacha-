import { html } from '../../scripts/lib/html.mjs';
import { legalPage } from '../components/legal.mjs';

/*
  Politique de confidentialité (loi marocaine 09-08). Le texte ne décrit que ce que le site fait
  réellement (formulaire, absence de cookies, services tiers chargés à la demande) ; tout ce qui
  relève du restaurant (responsable, durée de conservation, transferts, déclaration CNDP) vient de
  site.json › legal. Document à faire valider par un juriste avant toute mise en ligne.
*/
export function render(ctx) {
  const p = (key) => ctx.t(`pages.confidentialite.${key}`);
  const s = (key) => p(`sections.${key}`);
  const list = (keys) => html`<ul class="legal-list">${keys.map((k) => html`<li>${k}</li>`)}</ul>`;

  const body = legalPage(ctx, {
    title: p('title'),
    lead: p('lead'),
    sections: [
      { id: 'responsable', title: s('controller.title'), text: s('controller.text'), fields: ['companyName', 'registeredOffice', 'dataController', 'dataContactEmail'] },
      { id: 'donnees', title: s('data.title'), text: s('data.text'), extra: list(['item1', 'item2', 'item3', 'item4', 'item5'].map((k) => s(`data.${k}`))) },
      { id: 'finalite', title: s('purpose.title'), text: s('purpose.text') },
      { id: 'base', title: s('basis.title'), text: s('basis.text') },
      { id: 'destinataires', title: s('recipients.title'), text: s('recipients.text'), fields: ['hosting', 'emailProvider'] },
      { id: 'transferts', title: s('transfers.title'), text: s('transfers.text'), fields: ['dataTransfers'] },
      { id: 'conservation', title: s('retention.title'), fields: ['dataRetention'] },
      { id: 'droits', title: s('rights.title'), text: s('rights.text'), fields: ['dataContactEmail'] },
      { id: 'cndp', title: s('cndp.title'), text: s('cndp.text'), extra: html`<p><a href="https://www.cndp.ma" target="_blank" rel="noopener" dir="ltr">www.cndp.ma</a></p>`, fields: ['cndpReference'] },
      { id: 'tiers', title: s('thirdParty.title'), extra: list([s('thirdParty.whatsapp'), s('thirdParty.maps'), s('thirdParty.booking'), ctx.site.reservation?.antiSpam && s('thirdParty.antispam')].filter(Boolean)) },
      { id: 'cookies', title: s('cookies.title'), text: s('cookies.text') },
      { id: 'securite', title: s('security.title'), text: s('security.text') },
    ],
  });
  return { title: p('seoTitle'), description: p('seoDescription'), body };
}
