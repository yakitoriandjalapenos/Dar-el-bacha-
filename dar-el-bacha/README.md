# DAR EL BACHA — site gastronomique

Structure de base du site (étape 1). Site statique, trilingue (FR / EN / AR en RTL), sans framework ni dépendance : un petit générateur Node assemble les pages à partir des contenus et des traductions.

## Démarrer

Prérequis : Node.js 18 ou plus récent. Aucune installation de paquet n'est nécessaire.

```bash
npm run dev      # compile puis lance http://localhost:4321/fr/
npm run build    # compile uniquement → dossier dist/
```

Le dossier `dist/` est le site final : il se dépose tel quel chez n'importe quel hébergeur statique (Netlify, Cloudflare Pages, Vercel, OVH…). Ouvrir les fichiers directement par double-clic ne fonctionne pas (les liens partent de la racine du site) : passer par `npm run serve`.

## Organisation

```
src/
  content/
    site.json        Informations officielles (adresse, téléphone, WhatsApp, horaires…)
    menu.json        La carte — 25 propositions maximum, contrôlé au build
    gallery.json     Emplacements photo de la galerie
  i18n/
    fr.json en.json ar.json   Tous les textes du site, par langue
  routes.mjs         Langues et adresses des pages
  components/        Éléments réutilisables (en-tête, pied de page, arche, médias, boutons…)
  pages/             Les 6 pages + la page 404
  styles/            tokens → base → layout → components → pages (concaténés au build)
  scripts/main.js    Menu mobile, apparitions, formulaire, lien WhatsApp (5 ko)
  assets/            Images (arche, motif zellige), polices
  static/            Fichiers copiés à la racine (favicon, robots)
scripts/
  build.mjs          Générateur
  serve.mjs          Serveur local
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

Quelques effets automatiques :

- **WhatsApp** : tant que `whatsapp.number` est vide, le bouton est inactif. Une fois le numéro renseigné, il ouvre une conversation préremplie avec les informations saisies dans le formulaire.
- **Formulaire** : tant que `reservation.formEndpoint` est vide, l'envoi affiche un message clair (« l'envoi en ligne n'est pas encore activé »). Il ne simule jamais une réussite.
- **Système de réservation connecté** : invisible tant que `reservation.bookingSystem` vaut `null`. Pour l'activer : `{ "url": "https://…" }`.
- **Données structurées** (schema.org Restaurant / Menu) : seules les informations renseignées sont publiées ; les plats « à valider » en sont exclus.
- **Nom de domaine** : tant que `siteUrl` est vide, une adresse provisoire `dar-el-bacha.example` est utilisée pour canonical, sitemap et Open Graph.

## La carte

`src/content/menu.json` contient 4 catégories avec leurs limites strictes : entrées 6, plats 10, desserts 4, boissons 5, soit 25 au total. Le build **s'arrête** si une limite est dépassée ou si une catégorie non prévue est ajoutée. Les tajines et spécialités fassies se placent dans `plats`.

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

1. Déposer les fichiers dans `src/assets/img/photos/`, par exemple `salle-800.avif`, `salle-1600.avif`, `salle-800.webp`, `salle-1600.webp`, `salle-1600.jpg`.
2. Dans le contenu, remplacer `image: null` par `{ "src": "photos/salle", "width": 1600, "height": 1067 }`.

Le build crée la balise `<picture>` (AVIF, puis WebP, puis JPEG), avec `srcset`, dimensions explicites (pas de décalage de mise en page) et chargement différé hors écran.

Emplacements : `gallery.json` pour la galerie, en tête de `src/pages/home.mjs` et `src/pages/histoire.mjs` pour les autres pages.

## Direction artistique

- **Palette** : émeraude `#12372B`, or `#B08D57` (filets, détails) / or clair `#CDB07A` (sur fond émeraude), sable `#D9C7A6`, ivoire `#F5F0E6`, brun `#5B3A26`, noir doux `#1E1C19`. Contrastes texte vérifiés (≥ 6,2:1).
- **Motif signature** : l'arc outrepassé brisé (`src/assets/img/arch.svg`), utilisé comme cadre photo, en écho dans les en-têtes de page et dans l'arcade des plats emblématiques. Le zellige (étoile à huit branches) reste discret, réservé aux emplacements photo et aux ornements.
- **Typographie** : titres en serif (Lora, police provisoire auto-hébergée, 42 ko), texte courant en police système (0 ko). Voir `src/assets/fonts/README.md` pour installer la police de titres définitive et une police arabe.
- **Mouvement** : un seul moment chorégraphié (l'arche du hero se dessine au chargement), plus une apparition discrète de l'arcade. Tout est coupé si l'utilisateur a demandé la réduction des animations.

## Performance et accessibilité (mesures de cette étape)

Mesures sur mobile simulé (CPU ralenti ×4, connexion 4G lente) : LCP 0,6 à 0,8 s, CLS 0 sur toutes les pages testées. Poids d'une page : environ 85 ko non compressés, polices comprises.

Lien d'évitement, navigation au clavier, focus visible, libellés de formulaire, messages d'erreur reliés aux champs, menu mobile fermé par Échap, `prefers-reduced-motion` respecté, interface arabe en RTL complète (propriétés logiques CSS).

## Étapes suivantes

- Service d'envoi du formulaire (fonction serveur avec validation côté serveur, anti-spam et e-mail au restaurant), puis renseigner `formEndpoint`.
- Politique de confidentialité pour les données du formulaire.
- Contenus officiels : carte, prix, histoire, photographies, coordonnées.
- Galerie : agrandissement des photos (lightbox) et légendes.
- Plan Google Maps chargé au clic (pour ne pas alourdir la page).
- Police de titres définitive en WOFF2, police arabe auto-hébergée.
- Fichiers originaux du logo en haute définition (SVG).
