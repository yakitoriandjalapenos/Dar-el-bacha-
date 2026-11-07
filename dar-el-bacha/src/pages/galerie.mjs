import { html } from '../../scripts/lib/html.mjs';
import { pageHead } from '../components/ui.mjs';
import { media } from '../components/media.mjs';

const SIZES = {
  portrait: '(min-width: 72rem) 25vw, (min-width: 48rem) 33vw, 50vw',
  carre: '(min-width: 72rem) 25vw, (min-width: 48rem) 33vw, 50vw',
  paysage: '(min-width: 72rem) 50vw, (min-width: 48rem) 66vw, 100vw',
};

export function render(ctx) {
  const p = (key) => ctx.t(`pages.galerie.${key}`);

  const body = html`
${pageHead({ title: p('title'), lead: p('lead') })}

<section class="section" aria-label="${p('title')}">
  <div class="wrap">
    <ul class="gallery-grid" role="list">
      ${ctx.gallery.items.map((item) => {
        const theme = p(`themes.${item.theme}`);
        return html`<li class="gallery-item--${item.format}">
          <figure style="height:100%">
            ${media(ctx, {
              image: item.image,
              alt: item.alt?.[ctx.lang] || theme,
              format: item.format,
              caption: `${theme}. ${ctx.t('tbc.photo')}`,
              sizes: SIZES[item.format],
            })}
          </figure>
        </li>`;
      })}
    </ul>
  </div>
</section>`;

  return { title: p('seoTitle'), description: p('seoDescription'), body };
}
