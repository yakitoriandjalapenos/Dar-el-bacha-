# Service des demandes de réservation

Service Node.js sans dépendance qui reçoit les **demandes** de réservation du formulaire, les vérifie et les transmet au
restaurant par e-mail. Une demande n'est **jamais** une réservation confirmée : elle reste en attente de la réponse du
restaurant, et le site l'indique toujours ainsi.

## Architecture

| Fichier | Rôle |
|---|---|
| `reservation/rules.mjs` | Validation côté serveur : champs obligatoires, formats, date au fuseau de Casablanca, horizon de réservation, créneaux de 15 minutes, consentement, horaires et fermetures (si fournis dans `site.json › openingHours`), anti-robot (piège invisible, saisie trop rapide). Seul ce contrôle fait foi ; celui du navigateur sert au confort. |
| `reservation/rate-limit.mjs` | Limite d'envois par connexion (5 par 10 minutes par défaut). L'adresse IP n'est conservée qu'en empreinte salée, en mémoire, oubliée à la fin de la fenêtre. |
| `reservation/mailer.mjs` | Envoi de l'e-mail au restaurant : `simulation` (par défaut), `resend` ou `brevo`. |
| `reservation/handler.mjs` | Traitement d'une requête, indépendant de l'hébergeur : `handle({ method, headers, body, ip })` → `{ status, headers, body }`. |
| `node-adapter.mjs` | Branchement sur un serveur Node.js (`http`). |
| `index.mjs` | Service configuré par les variables d'environnement (utilisé par `npm run dev` et `npm run serve`). |

## Réponses

| Résultat | Avec JavaScript (JSON) | Sans JavaScript |
|---|---|---|
| Demande transmise au restaurant, **en attente de confirmation** | `202 { "status": "pending" }` | redirection 303 vers `/<langue>/<réservation>/statut/pending/` |
| Mode test : **rien n'a été transmis** | `200 { "status": "simulated" }` | `…/statut/simulated/` |
| Champs invalides | `422 { "error": "invalid", "fields": { "date": "closedDay" } }` | `…/statut/invalid/` |
| Trop de demandes | `429 { "error": "rate-limited", "retryAfter": 600 }` (+ en-tête `Retry-After`) | `…/statut/rate-limited/` |
| Robot détecté, origine étrangère, requête mal formée, échec de l'e-mail | `400`, `403`, `413`, `502` ou `500` | `…/statut/error/` |

Les pages de résultat sont produites par le build dans les trois langues et ne sont pas indexées.

## Configuration (variables d'environnement, jamais dans le code)

| Variable | Rôle | Défaut |
|---|---|---|
| `MAIL_PROVIDER` | `simulation`, `resend` ou `brevo` | `simulation` |
| `MAIL_API_KEY` | Clé du service d'e-mail (**secret**) | — |
| `MAIL_TO` | Adresse du restaurant qui reçoit les demandes (jamais publiée) | — |
| `MAIL_FROM` | Adresse d'expédition vérifiée auprès du service | — |
| `ALLOWED_ORIGINS` | Origines autorisées, séparées par des virgules | `siteUrl` de `site.json` et les adresses locales |
| `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MIN` | Limite d'envois par connexion | 5 par 10 minutes |
| `RESERVATION_MAX_DAYS` | Horizon de réservation (jours), à définir aussi au build | 180 |

Avec un service d'e-mail réel, la configuration est vérifiée au démarrage : une clé ou une adresse manquante arrête le
service plutôt que de perdre des demandes. Les adaptateurs `resend` et `brevo` suivent la documentation publique de ces
services ; ils **n'ont pas encore été testés avec un vrai compte** et devront l'être lors de la mise en place.

## Utilisation locale

`npm run dev` relie le formulaire du site local au service, en **mode simulation** : la demande est vérifiée, rien n'est
envoyé, et le site affiche « Mode test ». Pour essayer un vrai envoi en local (compte de test) :

```bash
MAIL_PROVIDER=resend MAIL_API_KEY=… MAIL_TO=… MAIL_FROM=… npm run dev
```

## Mise en production (selon l'hébergeur retenu)

1. Héberger le service au même domaine que le site (`/api/reservation`) : aucune autorisation inter-domaines n'est
   alors nécessaire, et le contrôle d'origine s'applique.
2. Serveur Node.js : `createReservationService(process.env).node` se branche sur `http.createServer`.
   Plateforme « serverless » (Cloudflare Pages Functions, Netlify Functions…) : un adaptateur de quelques lignes
   convertit la requête de la plateforme en `{ method, headers, body, ip }` et renvoie `{ status, headers, body }` ;
   la limite d'envois doit alors utiliser le stockage de la plateforme (même interface `hit(cle)`).
3. Renseigner `site.json › reservation.formEndpoint` (`/api/reservation`), puis compiler avec `npm run build:prod`.
4. Configurer l'envoi d'e-mails du domaine (SPF, DKIM, DMARC) pour que les demandes n'arrivent pas en courrier indésirable.

## Journal

Une ligne JSON par demande : heure, identifiant de requête, résultat, code HTTP et, le cas échéant, les **noms** des
champs refusés ou la cause technique. Jamais de nom, de coordonnées, de message ni d'adresse IP (test automatique).

## Sauvegarde et récupération

- **Aucune demande n'est stockée par le site.** L'e-mail reçu par le restaurant est la seule trace : utiliser une boîte
  dédiée aux réservations, sauvegardée et archivée, avec une durée de conservation conforme à la politique de
  confidentialité (`site.json › legal.dataRetention`).
- **En cas d'échec d'envoi** (service d'e-mail indisponible), le visiteur reçoit un message d'erreur clair qui l'invite à
  utiliser le téléphone ou WhatsApp : aucune demande n'est perdue silencieusement. Surveiller les lignes du journal
  dont le résultat est `error` (`delivery-failed`).
- **Configuration** : conserver les variables d'environnement (dont la clé du service d'e-mail) dans le gestionnaire de
  secrets de l'hébergeur ; le code est entièrement dans le dépôt Git. Restaurer le service consiste à redéployer une
  version du dépôt et à reconfigurer ces variables.
- **Test régulier** : envoyer une demande de test après chaque déploiement et vérifier sa réception.
