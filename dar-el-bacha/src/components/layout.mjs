import { html, raw } from '../../scripts/lib/html.mjs';
import { header } from './header.mjs';
import { footer } from './footer.mjs';

/** Document HTML complet : métadonnées SEO, en-tête, contenu, pied de page. */
export function layout(ctx, { title, description, body, jsonLd = [], noindex = false }) {
  const url = ctx.absUrl(ctx.path(ctx.pageId));
  const alternates = ctx.pageId === '404' ? [] : ctx.langs.map((l) => ({ hreflang: l.hreflang, href: ctx.absUrl(ctx.path(ctx.pageId, l.code)) }));
  const xDefault = ctx.pageId === '404' ? null : ctx.absUrl(ctx.path(ctx.pageId, ctx.defaultLang));
  const og = ctx.langs.find((l) => l.code === ctx.lang).ogLocale;

  return html`<!doctype html>
<html lang="${ctx.lang}" dir="${ctx.dir}" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
${noindex ? html`<meta name="robots" content="noindex">` : html`<link rel="canonical" href="${url}">`}
${alternates.map((a) => html`<link rel="alternate" hreflang="${a.hreflang}" href="${a.href}">`)}
${xDefault && html`<link rel="alternate" hreflang="x-default" href="${xDefault}">`}
<meta name="theme-color" content="#12372b">
<link rel="icon" href="${ctx.asset('favicon.ico')}" sizes="48x48">
<link rel="icon" href="${ctx.asset('favicon-32.png')}" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="${ctx.asset('apple-touch-icon.png')}">
${ctx.fontPreloads.map((f) => html`<link rel="preload" href="${f.href}" as="font" type="font/${f.format}" crossorigin>`)}
<link rel="stylesheet" href="${ctx.assets.css}">
<script>document.documentElement.classList.replace('no-js','js')</script>
<script src="${ctx.assets.js}" defer></script>
<meta property="og:type" content="website">
<meta property="og:site_name" content="${ctx.site.name}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="${og}">
${ctx.langs.filter((l) => l.code !== ctx.lang).map((l) => html`<meta property="og:locale:alternate" content="${l.ogLocale}">`)}
${ctx.site.ogImage && html`<meta property="og:image" content="${ctx.absUrl(ctx.site.ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">`}
<meta name="twitter:card" content="${ctx.site.ogImage ? 'summary_large_image' : 'summary'}">
${jsonLd.map((data) => html`<script type="application/ld+json">${raw(JSON.stringify(data).replace(/</g, '\\u003c'))}</script>`)}
</head>
<body>
<a class="skip-link" href="#contenu">${ctx.t('a11y.skip')}</a>
${header(ctx)}
<main id="contenu" tabindex="-1">
${body}
</main>
${footer(ctx)}
</body>
</html>
`;
}
