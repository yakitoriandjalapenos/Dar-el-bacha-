@echo off
chcp 65001 >nul
title Aperçu DAR EL BACHA
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js n'est pas installé sur cet ordinateur.
  echo  1. Ouvrez https://nodejs.org et installez la version LTS.
  echo  2. Relancez ensuite ce fichier.
  echo.
  pause
  exit /b 1
)
echo.
echo  Aperçu de DAR EL BACHA (local, rien n'est publié sur Internet)
echo  Le site va s'ouvrir dans votre navigateur : http://localhost:4321/fr/
echo  Pour arrêter l'aperçu : fermez cette fenêtre.
echo.
start "" /min cmd /c "timeout /t 6 /nobreak >nul && start http://localhost:4321/fr/"
node scripts\dev.mjs
echo.
pause
