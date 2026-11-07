# Polices

Le build génère automatiquement les `@font-face` à partir de `fonts.json` :
un fichier déclaré mais absent est simplement ignoré (le site retombe sur la police de secours).
Chaque police est découpée par alphabet (`unicodeRange`) : une page française ne télécharge jamais
les polices arabes, et inversement.

## Polices retenues (phase 2) — licence SIL Open Font License 1.1

| Rôle | Famille CSS | Police | Fichier | Poids |
|---|---|---|---|---|
| Titres (latin) | `Dar Display` | Cormorant Garamond 500, droit et italique | `cormorant-garamond-latin-500-*.woff2` | 23 ko chacun |
| Texte (latin) | `Dar Text` | Jost 400 et 500 | `jost-latin-*.woff2` | 9 et 10 ko |
| Titres (arabe) | `Dar Display Arabic` | Noto Kufi Arabic 500 | `noto-kufi-arabic-arabic-500-normal.woff2` | 47 ko |
| Texte (arabe) | `Dar Text Arabic` | Noto Naskh Arabic 400 | `noto-naskh-arabic-arabic-400-normal.woff2` | 53 ko |

Choix : les capitales classiques de Cormorant Garamond font écho au lettrage romain du logo ;
Jost apporte une lecture contemporaine. En arabe, le coufique (titres) rappelle les inscriptions
architecturales des demeures marocaines, le naskh (texte) assure une lecture confortable.

Source : paquets officiels Fontsource 5.3.0 (fichiers WOFF2 et licences inchangés). Licences : `licences/`.
`preload` indique les langues dont les pages préchargent la police (uniquement la police des titres,
qui porte le premier grand texte affiché).

`lora-latin.woff` : police provisoire de la phase 1, conservée mais plus déclarée (non publiée).

## Pour changer de police

1. Déposer le fichier (`.woff2`, sous-ensemble par alphabet) dans ce dossier et sa licence dans `licences/`.
2. Mettre à jour `fonts.json` (fichier, plage de graisses, `unicodeRange`, `preload`).
3. Les noms de familles CSS (`Dar Display`, `Dar Text`, `Dar Display Arabic`, `Dar Text Arabic`) ne changent pas :
   aucune autre modification n'est nécessaire.
