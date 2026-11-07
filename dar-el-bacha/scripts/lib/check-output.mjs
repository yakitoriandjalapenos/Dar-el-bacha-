/*
  Contrôle du site généré, avant qu'il ne remplace dist/.

  - Structure : langue et sens d'écriture, un seul h1, identifiants uniques.
  - Référencement : canonical, hreflang, Open Graph et sitemap cohérents avec l'URL officielle ;
    noindex sur les versions de prévisualisation, absent en production.
  - Liens et ressources internes : chaque lien, image, feuille de style ou script pointe vers un fichier existant.
  - Langues : aucun texte d'une autre langue (traductions et contenus localisés) dans une page, hors éléments
    explicitement marqués d'un attribut lang ; titre et description présents, de longueur adaptée, uniques par langue.
  - Contenus provisoires : éléments balisés data-provisional (repères [À CONFIRMER], photos à venir,
    plats à valider…) et textes interdits (repères non balisés, domaine fictif, lorem ipsum…).

  Renvoie { errors, provisional, stray } :
    errors       problèmes bloquants dans tous les modes ;
    provisional  contenus provisoires balisés, par type ;
    stray        textes provisoires ou interdits trouvés hors balisage.
*/

const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const tags = (html, re) => [...html.matchAll(re)].map((m) => m[0]);
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Textes qui ne doivent jamais apparaître hors d'un élément balisé comme provisoire
const GENERIC_FORBIDDEN = [
  /À CONFIRMER|A CONFIRMER|TO BE CONFIRMED|قيد التأكيد/i,
  /lorem ipsum/i,
  /\b(TODO|FIXME|TBD)\b/,
  /X{4,}/,
  /[\w-]+\.(example|invalid|test)\b|\bexample\.(com|net|org)\b/i,
];

const TITLE_MAX = 70;
const DESCRIPTION_MAX = 170;
const normalize = (s) => s.replace(/\s+/g, ' ').trim();

/** Texte lu ou entendu par le visiteur : titre, description, contenu, textes alternatifs et libellés. */
export function visibleText(html, lang) {
  const attrs = [...html.matchAll(/\s(?:alt|aria-label|title|placeholder)="([^"]*)"/g)].map((m) => m[1]);
  const meta = attr(tags(html, /<meta name="description"[^>]*>/g)[0] || '', 'content') || '';
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] || '';
  const body = (html.match(/<body\b[\s\S]*<\/body>/)?.[0] || html)
    .replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, ' ')
    // Passages volontairement dans une autre langue, marqués comme tels (noms de langues, crédits…)
    .replace(/<(\w+)\b[^>]*\slang="([^"]+)"[^>]*>[\s\S]*?<\/\1>/g, (m, tag, l) => (l === lang ? m : ' '))
    .replace(/<[^>]+>/g, ' ');
  return normalize(decode([title, meta, body, ...attrs].join(' ')));
}

/**
 * Textes propres à chaque langue (traductions et contenus localisés { fr, en, ar }), regroupés par langue cible :
 * pour une page en `fr`, les textes anglais et arabes qui diffèrent du français et n'existent nulle part en français.
 * Seules les phrases (au moins 12 caractères et une espace) sont retenues, pour éviter les faux positifs (noms, sigles).
 */
export function collectForeignTexts(entries, langs) {
  const fragments = (v) => String(v).replace(/<[^>]+>/g, ' ').split(/\{[^}]*\}/).map(normalize).filter((f) => f.length >= 12 && f.includes(' '));
  const own = Object.fromEntries(langs.map((l) => [l, entries.map((e) => normalize(String(e[l] ?? ''))).join('\n')]));
  const out = {};
  for (const l of langs) {
    const set = new Set();
    for (const e of entries) {
      for (const other of langs) {
        if (other === l || e[other] == null || e[other] === e[l]) continue;
        for (const f of fragments(e[other])) if (!own[l].includes(f)) set.add(f);
      }
    }
    out[l] = [...set];
  }
  return out;
}

/**
 * @param {object} o
 * @param {Map<string,string>} o.files    contenus texte écrits (chemin relatif → contenu)
 * @param {Set<string>} o.allFiles        tous les fichiers présents dans le dossier généré
 * @param {Array} o.pages                 pages HTML : { file, lang, dir, path, indexable, alternates: [{hreflang, path}] }
 * @param {'preview'|'production'} o.mode
 * @param {string|null} o.siteUrl
 * @param {string} o.base
 * @param {string[]} o.forbiddenTexts     textes provisoires connus (repères de toutes les langues)
 * @param {Record<string,string[]>} [o.foreignTexts]  par langue, textes des autres langues qui ne doivent pas y figurer
 */
export function checkOutput({ files, allFiles, pages, mode, siteUrl, base, forbiddenTexts, foreignTexts = {} }) {
  const errors = [];
  const provisional = new Map(); // type → { count, files:Set }
  const stray = new Map(); // texte → Set de fichiers
  const preview = mode !== 'production';

  const forbidden = [
    ...forbiddenTexts.filter(Boolean).map((t) => new RegExp(escapeRe(t))),
    ...GENERIC_FORBIDDEN,
  ];

  const resolve = (href) => {
    let p = decode(href).split('#')[0].split('?')[0];
    if (base && p.startsWith(base)) p = p.slice(base.length);
    p = p.replace(/^\//, '');
    if (p === '' || p.endsWith('/')) p += 'index.html';
    return p;
  };
  const exists = (href) => allFiles.has(resolve(href));
  const abs = (p) => (siteUrl ? siteUrl + p : null);
  const seenTitles = new Map(); // langue → Map(titre → page)

  for (const page of pages) {
    const html = files.get(page.file);
    const where = `/${page.file}`;
    if (!html) { errors.push(`${where} : page absente.`); continue; }

    // Structure
    const root = html.match(/<html\b[^>]*>/)?.[0] || '';
    if (attr(root, 'lang') !== page.lang || attr(root, 'dir') !== page.dir) {
      errors.push(`${where} : <html lang="${attr(root, 'lang')}" dir="${attr(root, 'dir')}"> au lieu de lang="${page.lang}" dir="${page.dir}".`);
    }
    const h1 = (html.match(/<h1[\s>]/g) || []).length;
    if (h1 !== 1) errors.push(`${where} : ${h1} titres h1 (1 attendu).`);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const dupIds = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
    if (dupIds.length) errors.push(`${where} : identifiants en double (${dupIds.join(', ')}).`);

    // Indexation
    const robots = attr(tags(html, /<meta name="robots"[^>]*>/g)[0] || '', 'content') || '';
    if (preview && !/noindex/.test(robots)) errors.push(`${where} : balise noindex absente en prévisualisation.`);
    if (!preview && page.indexable && /noindex/.test(robots)) errors.push(`${where} : balise noindex présente en production.`);
    if (!page.indexable && !/noindex/.test(robots)) errors.push(`${where} : page non indexable sans noindex.`);

    // Canonical, hreflang, Open Graph
    const canonical = attr(tags(html, /<link rel="canonical"[^>]*>/g)[0] || '', 'href');
    const ogUrl = attr(tags(html, /<meta property="og:url"[^>]*>/g)[0] || '', 'content');
    const ogImage = attr(tags(html, /<meta property="og:image"[^>]*>/g)[0] || '', 'content');
    const alternates = tags(html, /<link rel="alternate" hreflang="[^"]*"[^>]*>/g).map((t) => [attr(t, 'hreflang'), attr(t, 'href')]);

    if (!siteUrl) {
      if (canonical || ogUrl || ogImage || alternates.length) errors.push(`${where} : URL absolue publiée alors qu'aucune URL officielle n'est configurée.`);
    } else if (page.indexable) {
      if (canonical !== abs(page.path)) errors.push(`${where} : canonical « ${canonical} » au lieu de « ${abs(page.path)} ».`);
      if (ogUrl !== canonical) errors.push(`${where} : og:url « ${ogUrl} » différent du canonical.`);
      if (ogImage && !ogImage.startsWith(`${siteUrl}/`)) errors.push(`${where} : og:image hors du domaine officiel (« ${ogImage} »).`);
      if (ogImage && !exists(ogImage.slice(siteUrl.length))) errors.push(`${where} : og:image introuvable (« ${ogImage} »).`);
      const expected = page.alternates.map((a) => `${a.hreflang} ${abs(a.path)}`).sort().join('\n');
      const actual = alternates.map(([h, u]) => `${h} ${u}`).sort().join('\n');
      if (expected !== actual) errors.push(`${where} : liens hreflang incorrects.\n      attendu :\n        ${expected.replace(/\n/g, '\n        ')}\n      trouvé :\n        ${actual.replace(/\n/g, '\n        ') || '(aucun)'}`);
    }

    // Titre et description (résultats de recherche, aperçus de partage)
    const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] || '').trim();
    const description = decode(attr(tags(html, /<meta name="description"[^>]*>/g)[0] || '', 'content') || '').trim();
    if (!title || !description) errors.push(`${where} : titre ou description absent.`);
    if (page.indexable) {
      // Longueurs lisibles dans les résultats de recherche (pages non indexées : 404, résultats de demande, exemptées)
      if (title.length < 10 || title.length > TITLE_MAX) errors.push(`${where} : titre de ${title.length} caractères (10 à ${TITLE_MAX} attendus) « ${title} ».`);
      if (description.length < 50 || description.length > DESCRIPTION_MAX) errors.push(`${where} : description de ${description.length} caractères (50 à ${DESCRIPTION_MAX} attendus).`);
      const byLang = seenTitles.get(page.lang) || new Map();
      if (byLang.has(title)) errors.push(`${where} : titre identique à celui de ${byLang.get(title)}.`);
      byLang.set(title, where);
      seenTitles.set(page.lang, byLang);
    }

    // Aucun texte d'une autre langue (oubli de traduction, contenu non localisé)
    const foreign = foreignTexts[page.lang] || [];
    if (foreign.length) {
      const text = visibleText(html, page.lang);
      const found = foreign.filter((t) => text.includes(t));
      if (found.length) errors.push(`${where} : texte d'une autre langue : ${found.slice(0, 3).map((t) => `« ${t} »`).join(', ')}${found.length > 3 ? '…' : ''}`);
    }

    // Liens et ressources internes
    for (const [, name, value] of html.matchAll(/\s(href|src|srcset)="([^"]*)"/g)) {
      const urls = name === 'srcset' ? value.split(',').map((s) => s.trim().split(/\s+/)[0]) : [value];
      for (const u of urls) {
        if (u.startsWith('#')) {
          if (u.length > 1 && !ids.includes(decode(u.slice(1)))) errors.push(`${where} : ancre introuvable « ${u} ».`);
        } else if (u.startsWith('/') && !u.startsWith('//')) {
          if (!exists(u)) errors.push(`${where} : lien ou ressource introuvable « ${u} ».`);
          const hash = decode(u).split('#')[1];
          if (hash) {
            const target = files.get(resolve(u));
            if (target && !new RegExp(`\\sid="${escapeRe(hash)}"`).test(target)) errors.push(`${where} : ancre introuvable « ${u} ».`);
          }
        }
      }
    }

    // Images : une seule image prioritaire par page, dimensions toujours déclarées (pas de décalage de mise en page)
    const imgs = tags(html, /<img\b[^>]*>/g);
    const high = imgs.filter((t) => /fetchpriority="high"/.test(t)).length;
    if (high > 1) errors.push(`${where} : ${high} images en priorité haute (une seule image principale attendue).`);
    const noSize = imgs.filter((t) => !attr(t, 'width') || !attr(t, 'height')).length;
    if (noSize) errors.push(`${where} : ${noSize} image(s) sans largeur ni hauteur déclarées.`);
    const noAlt = imgs.filter((t) => attr(t, 'alt') === undefined).length;
    if (noAlt) errors.push(`${where} : ${noAlt} image(s) sans attribut alt.`);

    // Contenus provisoires balisés
    for (const [, type] of html.matchAll(/\sdata-provisional="([^"]+)"/g)) {
      const entry = provisional.get(type) || { count: 0, files: new Set() };
      entry.count += 1;
      entry.files.add(where);
      provisional.set(type, entry);
    }
  }

  // Textes provisoires ou interdits hors balisage (tous les fichiers texte publiés)
  for (const [file, content] of files) {
    // Les éléments balisés data-provisional (feuilles, sans élément de même nom imbriqué) sont retirés avant l'analyse.
    const cleaned = content.replace(/<(\w+)\b[^>]*\sdata-provisional="[^"]*"[^>]*>[\s\S]*?<\/\1>/g, '');
    for (const re of forbidden) {
      const m = decode(cleaned).match(re);
      if (m) {
        const set = stray.get(m[0]) || new Set();
        set.add(`/${file}`);
        stray.set(m[0], set);
      }
    }
  }

  // Sitemap et robots.txt
  const sitemap = files.get('sitemap.xml');
  const robotsTxt = files.get('robots.txt') || '';
  const indexable = pages.filter((p) => p.indexable);
  if (siteUrl) {
    if (!sitemap) errors.push('sitemap.xml absent.');
    else {
      const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).sort();
      const expected = indexable.map((p) => abs(p.path)).sort();
      if (locs.join() !== expected.join()) errors.push(`sitemap.xml : ${locs.length} adresses au lieu de ${expected.length}, ou adresses différentes des pages générées.`);
      const blocks = sitemap.split('<url>').slice(1);
      for (const b of blocks) {
        const n = (b.match(/hreflang=/g) || []).length;
        if (n !== indexable[0].alternates.length) errors.push(`sitemap.xml : ${n} variantes de langue pour ${b.match(/<loc>([^<]+)/)?.[1]} (attendu ${indexable[0].alternates.length}).`);
      }
    }
  } else if (sitemap) {
    errors.push('sitemap.xml généré sans URL officielle.');
  }
  if (preview) {
    if (!/^Disallow: \/\s*$/m.test(robotsTxt)) errors.push('robots.txt : « Disallow: / » attendu en prévisualisation.');
  } else {
    if (/^Disallow: \/\s*$/m.test(robotsTxt)) errors.push('robots.txt : le site entier est bloqué en production.');
    if (!robotsTxt.includes(`Sitemap: ${siteUrl}/sitemap.xml`)) errors.push('robots.txt : lien vers le sitemap officiel absent.');
  }

  return { errors, provisional, stray };
}
