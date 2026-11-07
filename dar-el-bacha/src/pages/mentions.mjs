import { html } from '../../scripts/lib/html.mjs';
import { legalPage } from '../components/legal.mjs';

// Polices réellement utilisées (src/assets/fonts/fonts.json), noms propres affichés en latin dans toutes les langues
const FONTS = 'Cormorant Garamond · Jost · Noto Kufi Arabic · Noto Naskh Arabic — SIL Open Font License 1.1';

/*
  Mentions légales. Toutes les informations sur l'éditeur, le directeur de la publication et
  l'hébergeur viennent de site.json › legal (repère [À CONFIRMER] sinon). À valider par un juriste.
*/
export function render(ctx) {
  const p = (key) => ctx.t(`pages.mentions.${key}`);
  const s = (key) => p(`sections.${key}`);
  const body = legalPage(ctx, {
    title: p('title'),
    lead: p('lead'),
    sections: [
      { id: 'editeur', title: s('editor.title'), fields: ['companyName', 'legalForm', 'shareCapital', 'registeredOffice', 'rc', 'ice', 'identifiantFiscal', 'phone', 'email'] },
      { id: 'publication', title: s('director.title'), fields: ['publicationDirector'] },
      { id: 'hebergement', title: s('hosting.title'), fields: ['hosting'] },
      { id: 'propriete', title: s('ip.title'), text: s('ip.text') },
      { id: 'credits', title: s('credits.title'), text: s('credits.fonts'), extra: html`<p lang="en" dir="ltr" class="legal-fonts">${FONTS}</p>`, fields: ['photoCredits'] },
      ...(ctx.photoCredits.length ? [{
        id: 'illustrations', title: ctx.t('demo.creditsTitle'), text: ctx.t('demo.creditsText'),
        // Titres, auteurs et licences tels que publiés sur Wikimedia Commons (en latin dans toutes les langues)
        extra: html`<ul class="photo-credits" lang="en" dir="ltr" data-provisional="photo-illustration">
          ${ctx.photoCredits.map((c) => html`<li><a href="${c.source}" rel="noopener" target="_blank">${c.title}</a> — ${c.author} — <a href="${c.licenseUrl}" rel="noopener license" target="_blank">${c.license}</a></li>`)}
        </ul>`,
      }] : []),
      { id: 'donnees', title: s('privacy.title'), text: s('privacy.text'), extra: html`<p><a class="text-link" href="${ctx.path('confidentialite')}">${ctx.t('legal.privacy')}</a></p>` },
    ],
  });
  return { title: p('seoTitle'), description: p('seoDescription'), body };
}
