import { html } from '../../scripts/lib/html.mjs';
import { pageHead, info, button } from '../components/ui.mjs';
import { media } from '../components/media.mjs';
import { arch } from '../components/arch.mjs';

// Ordre des sections. Photos d'illustration : src/content/media.json (histoire).
const SECTION_IDS = ['philosophie', 'inspiration', 'savoirFaire', 'recevoir', 'ambiance'];

export function render(ctx) {
  const p = (key) => ctx.t(`pages.histoire.${key}`);
  const slots = ctx.media.histoire;
  const alt = (slot) => slot.alt?.[ctx.lang] || '';
  const SECTIONS = SECTION_IDS.map((id) => ({ id, ...slots[id] }));

  // Le texte de présentation n'est pas fourni : on n'invente rien, on affiche un repère.
  const presentationText = ctx.site.story?.[ctx.lang] ?? null;

  const body = html`
${pageHead({ title: p('title'), lead: p('lead') })}

<section class="section" aria-labelledby="presentation-title">
  <div class="wrap feature">
    <div class="stack stack-l">
      <h2 id="presentation-title">${p('sections.presentation.title')}</h2>
      <p class="lead">${info(ctx, presentationText, 'story')}</p>
    </div>
    <div style="max-width: 22rem; justify-self: center; width: 100%">
      ${arch(media(ctx, { image: slots.presentation.image, alt: alt(slots.presentation), format: null, sizes: '22rem' }))}
    </div>
  </div>
</section>

${SECTIONS.map((s, i) => html`
<section class="section${i % 2 === 0 ? ' section--sand' : ''}" aria-labelledby="${s.id}-title">
  <div class="wrap feature${i % 2 === 1 ? ' feature--reverse' : ''}">
    ${media(ctx, { image: s.image, alt: alt(s), format: 'paysage', sizes: '(min-width: 56rem) 55vw, 100vw' })}
    <div class="stack stack-l">
      <h2 id="${s.id}-title">${p(`sections.${s.id}.title`)}</h2>
      <p>${p(`sections.${s.id}.text`)}</p>
    </div>
  </div>
</section>`)}

<section class="section section--tight theme-dark cta-band">
  <div class="wrap actions">
    ${button({ href: ctx.path('carte'), label: ctx.t('cta.viewMenu') })}
    ${button({ href: ctx.path('reservation'), label: ctx.t('cta.reserve'), variant: 'ghost' })}
  </div>
</section>`;

  return { title: p('seoTitle'), description: p('seoDescription'), body };
}
