import { html, attrs } from '../../scripts/lib/html.mjs';

/**
 * Image responsive ou emplacement photo temporaire.
 *
 * image : nom d'une photo préparée par « npm run images » (ex. "restaurant/salle"),
 *         ou { src: "photos/salle", width: 1600, height: 1067 } (chemin sous src/assets/img/, sans extension),
 *         ou null → emplacement provisoire élégant (tadelakt, moucharabieh, arche) avec la mention
 *         « Photographie officielle à venir », balisé comme provisoire. Il n'imite jamais une photographie.
 * Le build fournit ctx.resolveImage() (dimensions, couleur dominante) et ctx.picture() (variantes AVIF/WebP/JPEG).
 *
 * Priorités de chargement :
 *   eager: true               → chargement immédiat (image visible dès l'ouverture, au moins sur grand écran) ;
 *   priority: 'high'          → en plus, priorité haute : une seule image par page (l'image principale), contrôlé au build ;
 *   par défaut                → chargement différé (hors écran), avec un fondu discret à l'arrivée (main.js).
 */
export function media(ctx, { image = null, alt = '', format = 'paysage', caption, dark = false, eager = false, priority = null, sizes = '100vw', className = '' } = {}) {
  const cls = ['media', format && `media--${format}`, className].filter(Boolean).join(' ');

  if (!image) {
    const label = caption || ctx.t('tbc.photo');
    return html`<div class="${cls} media--placeholder${dark ? ' is-dark' : ''}" role="img" aria-label="${label}" data-provisional="photo">
      <svg class="media__mark" viewBox="0 0 100 140" aria-hidden="true" focusable="false"><path d="M10 140V64C2 54 0 36 11 21 22 8 38 2 50 0c12 2 28 8 39 21 11 15 9 33 1 43v76"/></svg>
      <span class="media__caption" aria-hidden="true">${label}</span>
    </div>`;
  }

  const img = ctx.resolveImage(image);
  const pic = ctx.picture(img);
  // Photo d'illustration (banque d'images libre, aperçu) : toujours signalée, jamais présentée comme une photo du restaurant
  const illustration = typeof image === 'string' && image.startsWith('illustrations/');
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
        fetchpriority: priority === 'high' ? 'high' : false,
      })}>
    </picture>
    ${illustration && html`<span class="media__illustration" data-provisional="photo-illustration">${ctx.t('demo.illustration')}</span>`}
  </div>`;
}
