#!/usr/bin/env node
/*
  Tests dans un vrai navigateur (Chromium) sur le site compilé dans dist/.
  Usage : npm run build && npm run test:browser

  Nécessite Playwright, qui n'est PAS une dépendance du projet (le site n'en a pas besoin) :
  s'il n'est pas disponible sur la machine, installer-le à part :
    npm install --no-save playwright && npx playwright install chromium

  Vérifie : 19 pages × 7 largeurs (débordement horizontal, erreurs JavaScript, ressources manquantes),
  accès à la réservation à toutes les tailles, menu mobile et clavier, RTL arabe, états du formulaire,
  repli sans JavaScript (script absent ou en erreur), apparitions progressives, liens externes,
  parcours de réservation ; sur une copie de test (données de test) : agrandissement de la galerie,
  plan et module de réservation chargés à la demande.
*/
import { createRequire } from 'node:module';
import { readdirSync, statSync, mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from '../scripts/lib/static-server.mjs';
import { LANGS, PAGES, DEFAULT_LANG, pathFor } from '../src/routes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  console.error('✗ Playwright introuvable. Installer-le à part : npm install --no-save playwright && npx playwright install chromium');
  process.exit(2);
}

const WIDTHS = [320, 360, 390, 768, 1024, 1440, 1920];
const URLS = [...LANGS.flatMap((l) => PAGES.map((p) => pathFor(p.id, l.code))), '/404.html'];

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok: Boolean(ok), detail });

const server = createStaticServer({ root: DIST, home: pathFor('home', DEFAULT_LANG) });
await new Promise((r) => server.listen(0, r));
const BASE = `http://localhost:${server.address().port}`;
const browser = await chromium.launch();

try {
  /* ---------- 1. Toutes les pages, toutes les largeurs ---------- */
  const external = new Set();
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 860 } });
    const page = await ctx.newPage();
    const problems = [];
    page.on('pageerror', (e) => problems.push(`erreur JS ${page.url()} : ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') problems.push(`console ${page.url()} : ${m.text()}`); });
    page.on('response', (r) => { if (r.status() >= 400 && !r.url().endsWith('/404.html')) problems.push(`HTTP ${r.status()} ${r.url()}`); });
    page.on('requestfailed', (r) => problems.push(`échec ${r.url()}`));
    let overflow = [];
    let access = [];
    for (const u of URLS) {
      await page.goto(BASE + u, { waitUntil: 'load' });
      const r = await page.evaluate(() => {
        const vis = (el) => { if (!el) return false; const b = el.getBoundingClientRect(); const s = getComputedStyle(el); return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && b.top < innerHeight && b.bottom > 0; };
        const reservationLinks = [...document.querySelectorAll('.site-header__tools .btn, .booking-bar .btn')];
        return {
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          jsOk: document.documentElement.classList.contains('js-ok'),
          reserveVisible: reservationLinks.some(vis),
          isReservation: !!document.getElementById('reservation-form'),
          external: [...document.querySelectorAll('a[href^="http"]')].map((a) => a.href),
        };
      });
      if (r.overflow > 0) overflow.push(`${u} (+${r.overflow}px)`);
      if (!r.jsOk) problems.push(`${u} : script principal non exécuté`);
      if (!r.isReservation && !r.reserveVisible) access.push(u);
      r.external.forEach((x) => external.add(x));
    }
    check(`${width}px : aucun débordement horizontal (${URLS.length} pages)`, !overflow.length, overflow.join(', '));
    check(`${width}px : aucune erreur JavaScript ni ressource manquante`, !problems.length, problems.slice(0, 5).join('\n'));
    check(`${width}px : bouton de réservation visible sans défiler`, !access.length, access.join(', '));
    await ctx.close();
  }
  check('Liens externes bien formés (https)', [...external].every((u) => u.startsWith('https://')), [...external].join(', ') || 'aucun lien externe configuré pour le moment');

  /* ---------- 2. Barre de réservation mobile : ne masque pas le pied de page ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/fr/galerie/`);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const r = await page.evaluate(() => {
      const bar = document.querySelector('.booking-bar').getBoundingClientRect();
      const last = document.querySelector('.site-footer__base').getBoundingClientRect();
      return { overlap: bar.bottom > last.top && bar.top < last.bottom };
    });
    check('Mobile : en bas de page, la barre de réservation ne recouvre pas le pied de page', !r.overlap);
    await page.goto(`${BASE}/fr/reservation/`);
    check('Mobile : pas de barre de réservation sur la page Réservation', (await page.locator('.booking-bar').count()) === 0);
    await ctx.close();
  }

  /* ---------- 3. Menu mobile et clavier ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/fr/`);
    const toggle = page.locator('.nav-toggle');
    const navVisible = () => page.locator('#primary-nav').evaluate((n) => getComputedStyle(n).visibility === 'visible');
    check('Menu mobile fermé au chargement', !(await navVisible()) && (await toggle.getAttribute('aria-expanded')) === 'false');
    await toggle.click();
    await page.waitForTimeout(400);
    check('Menu mobile : ouverture (aria-expanded, panneau visible)', (await navVisible()) && (await toggle.getAttribute('aria-expanded')) === 'true');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    check('Menu mobile : Échap ferme et rend le focus au bouton', !(await navVisible()) && (await page.evaluate(() => document.activeElement.classList.contains('nav-toggle'))));
    await toggle.click();
    await page.waitForTimeout(400);
    // Clic sur le contenu de la page, hors du menu et de son bouton
    await page.evaluate(() => document.querySelector('main').dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await page.waitForTimeout(400);
    check('Menu mobile : clic en dehors ferme le menu (sans changer de page)', !(await navVisible()) && page.url().endsWith('/fr/'));
    await toggle.click();
    await page.waitForTimeout(400);
    await page.keyboard.press('Tab');
    const firstTab = await page.evaluate(() => ({ inNav: !!document.activeElement.closest('#primary-nav'), text: document.activeElement.textContent.trim() }));
    check('Menu mobile : au clavier, Tab mène du bouton au premier lien du menu ouvert', firstTab.inNav, JSON.stringify(firstTab));
    for (let i = 0; i < 20; i++) await page.keyboard.press('Tab');
    await page.waitForTimeout(400); // fin de l'animation de fermeture
    const closedAfterTab = !(await navVisible());
    check('Menu mobile : le focus clavier qui quitte le menu le referme', closedAfterTab);
    await toggle.click();
    await page.locator('#primary-nav .primary-nav__list a', { hasText: 'La carte' }).click();
    await page.waitForURL('**/fr/la-carte/');
    check('Menu mobile : les liens naviguent', page.url().endsWith('/fr/la-carte/'));

    await page.goto(`${BASE}/fr/`);
    await page.keyboard.press('Tab');
    const skip = await page.evaluate(() => document.activeElement.className);
    await page.keyboard.press('Enter');
    const afterSkip = await page.evaluate(() => document.activeElement.id);
    check('Clavier : lien d\'évitement en premier, il mène au contenu', skip === 'skip-link' && afterSkip === 'contenu', `${skip} → ${afterSkip}`);
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/fr/`);
    const order = [];
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      order.push(await page.evaluate(() => {
        const el = document.activeElement; const s = getComputedStyle(el);
        return { text: (el.textContent || '').trim().slice(0, 24), outline: s.outlineStyle !== 'none' || s.boxShadow !== 'none' };
      }));
    }
    check('Bureau : navigation au clavier dans l\'en-tête avec focus visible', order.slice(1).every((o) => o.outline), order.map((o) => o.text).join(' › '));
    await ctx.close();
  }

  /* ---------- 4. RTL arabe ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    for (const [code, expectRtl] of [['ar', true], ['fr', false]]) {
      await page.goto(`${BASE}/${code}/contact/`);
      const r = await page.evaluate(() => ({
        dir: getComputedStyle(document.body).direction,
        brandX: document.querySelector('.brand').getBoundingClientRect().x,
        ctaX: document.querySelector('.site-header__tools .btn').getBoundingClientRect().x,
        h1Align: document.querySelector('h1').getBoundingClientRect().right,
      }));
      const ok = expectRtl ? r.dir === 'rtl' && r.brandX > r.ctaX && r.h1Align > 1000 : r.dir === 'ltr' && r.brandX < r.ctaX;
      check(`RTL : mise en page ${code} ${expectRtl ? 'de droite à gauche' : 'de gauche à droite'} (sens, marque, titre)`, ok, JSON.stringify(r));
    }
    await page.goto(`${BASE}/ar/menu/`);
    check('RTL : prix et intitulés de la carte en arabe', (await page.locator('.dish__name').first().textContent()).includes('زعلوك'));
    await ctx.close();
  }

  /* ---------- 5. Formulaire de réservation (état actuel : envoi non relié) ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    for (const code of LANGS.map((l) => l.code)) {
      await page.goto(`${BASE}${pathFor('reservation', code)}`);
      await page.click('#reservation-form [type=submit]');
      const invalid = await page.evaluate(() => ({
        errors: [...document.querySelectorAll('.field__error')].filter((e) => e.textContent.trim()).length,
        focused: document.activeElement.id,
        status: document.querySelector('.form-status').dataset.state,
      }));
      check(`Formulaire ${code} : champs vides → erreurs liées, focus sur le premier champ`, invalid.errors === 6 && invalid.focused === 'f-name' && invalid.status === 'invalid', JSON.stringify(invalid));

      await page.fill('#f-name', 'Test');
      await page.fill('#f-email', 'pas-un-email');
      await page.fill('#f-phone', '12');
      await page.click('#reservation-form [type=submit]');
      const wrong = await page.evaluate(() => ['email', 'phone'].map((n) => document.getElementById(`f-${n}`).getAttribute('aria-invalid')));
      check(`Formulaire ${code} : e-mail et téléphone invalides signalés`, wrong.every((v) => v === 'true'));

      const min = await page.getAttribute('#f-date', 'min');
      await page.fill('#f-email', 'test@exemple.ma');
      await page.fill('#f-phone', '+212 600 000 000');
      await page.fill('#f-date', min);
      await page.fill('#f-time', '20:00');
      await page.selectOption('#f-guests', '2');
      await page.click('#reservation-form [type=submit]');
      const status = await page.evaluate(() => document.querySelector('.form-status').dataset.state);
      check(`Formulaire ${code} : formulaire valide sans service d'envoi → message clair, aucune fausse réussite`, status === 'error');
      const wa = await page.evaluate(() => document.querySelector('.panel.theme-dark .btn').getAttribute('aria-disabled'));
      check(`Formulaire ${code} : bouton WhatsApp inactif tant que le numéro n'est pas confirmé`, wa === 'true');
    }
    await ctx.close();
  }

  /* ---------- 6. Robustesse : script absent ou en erreur ---------- */
  for (const [label, handler] of [
    ['script principal introuvable (404)', (route) => route.fulfill({ status: 404, body: '' })],
    ['script principal en erreur', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: 'throw new Error("panne simulée")' })],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.route('**/assets/main.*.js', handler);
    await page.goto(`${BASE}/fr/`, { waitUntil: 'load' });
    await page.waitForTimeout(100);
    const r = await page.evaluate(() => {
      const nav = document.getElementById('primary-nav');
      const reveal = [...document.querySelectorAll('[data-reveal]')].map((e) => getComputedStyle(e).opacity);
      return {
        mode: document.documentElement.className,
        navVisible: getComputedStyle(nav).visibility === 'visible' && nav.getBoundingClientRect().height > 0,
        toggleHidden: getComputedStyle(document.querySelector('.nav-toggle')).display === 'none',
        reveal,
      };
    });
    check(`Sans JavaScript (${label}) : navigation visible, arches visibles`, r.mode.includes('no-js') && r.navVisible && r.toggleHidden && r.reveal.every((o) => o === '1'), JSON.stringify(r));
    await page.goto(`${BASE}/fr/reservation/`, { waitUntil: 'load' });
    await page.waitForTimeout(100);
    check(`Sans JavaScript (${label}) : message d'orientation visible sur le formulaire`, await page.locator('.no-js-only').isVisible());
    await ctx.close();
  }

  /* ---------- 7. Apparitions progressives avec JavaScript ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/fr/`);
    await page.locator('.arcade').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    const op = await page.$$eval('.arcade [data-reveal]', (els) => els.map((e) => getComputedStyle(e).opacity));
    check('Apparitions : les arches des plats emblématiques apparaissent au défilement', op.length && op.every((o) => o === '1'), op.join(','));
    await page.goto(`${BASE}/fr/`);
    for (let y = 0; y < 12000; y += 500) { await page.mouse.wheel(0, 500); await page.waitForTimeout(60); }
    await page.waitForTimeout(1200);
    const all = await page.$$eval('[data-reveal]', (els) => els.map((e) => getComputedStyle(e).opacity));
    check('Apparitions : toutes les sections apparaissent au fil du défilement', all.every((o) => o === '1'), all.join(','));
    await ctx.close();
  }

  /* ---------- 8. Parcours de réservation et conditions (site actuel) ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/fr/reservation/`);
    const r = await page.evaluate(() => ({
      paths: [...document.querySelectorAll('.path__link')].map((a) => a.getAttribute('href')),
      conditions: document.querySelector('.conditions [data-provisional="conditions"]')?.textContent,
      system: !!document.querySelector('.booking-system'),
    }));
    check('Réservation : 2 parcours présentés tant que le système connecté n\'est pas configuré, ancres valides', r.paths.join() === '#form-title,#wa-title' && !r.system, JSON.stringify(r));
    check('Réservation : emplacement des conditions signalé [À CONFIRMER]', /CONFIRMER/.test(r.conditions || ''), r.conditions);
    await ctx.close();
  }

  /* ---------- 10. Cohérence linguistique : aucun texte latin visible dans les pages arabes ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const ALLOWED = new Set(['English', 'Français', 'Google', 'JavaScript', 'WhatsApp', 'Instagram', 'Facebook', 'Tripadvisor']);
    const leaks = [];
    for (const p of PAGES) {
      await page.goto(BASE + pathFor(p.id, 'ar'));
      const words = await page.evaluate(() => {
        const out = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const el = walker.currentNode.parentElement;
          if (!el || el.closest('script, style, [aria-hidden="true"], .visually-hidden, [dir="ltr"], [lang]:not(html)')) continue;
          out.push(...(walker.currentNode.textContent.match(/[A-Za-zÀ-ÿ]{3,}/g) || []));
        }
        return out;
      });
      words.filter((w) => !ALLOWED.has(w)).forEach((w) => leaks.push(`${pathFor(p.id, 'ar')} : ${w}`));
    }
    check('Arabe : aucun texte latin visible hors noms de marque et de langues (cahier des charges, section 7)', !leaks.length, leaks.join(', '));
    await ctx.close();
  }

  /* ---------- 9. Copie de test avec photos, adresse et système connecté (données de test, hors projet) ---------- */
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'dar-el-bacha-navigateur-'));
  let fxServer;
  try {
    for (const p of ['scripts', 'src', 'package.json']) cpSync(path.join(ROOT, p), path.join(tmp, p), { recursive: true });
    const rd = (p) => JSON.parse(readFileSync(path.join(tmp, p), 'utf8'));
    const wr = (p, v) => writeFileSync(path.join(tmp, p), JSON.stringify(v, null, 2));
    const T = (t) => ({ fr: `${t} (test)`, en: `${t} (test)`, ar: `${t} (اختبار)` });
    const gallery = rd('src/content/gallery.json');
    gallery.items.forEach((i, n) => { i.image = { src: 'logo/logo-vert-or', width: 333, height: 313 }; i.alt = T(`Image ${n + 1}`); });
    wr('src/content/gallery.json', gallery);
    const site = rd('src/content/site.json');
    site.address = { street: 'Adresse de test', postalCode: '20000', district: null };
    site.reservation.bookingSystem = { url: 'https://reservation.domaine-de-test.ma', embedUrl: 'https://reservation.domaine-de-test.ma/module' };
    wr('src/content/site.json', site);
    const b = spawnSync(process.execPath, ['scripts/build.mjs'], { cwd: tmp, encoding: 'utf8' });
    if (b.status !== 0) throw new Error(`build de la copie de test : ${b.stderr}`);
    fxServer = createStaticServer({ root: path.join(tmp, 'dist'), home: '/fr/' });
    await new Promise((r) => fxServer.listen(0, r));
    const FX = `http://localhost:${fxServer.address().port}`;

    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const external = [];
    await ctx.route(/^https:\/\/(maps\.google\.com|reservation\.domaine-de-test\.ma)\//, (route) => { external.push(route.request().url()); route.fulfill({ status: 200, contentType: 'text/html', body: '<p>module</p>' }); });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    // Galerie : agrandissement
    await page.goto(`${FX}/fr/galerie/`);
    const links = await page.locator('[data-lightbox]').count();
    const href = await page.locator('[data-lightbox]').first().getAttribute('href');
    const direct = await fetch(FX + href);
    check('Galerie : chaque photo est un lien vers sa grande version (fonctionne sans JavaScript)', links === 7 && direct.ok, `${links} liens, ${href} → ${direct.status}`);
    await page.locator('[data-lightbox]').first().click();
    const state = () => page.evaluate(() => ({ open: document.querySelector('dialog.lightbox')?.open, counter: document.querySelector('.lightbox__counter')?.textContent, focus: document.activeElement.className, img: !!document.querySelector('.lightbox__frame img') }));
    let st = await state();
    check('Galerie : ouverture de la fenêtre, focus sur « Fermer », photo et compteur affichés', st.open && /lightbox__close/.test(st.focus) && st.img && st.counter === 'Photo 1 sur 7', JSON.stringify(st));
    await page.keyboard.press('ArrowRight');
    const afterRight = (await state()).counter;
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    const afterLeft = (await state()).counter;
    check('Galerie : flèches du clavier (suivante, précédente, en boucle)', afterRight === 'Photo 2 sur 7' && afterLeft === 'Photo 7 sur 7', `${afterRight} / ${afterLeft}`);
    await page.mouse.move(900, 450); await page.mouse.down(); await page.mouse.move(700, 450, { steps: 4 }); await page.mouse.up();
    check('Galerie : glissement vers la gauche → photo suivante', (await state()).counter === 'Photo 1 sur 7', (await state()).counter);
    for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
    check('Galerie : le focus reste dans la fenêtre ouverte', await page.evaluate(() => !!document.activeElement.closest('dialog.lightbox')));
    await page.keyboard.press('Escape');
    st = await state();
    const back = await page.evaluate(() => document.activeElement.matches('[data-lightbox]') && document.activeElement === document.querySelectorAll('[data-lightbox]')[0]);
    check('Galerie : Échap ferme la fenêtre et rend le focus à la photo d\'origine', !st.open && back, JSON.stringify(st));
    await page.goto(`${FX}/ar/gallery/`);
    await page.locator('[data-lightbox]').first().click();
    await page.keyboard.press('ArrowLeft');
    check('Galerie (arabe) : la flèche gauche mène à la photo suivante (sens de lecture RTL)', (await state()).counter === 'الصورة 2 من 7', (await state()).counter);
    await page.keyboard.press('Escape');

    // Plan d'accès chargé à la demande
    external.length = 0;
    await page.goto(`${FX}/fr/contact/`, { waitUntil: 'networkidle' });
    const before = external.filter((u) => u.includes('maps.google.com')).length;
    await page.locator('.map-frame__load').click();
    await page.waitForSelector('#map-embed iframe');
    const iframe = await page.getAttribute('#map-embed iframe', 'src');
    check('Contact : aucune requête vers Google avant le clic, plan intégré après le clic', before === 0 && /^https:\/\/maps\.google\.com\/maps\?q=/.test(iframe), `${before} requête(s) avant ; ${iframe}`);

    // Système de réservation connecté configuré : 3 parcours, module chargé à la demande
    external.length = 0;
    await page.goto(`${FX}/fr/reservation/`, { waitUntil: 'networkidle' });
    const paths = await page.$$eval('.path__link', (a) => a.map((x) => x.getAttribute('href')));
    const moduleBefore = external.length;
    await page.locator('[data-embed-target="booking-embed"]').click();
    await page.waitForSelector('#booking-embed iframe');
    check('Réservation : 3 parcours distincts quand le système est configuré, module chargé seulement à la demande',
      paths.join() === '#system-title,#form-title,#wa-title' && moduleBefore === 0 && (await page.getAttribute('#booking-embed iframe', 'src')).endsWith('/module'), `${paths.join()} ; ${moduleBefore} requête(s) avant le clic`);
    check('Copie de test : aucune erreur JavaScript', !errors.length, errors.join('\n'));
    await ctx.close();
  } finally {
    fxServer?.close();
    rmSync(tmp, { recursive: true, force: true });
  }
} finally {
  await browser.close();
  server.close();
}

/* ---------- Rapport ---------- */
const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? '✓' : '✗'} ${r.name}${r.detail && (!r.ok || r.name.startsWith('Liens')) ? `\n    ${r.detail.replace(/\n/g, '\n    ')}` : ''}`);
}
console.log(`\n${results.length - failed.length}/${results.length} vérifications réussies`);
process.exit(failed.length ? 1 : 0);
