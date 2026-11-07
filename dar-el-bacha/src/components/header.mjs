import { html } from '../../scripts/lib/html.mjs';
import { button } from './ui.mjs';
import { langSwitch } from './lang-switch.mjs';
import { brand } from './logo.mjs';

const NAV = ['histoire', 'carte', 'galerie', 'contact'];

export function header(ctx) {
  const link = (id) =>
    html`<li><a href="${ctx.path(id)}"${ctx.pageId === id ? html` aria-current="page"` : ''}>${ctx.t(`nav.${id}`)}</a></li>`;

  return html`<header class="site-header theme-dark">
    <div class="wrap site-header__inner">
      ${brand(ctx)}
      <!-- Le bouton précède le menu dans le code : au clavier, Tab mène directement aux liens du menu ouvert.
           Sa place à l'écran (à droite, ou à gauche en arabe) est donnée par la propriété CSS order. -->
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="primary-nav"
        data-label-open="${ctx.t('a11y.menuOpen')}" data-label-close="${ctx.t('a11y.menuClose')}">
        <span class="nav-toggle__bars" aria-hidden="true"></span>
        <span class="nav-toggle__label">${ctx.t('a11y.menuOpen')}</span>
      </button>
      <nav class="primary-nav" id="primary-nav" aria-label="${ctx.t('a11y.primaryNav')}">
        <ul class="primary-nav__list" role="list">
          ${NAV.map(link)}
          ${link('reservation')}
        </ul>
        <div class="primary-nav__cta">
          ${button({ href: ctx.path('reservation'), label: ctx.t('cta.reserve'), className: 'btn--block' })}
          ${langSwitch(ctx, 'lang-switch--panel')}
        </div>
      </nav>
      <div class="site-header__tools">
        ${langSwitch(ctx, 'lang-switch--bar')}
        ${button({ href: ctx.path('reservation'), label: ctx.t('cta.reserve'), small: true })}
      </div>
    </div>
  </header>`;
}
