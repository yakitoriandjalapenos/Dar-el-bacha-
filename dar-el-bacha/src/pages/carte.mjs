import { html } from '../../scripts/lib/html.mjs';
import { pageHead, info, button } from '../components/ui.mjs';

export function render(ctx) {
  const p = (key) => ctx.t(`pages.carte.${key}`);
  const { menu } = ctx;

  // Mention « carte en cours de validation » : seulement s'il reste des plats à valider, des prix ou des catégories vides.
  const pending = menu.categories.some((c) => !c.items.length || c.items.some((i) => i.status === 'a-valider' || i.price == null));

  const price = (value) => (value === null || value === undefined ? null : ctx.formatPrice(value));

  const dish = (item) => html`<li class="dish">
    <div class="dish__row">
      <h3 class="dish__name">${item.name[ctx.lang]}${item.status === 'a-valider' ? html`<span class="badge" data-provisional="dish-pending">${p('pending')}</span>` : ''}</h3>
      <span class="dish__leader" aria-hidden="true"></span>
      <span class="dish__price">${info(ctx, price(item.price), 'price')}</span>
    </div>
    ${item.description?.[ctx.lang] && html`<p class="dish__desc">${item.description[ctx.lang]}</p>`}
  </li>`;

  const body = html`
${pageHead({ title: p('title'), lead: p('lead') })}

<nav class="menu-nav" aria-label="${p('categoriesNav')}">
  <div class="wrap">
    <ul role="list">
      ${menu.categories.map((c) => html`<li><a href="#${c.id}">${p(`categories.${c.id}`)}</a></li>`)}
    </ul>
  </div>
</nav>

<div class="wrap">
  ${pending && html`<p class="menu-notice note" data-provisional="menu-notice">${p('notice')}</p>`}
  ${menu.categories.map((c) => html`
  <section class="menu-category" id="${c.id}" aria-labelledby="${c.id}-title">
    <div class="menu-category__head"><h2 id="${c.id}-title">${p(`categories.${c.id}`)}</h2></div>
    ${c.items.length
      ? html`<ul class="dish-list" role="list">${c.items.map(dish)}</ul>`
      : html`<p class="menu-empty" data-provisional="menu-empty">${p('empty')}</p>`}
  </section>`)}
</div>

<section class="section section--tight theme-dark cta-band">
  <div class="wrap actions">
    ${button({ href: ctx.path('reservation'), label: ctx.t('cta.reserve') })}
  </div>
</section>`;

  return { title: p('seoTitle'), description: p('seoDescription'), body, jsonLd: [ctx.menuSchema()] };
}
