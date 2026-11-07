import { html } from '../../scripts/lib/html.mjs';
import { pageHead, button } from '../components/ui.mjs';
import { media } from '../components/media.mjs';
import { eyebrow, frieze } from '../components/sections.mjs';

const SIZES = {
  portrait: '(min-width: 72rem) 25vw, (min-width: 48rem) 33vw, 50vw',
  carre: '(min-width: 72rem) 25vw, (min-width: 48rem) 33vw, 50vw',
  paysage: '(min-width: 72rem) 50vw, (min-width: 48rem) 66vw, 100vw',
};

/*
  Galerie : les sept thèmes du cahier des charges (gallery.json), composition éditoriale variée.
  Une photo réelle est un lien vers sa plus grande version (fonctionne sans JavaScript) ;
  avec JavaScript, elle s'ouvre dans une fenêtre d'agrandissement accessible (main.js) :
  flèches du clavier (inversées en arabe), Échap pour fermer, retour du focus, glissement au doigt.
  Les emplacements provisoires ne sont pas cliquables.
*/
export function render(ctx) {
  const p = (key) => ctx.t(`pages.galerie.${key}`);
  const labels = ctx.tObj('pages.galerie.lightbox');

  const body = html`
${pageHead({ title: p('title'), lead: p('lead'), kicker: ctx.t('pages.home.photos.eyebrow') })}

<section class="section" aria-label="${p('title')}">
  <div class="wrap">
    <ul class="gallery-grid" role="list" data-gallery data-labels="${JSON.stringify(labels)}">
      ${ctx.gallery.items.map((item, index) => {
        const theme = p(`themes.${item.theme}`);
        const alt = item.alt?.[ctx.lang] || theme;
        const picture = media(ctx, {
          image: item.image,
          alt,
          format: item.format,
          caption: `${theme}. ${ctx.t('tbc.photo')}`,
          sizes: SIZES[item.format],
          // Première photo : visible dès l'ouverture sur mobile comme sur ordinateur
          ...(index === 0 && { eager: true, priority: 'high' }),
        });
        const full = item.image ? ctx.picture(ctx.resolveImage(item.image)).fallback : null;
        // Les premières photos (visibles à l'ouverture, dont l'image principale) ne sont jamais masquées par l'apparition
        const reveal = index > 1 ? html` data-reveal style="--reveal-i:${index % 4}"` : '';
        return html`<li class="gallery-item gallery-item--${item.format}"${reveal}>
          <figure>
            ${full
              ? html`<a class="gallery-item__link" href="${full}" data-lightbox aria-label="${labels.open} : ${alt}${typeof item.image === 'string' && item.image.startsWith('illustrations/') ? ` (${ctx.t('demo.illustration')})` : ''}">${picture}</a>`
              : picture}
            ${full && html`<figcaption class="gallery-item__caption">${theme}</figcaption>`}
          </figure>
        </li>`;
      })}
    </ul>
  </div>
</section>

<section class="section section--tight theme-dark lattice cta-band">
  ${frieze('frieze--top')}
  <div class="wrap cta-band__inner">
    ${eyebrow(ctx.t('pages.home.cta.eyebrow'))}
    <div class="actions">${button({ href: ctx.path('reservation'), label: ctx.t('cta.reserve') })}</div>
  </div>
</section>`;

  return { title: p('seoTitle'), description: p('seoDescription'), body };
}
