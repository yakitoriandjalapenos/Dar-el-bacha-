#!/bin/bash
# Aperçu local de DAR EL BACHA (rien n'est publié sur Internet). Double-cliquer sur ce fichier (Mac).
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo
  echo "  Node.js n'est pas installé sur cet ordinateur."
  echo "  1. Ouvrez https://nodejs.org et installez la version LTS."
  echo "  2. Relancez ensuite ce fichier."
  echo
  read -r -p "  Appuyez sur Entrée pour fermer. " _
  exit 1
fi
echo
echo "  Aperçu de DAR EL BACHA (local, rien n'est publié sur Internet)"
echo "  Le site va s'ouvrir dans votre navigateur : http://localhost:4321/fr/"
echo "  Pour arrêter l'aperçu : Ctrl+C ou fermez cette fenêtre."
echo
( sleep 6; open "http://localhost:4321/fr/" 2>/dev/null || xdg-open "http://localhost:4321/fr/" 2>/dev/null ) &
node scripts/dev.mjs
