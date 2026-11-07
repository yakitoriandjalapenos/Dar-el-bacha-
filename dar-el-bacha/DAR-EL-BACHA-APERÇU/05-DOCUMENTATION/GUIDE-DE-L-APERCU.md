# Guide de l'aperçu DAR EL BACHA

Ce guide explique où se trouve chaque élément de l'aperçu et comment le modifier, sans avoir à chercher dans le code.
Tous les chemins partent du dossier du projet `dar-el-bacha/`.

> **Règle d'or** : le site se construit à partir de quelques fichiers de contenu (`src/content/*.json` et `src/i18n/*.json`).
> Ce dossier `DAR-EL-BACHA-APERÇU/` en est une **copie de consultation** : pour changer le site, modifier les fichiers indiqués
> ci-dessous, puis lancer `npm run apercu` pour remettre ce dossier à jour.

## 1. Lancer l'aperçu du site

Prérequis : Node.js 18 ou plus récent (aucune installation de paquet n'est nécessaire pour le site).

```bash
cd dar-el-bacha
npm run dev
```

Ouvrir ensuite **http://localhost:4321/fr/** (anglais : `/en/`, arabe : `/ar/`). Chaque modification d'un fichier de contenu
recompile le site et recharge le navigateur. Le formulaire de réservation fonctionne en **mode test** : rien n'est envoyé.

Autres commandes utiles :

| Commande | Rôle |
|---|---|
| `npm run build` puis `npm run serve` | Compiler l'aperçu puis le servir tel qu'il serait publié |
| `npm run apercu` | Mettre à jour ce dossier de livraison (carte, avis, photos, correspondances) |
| `npm run contenus` | Mettre à jour `INFORMATIONS-A-FOURNIR.md` (ce que le restaurant doit encore fournir) |
| `npm test` | Vérifier contenus, traductions, pages et sécurité |

## 2. Contenu du dossier de livraison

| Dossier | Contenu |
|---|---|
| `DAR-EL-BACHA-DIRECTION-ARTISTIQUE.md` | Direction artistique de référence (obligatoire pour toute intégration) |
| `01-CAHIER-DES-CHARGES/` | Cahier des charges du projet |
| `02-PHOTOS/` | Copie de chaque photo utilisée, rangée par section, et `CORRESPONDANCE.md` (photo ↔ section ↔ auteur ↔ licence) |
| `03-CONTENUS/` | `CARTE.md` (les 25 propositions, trois langues, prix) et `INFORMATIONS-RESTAURANT.md` |
| `04-AVIS-DEMO/` | `AVIS.md` (avis fictifs, trois langues) et copie de `reviews.json` |
| `05-DOCUMENTATION/` | Ce guide |

## 3. Où se trouvent les photos

| Quoi | Où |
|---|---|
| Photos téléchargées (originaux 1920 px, ce sont elles que le site utilise) | `ressources/photos/illustrations/` |
| Versions optimisées publiées (AVIF, WebP, JPEG, 480 à 1920 px) | `src/assets/img/photos/illustrations/` (produites par `npm run images`) |
| Copies de consultation, rangées par section | `DAR-EL-BACHA-APERÇU/02-PHOTOS/` |
| Auteur, licence et source de chaque photo | `src/content/photo-credits.json` et `02-PHOTOS/CORRESPONDANCE.md` |

**Quelle image correspond à quelle section** : voir le tableau de `02-PHOTOS/CORRESPONDANCE.md` (généré automatiquement,
toujours à jour). Les réglages se font dans :

| Section du site | Fichier | Champ |
|---|---|---|
| Accueil : grand visuel, philosophie, mosaïque | `src/content/media.json` | `home.hero`, `home.philosophy`, `home.mosaic` |
| Notre histoire : six chapitres | `src/content/media.json` | `histoire.*` |
| Contact : visuel du plan | `src/content/media.json` | `contact.map` |
| Galerie : sept thèmes | `src/content/gallery.json` | `items[].image` |
| Carte : photo de chaque plat (et des plats emblématiques de l'accueil) | `src/content/menu.json` | `image` de chaque plat |

Chaque emplacement a deux champs : `"image"` (nom de la photo, par exemple `"illustrations/tajine-agneau-pruneaux"`) et
`"alt"` (description de la photo en français, anglais et arabe, lue par les lecteurs d'écran).

## 4. Remplacer une photo provisoire par une photo officielle

1. Déposer l'original haute définition (JPEG ou PNG, 2000 px de large ou plus) dans `ressources/photos/restaurant/`
   (salle, architecture, ambiance) ou `ressources/photos/gastronomie/` (plats), avec un nom simple : `salle-principale.jpg`.
2. Lancer `npm run images` : les versions optimisées sont créées automatiquement.
   (Cette commande utilise l'outil `sharp`, à installer une fois : `npm install --no-save sharp`.)
3. Dans le fichier de la section (tableau ci-dessus), remplacer le nom, par exemple
   `"image": "illustrations/salle-riad"` → `"image": "restaurant/salle-principale"`, et adapter `"alt"`.
4. Quand une photo d'illustration n'est plus utilisée, supprimer son entrée de `src/content/photo-credits.json`
   et son fichier de `ressources/photos/illustrations/`.
5. `npm run dev` pour vérifier, puis `npm run apercu` pour mettre ce dossier à jour.

Tant qu'il reste une photo d'illustration, le site l'indique (« Photo d'illustration », bandeau d'aperçu) et la mise en
production est refusée.

## 5. Modifier les textes

| Quoi | Fichier |
|---|---|
| Tous les textes des pages (titres, paragraphes, boutons, messages) | `src/i18n/fr.json`, `src/i18n/en.json`, `src/i18n/ar.json` (même structure dans les trois langues) |
| Nom, adresse, téléphone, horaires, réseaux sociaux | `src/content/site.json` |
| Histoire du restaurant | `src/content/site.json › story` |
| Informations juridiques | `src/content/site.json › legal` |

Exemple : le titre de l'accueil est `pages.home.hero.title` dans chacun des trois fichiers de traduction. Le site refuse de se
compiler si une traduction manque ou si un texte d'une langue apparaît dans une autre : l'erreur indique le fichier et la clé.

**Horaires** : `site.json › openingHours` (plages par jour, `[]` = fermé). Ils sont actuellement **proposés**
(`"hoursConfirmed": false`, affichés avec la mention « à confirmer ») ; passer à `true` une fois confirmés.

## 6. Modifier la carte et les prix

Fichier : **`src/content/menu.json`**. Chaque plat se présente ainsi :

```json
{ "id": "zaalouk", "status": "a-valider",
  "name": { "fr": "Zaalouk", "en": "Zaalouk", "ar": "زعلوك" },
  "description": { "fr": "…", "en": "…", "ar": "…" },
  "ingredients": { "fr": "…", "en": "…", "ar": "…" },
  "price": 70, "image": "illustrations/zaalouk" }
```

- **Prix** : champ `price`, en dirhams, nombre entier (`70` s'affiche « 70 DH »). `null` affiche « prix à confirmer ».
- Les prix sont actuellement **indicatifs** (`"pricesStatus": "indicatif"` en tête du fichier : astérisque et mention
  « Prix indicatifs… à confirmer ») ; passer à `"valide"` une fois tous les prix confirmés par le restaurant.
- **Plat validé** : supprimer la ligne `"status": "a-valider"`.
- **Plat emblématique** (accueil, 4 au plus) : ajouter `"signature": true`.
- Limites contrôlées automatiquement : 6 entrées, 10 plats, 4 desserts, 5 boissons, 25 au total.

## 7. Modifier les avis

Fichier : **`src/content/reviews.json`** (copie dans `04-AVIS-DEMO/`). Les six avis actuels sont **fictifs** (`"demo": true`)
et le site l'affiche : « Avis fictifs — aperçu de démonstration ». Pour publier de vrais avis : remplacer le texte, le contexte
et le nombre d'étoiles (1 à 5) dans les trois langues, ajouter éventuellement `author`, puis passer `"demo"` à `false`.
Détails : `04-AVIS-DEMO/AVIS.md`.

## 8. Sources et licences des images

- Toutes les photographies de l'aperçu viennent de **Wikimedia Commons** et sont publiées sous licence libre
  (domaine public, CC0, CC BY ou CC BY-SA), vérifiée fichier par fichier au moment du téléchargement.
- Auteur, licence, lien de la licence et page source de chaque image : `src/content/photo-credits.json`,
  `02-PHOTOS/CORRESPONDANCE.md`, et sur le site dans les **mentions légales** (« Photographies d'illustration de l'aperçu »).
- Les images ont seulement été redimensionnées et converties (AVIF, WebP, JPEG) ; aucune n'a été recadrée ni retouchée.
- Elles **illustrent** l'aperçu et ne représentent **pas** le restaurant : elles devront être remplacées par les photographies
  officielles avant la mise en ligne (la production est refusée tant qu'il en reste).

## 9. Ce qui reste à fournir

Voir `INFORMATIONS-A-FOURNIR.md` à la racine du projet (mis à jour par `npm run contenus`).
