# DAR EL BACHA — site gastronomique

Site statique, trilingue (FR / EN / AR en RTL), sans framework ni dépendance : un petit générateur Node assemble les pages à partir des contenus et des traductions. Étape actuelle : phase 4 terminée — fonctions, intégrations et contrôles finalisés ; mise en ligne en attente des informations officielles du restaurant (voir `INFORMATIONS-A-FOURNIR.md`) et du choix de l'hébergeur (voir `HEBERGEMENT.md`).

## Démarrer

Prérequis : Node.js 18 ou plus récent. Aucune installation de paquet n'est nécessaire pour compiler le site.

**Voir le site sans rien taper** : double-cliquer sur `LANCER-APERCU-WINDOWS.bat` ou `LANCER-APERCU-MAC.command`, puis ouvrir http://localhost:4321/fr/ (s'ouvre automatiquement). Mode d'emploi : `OUVRIR-L-APERCU.md`.

| Commande | Rôle |
|---|---|
| `npm run dev` | Compile, lance http://localhost:4321/fr/, recompile à chaque modification de `src/` ou `scripts/` et **recharge le navigateur** automatiquement. Une erreur de build s'affiche dans la page ; la dernière version valide reste servie. Le formulaire de réservation est relié au service local `/api/reservation` en **mode simulation** (rien n'est transmis au restaurant ; voir `server/README.md`). |
| `npm run build` | Compilation de **prévisualisation** → `dist/`. Toutes les pages portent `noindex`, `robots.txt` bloque l'indexation. Les contenus provisoires sont listés. |
| `npm run build:prod` | Compilation de **production**. Refusée (et `dist/` laissé intact) tant qu'il reste une information `[À CONFIRMER]`, une photo provisoire, un plat « à valider », un formulaire non relié ou que l'URL officielle (`siteUrl`) n'est pas configurée. |
| `npm run serve` | Sert `dist/` tel quel (sans rechargement), avec les en-têtes de sécurité de `dist/_headers` (CSP…) appliqués comme chez l'hébergeur. |
| `npm run images` | Prépare les photos de `ressources/photos/` (AVIF, WebP, JPEG, 480 à 2000 px). Nécessite `sharp`, voir « Photos ». |
| `npm run apercu` | Met à jour le dossier de livraison `DAR-EL-BACHA-APERÇU/` (carte, avis, photos rangées par section, correspondances et licences) à partir des fichiers de contenu. |
| `npm run contenus` | Régénère `INFORMATIONS-A-FOURNIR.md` : liste centralisée de tout ce que le restaurant doit fournir, avec l'état réel (fourni / à fournir), l'endroit où le renseigner et le format. |
| `npm test` | Tests automatiques sans dépendance (contrôles des contenus, du site généré, des deux modes de compilation). |
| `npm run test:browser` | Tests dans Chromium (25 pages × 7 largeurs, menu, clavier, RTL, formulaire et envoi de bout en bout, WhatsApp, pannes de script, politique de sécurité, préférence « réduire les animations »). Nécessite Playwright installé à part. |

Chaque compilation construit le site dans un dossier temporaire, le **contrôle** (langue et sens d'écriture, textes d'une autre langue, titres et descriptions, liens et ressources internes, ancres, canonical, hreflang, Open Graph, sitemap, indexation, images), produit les en-têtes de sécurité (`dist/_headers`), puis remplace `dist/` seulement si tout est conforme.

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
  scripts/main.js    Menu mobile, apparitions, galerie, formulaire, lien WhatsApp (13 ko minifié, 3,9 ko compressé)
  assets/            Images (logo, arche, motif zellige, photos préparées), polices
  static/            Fichiers copiés à la racine (favicon, icônes, image de partage, robots)
ressources/          Fichiers sources définitifs (logo, icônes, polices, photos) — inventaire dans ressources/README.md
server/              Service des demandes de réservation (Node.js, sans dépendance) — voir server/README.md
INFORMATIONS-A-FOURNIR.md   Liste centralisée des informations et fichiers attendus du restaurant (npm run contenus)
HEBERGEMENT.md       Mise en ligne : HTTPS, en-têtes de sécurité, types d'hébergement, points à faire valider
scripts/
  build.mjs          Générateur (prévisualisation / production)
  dev.mjs            Serveur de développement avec rechargement automatique
  serve.mjs          Serveur local
  images.mjs         Préparation des photographies
  lib/               Contrôles des contenus (validate), contrôle du site généré (check-output), en-têtes de sécurité, horaires, serveur statique, gabarits HTML
tests/               Tests automatiques (npm test) et tests navigateur (npm run test:browser)
```

## Aperçu de démonstration (complément avant la phase 5)

Pour obtenir un aperçu complet et illustré, le site contient des **contenus de démonstration, toujours signalés comme tels**
(bandeau d'aperçu sur chaque page) et qui **bloquent la mise en production** tant qu'ils restent en place :

| Contenu | Fichier | Signalement sur le site | À faire avant la mise en ligne |
|---|---|---|---|
| Carte de 25 propositions (FR/EN/AR) | `src/content/menu.json` | note en tête de carte, `status: "a-valider"` | validation par le restaurant |
| Prix indicatifs en DH | `menu.json › pricesStatus: "indicatif"` | astérisque et « Prix indicatifs… à confirmer » | `pricesStatus: "valide"` |
| Horaires proposés | `site.json › openingHours`, `hoursConfirmed: false` | « Horaires proposés, à confirmer » | `hoursConfirmed: true` |
| Six avis fictifs | `src/content/reviews.json › demo: true` | « Avis fictifs — aperçu de démonstration » | vrais avis, `demo: false` |
| Photographies d'illustration (Wikimedia Commons, licences libres) | `ressources/photos/illustrations/`, `src/content/photo-credits.json` | « Photo d'illustration » sur chaque image, crédits dans les mentions légales | photographies officielles |

Tout est regroupé et documenté dans **`DAR-EL-BACHA-APERÇU/`** : direction artistique de référence, cahier des charges, photos
rangées par section avec leurs licences, carte, informations, avis et guide (`05-DOCUMENTATION/GUIDE-DE-L-APERCU.md`).

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
- **Contrôle phase 3** (mêmes conditions, après ajout du service de réservation et des pages juridiques) : accueil FR 100 / LCP 1,69 s ;
  accueil AR 99 / 1,92 s ; réservation FR 100 / 1,74 s et AR 99 / 1,99 s ; confidentialité EN 100 / 1,69 s ; contact FR 100 / 1,72 s ;
  accessibilité et bonnes pratiques 100 partout ; CLS ≤ 0,010.
- **Contrôle phase 4** (mêmes conditions, **en-têtes de sécurité et CSP appliqués**) : accueil FR 99 / LCP 1,78 s ; accueil AR 99 / 1,91 s ;
  réservation FR 100 / 1,69 s et AR 99 / 1,97 s ; carte EN 99 / 1,71 s ; contact EN 99 / 1,69 s ; galerie FR 99 / 1,75 s ;
  confidentialité FR 99 / 1,67 s ; accueil FR ordinateur 100 / 0,40 s ; accessibilité et bonnes pratiques 100 partout ; CLS ≤ 0,008 ;
  TBT 0 ms. INP estimé 32 ms (pire interaction : envoi du formulaire vide). Points relevés par Lighthouse sans effet sur la note :
  feuille de style bloquante (unique, 7,9 ko compressés) et découpes du logo plus grandes que leur affichage (en attente du SVG).
- **SEO** : 66 en prévisualisation **par construction** (`noindex`) ; 100 en production (copie de test, phase 1).
- **INP** (Chromium, processeur ralenti ×4, Event Timing) : 56 ms pour la pire interaction (ouverture d'une photo en grand) ;
  menu, formulaire, carte et galerie entre 16 et 32 ms.
- **Poids** (phase 3) : JavaScript minifié 12,4 ko (3,7 ko compressé) ; CSS 42,6 ko (7,9 ko compressé) ; accueil complet 141 ko transférés (FR, polices
  comprises), 173 ko en arabe (deux polices arabes).

Accessibilité : Lighthouse 100 sur les pages mesurées ; navigation au clavier (menu, galerie), focus visibles, contrastes vérifiés
automatiquement, textes alternatifs, libellés, `prefers-reduced-motion`, RTL complet. Les pages arabes ne contiennent aucun texte
latin visible hors noms de marque et de langues (test automatique). Le build refuse aussi toute page contenant une phrase
d'une autre langue (traduction oubliée, texte alternatif ou contenu non localisé), hors passages marqués d'un attribut `lang`,
ainsi que les titres et descriptions absents, en double ou de longueur inadaptée aux résultats de recherche.

## Réservation (phases 3 et 4)

- **Formulaire** : nom, e-mail, téléphone, date, heure, nombre de personnes, message facultatif et **consentement** obligatoire
  (avec lien vers la politique de confidentialité). Validation dans le navigateur **et** sur le serveur, avec les mêmes règles :
  date au fuseau de Casablanca, horizon de réservation, créneaux de 15 minutes, jours de fermeture, fermetures exceptionnelles
  et heures d'ouverture dès que `site.json › openingHours` est renseigné.
- **Statut** : une demande envoyée est toujours présentée comme **en attente de confirmation par le restaurant**, jamais confirmée.
- **Sans JavaScript** : le navigateur valide les champs, le service reçoit l'envoi classique et redirige vers une page de résultat
  dans la langue du visiteur (`/fr/reservation/statut/…/`, non indexée).
- **Service** (`server/`) : anti-robot, limite d'envois, contrôle d'origine, e-mail configurable (simulation par défaut), journal sans
  donnée personnelle. Détails, configuration, sauvegarde et récupération : `server/README.md`.
- **Accusé de réception** : e-mail au client dans sa langue (« demande reçue, en attente de confirmation »), envoyé **uniquement** après
  la transmission réussie au restaurant ; le site ne le mentionne que s'il est parti.
- **Anti-robot** : piège invisible, délai minimal de saisie, limite d'envois, contrôle d'origine ; **Cloudflare Turnstile** facultatif
  (`site.json › reservation.antiSpam`), chargé seulement à la première interaction et mentionné alors dans la politique de confidentialité.
- **WhatsApp** : message prérempli dans la langue de la page, envoyé par le client ; actif dès que le numéro officiel est renseigné.
- **Système externe** : seulement s'il est réellement configuré (`reservation.bookingSystem`).

## Pages juridiques (phase 3)

Politique de confidentialité (`/fr/confidentialite/`, `/en/privacy/`, `/ar/privacy/`) et mentions légales (`/fr/mentions-legales/`,
`/en/legal-notice/`, `/ar/legal-notice/`), liées depuis le pied de page. Toutes les informations viennent de `site.json › legal`
(repère `[INFORMATION JURIDIQUE À CONFIRMER]` sinon). La politique ne décrit que ce que le site fait réellement et ne déclare pas la
conformité CNDP acquise. Tant que `legal.validated` n'est pas `true` (validation par un juriste), un bandeau l'indique et la
production est refusée.

## Avant la mise en ligne (plan des travaux)

État des points à finaliser avant toute mise en production :

- ✅ Préparé : service de réception des demandes avec validation serveur, anti-robots, limite d'envois et e-mail configurable
  (`server/`) ; consentement ; pages juridiques ; horaires structurés ; liste centralisée des informations à fournir.
- ⏳ À configurer selon l'hébergeur : déploiement du service, service d'e-mail réel (clé, adresse de réception, SPF/DKIM/DMARC),
  limite d'envois partagée entre instances, `formEndpoint`.
- ✅ **En-têtes de sécurité** générés à chaque build dans `dist/_headers` : **CSP** stricte (script de repli autorisé par empreinte,
  cadres externes seulement s'ils sont configurés), **HSTS** en production, vérifiés par les tests navigateur.
  ⏳ À reporter chez l'hébergeur retenu et à contrôler en ligne : voir **`HEBERGEMENT.md`** (HTTPS, en-têtes, types d'hébergement,
  points à faire valider).
- ⛔ **Données personnelles** : informations juridiques, durée de conservation, transferts, démarches **CNDP** (loi 09-08) et
  validation par un juriste (`legal.validated`).
- ⛔ **Contenus officiels** : coordonnées, horaires, carte validée et prix, plats emblématiques, conditions de réservation, histoire,
  photographies et textes alternatifs, réseaux sociaux, domaine (`siteUrl`) — voir `INFORMATIONS-A-FOURNIR.md`.
- ⛔ **Logo** : fichiers SVG définitifs ; favicon SVG (`src/static/favicon.svg`, pris en compte automatiquement) ; icônes d'application.
- Hébergement, redirection 301 de la racine, mesure avec PageSpeed Insights une fois en ligne, tests sur Safari et Firefox.

`npm run build:prod` refuse la production tant que les contenus provisoires ou le formulaire non relié subsistent.
