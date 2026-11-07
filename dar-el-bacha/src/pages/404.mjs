import { html } from '../../scripts/lib/html.mjs';
import { button } from '../components/ui.mjs';

export function render(ctx) {
  const p = (key) => ctx.t(`pages.notFound.${key}`);
  const body = html`
<section class="section not-found">
  <div class="wrap stack stack-l">
    <h1>${p('title')}</h1>
    <p class="lead">${p('lead')}</p>
    <div class="actions">
      ${button({ href: ctx.path('home'), label: ctx.t('cta.backHome') })}
      ${button({ href: ctx.path('carte'), label: ctx.t('cta.viewMenu'), variant: 'ghost' })}
    </div>
  </div>
</section>`;
  return { title: p('seoTitle'), description: p('seoDescription'), body, noindex: true };
}
