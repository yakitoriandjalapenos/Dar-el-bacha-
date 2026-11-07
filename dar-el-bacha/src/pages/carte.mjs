import { html } from '../../scripts/lib/html.mjs';
import { pageHead, button, ornament } from '../components/ui.mjs';
import { eyebrow, frieze } from '../components/sections.mjs';
import { dishLine } from '../components/dish.mjs';

/*
  La carte : expérience éditoriale, données exclusivement issues de src/content/menu.json
  (plafonds du cahier des charges contrôlés au build). Chaque plat expose une ancre #plat-<id>,
  utilisée par les plats emblématiques de l'accueil.
*/
export function render(ctx) {
  const p = (key) => ctx.t(`pages.carte.${key}`);
  const { menu } = ctx;

  // Mention « carte en cours de validation » : seulement s'il reste des plats à valider, des prix ou des catégories vides.
  const pending = menu.categories.some((c) => !c.items.length || c.items.some((i) => i.status === 'a-valider' || i.price == null));

  const body = html`
${pageHead({ title: p('title'), lead: p('lead'), kicker: ctx.t('pages.home.specialties.eyebrow') })}

<nav class="menu-nav" aria-label="${p('categoriesNav')}">
  <div class="wrap">
    <ul role="list">
      ${menu.categories.map((c) => html`<li><a href="#${c.id}">${p(`categories.${c.id}`)}</a></li>`)}
    </ul>
  </div>
</nav>

<div class="wrap menu-layout">
  ${pending && html`<p class="menu-notice note" data-provisional="menu-notice">${p('notice')}${ctx.pricesIndicative ? html` <span aria-hidden="true">*</span>${p('indicative')}` : ''}</p>`}
  ${menu.categories.map((c, i) => html`
  <section class="menu-category" id="${c.id}" aria-labelledby="${c.id}-title">
    <div class="menu-category__head">
      <span class="menu-category__index" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
      <h2 id="${c.id}-title">${p(`categories.${c.id}`)}</h2>
    </div>
    <p class="menu-category__desc">${ctx.t(`pages.home.specialties.items.${c.id}`)}</p>
    ${c.items.length
      ? html`<ul class="dish-list" role="list">${c.items.map((item) => dishLine(ctx, item))}</ul>`
      : html`<p class="menu-empty" data-provisional="menu-empty">${p('empty')}</p>`}
  </section>`)}
  ${ornament(true)}
</div>

<section class="section section--tight theme-dark lattice cta-band">
  ${frieze('frieze--top')}
  <div class="wrap cta-band__inner">
    ${eyebrow(ctx.t('pages.home.cta.eyebrow'))}
    <div class="actions">${button({ href: ctx.path('reservation'), label: ctx.t('cta.reserve') })}</div>
  </div>
</section>`;

  return { title: p('seoTitle'), description: p('seoDescription'), body, jsonLd: [ctx.menuSchema()] };
}
