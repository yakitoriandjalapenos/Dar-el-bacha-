#!/usr/bin/env node
/*
  Liste centralisée des informations et fichiers à fournir par le restaurant : npm run contenus

  Lit l'état réel des contenus (src/content/*.json, logo, polices, photos) et régénère
  INFORMATIONS-A-FOURNIR.md à la racine du projet : chaque élément y est marqué
  ✅ fourni ou ❌ à fournir, avec l'endroit où il se renseigne et le format attendu.
  Rien n'est inventé : la commande se contente de constater ce qui est présent ou absent.
*/
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MENU_CEILINGS } from './lib/validate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = async (p) => JSON.parse(await readFile(path.join(ROOT, p), 'utf8'));
const site = await read('src/content/site.json');
const menu = await read('src/content/menu.json');
const media = await read('src/content/media.json');
const gallery = await read('src/content/gallery.json');
const logoDir = path.join(ROOT, 'src/assets/img/logo');
const logoFiles = existsSync(logoDir) ? await readdir(logoDir) : [];

const has = (v) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length);
const mark = (ok) => (ok ? '✅' : '❌');
const rows = [];
const section = (title, items) => rows.push({ title, items });
const item = (label, ok, where, format) => ({ label, ok: Boolean(ok), where, format });

section('Le restaurant', [
  item('Adresse complète (rue, quartier, code postal)', site.address?.street && site.address?.postalCode, 'site.json › address', 'texte'),
  item('Coordonnées GPS', site.geo?.latitude != null && site.geo?.longitude != null, 'site.json › geo', 'latitude et longitude (nombres)'),
  item('Téléphone', site.phone, 'site.json › phone', 'format international, ex. +212 5…'),
  item('E-mail public', site.email, 'site.json › email', 'adresse e-mail'),
  item('Numéro WhatsApp officiel', site.whatsapp?.number, 'site.json › whatsapp.number', 'chiffres uniquement, ex. 2126…'),
  item('Horaires d\'ouverture détaillés et jours de fermeture', site.openingHours || site.hours, 'site.json › openingHours', 'plages par jour + fermetures exceptionnelles'),
  item('Lien Google Maps / fiche Google Business', site.googleMapsUrl, 'site.json › googleMapsUrl', 'adresse https://'),
  item('Instagram', site.social?.instagram, 'site.json › social.instagram', 'adresse https://'),
  item('Facebook', site.social?.facebook, 'site.json › social.facebook', 'adresse https://'),
  item('Tripadvisor', site.social?.tripadvisor, 'site.json › social.tripadvisor', 'adresse https:// (facultatif)'),
  item('Gamme de prix indicative', site.priceRange, 'site.json › priceRange', 'ex. « MAD 400–700 par personne »'),
  item('Domaine du site', site.siteUrl, 'site.json › siteUrl', 'https://www.…'),
]);

section('Textes', [
  item('Présentation et histoire du restaurant (FR, EN, AR)', site.story, 'site.json › story', '{ fr, en, ar }'),
  item('Relecture et validation des textes du site (FR, EN, AR, dont relecture arabe native)', false, 'src/i18n/fr.json, en.json, ar.json', 'validation écrite'),
  item('Graphie officielle du nom dans les textes (« DAR EL BACHA » ou « Dar el Bacha »)', false, 'src/i18n/*.json', 'décision'),
]);

const items = menu.categories.flatMap((c) => c.items.map((i) => ({ ...i, cat: c.id })));
const counts = menu.categories.map((c) => `${c.id} ${c.items.length}/${MENU_CEILINGS.categories[c.id] ?? '?'}`).join(', ');
section(`La carte (actuellement ${items.length}/${MENU_CEILINGS.total} propositions : ${counts})`, [
  item('Liste définitive des propositions (25 au plus : 6 entrées, 10 plats, 4 desserts, 5 boissons)', items.length && items.every((i) => i.status !== 'a-valider'), 'menu.json › categories', 'validée par le restaurant'),
  // Seuls comptent les plats validés : un nom provisoire (plat « à valider ») n'est pas un nom fourni
  item('Noms en français, anglais et arabe', items.length && items.every((i) => i.status !== 'a-valider' && i.name?.fr && i.name?.en && i.name?.ar), 'menu.json › name', '{ fr, en, ar }'),
  item('Descriptions en français, anglais et arabe', items.length && items.every((i) => i.description), 'menu.json › description', '{ fr, en, ar }'),
  item('Ingrédients ou particularités (si souhaités)', items.some((i) => i.ingredients), 'menu.json › ingredients', '{ fr, en, ar }'),
  item('Prix en MAD', items.length && items.every((i) => i.price != null), 'menu.json › price', 'nombre'),
  item('Plats emblématiques (4 au plus)', items.some((i) => i.signature), 'menu.json › signature', 'true sur les plats choisis'),
  item('Photographies des plats', items.some((i) => i.image), 'menu.json › image + ressources/photos/gastronomie/', 'originaux HD'),
]);

section('Réservation', [
  item('Conditions de réservation et d\'annulation (FR, EN, AR)', site.reservation?.conditions, 'site.json › reservation.conditions', '{ fr, en, ar }'),
  item('Adresse e-mail qui reçoit les demandes', false, 'configuration du service (variable MAIL_TO)', 'adresse e-mail — jamais publiée'),
  item('Service d\'envoi d\'e-mails (compte et clé)', false, 'configuration du service (MAIL_PROVIDER, MAIL_API_KEY)', 'Resend, Brevo… — secret côté serveur'),
  item('Adresse du service de réception une fois déployé', site.reservation?.formEndpoint, 'site.json › reservation.formEndpoint', '/api/reservation ou https://…'),
  item('Système de réservation externe (facultatif)', site.reservation?.bookingSystem, 'site.json › reservation.bookingSystem', 'uniquement s\'il gère réellement disponibilités et confirmations'),
]);

const legal = site.legal || {};
const L = (k, label, format = 'texte') => item(label, has(legal[k]), `site.json › legal.${k}`, format);
section('Informations juridiques (à faire valider par un juriste)', [
  L('companyName', 'Raison sociale'),
  L('legalForm', 'Forme juridique'),
  L('shareCapital', 'Capital social'),
  L('registeredOffice', 'Siège social'),
  L('rc', 'Registre du commerce (RC)'),
  L('ice', 'Identifiant commun de l\'entreprise (ICE)'),
  L('identifiantFiscal', 'Identifiant fiscal (IF)'),
  L('publicationDirector', 'Directeur de la publication'),
  L('dataController', 'Responsable du traitement des données'),
  L('dataContactEmail', 'Contact pour les demandes relatives aux données personnelles', 'adresse e-mail'),
  L('cndpReference', 'Référence de la déclaration ou de l\'autorisation CNDP (loi 09-08)'),
  L('dataRetention', 'Durée de conservation des demandes de réservation', '{ fr, en, ar }'),
  L('dataTransfers', 'Localisation des données et transferts éventuels hors du Maroc', '{ fr, en, ar }'),
  L('hosting', 'Hébergeur du site (nom, adresse)'),
  L('emailProvider', 'Prestataire d\'envoi d\'e-mails'),
  L('photoCredits', 'Crédits photographiques'),
  item('Validation juridique des pages Mentions légales et Confidentialité', legal.validated === true, 'site.json › legal.validated', 'true après validation'),
]);

const slots = [];
const collect = (v) => { if (Array.isArray(v)) v.forEach(collect); else if (v && typeof v === 'object') { if ('image' in v) slots.push(v); Object.entries(v).forEach(([k, x]) => { if (!k.startsWith('_') && k !== 'image' && k !== 'alt') collect(x); }); } };
collect(media); collect(gallery.items);
const filled = slots.filter((s) => s.image).length;
section('Identité visuelle et photographies', [
  item('Logo SVG — vert et or avec couronne', logoFiles.includes('logo-vert-or-couronne.svg'), 'src/assets/img/logo/logo-vert-or-couronne.svg', 'SVG'),
  item('Logo SVG — vert et or sans couronne', logoFiles.includes('logo-vert-or.svg'), 'src/assets/img/logo/logo-vert-or.svg', 'SVG'),
  item('Logo SVG — ivoire et or (fond émeraude)', logoFiles.includes('logo-ivoire-or.svg'), 'src/assets/img/logo/logo-ivoire-or.svg', 'SVG'),
  item('Logo SVG — ivoire et or avec couronne (absent de la planche)', logoFiles.includes('logo-ivoire-or-couronne.svg'), 'ressources/logo/', 'SVG'),
  item('Logo monochrome', false, 'ressources/logo/', 'SVG'),
  item('Favicon simplifié (arche seule) et icône d\'application 1024 px', existsSync(path.join(ROOT, 'src/static/favicon.svg')), 'src/static/favicon.svg, ressources/icones/', 'SVG + PNG 1024'),
  item('Confirmation des codes couleur du logo', false, 'ressources/logo/', 'confirmation du graphiste'),
  item(`Photographies du restaurant et de la galerie (${filled}/${slots.length} emplacements remplis)`, filled === slots.length, 'ressources/photos/ puis media.json, gallery.json', 'originaux HD + droits d\'utilisation'),
  item('Textes alternatifs des photos (FR, EN, AR)', filled > 0 && slots.every((s) => !s.image || s.alt), 'media.json, gallery.json › alt', '{ fr, en, ar }'),
]);

section('Décisions et accès', [
  item('Hébergeur', false, '—', 'décision (après avis juridique sur la localisation des données)'),
  item('Accès au registraire du domaine (DNS)', false, '—', 'accès'),
  item('Mesure d\'audience (aucune, ou sans cookies)', false, '—', 'décision'),
  item('Ajout de l\'outil de préparation des photos (sharp)', false, 'package.json', 'décision'),
]);

const total = rows.flatMap((r) => r.items);
const done = total.filter((i) => i.ok).length;
const md = [
  '# Informations et fichiers à fournir — DAR EL BACHA',
  '',
  `Document généré par \`npm run contenus\` à partir de l'état réel du projet. **${done} élément(s) fourni(s) sur ${total.length}.**`,
  '',
  'Aucune de ces informations n\'est inventée sur le site : tant qu\'un élément manque, le site affiche un repère `[À CONFIRMER]` ou un emplacement provisoire, et `npm run build:prod` refuse la mise en production.',
  '',
  ...rows.flatMap((r) => [
    `## ${r.title}`,
    '',
    '| | Élément | Où le renseigner | Format |',
    '|---|---|---|---|',
    ...r.items.map((i) => `| ${mark(i.ok)} | ${i.label} | \`${i.where}\` | ${i.format} |`),
    '',
  ]),
].join('\n');

await writeFile(path.join(ROOT, 'INFORMATIONS-A-FOURNIR.md'), md);
console.log(`✓ INFORMATIONS-A-FOURNIR.md : ${done}/${total.length} éléments fournis`);
for (const r of rows) {
  const missing = r.items.filter((i) => !i.ok);
  if (missing.length) console.log(`  ${r.title} : ${missing.length} à fournir`);
}
