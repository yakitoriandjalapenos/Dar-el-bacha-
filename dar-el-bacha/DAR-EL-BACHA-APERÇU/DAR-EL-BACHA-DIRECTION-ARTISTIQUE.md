# DAR EL BACHA — Direction artistique de référence

> **Document de référence obligatoire** pour toute intégration visuelle ou éditoriale (photographies, carte, galerie,
> témoignages, textes). Il ne propose **aucune nouvelle direction** : il rassemble et précise les choix déjà arrêtés.
> En cas de doute, la fidélité à ce document l'emporte sur toute initiative créative.

## 0. Sources de cette direction

| Source | Contenu repris | Emplacement |
|---|---|---|
| Cahier des charges | § 1 (positionnement), § 2 (direction artistique « luxe marocain contemporain »), § 4.4 (galerie), § 5 (carte), § 6 (photographie) | `01-CAHIER-DES-CHARGES/` |
| Décisions validées (phase 2) | Palette exacte, règles du logo, plafonds de la carte, « patrimoine marocain revisité » | `README.md › Direction artistique`, `src/styles/tokens.css` |
| Planche d'identité officielle | Logo vert et or, ivoire et or, couronne, arche, lettrage romain | `ressources/logo/planche-identite-officielle-reference.jpg` |
| Site réalisé (phases 1 à 4) | Mise en page, motifs, composants, mouvement | `src/` |

**Point à signaler.** Les « photographies d'inspiration » et la liste des « 25 plats et leurs tarifs indicatifs déjà proposés »
évoquées dans vos messages **ne figurent ni dans le dépôt, ni dans les documents transmis au cours de ce projet** (cahier des
charges, planche du logo). Elles n'ont donc pas pu être reprises à l'identique :

- la carte intégrée reprend les **exemples du cahier des charges** (§ 5.3 à 5.6 : zaalouk, taktouka, pastilla, briouates,
  tajines, spécialités fassies, couscous, thé, infusions, jus…) et la complète jusqu'aux 25 propositions, avec des **prix
  indicatifs** signalés comme tels ;
- les photographies suivent les critères écrits ci-dessous (§ 6 du cahier).

Si ces références existent ailleurs (autre conversation, fichier, planche), il suffit de les déposer dans `01-CAHIER-DES-CHARGES/` :
la carte (`src/content/menu.json`) et les photos se remplacent sans toucher au code.

## 1. Positionnement

**« Patrimoine marocain revisité »** : une grande demeure marocaine, prestigieuse et intime, entre héritage traditionnel
et élégance contemporaine.

- Comparable aux maisons gastronomiques et hôtelières de luxe ; **jamais** un site de restaurant classique, **jamais** touristique.
- Luxueux sans être chargé : de l'espace, peu d'éléments, chacun soigné.
- Chaleureux et intimiste : lumière chaude, matières naturelles, accueil.

**À ne pas faire** : design générique ou « gabarit », minimalisme froid sans ornement, imagerie de carte postale (désert,
chameaux, souks bondés, cliché folklorique), couleurs vives, effets tape-à-l'œil.

## 2. Palette (validée — ne pas modifier)

| Couleur | Code | Rôle |
|---|---|---|
| Émeraude | `#123D32` | Fond des sections nobles (en-tête, hero, art de recevoir, appels à réserver), titres sur fond clair |
| Or patiné | `#B99A62` | Filets, ornements, cadres d'arche, étoiles des témoignages, détails ; **jamais de texte sur fond clair** (2,4:1) |
| Sable | `#E9DFCC` | Sections secondaires, grain de tadelakt |
| Ivoire | `#F7F3EA` | Fond principal, cartes |
| Noyer | `#38291F` | Texte courant |

Nuances dérivées pour l'accessibilité uniquement : or clair `#CDB385` (texte doré sur émeraude), or foncé `#6E5730` (texte doré
sur fond clair), noyer adouci `#5E4C3F` (texte secondaire). Aucune autre couleur d'interface.

## 3. Typographie

- **Titres** : Cormorant Garamond (serif, écho au lettrage romain du logo), grands corps, interlignage serré.
- **Texte** : Jost (sans-serif moderne), interlignage généreux (1,7).
- **Arabe** : Noto Kufi Arabic (titres, écho aux inscriptions architecturales), Noto Naskh Arabic (texte) ; mise en page RTL complète.
- **Surtitres** : petites capitales espacées, or foncé ou or clair selon le fond.

## 4. Logo

- Grand format : version **avec couronne**, vert et or sur fond clair.
- Espace réduit : version compacte **sans couronne**.
- Sur émeraude : **ivoire et or**.
- Favicons 16 et 32 px : **arche seule**.
- Jamais agrandi au-delà de sa définition, jamais recoloré, jamais déformé. Le SVG définitif remplacera les découpes actuelles.

## 5. Éléments graphiques

Un seul motif par section, toujours discret :

- **Arche outrepassée** : cadre des photographies (hero, philosophie, plats), en-têtes.
- **Treillis de moucharabieh** : sections émeraude.
- **Grain de tadelakt** : sections sable.
- **Frise de bois sculpté** : séparateurs.
- **Étoile du zellige** : ornements, puces.
- Filets fins en or patiné ; jamais d'ombres lourdes, de dégradés vifs ni de coins très arrondis.

## 6. Photographie

### 6.1 Esprit commun (cahier § 6.1)

Lumière naturelle ou maîtrisée et **chaude** ; contrastes élégants ; couleurs chaleureuses (ocres, cuivres, terres, verts profonds) ;
**textures visibles** ; mise en scène soignée ; profondeur de champ maîtrisée ; **cadrages éditoriaux** (gros plans, plongées,
trois-quarts, espace négatif).

### 6.2 Gastronomie (cahier § 6.2)

- Le plat est une **création gastronomique** : dressage net, textures, ingrédients lisibles.
- Contenants de tradition : **tajines en terre cuite**, plats en cuivre ou en céramique peinte, théières en métal ciselé, verres à thé.
- Fonds : bois sombre, zellige, nappe claire, laiton ; peu d'accessoires.
- À éviter : flash, lumière froide, assiettes en plastique, buffet, vue de stand de rue, nourriture abîmée, mains ou visages,
  texte ou logo incrusté.

### 6.3 Ambiance et intérieurs (cahier § 6.3)

- **Zelliges**, **arches**, **boiseries de cèdre sculptées**, **plâtre ciselé (gebs)**, patios de riad, fontaines,
  lanternes et appliques en laiton, **lumière chaude** du soir ou rasante du jour.
- Tables dressées, détails décoratifs, matières (bois, cuivre, tadelakt, tissages).
- À éviter : foule, personnes identifiables, enseignes et marques, rues touristiques, monuments trop célèbres présentés comme
  le restaurant.

### 6.4 Photographies d'illustration (aperçu)

- Uniquement des photos à **licence vérifiée** (domaine public, CC0, CC BY, CC BY-SA), source et auteur conservés.
- Haute définition (≥ 1600 px), préparées en AVIF, WebP et JPEG ; aucun filtre ni recadrage qui dénature l'image.
- **Jamais présentées comme des photos du restaurant** : mention « Illustration » sur chaque image, bandeau d'aperçu, textes
  alternatifs descriptifs (« Tajine d'agneau aux pruneaux », jamais « notre salle »), crédits publiés dans les mentions légales.
- Production refusée tant qu'une illustration reste en place : elles seront remplacées par les photographies officielles.

## 7. Carte gastronomique

- **25 propositions au plus** : 6 entrées, 10 plats principaux (tajines et spécialités fassies compris), 4 desserts, 5 boissons.
  Aucune catégorie supplémentaire.
- Présentation de **carte de grande table** : catégorie numérotée (01, 02…) en serif, ligne par plat avec nom, filet pointillé
  doré, prix ; description courte et élégante ; ingrédients en italique discret ; vignette ronde-arche de la photo.
- Prix en **dirhams (DH)**, sans décimales ; tant qu'ils ne sont pas validés : astérisque doré et mention
  « Prix indicatifs en dirhams (DH), à confirmer ».
- Plats emblématiques (4) mis en avant sur l'accueil, en grandes arches.

## 8. Galerie

- Sept thèmes du cahier (§ 4.4) : plats, détails culinaires, intérieur, architecture, décoration, ambiance, art de recevoir.
- Compositions **variées** (portrait, paysage, carré) en mosaïque éditoriale ; agrandissement plein écran sur fond émeraude.

## 9. Témoignages

- Section sur fond **sable ou ivoire**, cartes ivoire à filet or, grands guillemets en serif or patiné.
- **Cinq étoiles dessinées** (SVG) en or patiné, sans chiffre ni note moyenne.
- Citation en serif italique ; attribution sobre en petites capitales (type d'occasion, jamais un vrai nom).
- Mention visible : **« Avis fictifs — aperçu de démonstration »** ; aucune donnée structurée d'avis, aucune note Google,
  aucune statistique.

## 10. Mouvement

Apparitions progressives au défilement, arche du hero qui se dessine, fondu des photos, transitions entre pages ; uniquement
`transform` et `opacity` ; tout est coupé avec « réduire les animations ».

## 11. Ton éditorial

Vouvoiement, phrases courtes et précises, vocabulaire du goût et du geste ; aucun superlatif invérifiable (« le meilleur »,
« étoilé »), aucun fait inventé (dates, chef, récompenses, labels).

## 12. Grille de contrôle (à utiliser avant chaque livraison)

1. Palette strictement respectée, or jamais en texte sur fond clair.
2. Typographies et motifs inchangés, un motif par section.
3. Photographies chaudes, texturées, éditoriales ; ni foule, ni cliché touristique, ni lumière froide.
4. Chaque photo d'illustration signalée et créditée.
5. Carte : 25 propositions au plus, présentation de grande table, prix en DH signalés comme indicatifs.
6. Galerie : sept thèmes, compositions variées.
7. Témoignages : étoiles dessinées, mention « Avis fictifs — aperçu de démonstration », aucune note chiffrée.
8. Trois langues complètes, arabe en RTL.
9. Aucune information inventée présentée comme officielle.
