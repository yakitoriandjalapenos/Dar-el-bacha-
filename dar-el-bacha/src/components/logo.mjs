import { html } from '../../scripts/lib/html.mjs';

/*
  Logo officiel DAR EL BACHA — règles d'usage (validées) :
    - « couronne »  : signature principale en grand format, version vert et or, sur fond clair ;
    - « compact »   : version vert et or sans couronne, sur fond clair, lorsque l'espace est limité ;
    - « complet »   : version ivoire et or, sur fond émeraude (pied de page, grands formats sombres) ;
    - « symbole »   : porte seule ivoire et or, en-tête (à côté du nom écrit en texte, traduit en arabe) ;
    - favicons 16 et 32 px : arche seule (src/static/).

  Fichiers : src/assets/img/logo/. Les versions actuelles sont DÉCOUPÉES dans la planche officielle
  (ressources/logo/planche-identite-officielle-reference.jpg), à leur taille d'origine, sans redessin.
  Pour ne jamais les agrandir artificiellement, une découpe raster s'affiche au plus à la moitié de sa
  largeur réelle (netteté sur écran haute densité).

  Fichiers SVG définitifs : déposer <nom>.svg à côté des fichiers actuels (ex. logo-vert-or-couronne.svg).
  Le composant l'utilise alors automatiquement, sans limite de taille ; aucune autre modification n'est nécessaire.
  Il n'existe pas de version ivoire et or AVEC couronne dans la planche : elle viendra avec les fichiers SVG.
*/
export const LOGO_FILES = {
  couronne: { name: 'logo-vert-or-couronne', width: 304, height: 332 },
  compact: { name: 'logo-vert-or', width: 333, height: 313 },
  complet: { name: 'logo-ivoire-or', width: 300, height: 278 },
  symbole: { name: 'symbole-ivoire-or-112', width: 171, height: 112 },
};

/*
  Priorités : le logo de l'en-tête est chargé immédiatement (visible dès l'ouverture) mais sans priorité haute,
  pour ne pas concurrencer l'image principale de la page ; les autres sont différés.
*/
export function logoImage(ctx, variant, { className = '', eager = false, alt = '' } = {}) {
  const f = LOGO_FILES[variant];
  const path = (ext) => `assets/img/logo/${f.name}.${ext}`;
  const loading = eager ? html`decoding="async"` : html`loading="lazy" decoding="async"`;

  if (ctx.hasAsset(path('svg'))) {
    return html`<img class="logo logo--${variant} logo--vector ${className}" src="${ctx.asset(path('svg'))}" width="${f.width}" height="${f.height}" alt="${alt}" ${loading}>`;
  }
  return html`<picture>
    <source type="image/webp" srcset="${ctx.asset(path('webp'))}">
    <img class="logo logo--${variant} ${className}" src="${ctx.asset(path('png'))}" width="${f.width}" height="${f.height}" alt="${alt}"
      style="--logo-max:${Math.floor(f.width / 2)}px" ${loading}>
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

/** Signature de la maison : logo officiel en grand format sur fond clair (version avec couronne). */
export function signature(ctx, { variant = 'couronne', className = '' } = {}) {
  return html`<div class="signature ${className}">
    ${logoImage(ctx, variant, { alt: ctx.site.name })}
  </div>`;
}
