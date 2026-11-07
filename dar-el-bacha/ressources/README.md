# Ressources définitives — DAR EL BACHA

Ce dossier reçoit les **fichiers sources** fournis par le restaurant ou ses prestataires
(logo, icônes, polices, photographies, illustrations). Ils ne sont pas publiés tels quels :
ils sont préparés, puis copiés dans `src/` sous leur forme optimisée.

Règle : **aucun faux logo, aucune photographie inventée ou générée.** Tant qu'une ressource manque,
le site affiche un emplacement clairement signalé et le build la liste à chaque compilation.

## Inventaire

| Ressource | Dossier source | Utilisée sur le site depuis | État |
|---|---|---|---|
| Logo principal (vectoriel) | `logo/` | `src/assets/img/logo/` | ❌ **Manquant**. Le site utilise une découpe provisoire de 300 px tirée d'une planche JPEG basse définition. |
| Logo pour fonds sombres (ivoire et or) | `logo/` | `src/assets/img/logo/` | ⚠️ Provisoire (même découpe, PNG/WebP 300 px) |
| Logo pour fonds clairs (émeraude et or, ou brun) | `logo/` | `src/assets/img/logo/` | ❌ **Manquant** |
| Logo monochrome (une couleur, pour impressions et tampons) | `logo/` | — | ❌ **Manquant** |
| Favicon (symbole simplifié, lisible à 16 px) | `icones/` | `src/static/favicon.ico`, `favicon-32.png` | ⚠️ Provisoire (porte du logo réduite, peu lisible à 16 px) |
| Icône d'application (1024 × 1024, marges de sécurité) | `icones/` | `src/static/apple-touch-icon.png`, `icon-512.png` | ⚠️ Provisoire (logo petit au centre) |
| Image de partage réseaux sociaux (1200 × 630) | `icones/` | `src/static/og-image.jpg` | ⚠️ Provisoire (logo sur fond émeraude) |
| Police de titres latine | `polices/latin/` | `src/assets/fonts/` + `fonts.json` | ⚠️ Provisoire : Lora (licence OFL), en WOFF |
| Police de texte latine | `polices/latin/` | — | Polices du système (choix volontaire, 0 ko) |
| Police arabe (titres et texte) | `polices/arabe/` | `src/assets/fonts/` + `fonts.json` | ❌ **Manquante** : polices arabes du système, rendu variable selon l'appareil |
| Photographies du restaurant (salle, architecture, décoration, ambiance, accueil) | `photos/restaurant/` | `src/assets/img/photos/restaurant/` | ❌ **Aucune** |
| Photographies gastronomiques (plats, détails culinaires) | `photos/gastronomie/` | `src/assets/img/photos/gastronomie/` | ❌ **Aucune** |
| Illustrations et éléments décoratifs | `illustrations/` | `src/assets/img/` | ✅ Arche (`arch.svg`) et zellige (`zellige.svg`), dessinés pour le site ; à remplacer si une charte en fournit d'autres. |

Emplacements photo à remplir : 1 image principale, 1 philosophie, 3 plats emblématiques et 3 images de mosaïque sur l'accueil ;
6 sur Notre histoire ; 1 plan d'accès sur Contact ; 7 dans la galerie (`src/content/media.json`, `src/content/gallery.json`).

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
