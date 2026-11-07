import { html, attrs } from '../../scripts/lib/html.mjs';

/**
 * Image responsive ou emplacement photo temporaire.
 *
 * image : nom d'une photo préparée par « npm run images » (ex. "restaurant/salle"),
 *         ou { src: "photos/salle", width: 1600, height: 1067 } (chemin sous src/assets/img/, sans extension),
 *         ou null → emplacement temporaire avec motif zellige et légende (balisé comme provisoire).
 * Le build fournit ctx.resolveImage() (dimensions, couleur dominante) et ctx.picture() (variantes AVIF/WebP/JPEG).
 *
 * Priorités de chargement : une seule image par page doit être « eager » (l'image principale, au-dessus
 * de la ligne de flottaison) ; elle reçoit fetchpriority="high". Toutes les autres sont différées.
 */
export function media(ctx, { image = null, alt = '', format = 'paysage', caption, dark = false, eager = false, sizes = '100vw', className = '' } = {}) {
  const cls = ['media', format && `media--${format}`, className].filter(Boolean).join(' ');

  if (!image) {
    return html`<div class="${cls} media--placeholder${dark ? ' is-dark' : ''}" role="img" aria-label="${caption || ctx.t('tbc.photo')}" data-provisional="photo">
      <span class="media__caption" aria-hidden="true">${caption || ctx.t('tbc.photo')}</span>
    </div>`;
  }

  const img = ctx.resolveImage(image);
  const pic = ctx.picture(img);
  // Couleur dominante en fond pendant le chargement (aucun octet supplémentaire à télécharger)
  return html`<div class="${cls}"${img.color ? html` style="background-color:${img.color}"` : ''}>
    <picture>
      ${pic.sources.map((s) => html`<source type="${s.type}" srcset="${s.srcset}" sizes="${sizes}">`)}
      <img${attrs({
        src: pic.fallback,
        alt,
        width: img.width,
        height: img.height,
        loading: eager ? 'eager' : 'lazy',
        decoding: eager ? 'auto' : 'async',
        fetchpriority: eager ? 'high' : false,
      })}>
    </picture>
  </div>`;
}
