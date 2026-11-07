import { html, attrs } from '../../scripts/lib/html.mjs';

/**
 * Image responsive ou emplacement photo temporaire.
 *
 * image : { src: "photos/salle", width: 1600, height: 1067 } (chemin sous src/assets/img/, sans extension)
 *         ou null → emplacement temporaire avec motif zellige et légende.
 * Le build fournit ctx.picture(image) qui détecte les variantes AVIF/WebP/JPEG disponibles.
 */
export function media(ctx, { image = null, alt = '', format = 'paysage', caption, dark = false, eager = false, sizes = '100vw', className = '' } = {}) {
  const cls = ['media', format && `media--${format}`, className].filter(Boolean).join(' ');

  if (!image) {
    return html`<div class="${cls} media--placeholder${dark ? ' is-dark' : ''}" role="img" aria-label="${caption || ctx.t('tbc.photo')}" data-provisional="photo">
      <span class="media__caption" aria-hidden="true">${caption || ctx.t('tbc.photo')}</span>
    </div>`;
  }

  const pic = ctx.picture(image);
  return html`<div class="${cls}">
    <picture>
      ${pic.sources.map((s) => html`<source type="${s.type}" srcset="${s.srcset}" sizes="${sizes}">`)}
      <img${attrs({
        src: pic.fallback,
        alt,
        width: image.width,
        height: image.height,
        loading: eager ? 'eager' : 'lazy',
        decoding: eager ? 'auto' : 'async',
        fetchpriority: eager ? 'high' : false,
      })}>
    </picture>
  </div>`;
}
