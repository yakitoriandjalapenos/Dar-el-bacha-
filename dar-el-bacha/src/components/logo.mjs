import { html } from '../../scripts/lib/html.mjs';

/*
  Logo officiel DAR EL BACHA (version ivoire et or, fond transparent, pour fonds émeraude).
  Fichiers : src/assets/img/logo/
    symbole-ivoire-or-112.(webp|png)  porte seule, 171×112 — en-tête
    logo-ivoire-or.(webp|png)         logo complet avec le nom, 300×278 — pied de page, en-tête « complet »
  Remplacer ces fichiers par les originaux (SVG de préférence) sans changer leurs noms ni ce composant,
  sauf les dimensions si elles changent.
*/
const FILES = {
  symbole: { name: 'symbole-ivoire-or-112', width: 171, height: 112 },
  complet: { name: 'logo-ivoire-or', width: 300, height: 278 },
};

/*
  Priorités : le logo de l'en-tête est chargé immédiatement (il est visible dès l'ouverture) mais sans
  priorité haute, pour ne pas concurrencer l'image principale de la page ; celui du pied de page est différé.
*/
export function logoImage(ctx, variant, { className = '', eager = false, alt = '' } = {}) {
  const f = FILES[variant];
  const src = (ext) => `${ctx.asset(`assets/img/logo/${f.name}.${ext}`)}`;
  return html`<picture>
    <source type="image/webp" srcset="${src('webp')}">
    <img class="${className}" src="${src('png')}" width="${f.width}" height="${f.height}" alt="${alt}"
      ${eager ? html`decoding="async"` : html`loading="lazy" decoding="async"`}>
  </picture>`;
}

/** Bloc de marque de l'en-tête : porte + nom en texte (net, traduit en arabe), ou logo complet. */
export function brand(ctx) {
  const mode = ctx.site.logo?.header || 'symbole';
  const name = ctx.lang === 'ar' ? ctx.site.nameAr : ctx.site.name;
  const current = ctx.pageId === 'home' ? html` aria-current="page"` : '';

  if (mode === 'complet') {
    return html`<a class="brand brand--full" href="${ctx.path('home')}" aria-label="${ctx.t('a11y.home')}"${current}>
      ${logoImage(ctx, 'complet', { className: 'brand__logo', eager: true })}
    </a>`;
  }
  return html`<a class="brand" href="${ctx.path('home')}" aria-label="${ctx.t('a11y.home')}"${current}>
    ${logoImage(ctx, 'symbole', { className: 'brand__symbol', eager: true })}
    <span class="brand__name" aria-hidden="true">${name}</span>
  </a>`;
}
