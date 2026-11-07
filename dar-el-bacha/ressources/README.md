# Ressources définitives — DAR EL BACHA

Ce dossier reçoit les **fichiers sources** fournis par le restaurant ou ses prestataires
(logo, icônes, polices, photographies, illustrations). Ils ne sont pas publiés tels quels :
ils sont préparés, puis copiés dans `src/` sous leur forme optimisée.

Règle : **aucun faux logo, aucune photographie inventée ou générée.** Tant qu'une ressource manque,
le site affiche un emplacement clairement signalé et le build la liste à chaque compilation.

## Inventaire

| Ressource | Dossier source | Utilisée sur le site depuis | État |
|---|---|---|---|
| Planche d'identité officielle | `logo/planche-identite-officielle-reference.jpg` | — | ✅ Reçue (JPEG 1408 × 768) : **référence visuelle**, pas un fichier source |
| Logo vert et or avec couronne (signature, fond clair) | `logo/` | `src/assets/img/logo/logo-vert-or-couronne.*` | ⚠️ Découpe de la planche (304 × 332 px, affichée à mi-taille) — **SVG manquant** |
| Logo vert et or sans couronne (compact, fond clair) | `logo/` | `src/assets/img/logo/logo-vert-or.*` | ⚠️ Découpe de la planche (333 × 313 px) — **SVG manquant** |
| Logo ivoire et or (fond émeraude) | `logo/` | `src/assets/img/logo/logo-ivoire-or.*` | ⚠️ Découpe de la planche (300 px) — **SVG manquant** ; version avec couronne absente de la planche |
| Logo monochrome (impressions, tampons) | `logo/` | — | ❌ **Manquant** |
| Favicon 16 et 32 px (arche seule) | `icones/` | `src/static/favicon.ico`, `favicon-32.png` | ⚠️ Provisoire (porte du logo réduite) — SVG simplifié souhaité |
| Icône d'application (1024 × 1024, arche et nom) | `icones/` | `src/static/apple-touch-icon.png`, `icon-512.png` | ⚠️ Provisoire — les icônes miniatures de la planche (168 px) ne peuvent pas être agrandies |
| Image de partage réseaux sociaux (1200 × 630) | `icones/` | `src/static/og-image.jpg` | ⚠️ Provisoire (logo sur fond émeraude) |
| Police de titres latine | `polices/latin/` | `src/assets/fonts/` + `fonts.json` | ✅ Cormorant Garamond 500 (OFL), WOFF2 |
| Police de texte latine | `polices/latin/` | `src/assets/fonts/` | ✅ Jost 400 et 500 (OFL), WOFF2 |
| Police arabe (titres et texte) | `polices/arabe/` | `src/assets/fonts/` | ✅ Noto Kufi Arabic 500 et Noto Naskh Arabic 400 (OFL), WOFF2 |
| Photographies du restaurant (salle, architecture, décoration, ambiance, accueil) | `photos/restaurant/` | `src/assets/img/photos/restaurant/` | ❌ **Aucune** |
| Photographies gastronomiques (plats, détails culinaires) | `photos/gastronomie/` | `src/assets/img/photos/gastronomie/` | ❌ **Aucune** |
| Illustrations et éléments décoratifs | `illustrations/` | `src/assets/img/` | ✅ Arche, zellige, moucharabieh, frise de bois sculpté (SVG dessinés pour le site) et grain de tadelakt (CSS) ; à remplacer si une charte en fournit d'autres. |

Emplacements photo à remplir : 1 image principale, 1 philosophie et 3 images de mosaïque sur l'accueil ; 6 sur Notre histoire ;
1 plan d'accès sur Contact ; 7 dans la galerie (`src/content/media.json`, `src/content/gallery.json`). Les plats emblématiques
utilisent les photos des plats de la carte (`src/content/menu.json`, champ `image`).

## Formats attendus

- **Logo** : SVG (de préférence) ou PNG transparent d'au moins 2000 px de large. Une version par fond (sombre, clair) et une monochrome.
  Remplacement : déposer les fichiers dans `logo/`, puis les variantes web dans `src/assets/img/logo/` en gardant les mêmes noms
  (ou ajouter les `.svg` et adapter `src/components/logo.mjs`).
- **Favicon et icône** : SVG du symbole simplifié (l'arche ou la porte seule) et PNG 1024 × 1024.
- **Polices** : fichiers d'origine et **licence d'utilisation web**. Le site les convertit en WOFF2 sous-ensemble
  (voir `src/assets/fonts/README.md`).
- **Photographies** : JPEG ou TIFF haute définition (3000 px de large ou plus), non retouchées pour le web.
  Le texte alternatif de chaque photo (FR / EN / AR) doit être rédigé ou validé par le restaurant.

## Préparer les photographies

1. Déposer les originaux dans `photos/restaurant/` ou `photos/gastronomie/` (sous-dossiers possibles).
   Les noms deviennent les identifiants : « Salle principale.jpg » → `restaurant/salle-principale`.
2. Lancer `npm run images` : création des variantes AVIF, WebP et JPEG (480 à 2000 px), suppression des
   métadonnées (dont la position GPS), manifeste des dimensions et de la couleur dominante.
3. Indiquer le nom de la photo dans `src/content/media.json` ou `src/content/gallery.json`, avec son texte alternatif.
4. `npm run build` : le site produit automatiquement les balises `<picture>` (srcset, sizes, dimensions).

`npm run images` nécessite la bibliothèque `sharp` (outil de développement uniquement, voir le README principal).

## Poids du dépôt

Les originaux photo peuvent peser plusieurs dizaines de mégaoctets. Avant d'en ajouter beaucoup, décider
s'ils sont conservés dans le dépôt Git (Git LFS conseillé) ou dans un espace partagé, seules les variantes
web générées (`src/assets/img/photos/`) étant alors versionnées.
