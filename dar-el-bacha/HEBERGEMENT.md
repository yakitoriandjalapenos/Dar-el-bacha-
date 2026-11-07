# Mise en ligne : HTTPS, en-têtes de sécurité et hébergement

Ce guide prépare la mise en ligne **sans choisir d'hébergeur** (décision du restaurant). Il décrit ce que le site attend de
l'hébergement, quel que soit le prestataire retenu. Aucune mise en production n'a été effectuée.

## 1. Ce qu'il faut publier

`npm run build:prod` produit `dist/` (refusé tant qu'une information reste à confirmer — voir `INFORMATIONS-A-FOURNIR.md`).

| Élément | Contenu |
|---|---|
| Pages | `dist/` en fichiers statiques (HTML, CSS, JS, polices, images, `sitemap.xml`, `robots.txt`, `site.webmanifest`) |
| `dist/_headers` | En-têtes HTTP (sécurité, cache) au format Netlify / Cloudflare Pages ; **fichier de configuration, jamais publié comme page** |
| Service de réservation | `server/` (Node.js), à exposer **au même domaine** sous `/api/reservation` (voir `server/README.md`) |

## 2. HTTPS (obligatoire)

1. **Certificat** : certificat TLS gratuit et renouvelé automatiquement (Let's Encrypt ou équivalent), proposé par la quasi-totalité
   des hébergeurs ; TLS 1.2 minimum.
2. **Une seule adresse officielle** : choisir `https://domaine` **ou** `https://www.domaine`, l'inscrire dans `site.json › siteUrl`,
   et rediriger (301) l'autre variante et tout `http://` vers elle. Les adresses canoniques, `hreflang`, le plan du site et les
   aperçus de partage utilisent `siteUrl` : il doit correspondre exactement à l'adresse servie.
3. **HSTS** : `Strict-Transport-Security: max-age=31536000` est ajouté automatiquement **en production uniquement**.
   `includeSubDomains` et l'inscription à la liste *preload* des navigateurs ne sont **pas** activés : à décider par le propriétaire
   du domaine une fois **tous** les sous-domaines (messagerie web, outils…) servis en HTTPS, car ces choix sont difficiles à annuler.
4. **Vérifier après mise en ligne** : SSL Labs (note A attendue), securityheaders.com et Mozilla Observatory, plus une demande de
   réservation de test (`server/README.md › Test régulier`).

## 3. En-têtes de sécurité (générés à chaque build)

| En-tête | Valeur | Rôle |
|---|---|---|
| `Content-Security-Policy` | voir ci-dessous | seuls les fichiers du site s'exécutent |
| `Strict-Transport-Security` | `max-age=31536000` (production) | HTTPS imposé par le navigateur |
| `X-Content-Type-Options` | `nosniff` | pas d'interprétation hasardeuse des fichiers |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | adresse complète jamais transmise aux sites tiers |
| `Permissions-Policy` | caméra, micro, géolocalisation, paiement, USB désactivés | fonctions sensibles du navigateur inutilisées |
| `X-Frame-Options` + `frame-ancestors 'self'` | `SAMEORIGIN` | le site ne peut pas être intégré par un autre site |
| `Cross-Origin-Opener-Policy` | `same-origin` | isolement vis-à-vis des fenêtres d'autres sites |
| `X-Robots-Tag` | `noindex, nofollow` (prévisualisation uniquement) | une prévisualisation n'est jamais indexée |
| `Cache-Control` (`/assets/*`) | `public, max-age=31536000, immutable` | CSS, JS, polices et images empreintés mis en cache un an |

**Politique de sécurité du contenu (CSP)**, déduite des pages générées (`scripts/lib/security-headers.mjs`) :

- `script-src 'self'` + l'**empreinte SHA-256** du petit script de repli intégré aux pages (aucun `unsafe-inline`, aucun `eval`) ;
  l'empreinte est recalculée à chaque build.
- `frame-src` : `'none'`, sauf modules réellement présents — Google Maps dès que l'adresse est renseignée, module du système de
  réservation s'il est configuré, Cloudflare Turnstile s'il est activé.
- `connect-src` / `form-action` : le site lui-même, plus le domaine du service de réservation s'il est ailleurs (déconseillé).
- `img-src 'self' data:`, `font-src 'self'`, `object-src 'none'`, `base-uri 'self'`.
- `style-src 'self' 'unsafe-inline'` : nécessaire aux attributs `style="--variable:…"` (décalages d'animation, largeur du logo) ;
  aucune feuille de style externe n'est autorisée.

Les tests navigateur appliquent ce fichier comme le ferait l'hébergeur : ils vérifient qu'un script injecté est refusé et
qu'**aucune** violation ne survient sur l'ensemble des parcours (pages, menu, galerie, carte, module de réservation, formulaire,
Turnstile). `npm run serve` l'applique aussi ; `npm run dev` non (son rechargement automatique utilise un script intégré).

## 4. Selon le type d'hébergement

Valeurs à reprendre **telles quelles depuis `dist/_headers`** après chaque `npm run build:prod`. L'empreinte du script ne change
que si ce script est modifié, ou si un module externe est ajouté ou retiré ; en cas d'oubli, le site reste lisible mais le
navigateur bloque le script ou le module concerné : vérifier la console du navigateur après chaque mise à jour.

- **Cloudflare Pages, Netlify** : `dist/_headers` est lu directement. Le service de réservation s'y déploie en fonction
  (Pages Functions, Netlify Functions) via un adaptateur de quelques lignes (`server/README.md`), avec un stockage partagé pour la
  limite d'envois.
- **Vercel** : reporter chaque en-tête dans `vercel.json` (`"headers": [{ "source": "/(.*)", "headers": [{ "key": …, "value": … }] }]`).
- **Serveur Node.js (VPS)** : servir `dist/` derrière nginx ou Caddy, et lancer le service avec `createReservationService(process.env).node`
  (proxy `/api/reservation` → service ; `trustProxy` pour obtenir l'adresse du visiteur).
- **nginx** : `add_header Content-Security-Policy "…" always;` (une ligne par en-tête, dans le bloc `server` HTTPS),
  `return 301 https://domaine$request_uri;` dans le bloc HTTP.
- **Apache / hébergement mutualisé** (`.htaccess`, module `headers`) : `Header always set Content-Security-Policy "…"`, et redirection
  HTTPS par `RewriteRule`. Un mutualisé sans Node.js ne peut pas héberger le service de réservation : il faudrait alors une fonction
  externe, au même domaine si possible (sinon, `formEndpoint` absolu et `ALLOWED_ORIGINS` à jour ; la CSP l'autorise automatiquement).

Autres réglages attendus de l'hébergeur : compression Brotli ou gzip (HTML, CSS, JS, SVG, JSON), page 404 = `dist/404.html`,
redirection de `/` vers `/fr/` (la racine contient déjà une redirection de secours), barre oblique finale (`/fr/la-carte` → `/fr/la-carte/`).

## 5. Points à faire valider (juriste, restaurant)

- **Mentions légales et politique de confidentialité** : toutes les informations de `site.json › legal` (dont l'**hébergeur** et le
  **prestataire d'e-mail**, à renseigner une fois choisis), puis `legal.validated: true` après relecture par un juriste.
- **Loi 09-08 / CNDP** : formalités (déclaration ou autorisation) et référence ; **transferts hors du Maroc** si l'hébergeur ou le
  service d'e-mail stocke les données à l'étranger (`legal.dataTransfers`), ce qui peut nécessiter une autorisation de la CNDP.
- **Durée de conservation** des e-mails de demande (`legal.dataRetention`) et organisation de la boîte de réception.
- **Services tiers** effectivement retenus (Google Maps, système de réservation, Turnstile) : mentionnés automatiquement dans la
  politique de confidentialité lorsqu'ils sont configurés ; à confirmer par le juriste.
- **Journaux de l'hébergeur** : la plupart conservent des journaux d'accès (adresse IP) ; leur durée est à vérifier avec l'hébergeur
  retenu et, si nécessaire, à mentionner dans la politique de confidentialité.
