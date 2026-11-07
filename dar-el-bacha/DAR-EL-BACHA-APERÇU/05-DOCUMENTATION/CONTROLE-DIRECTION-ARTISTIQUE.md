# Contrôle de l'aperçu au regard de la direction artistique

Comparaison du site (aperçu illustré, novembre 2026) avec `DAR-EL-BACHA-DIRECTION-ARTISTIQUE.md`, point par point
(grille du § 12). Vérification faite sur captures d'écran en français, anglais et arabe, sur ordinateur (1280 px) et mobile
(390 et 320 px), et par les tests automatiques.

## Grille de contrôle

| # | Critère | Résultat |
|---|---|---|
| 1 | Palette strictement respectée, or jamais en texte sur fond clair | ✅ Aucune nouvelle couleur ; étoiles, filets et cadres en or patiné ; textes dorés en or foncé (contrastes vérifiés par les tests) |
| 2 | Typographies et motifs inchangés, un motif par section | ✅ Cormorant Garamond / Jost / Noto Kufi / Noto Naskh ; arches, moucharabieh, tadelakt, frises inchangés |
| 3 | Photographies chaudes, texturées, éditoriales ; ni foule, ni cliché touristique, ni lumière froide | ⚠️ Globalement respecté (voir écarts 1 à 3) |
| 4 | Chaque photo d'illustration signalée et créditée | ✅ Mention « Photo d'illustration » sur chaque image (et dans le texte alternatif), bandeau d'aperçu, crédits dans les mentions légales, `02-PHOTOS/CORRESPONDANCE.md` |
| 5 | Carte : 25 propositions au plus, présentation de grande table, prix en DH signalés comme indicatifs | ✅ 6 / 10 / 4 / 5, catégories numérotées, filet pointillé doré, vignettes en arche, astérisque et mention « Prix indicatifs… » (voir écart 4) |
| 6 | Galerie : sept thèmes, compositions variées | ✅ Plats, détails culinaires, intérieur, architecture, décoration, ambiance, art de recevoir ; portrait, paysage et carré |
| 7 | Témoignages : étoiles dessinées, mention d'avis fictifs, aucune note chiffrée | ✅ Cartes ivoire à double filet or, guillemets serif, étoiles SVG, aucune note moyenne ni donnée structurée d'avis |
| 8 | Trois langues complètes, arabe en RTL | ✅ Contrôle automatique : aucun texte d'une autre langue dans une page ; adresse affichée en arabe sur les pages arabes |
| 9 | Aucune information inventée présentée comme officielle | ✅ Carte, prix, horaires, avis et photos signalés comme provisoires ; la mise en production est refusée tant qu'ils restent en place |

## Ce qui correspond à la direction

- **Accueil** : grand visuel d'un salon de riad (zelliges, portes de cèdre sculpté, lanternes, banquettes, lumière chaude) ;
  arche de plâtre ciselé et brocart pour la philosophie ; mosaïque plafond sculpté et lanterne, plateau de thé, patio à fontaine.
- **Notre histoire** : cour dorée aux arches et au lustre, salon de plâtre ciselé, jarres de tanjia, service du thé, lanterne
  sur zellige ; chaque photo dans son cadre en arche.
- **Plats** : tajines en terre cuite, plats en céramique peinte de Fès, plateaux d'argent et de cuivre, verres à thé ciselés.

## Écarts constatés

1. **Qualité photographique inégale (cahier § 6.2).** Les photos libres de droits sont pour la plupart des photos de
   particuliers, pas des prises de vue de studio. Une partie de la carte n'atteint pas le niveau éditorial attendu :
   - éclairage plat ou cadrage simple : tajine de kefta (photographié sur un balcon), infusion de verveine (tasse ordinaire),
     taktouka (nappe fleurie), oranges (plan de travail en inox) ;
   - verres de vin à l'arrière-plan de la pastilla au lait.

   L'ambiance reste cohérente, mais ces images devront être les premières remplacées par les photographies officielles.
2. **Correspondance approximative de quelques plats.** Les photos les plus proches disponibles sous licence libre ont été
   retenues, sans être exactement la recette décrite :
   - « Méchoui d'agneau » : épaule d'agneau servie sur un couscous ;
   - « Oranges à la cannelle » : oranges en tranches, sans cannelle visible ;
   - « Cornes de gazelle » et « Assortiment de pâtisseries » : pâtisseries marocaines proches.
3. **Lieux d'origine des photos d'ambiance.** Deux photos de lanternes ont été prises dans des boutiques d'artisanat et une
   photo de plateau sur la place Jemaa el-Fna. Ces images ne montrent ni foule ni enseigne, mais leur origine est commerciale ou
   touristique. Les photos de monuments religieux (mosquées, médersas) et celles du palais « Dar el Bacha » de Marrakech ont été
   écartées volontairement.
4. **Carte et références d'inspiration.** Les « 25 plats et tarifs déjà proposés » et les « photographies d'inspiration »
   mentionnés n'ont pas été retrouvés dans le projet. La carte suit les exemples du cahier des charges (§ 5.3 à 5.6) et les prix
   sont des propositions indicatives. Il faudra les remplacer par votre liste si elle existe (`src/content/menu.json`).
5. **Plats emblématiques.** Les quatre plats mis en avant sur l'accueil (tajine d'agneau, tajine de poulet, couscous, méchoui)
   sont une proposition ; leur choix revient au restaurant.
6. **Mise en page.** Les points suivants sont mineurs :
   - dans le pied de page, chaque plage horaire passe sur deux lignes, car la colonne est étroite ;
   - sur mobile, les noms arabes longs de la carte occupent plusieurs lignes à côté de la vignette.
7. **Plan d'accès (Contact).** L'emplacement reste un visuel provisoire signalé (plan Google Maps chargé au clic), car aucun
   plan statique n'a été fourni : une photographie n'y aurait pas sa place.
8. **Poids du projet.** Les 42 photos ont été préparées en 5 largeurs et 3 formats, soit environ 90 Mo dans
   `src/assets/img/photos/`, plus la copie de `dist/`. Le visiteur ne télécharge que la taille utile : environ 270 à 450 ko par
   page sur mobile.

## Mesures (Lighthouse, mobile, en-têtes de sécurité appliqués)

| Page | Performance | Accessibilité | Bonnes pratiques | LCP | CLS |
|---|---|---|---|---|---|
| Accueil FR | 98 | 100 | 100 | 2,19 s | 0,007 |
| Accueil AR | 98 | 100 | 100 | 2,29 s | 0,001 |
| La carte FR | 99 | 100 | 100 | 1,95 s | 0,043 |
| Galerie FR | 99 | 100 | 100 | 2,12 s | 0,002 |
| Accueil FR (ordinateur) | 100 | 100 | 100 | 0,60 s | 0,004 |

L'objectif du cahier des charges (LCP ≤ 2,5 s) est tenu avec les photos.
