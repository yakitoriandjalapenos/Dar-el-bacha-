import { html } from '../../scripts/lib/html.mjs';

/** Liens vers la même page dans chaque langue. */
export function langSwitch(ctx, variant = '') {
  return html`<nav class="lang-switch ${variant}" aria-label="${ctx.t('a11y.languages')}">
    <ul class="lang-switch__list" role="list">
      ${ctx.langs.map((l) => {
        const current = l.code === ctx.lang;
        const label = ctx.tFor(l.code, 'lang.short');
        const name = ctx.tFor(l.code, 'lang.name');
        return html`<li><a href="${ctx.path(ctx.pageId, l.code)}" hreflang="${l.hreflang}" lang="${l.code}"${current ? html` aria-current="true"` : ''}>
          <span aria-hidden="true">${label}</span><span class="visually-hidden">${name}</span></a></li>`;
      })}
    </ul>
  </nav>`;
}
