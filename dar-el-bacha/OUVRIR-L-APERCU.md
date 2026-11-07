# Ouvrir l'aperçu du site DAR EL BACHA

L'aperçu fonctionne **uniquement sur votre ordinateur** : rien n'est publié sur Internet, aucun domaine ni hébergement n'est
nécessaire. Le formulaire de réservation fonctionne en **mode test** (rien n'est envoyé au restaurant).

## Méthode la plus simple : la version hors ligne (rien à installer)

1. Télécharger le fichier **`DAR-EL-BACHA-apercu.zip`** (environ 26 Mo) envoyé dans la conversation.
2. Le décompresser (double-clic sur le fichier ZIP ; sous Windows : clic droit → « Extraire tout »).
3. Ouvrir le dossier **`DAR-EL-BACHA-apercu`** et double-cliquer sur **`OUVRIR-LE-SITE.html`**.

Le site s'ouvre dans votre navigateur habituel, sans Internet, sans logiciel à installer, sans serveur. Seules différences avec
l'aperçu complet ci-dessous : le formulaire de réservation n'envoie rien (même en mode test) et le plan Google Maps comme le
bouton WhatsApp demandent une connexion Internet. Pour régénérer ce ZIP après une modification : `npm run apercu:hors-ligne`
(il est créé dans `apercu-hors-ligne/`).

## Aperçu complet (formulaire en mode test, rechargement automatique)

### Une seule fois : installer Node.js

1. Ouvrir **https://nodejs.org** et télécharger la version **LTS** (gratuite).
2. L'installer comme n'importe quel logiciel (laisser les options par défaut).

### Récupérer le projet

1. Ouvrir dans le navigateur (connecté à votre compte GitHub) :
   **https://github.com/yakitoriandjalapenos/Dar-el-bacha-/archive/refs/heads/claude/nifty-ritchie-ago1e5.zip**
   (environ 220 Mo, à cause des photos optimisées).
2. Décompresser le fichier ZIP téléchargé (double-clic).
3. Ouvrir le dossier obtenu, puis le sous-dossier **`dar-el-bacha`**.

### Lancer l'aperçu (à chaque fois)

| Ordinateur | Action |
|---|---|
| **Windows** | Double-cliquer sur **`LANCER-APERCU-WINDOWS.bat`** |
| **Mac** | Clic droit sur **`LANCER-APERCU-MAC.command`** → **Ouvrir** (la première fois, macOS demande de confirmer) |

Une fenêtre noire s'ouvre (c'est le serveur d'aperçu) et, après quelques secondes, le site s'affiche dans votre navigateur à
l'adresse :

### http://localhost:4321/fr/

- Anglais : http://localhost:4321/en/ — Arabe : http://localhost:4321/ar/ (ou le sélecteur de langue en haut de page).
- **Garder la fenêtre noire ouverte** tant que vous consultez le site. Pour arrêter l'aperçu : fermer cette fenêtre.
- Pour relancer : double-cliquer de nouveau sur le même fichier.

## Si quelque chose ne fonctionne pas

| Situation | Solution |
|---|---|
| « Node.js n'est pas installé » | Installer Node.js (voir plus haut), puis relancer |
| La page ne s'ouvre pas toute seule | Ouvrir vous-même **http://localhost:4321/fr/** dans le navigateur |
| « Le port 4321 est déjà utilisé » | Un aperçu est déjà lancé : ouvrir simplement l'adresse ci-dessus, ou fermer l'autre fenêtre noire |
| Mac : le fichier ne s'ouvre pas en double-cliquant | Ouvrir l'application **Terminal**, taper `cd ` (avec une espace), glisser le dossier `dar-el-bacha` dans la fenêtre, appuyer sur Entrée, puis taper `npm run dev` et Entrée |
| Windows : l'ordinateur affiche un avertissement de sécurité | Cliquer sur « Informations complémentaires » puis « Exécuter quand même » (le fichier lance seulement l'aperçu local) |

Méthode manuelle (tous systèmes) : dans un terminal ouvert dans le dossier `dar-el-bacha`, taper `npm run dev`.

## Ce que vous verrez

Le site complet en trois langues, avec la carte, la galerie, les témoignages et le formulaire. Un bandeau en haut de chaque
page rappelle que c'est un **aperçu de démonstration** : photographies d'illustration (banques d'images libres, pas le
restaurant), avis fictifs, prix indicatifs et horaires proposés, en attente de votre validation. La liste de tout ce qui reste à
fournir ou à valider est dans `INFORMATIONS-A-FOURNIR.md`.
