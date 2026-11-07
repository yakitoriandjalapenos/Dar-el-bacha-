# DAR EL BACHA — site gastronomique

Site statique, trilingue (FR / EN / AR en RTL), sans framework ni dépendance : un petit générateur Node assemble les pages à partir des contenus et des traductions. Étape actuelle : phase 2 terminée — identité « patrimoine marocain revisité » et expérience premium, en attente des contenus officiels du restaurant.

## Démarrer

Prérequis : Node.js 18 ou plus récent. Aucune installation de paquet n'est nécessaire pour compiler le site.

| Commande | Rôle |
|---|---|
| `npm run dev` | Compile, lance http://localhost:4321/fr/, recompile à chaque modification de `src/` ou `scripts/` et **recharge le navigateur** automatiquement. Une erreur de build s'affiche dans la page ; la dernière version valide reste servie. |
| `npm run build` | Compilation de **prévisualisation** → `dist/`. Toutes les pages portent `noindex`, `robots.txt` bloque l'indexation. Les contenus provisoires sont listés. |
| `npm run build:prod` | Compilation de **production**. Refusée (et `dist/` laissé intact) tant qu'il reste une information `[À CONFIRMER]`, une photo provisoire, un plat « à valider », un formulaire non relié ou que l'URL officielle (`siteUrl`) n'est pas configurée. |
| `npm run serve` | Sert `dist/` tel quel (sans rechargement). |
| `npm run images` | Prépare les photos de `ressources/photos/` (AVIF, WebP, JPEG, 480 à 2000 px). Nécessite `sharp`, voir « Photos ». |
| `npm test` | Tests automatiques sans dépendance (contrôles des contenus, du site généré, des deux modes de compilation). |
| `npm run test:browser` | Tests dans Chromium (19 pages × 7 largeurs, menu, clavier, RTL, formulaire, pannes de script). Nécessite Playwright installé à part. |

Chaque compilation construit le site dans un dossier temporaire, le **contrôle** (langue et sens d'écriture, titres, liens et ressources internes, ancres, canonical, hreflang, Open Graph, sitemap, indexation, images), puis remplace `dist/` seulement si tout est conforme.

Le dossier `dist/` est le site final : il se dépose tel quel chez n'importe quel hébergeur statique (Netlify, Cloudflare Pages, Vercel, OVH…). Ouvrir les fichiers directement par double-clic ne fonctionne pas (les liens partent de la racine du site) : passer par `npm run serve`. **Ne mettre en ligne qu'un `dist/` produit par `npm run build:prod`.**

## Organisation

```
src/
  content/
    site.json        Informations officielles (adresse, téléphone, WhatsApp, horaires…)
    menu.json        La carte — 25 propositions maximum, contrôlé au build
    gallery.json     Emplacements photo de la galerie
    media.json       Emplacements photo des autres pages (accueil, histoire, plan d'accès)
  i18n/
    fr.json en.json ar.json   Tous les textes du site, par langue
  routes.mjs         Langues et adresses des pages
  components/        Éléments réutilisables (en-tête, pied de page, arche, médias, boutons…)
  pages/             Les 6 pages + la page 404
  styles/            tokens → base → layout → components → pages (concaténés au build)
  scripts/main.js    Menu mobile, apparitions, formulaire, lien WhatsApp (7 ko non compressé)
  assets/            Images (logo, arche, motif zellige, photos préparées), polices
  static/            Fichiers copiés à la racine (favicon, icônes, image de partage, robots)
ressources/          Fichiers sources définitifs (logo, icônes, polices, photos) — inventaire dans ressources/README.md
scripts/
  build.mjs          Générateur (prévisualisation / production)
  dev.mjs            Serveur de développement avec rechargement automatique
  serve.mjs          Serveur local
  images.mjs         Préparation des photographies
  lib/               Contrôles des contenus (validate), contrôle du site généré (check-output), serveur statique, gabarits HTML
tests/               Tests automatiques (npm test) et tests navigateur (npm run test:browser)
```

## Adresses des pages

| Page | FR | EN | AR |
|---|---|---|---|
| Accueil | `/fr/` | `/en/` | `/ar/` |
| Notre histoire | `/fr/notre-histoire/` | `/en/our-story/` | `/ar/our-story/` |
| La carte | `/fr/la-carte/` | `/en/menu/` | `/ar/menu/` |
| Galerie | `/fr/galerie/` | `/en/gallery/` | `/ar/gallery/` |
| Réservation | `/fr/reservation/` | `/en/reservations/` | `/ar/reservations/` |
| Contact | `/fr/contact/` | `/en/contact/` | `/ar/contact/` |

La racine `/` redirige vers `/fr/`. Prévoir aussi une redirection 301 chez l'hébergeur.

## Informations à confirmer

Rien n'est inventé. Toute valeur à `null` dans `src/content/site.json` s'affiche sur le site sous la forme `[ADRESSE À CONFIRMER]`, `[TÉLÉPHONE À CONFIRMER]`, etc. (traduite dans chaque langue), et le build en dresse la liste à chaque compilation. Il suffit de remplacer `null` par la vraie valeur puis de recompiler.

Chaque élément provisoire affiché porte l'attribut `data-provisional` : c'est ce qui permet à `npm run build:prod` de les détecter tous. Le build signale aussi tout texte provisoire **non balisé** (repère `À CONFIRMER`, `lorem ipsum`, `TODO`, domaine fictif…).

Quelques effets automatiques :

- **WhatsApp** : tant que `whatsapp.number` est vide, le bouton est inactif. Une fois le numéro renseigné, il ouvre une conversation préremplie avec les informations saisies dans le formulaire.
- **Formulaire** : tant que `reservation.formEndpoint` est vide, l'envoi affiche un message clair (« l'envoi en ligne n'est pas encore activé »). Il ne simule jamais une réussite.
- **Système de réservation connecté** : invisible tant que `reservation.bookingSystem` vaut `null`. Pour l'activer : `{ "url": "https://…" }`.
- **Données structurées** (schema.org Restaurant / Menu) : seules les informations renseignées sont publiées ; les plats « à valider » en sont exclus.
- **Nom de domaine** : tant que `siteUrl` est vide, aucune adresse absolue n'est publiée (canonical, hreflang, `og:url`, `og:image` et sitemap sont omis) ; la production est refusée. Les domaines fictifs ou locaux (`.example`, `.test`, `localhost`…) et les adresses en `http://` sont refusés.
- **Présentation du restaurant** (page Notre histoire) : `story` = `{ "fr": "…", "en": "…", "ar": "…" }`.

## La carte

`src/content/menu.json` est la **seule source** des catégories et des limites : `maxTotal` (25) et, pour chaque catégorie, `max` (entrées 6, plats 10, desserts 4, boissons 5). Le build **s'arrête** si une limite est dépassée, si une catégorie n'a pas d'intitulé dans les trois langues (`pages.carte.categories.<id>`), si un plat n'a pas son nom dans les trois langues, si une description est incomplète ou si un prix est invalide. Les tajines et spécialités fassies se placent dans `plats`.

Les propositions déjà présentes (zaalouk, taktouka, pastilla, briouates, thé marocain) viennent des exemples du cahier des charges et portent `"status": "a-valider"` : elles s'affichent avec la mention « À valider ». Retirer ce statut une fois la carte validée par le restaurant.

## Logo

Règles d'usage validées (`src/components/logo.mjs`) :

| Version | Usage | Fichier (`src/assets/img/logo/`) |
|---|---|---|
| Vert et or **avec couronne** | Signature principale en grand format, sur fond clair (accueil, section « La maison ») | `logo-vert-or-couronne.*` |
| Vert et or **sans couronne** (compacte) | Fond clair, lorsque l'espace est limité | `logo-vert-or.*` |
| Ivoire et or | Fond émeraude (pied de page) | `logo-ivoire-or.*` |
| Porte seule ivoire et or | En-tête, à côté du nom écrit en texte (traduit en arabe) | `symbole-ivoire-or-112.*` |
| Arche seule | Favicons 16 et 32 px | `src/static/favicon.ico`, `favicon-32.png` |

Toutes les versions actuelles sont **découpées dans la planche officielle** (`ressources/logo/planche-identite-officielle-reference.jpg`,
référence visuelle et non fichier source), à leur taille d'origine, sans redessin ni changement de couleur. Pour ne jamais les agrandir
artificiellement, une découpe s'affiche au plus à **la moitié de sa largeur réelle** (netteté sur écran haute densité).

**Fichiers SVG définitifs** : déposer `<nom>.svg` à côté du fichier actuel (ex. `logo-vert-or-couronne.svg`) ; le composant l'utilise
automatiquement, sans limite de taille. La planche ne contient pas de version ivoire et or *avec* couronne : elle viendra avec les SVG.
Les icônes d'écran d'accueil (180 et 512 px) restent celles de la phase 1 : les icônes miniatures de la planche (168 px) ne peuvent pas
être portées à ces tailles sans agrandissement.

## Photos

Toutes les images sont pour l'instant des emplacements temporaires (motif zellige + mention « Photographie officielle à venir »). Pour en remplacer un :

1. Déposer l'original haute définition dans `ressources/photos/restaurant/` ou `ressources/photos/gastronomie/`.
2. `npm run images` : variantes AVIF, WebP et JPEG de 480 à 2000 px (sans agrandissement), métadonnées supprimées, manifeste des dimensions et de la couleur dominante (`src/assets/img/photos/manifest.json`, non publié).
3. Dans `src/content/media.json` (accueil, histoire, plan d'accès) ou `gallery.json`, remplacer `"image": null` par le nom de la photo, par exemple `"restaurant/salle-principale"`, et renseigner `alt` dans les trois langues.

Le build crée la balise `<picture>` (AVIF, puis WebP, puis JPEG), avec `srcset`, `sizes`, dimensions explicites (pas de décalage de mise en page), couleur de fond pendant le chargement et chargement différé hors écran. Seule l'image principale de l'accueil est chargée en priorité haute ; le build refuse plus d'une image prioritaire par page. Une photo citée mais introuvable interrompt le build.

**`sharp`** : `npm run images` utilise la bibliothèque `sharp` (Apache 2.0), seule façon fiable d'encoder l'AVIF depuis Node. Elle sert uniquement à préparer les photos sur le poste de travail : le build et le site publié n'en dépendent pas. Installation : `npm install --save-dev sharp` (en attente de validation pour l'ajouter au projet).

## Direction artistique

« Patrimoine marocain revisité » : une demeure marocaine prestigieuse, entre héritage et élégance contemporaine.

- **Palette** (`src/styles/tokens.css`) : émeraude `#123D32`, or patiné `#B99A62`, sable `#E9DFCC`, ivoire `#F7F3EA`, noyer `#38291F`.
  L'or patiné est réservé aux filets, ornements et détails (2,4:1 sur ivoire : jamais de texte). Deux nuances dérivées servent au petit
  texte doré : `#CDB385` sur émeraude (6,0:1), `#6E5730` sur fond clair (6,2:1). Contrastes vérifiés par `tests/tokens.test.mjs`.
- **Typographie** : Cormorant Garamond (titres, écho au lettrage romain du logo), Jost (texte), Noto Kufi Arabic (titres arabes,
  écho aux inscriptions architecturales) et Noto Naskh Arabic (texte arabe). WOFF2, licence OFL, découpées par alphabet : une page
  française ne télécharge aucune police arabe. Détails : `src/assets/fonts/README.md`.
- **Motifs** (un seul par section) : arche outrepassée (cadres photo, hero, en-têtes), treillis de moucharabieh (sections émeraude),
  grain de tadelakt (sections sable), frise de bois sculpté (séparateurs), étoile du zellige (ornements). Dessinés pour le site, en SVG de
  quelques centaines d'octets.
- **Emplacements photo provisoires** : tadelakt, treillis et arche, avec la mention « Photographie officielle à venir » ; ils n'imitent
  jamais une photographie et sont balisés comme provisoires (production refusée tant qu'il en reste).
- **Mouvement** : transitions entre pages (View Transitions, CSS seul), apparitions progressives au défilement, arche du hero qui se
  dessine, effets de survol et micro-interactions sur les boutons, fondu des photos différées. Uniquement `transform` et `opacity` ;
  tout est coupé avec `prefers-reduced-motion`. Sans JavaScript (ou s'il échoue), tout le contenu reste visible et utilisable.

### Fonctions par page

- **Accueil** : hero photographique plein écran ; « La maison » avec la signature à couronne ; philosophie ; art de recevoir ;
  saveurs de la carte (catégories réelles de `menu.json`) ; **plats emblématiques = propositions de `menu.json` marquées
  `"signature": true`** (4 au plus, choix du restaurant ; emplacement provisoire tant qu'aucune n'est désignée) ; galerie ; réservation.
- **Notre histoire** : présentation (texte `site.json › story`) et cinq chapitres ; aucune information historique inventée.
- **La carte** : navigation par catégorie, lignes de carte avec description, **ingrédients ou particularités** (`ingredients`),
  prix et photo, chacun seulement s'il est fourni. Ancres `#plat-<id>`.
- **Galerie** : sept thèmes, composition variée ; agrandissement accessible (`<dialog>` : flèches, Échap, retour du focus,
  glissement au doigt, sens inversé en arabe) ; sans JavaScript, chaque photo est un lien vers sa grande version.
- **Réservation** : parcours présentés (formulaire, WhatsApp, et système connecté **seulement s'il est configuré**,
  `bookingSystem.url` et `embedUrl` chargé à la demande) ; conditions de réservation (`reservation.conditions`).
- **Contact** : coordonnées, itinéraire, plan Google Maps **chargé uniquement au clic** (aucune requête avant), proposé seulement
  si l'adresse ou les coordonnées sont confirmées.

## Performance et accessibilité

**Objectifs** : LCP ≤ 2,5 s (cahier des charges ; objectif interne < 2 s), CLS ≤ 0,1, INP ≤ 200 ms, JavaScript initial ≤ 15 ko, Lighthouse élevé.

**Conditions de mesure (phase 2, novembre 2026)** : Lighthouse 12.6.1, Chromium 1243 sans interface, profil mobile par défaut
(Moto G Power émulé, processeur ralenti ×4, 150 ms de latence, 1,6 Mbit/s), 3 passages par page (médiane), site servi localement
avec compression Brotli et en-têtes de cache. Les mesures de laboratoire ne remplacent pas les données réelles des visiteurs.

| Page (mobile) | Performance | Accessibilité | Bonnes pratiques | LCP | CLS | TBT |
|---|---|---|---|---|---|---|
| Accueil FR | 100 | 100 | 100 | 1,63 s | 0,008 | 0 ms |
| Accueil AR | 99 | 100 | 100 | 1,90 s | 0,001 | 0 ms |
| Notre histoire FR | 100 | 100 | 100 | 1,61 s | 0 | 0 ms |
| La carte EN | 100 | 100 | 100 | 1,67 s | 0,001 | 0 ms |
| Galerie FR | 100 | 100 | 100 | 1,66 s | 0 | 0 ms |
| Réservation AR | 99 | 100 | 100 | 1,89 s | 0 | 0 ms |
| Contact EN | 100 | 100 | 100 | 1,74 s | 0 | 0 ms |
| Accueil FR (ordinateur) | 100 | 100 | 100 | 0,40 s | 0,002 | 0 ms |

- **Avec une photo dans le hero** (copie de test, image synthétique) : LCP mobile 1,62 s (FR) et 1,84 s (AR), l'image étant l'élément LCP.
- **SEO** : 66 en prévisualisation **par construction** (`noindex`) ; 100 en production (copie de test, phase 1).
- **INP** (Chromium, processeur ralenti ×4, Event Timing) : 56 ms pour la pire interaction (ouverture d'une photo en grand) ;
  menu, formulaire, carte et galerie entre 16 et 32 ms.
- **Poids** : JavaScript 12,9 ko (3,8 ko compressé) ; CSS 42,6 ko (7,9 ko compressé) ; accueil complet 141 ko transférés (FR, polices
  comprises), 173 ko en arabe (deux polices arabes).

Accessibilité : Lighthouse 100 sur les pages mesurées ; navigation au clavier (menu, galerie), focus visibles, contrastes vérifiés
automatiquement, textes alternatifs, libellés, `prefers-reduced-motion`, RTL complet. Les pages arabes ne contiennent aucun texte
latin visible hors noms de marque et de langues (test automatique).

## Avant la mise en ligne (plan des travaux)

Ces points ne sont **pas** opérationnels aujourd'hui et doivent être finalisés avant toute mise en production :

- **Formulaire** : service d'envoi avec **validation côté serveur**, **protection anti-robots côté serveur** (le piège actuel n'agit
  que dans le navigateur), e-mail au restaurant, puis renseigner `formEndpoint` (il devra accepter aussi les envois sans JavaScript).
- **Données personnelles** : **politique de confidentialité**, **mentions légales**, **consentement** au traitement des données du
  formulaire, conformité à la **loi marocaine 09-08** (CNDP) ; consentement également à prévoir pour le plan Google Maps si nécessaire.
- **En-têtes de sécurité** : **CSP** (le script en ligne de repli devra être autorisé par empreinte) et **HSTS**, chez l'hébergeur retenu.
- **Contenus officiels** : coordonnées, horaires, carte validée et prix, plats emblématiques, conditions de réservation, histoire,
  photographies et textes alternatifs, réseaux sociaux, domaine (`siteUrl`).
- **Logo** : fichiers SVG définitifs ; icônes d'application.
- Hébergement, redirection 301 de la racine, mesure avec PageSpeed Insights une fois en ligne, tests sur Safari et Firefox.

`npm run build:prod` refuse la production tant que les contenus provisoires ou le formulaire non relié subsistent.
