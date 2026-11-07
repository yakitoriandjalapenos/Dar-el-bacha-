# Informations et fichiers à fournir — DAR EL BACHA

Document généré par `npm run contenus` à partir de l'état réel du projet. **0 élément(s) fourni(s) sur 56.**

Aucune de ces informations n'est inventée sur le site : tant qu'un élément manque, le site affiche un repère `[À CONFIRMER]` ou un emplacement provisoire, et `npm run build:prod` refuse la mise en production.

## Le restaurant

| | Élément | Où le renseigner | Format |
|---|---|---|---|
| ❌ | Adresse complète (rue, quartier, code postal) | `site.json › address` | texte |
| ❌ | Coordonnées GPS | `site.json › geo` | latitude et longitude (nombres) |
| ❌ | Téléphone | `site.json › phone` | format international, ex. +212 5… |
| ❌ | E-mail public | `site.json › email` | adresse e-mail |
| ❌ | Numéro WhatsApp officiel | `site.json › whatsapp.number` | chiffres uniquement, ex. 2126… |
| ❌ | Horaires d'ouverture détaillés et jours de fermeture | `site.json › openingHours` | plages par jour + fermetures exceptionnelles |
| ❌ | Lien Google Maps / fiche Google Business | `site.json › googleMapsUrl` | adresse https:// |
| ❌ | Instagram | `site.json › social.instagram` | adresse https:// |
| ❌ | Facebook | `site.json › social.facebook` | adresse https:// |
| ❌ | Tripadvisor | `site.json › social.tripadvisor` | adresse https:// (facultatif) |
| ❌ | Gamme de prix indicative | `site.json › priceRange` | ex. « MAD 400–700 par personne » |
| ❌ | Domaine du site | `site.json › siteUrl` | https://www.… |

## Textes

| | Élément | Où le renseigner | Format |
|---|---|---|---|
| ❌ | Présentation et histoire du restaurant (FR, EN, AR) | `site.json › story` | { fr, en, ar } |
| ❌ | Relecture et validation des textes du site (FR, EN, AR, dont relecture arabe native) | `src/i18n/fr.json, en.json, ar.json` | validation écrite |
| ❌ | Graphie officielle du nom dans les textes (« DAR EL BACHA » ou « Dar el Bacha ») | `src/i18n/*.json` | décision |

## La carte (actuellement 5/25 propositions : entrees 4/6, plats 0/10, desserts 0/4, boissons 1/5)

| | Élément | Où le renseigner | Format |
|---|---|---|---|
| ❌ | Liste définitive des propositions (25 au plus : 6 entrées, 10 plats, 4 desserts, 5 boissons) | `menu.json › categories` | validée par le restaurant |
| ❌ | Noms en français, anglais et arabe | `menu.json › name` | { fr, en, ar } |
| ❌ | Descriptions en français, anglais et arabe | `menu.json › description` | { fr, en, ar } |
| ❌ | Ingrédients ou particularités (si souhaités) | `menu.json › ingredients` | { fr, en, ar } |
| ❌ | Prix en MAD | `menu.json › price` | nombre |
| ❌ | Plats emblématiques (4 au plus) | `menu.json › signature` | true sur les plats choisis |
| ❌ | Photographies des plats | `menu.json › image + ressources/photos/gastronomie/` | originaux HD |

## Réservation

| | Élément | Où le renseigner | Format |
|---|---|---|---|
| ❌ | Conditions de réservation et d'annulation (FR, EN, AR) | `site.json › reservation.conditions` | { fr, en, ar } |
| ❌ | Adresse e-mail qui reçoit les demandes | `configuration du service (variable MAIL_TO)` | adresse e-mail — jamais publiée |
| ❌ | Service d'envoi d'e-mails (compte et clé) | `configuration du service (MAIL_PROVIDER, MAIL_API_KEY)` | Resend, Brevo… — secret côté serveur |
| ❌ | Adresse du service de réception une fois déployé | `site.json › reservation.formEndpoint` | /api/reservation ou https://… |
| ❌ | Système de réservation externe (facultatif) | `site.json › reservation.bookingSystem` | uniquement s'il gère réellement disponibilités et confirmations |

## Informations juridiques (à faire valider par un juriste)

| | Élément | Où le renseigner | Format |
|---|---|---|---|
| ❌ | Raison sociale | `site.json › legal.companyName` | texte |
| ❌ | Forme juridique | `site.json › legal.legalForm` | texte |
| ❌ | Capital social | `site.json › legal.shareCapital` | texte |
| ❌ | Siège social | `site.json › legal.registeredOffice` | texte |
| ❌ | Registre du commerce (RC) | `site.json › legal.rc` | texte |
| ❌ | Identifiant commun de l'entreprise (ICE) | `site.json › legal.ice` | texte |
| ❌ | Identifiant fiscal (IF) | `site.json › legal.identifiantFiscal` | texte |
| ❌ | Directeur de la publication | `site.json › legal.publicationDirector` | texte |
| ❌ | Responsable du traitement des données | `site.json › legal.dataController` | texte |
| ❌ | Contact pour les demandes relatives aux données personnelles | `site.json › legal.dataContactEmail` | adresse e-mail |
| ❌ | Référence de la déclaration ou de l'autorisation CNDP (loi 09-08) | `site.json › legal.cndpReference` | texte |
| ❌ | Durée de conservation des demandes de réservation | `site.json › legal.dataRetention` | { fr, en, ar } |
| ❌ | Localisation des données et transferts éventuels hors du Maroc | `site.json › legal.dataTransfers` | { fr, en, ar } |
| ❌ | Hébergeur du site (nom, adresse) | `site.json › legal.hosting` | texte |
| ❌ | Prestataire d'envoi d'e-mails | `site.json › legal.emailProvider` | texte |
| ❌ | Validation juridique des pages Mentions légales et Confidentialité | `site.json › legal.validated` | true après validation |

## Identité visuelle et photographies

| | Élément | Où le renseigner | Format |
|---|---|---|---|
| ❌ | Logo SVG — vert et or avec couronne | `src/assets/img/logo/logo-vert-or-couronne.svg` | SVG |
| ❌ | Logo SVG — vert et or sans couronne | `src/assets/img/logo/logo-vert-or.svg` | SVG |
| ❌ | Logo SVG — ivoire et or (fond émeraude) | `src/assets/img/logo/logo-ivoire-or.svg` | SVG |
| ❌ | Logo SVG — ivoire et or avec couronne (absent de la planche) | `ressources/logo/` | SVG |
| ❌ | Logo monochrome | `ressources/logo/` | SVG |
| ❌ | Favicon simplifié (arche seule) et icône d'application 1024 px | `src/static/favicon.svg, ressources/icones/` | SVG + PNG 1024 |
| ❌ | Confirmation des codes couleur du logo | `ressources/logo/` | confirmation du graphiste |
| ❌ | Photographies du restaurant et de la galerie (0/19 emplacements remplis) | `ressources/photos/ puis media.json, gallery.json` | originaux HD + droits d'utilisation |
| ❌ | Textes alternatifs des photos (FR, EN, AR) | `media.json, gallery.json › alt` | { fr, en, ar } |

## Décisions et accès

| | Élément | Où le renseigner | Format |
|---|---|---|---|
| ❌ | Hébergeur | `—` | décision (après avis juridique sur la localisation des données) |
| ❌ | Accès au registraire du domaine (DNS) | `—` | accès |
| ❌ | Mesure d'audience (aucune, ou sans cookies) | `—` | décision |
| ❌ | Ajout de l'outil de préparation des photos (sharp) | `package.json` | décision |
