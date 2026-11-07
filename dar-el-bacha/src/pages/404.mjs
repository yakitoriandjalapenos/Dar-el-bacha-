import { html } from '../../scripts/lib/html.mjs';
import { button, pageHead, ornament } from '../components/ui.mjs';

export function render(ctx) {
  const p = (key) => ctx.t(`pages.notFound.${key}`);
  const body = html`
${pageHead({ title: p('title'), lead: p('lead') })}
<section class="section not-found">
  <div class="wrap stack stack-l">
    ${ornament()}
    <div class="actions">
      ${button({ href: ctx.path('home'), label: ctx.t('cta.backHome') })}
      ${button({ href: ctx.path('carte'), label: ctx.t('cta.viewMenu'), variant: 'ghost' })}
    </div>
  </div>
</section>`;
  return { title: p('seoTitle'), description: p('seoDescription'), body, noindex: true };
}
