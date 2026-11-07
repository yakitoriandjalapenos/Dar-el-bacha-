# Polices

Le build génère automatiquement les `@font-face` à partir de `fonts.json` :
un fichier déclaré mais absent est simplement ignoré (le site retombe sur la police de secours).

## Police de titres provisoire

`lora-latin.woff` — **Lora** (Cyreal), licence SIL Open Font License 1.1, sous-ensemble latin.
Utilisée en attendant la police de titres définitive.

## Pour changer de police

1. Déposer le fichier (de préférence `.woff2`, sous-ensemble latin) dans ce dossier.
2. Mettre à jour `fonts.json` (fichier, plage de graisses).
3. Le nom de famille CSS (`Dar Display`) ne change pas : aucune autre modification n'est nécessaire.

Pour l'arabe, déclarer une police sous la famille `Dar Display Arabic` (titres) et/ou
`Dar Text Arabic` (texte courant), par exemple Noto Naskh Arabic ou Amiri (licence OFL).
Sans fichier, le site utilise les polices arabes du système (Geeza Pro, Segoe UI, Noto…).
