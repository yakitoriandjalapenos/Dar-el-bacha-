// Serveur statique minimal pour dist/ (aucune dépendance), partagé par `npm run serve` et `npm run dev`.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.avif': 'image/avif', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.ico': 'image/x-icon',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
};

/**
 * @param {object} o
 * @param {string} o.root               dossier servi (dist/)
 * @param {string} o.home               redirection de « / » (ex. /fr/)
 * @param {(html:string)=>string} [o.transformHtml]  modification des pages HTML (développement uniquement)
 * @param {Record<string,(req,res)=>void>} [o.routes] routes spéciales (développement uniquement)
 */
export function createStaticServer({ root, home, transformHtml = (s) => s, routes = {} }) {
  const ROOT = path.resolve(root);

  const send = (res, status, type, body) => {
    res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(body);
  };
  const notFound = async (res) => {
    const page = await readFile(path.join(ROOT, '404.html'), 'utf8').catch(() => '<!doctype html><title>404</title><p>Not found</p>');
    send(res, 404, TYPES['.html'], transformHtml(page));
  };

  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (routes[url.pathname]) return routes[url.pathname](req, res);

    let p;
    try { p = decodeURIComponent(url.pathname); } catch { return send(res, 400, TYPES['.txt'], 'Bad request'); }
    if (p === '/') { res.writeHead(302, { Location: home }); return res.end(); }

    let file = path.join(ROOT, p);
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return send(res, 403, TYPES['.txt'], 'Forbidden');

    try {
      if ((await stat(file)).isDirectory()) {
        // Comme chez les hébergeurs statiques : /fr/la-carte → /fr/la-carte/
        if (!p.endsWith('/')) { res.writeHead(301, { Location: `${url.pathname}/${url.search}` }); return res.end(); }
        file = path.join(file, 'index.html');
      }
      const ext = path.extname(file);
      const body = await readFile(file);
      if (ext === '.html') return send(res, 200, TYPES[ext], transformHtml(body.toString('utf8')));
      send(res, 200, TYPES[ext] || 'application/octet-stream', body);
    } catch {
      await notFound(res);
    }
  });
}

/** Démarre le serveur et affiche un message clair si le port est déjà utilisé. */
export function listen(server, port, onReady) {
  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') console.error(`✗ Le port ${port} est déjà utilisé. Relancer avec un autre port : PORT=4322 npm run …`);
    else console.error(e);
    process.exit(1);
  });
  server.listen(port, onReady);
}
