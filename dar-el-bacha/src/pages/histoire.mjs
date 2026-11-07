import { html } from '../../scripts/lib/html.mjs';
import { pageHead, info, button, ornament } from '../components/ui.mjs';
import { media } from '../components/media.mjs';
import { arch } from '../components/arch.mjs';
import { eyebrow, frieze } from '../components/sections.mjs';

/*
  Notre histoire : présentation puis cinq chapitres (thèmes du cahier des charges, section 4.2).
  Photos : src/content/media.json (histoire). Le texte de présentation vient du restaurant
  (site.json › story) ; tant qu'il n'est pas fourni, un repère [À CONFIRMER] s'affiche.
  Rien n'est inventé : ni date, ni fondateur, ni distinction.
*/
const CHAPTERS = [
  { id: 'philosophie', theme: '' },
  { id: 'inspiration', theme: 'theme-sand texture' },
  { id: 'savoirFaire', theme: '' },
  { id: 'recevoir', theme: 'theme-dark lattice' },
  { id: 'ambiance', theme: 'theme-sand texture' },
];

export function render(ctx) {
  const p = (key) => ctx.t(`pages.histoire.${key}`);
  const slots = ctx.media.histoire;
  const alt = (slot) => slot.alt?.[ctx.lang] || '';
  const presentationText = ctx.site.story?.[ctx.lang] ?? null;

  const body = html`
${pageHead({ title: p('title'), lead: p('lead'), kicker: ctx.t('pages.home.intro.eyebrow') })}

<section class="section" aria-labelledby="presentation-title">
  <div class="wrap editorial editorial--reverse">
    <div class="editorial__media">
      ${arch(media(ctx, { image: slots.presentation.image, alt: alt(slots.presentation), format: null, sizes: '(min-width: 56rem) 26rem, 86vw', eager: true }))}
    </div>
    <div class="editorial__text stack stack-l" data-reveal style="--reveal-i:1">
      ${eyebrow(ctx.site.name)}
      <h2 id="presentation-title">${p('sections.presentation.title')}</h2>
      <p class="lead">${info(ctx, presentationText, 'story')}</p>
      ${ornament()}
    </div>
  </div>
</section>

${CHAPTERS.map((c, i) => html`
<section class="section chapter ${c.theme}" aria-labelledby="${c.id}-title">
  <div class="wrap editorial${i % 2 === 1 ? '' : ' editorial--reverse'}">
    <div class="editorial__media" data-reveal>
      ${media(ctx, { image: slots[c.id].image, alt: alt(slots[c.id]), format: 'portrait', dark: c.theme.includes('theme-dark'), sizes: '(min-width: 56rem) 26rem, 86vw' })}
    </div>
    <div class="editorial__text stack stack-l" data-reveal style="--reveal-i:1">
      <p class="chapter__number" aria-hidden="true">${String(i + 1).padStart(2, '0')}</p>
      <h2 id="${c.id}-title">${p(`sections.${c.id}.title`)}</h2>
      <p>${p(`sections.${c.id}.text`)}</p>
    </div>
  </div>
</section>`)}

<section class="section section--tight theme-dark lattice cta-band">
  ${frieze('frieze--top')}
  <div class="wrap cta-band__inner">
    <div class="actions">
      ${button({ href: ctx.path('carte'), label: ctx.t('cta.viewMenu') })}
      ${button({ href: ctx.path('reservation'), label: ctx.t('cta.reserve'), variant: 'ghost' })}
    </div>
  </div>
</section>`;

  return { title: p('seoTitle'), description: p('seoDescription'), body };
}
