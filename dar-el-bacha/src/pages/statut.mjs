import { html } from '../../scripts/lib/html.mjs';
import { pageHead, button } from '../components/ui.mjs';

/*
  Résultat d'une demande de réservation envoyée sans JavaScript (le service redirige ici).
  Un résultat « pending » signifie : demande transmise, EN ATTENTE de confirmation par le restaurant ;
  jamais une réservation confirmée. Pages non indexées.
*/
export function render(ctx) {
  const result = ctx.pageId.slice('statut:'.length);
  const p = (key) => ctx.t(`pages.statut.${key}`);
  const wa = ctx.site.whatsapp?.number;
  const body = html`
${pageHead({ title: p(`${result}.title`), kicker: ctx.t('pages.home.cta.eyebrow') })}
<section class="section not-found">
  <div class="wrap stack stack-l">
    <p class="lead" role="status">${p(`${result}.text`)}</p>
    <div class="actions">
      ${button({ href: ctx.path('reservation'), label: p('back') })}
      ${wa ? button({ href: `https://wa.me/${wa}`, label: ctx.t('cta.whatsapp'), variant: 'ghost', icon: 'chat', external: true }) : button({ href: ctx.path('contact'), label: ctx.t('nav.contact'), variant: 'ghost' })}
    </div>
  </div>
</section>`;
  return { title: `${p(`${result}.title`)} — ${ctx.siteName}`, description: p(`${result}.text`), body, noindex: true };
}
