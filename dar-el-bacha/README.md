# DAR EL BACHA — site gastronomique

Site statique, trilingue (FR / EN / AR en RTL), sans framework ni dépendance : un petit générateur Node assemble les pages à partir des contenus et des traductions. Étape actuelle : socle technique consolidé (phase 1) ; l'identité visuelle définitive viendra ensuite.

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

Le logo est découpé dans la planche d'identité visuelle fournie (version ivoire et or, fond rendu transparent) :

- `src/assets/img/logo/symbole-ivoire-or-112.*` : la porte seule, dans l'en-tête, à côté du nom écrit en texte (net à toutes les tailles et traduit en arabe).
- `src/assets/img/logo/logo-ivoire-or.*` : le logo complet, dans le pied de page.
- `src/static/favicon.ico`, `favicon-32.png`, `apple-touch-icon.png`, `icon-512.png` : icônes d'onglet et d'écran d'accueil (porte centrale seule).
- `src/static/og-image.jpg` : image de partage sur les réseaux sociaux (1200 × 630).

Pour afficher le logo complet dans l'en-tête au lieu de la porte + le nom : `"logo": { "header": "complet" }` dans `site.json`.

La planche est une image JPEG de basse définition : le découpage convient pour avancer, mais il faudra le remplacer par les fichiers originaux du logo (SVG de préférence, sinon PNG transparent haute définition) avant la mise en ligne. Il suffit de garder les mêmes noms de fichiers.

## Photos

Toutes les images sont pour l'instant des emplacements temporaires (motif zellige + mention « Photographie officielle à venir »). Pour en remplacer un :

1. Déposer l'original haute définition dans `ressources/photos/restaurant/` ou `ressources/photos/gastronomie/`.
2. `npm run images` : variantes AVIF, WebP et JPEG de 480 à 2000 px (sans agrandissement), métadonnées supprimées, manifeste des dimensions et de la couleur dominante (`src/assets/img/photos/manifest.json`, non publié).
3. Dans `src/content/media.json` (accueil, histoire, plan d'accès) ou `gallery.json`, remplacer `"image": null` par le nom de la photo, par exemple `"restaurant/salle-principale"`, et renseigner `alt` dans les trois langues.

Le build crée la balise `<picture>` (AVIF, puis WebP, puis JPEG), avec `srcset`, `sizes`, dimensions explicites (pas de décalage de mise en page), couleur de fond pendant le chargement et chargement différé hors écran. Seule l'image principale de l'accueil est chargée en priorité haute ; le build refuse plus d'une image prioritaire par page. Une photo citée mais introuvable interrompt le build.

**`sharp`** : `npm run images` utilise la bibliothèque `sharp` (Apache 2.0), seule façon fiable d'encoder l'AVIF depuis Node. Elle sert uniquement à préparer les photos sur le poste de travail : le build et le site publié n'en dépendent pas. Installation : `npm install --save-dev sharp` (en attente de validation pour l'ajouter au projet).

## Direction artistique

- **Palette** : émeraude `#12372B`, or `#B08D57` (filets, détails) / or clair `#CDB07A` (sur fond émeraude), sable `#D9C7A6`, ivoire `#F5F0E6`, brun `#5B3A26`, noir doux `#1E1C19`. Contrastes texte vérifiés (≥ 6,2:1).
- **Motif signature** : l'arc outrepassé brisé (`src/assets/img/arch.svg`), utilisé comme cadre photo, en écho dans les en-têtes de page et dans l'arcade des plats emblématiques. Le zellige (étoile à huit branches) reste discret, réservé aux emplacements photo et aux ornements.
- **Typographie** : titres en serif (Lora, police provisoire auto-hébergée, 42 ko), texte courant en police système (0 ko). Voir `src/assets/fonts/README.md` pour installer la police de titres définitive et une police arabe.
- **Mouvement** : un seul moment chorégraphié (l'arche du hero se dessine au chargement), plus une apparition discrète de l'arcade. Tout est coupé si l'utilisateur a demandé la réduction des animations.

## Performance et accessibilité

**Objectifs** : LCP < 2 s, CLS < 0,05, INP < 200 ms, JavaScript initial ≤ 15 ko, Lighthouse ≥ 95.

**Conditions de mesure (phase 1, novembre 2026)** : Lighthouse 12.6.1, Chromium 1243 sans interface, profil mobile par défaut
(Moto G Power émulé, processeur ralenti ×4, réseau simulé : 150 ms de latence, 1,6 Mbit/s), 3 passages par page (médiane),
site servi localement avec compression Brotli et en-têtes de cache comme chez un hébergeur statique.
Les mesures de laboratoire ne remplacent pas les données réelles des visiteurs (Chrome UX Report) après la mise en ligne.

| Page (mobile) | Performance | Accessibilité | Bonnes pratiques | LCP | CLS | TBT |
|---|---|---|---|---|---|---|
| Accueil FR | 100 | 100 | 100 | 1,51 s | 0 | 0 ms |
| Accueil AR | 100 | 100 | 100 | 1,22 s | 0 | 0 ms |
| La carte FR / EN | 100 | 100 | 100 | 1,59 s | 0 | 0 ms |
| Réservation FR / AR | 100 | 100 | 100 | 1,52 / 1,16 s | 0 | 0 ms |
| Galerie EN | 100 | 100 | 100 | 1,52 s | 0 | 0 ms |
| Notre histoire FR | 100 | 100 | 100 | 1,51 s | 0 | 0 ms |
| Contact AR | 100 | 100 | 100 | 1,14 s | 0 | 0 ms |
| Accueil FR (profil ordinateur) | 100 | 100 | 100 | 0,37 s | 0 | 0 ms |

- **SEO** : 66 en prévisualisation, **par construction** (pages en `noindex`). Sur une copie compilée en production avec des données de test : 100.
- **Avec une photo principale** (copie de test, images synthétiques préparées par `npm run images`) : Accueil FR mobile 100, LCP 1,58 s ; Galerie FR mobile 100, LCP 1,58 s.
- **INP** (laboratoire, Chromium, processeur ralenti ×4, Event Timing) : 24 ms pour la pire interaction mesurée (menu mobile, validation du formulaire, saisie, sélecteur, navigation dans la carte).
- **Poids** : JavaScript 7,3 ko (2,4 ko compressé) + 179 octets en ligne ; CSS 22 ko (4,9 ko compressé) ; HTML 10 à 13 ko (2 à 3 ko compressé). Page d'accueil complète : 73 ko transférés (police comprise).

Points relevés par Lighthouse, sans effet sur les scores : la feuille de style bloque le premier affichage (5 ko compressés, environ 150 ms estimés ;
conservée en fichier séparé pour profiter du cache entre les pages) ; le symbole du logo (171 × 112 px, 17 ko) est plus grand que son affichage : le logo vectoriel définitif réglera ce point.

Accessibilité : lien d'évitement, navigation au clavier (le bouton du menu mobile précède le menu, Tab mène à ses liens), focus visible,
libellés de formulaire, messages d'erreur reliés aux champs, menu mobile fermé par Échap, par un clic en dehors ou quand le focus le quitte,
`prefers-reduced-motion` respecté, interface arabe en RTL complète (propriétés logiques CSS). Sans JavaScript (désactivé, fichier absent ou en erreur),
le site revient automatiquement à un mode entièrement utilisable.

## Étapes suivantes

- Service d'envoi du formulaire (fonction serveur avec validation côté serveur, anti-spam et e-mail au restaurant), puis renseigner `formEndpoint`.
  Il devra accepter aussi les envois classiques (sans JavaScript) : le formulaire les lui adresse dès que `formEndpoint` est renseigné.
- Politique de confidentialité et mentions légales (données du formulaire, loi 09-08).
- Contenus officiels : carte, prix, histoire, photographies, coordonnées.
- Galerie : agrandissement des photos (lightbox) et légendes.
- Plan Google Maps chargé au clic (pour ne pas alourdir la page).
- Police de titres définitive en WOFF2, police arabe auto-hébergée.
- Fichiers originaux du logo en haute définition (SVG), favicon simplifié, icône d'application.
