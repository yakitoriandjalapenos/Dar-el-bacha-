#!/usr/bin/env node
/*
  Développement : compile (prévisualisation), sert dist/, recompile à chaque modification
  de src/ ou scripts/ et recharge automatiquement le navigateur. Aucune dépendance.

  - La compilation est lancée dans un processus séparé : chaque build part d'un état neuf,
    exactement comme `npm run build` (résultat identique, reproductible).
  - Le rechargement passe par un flux d'événements (Server-Sent Events) ; le petit script
    client est ajouté aux pages par ce serveur uniquement, jamais dans dist/.
  - En cas d'erreur de build, le site précédent reste servi et l'erreur s'affiche dans le navigateur.
*/
import { spawn } from 'node:child_process';
import { watch, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer, listen } from './lib/static-server.mjs';
import { DEFAULT_LANG, pathFor } from '../src/routes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const BUILD = path.join(ROOT, 'scripts/build.mjs');
const WATCH = [path.join(ROOT, 'src'), path.join(ROOT, 'scripts')];
const PORT = Number(process.env.PORT) || 4321;
const HOME = pathFor('home', DEFAULT_LANG);
const EVENTS = '/__dev/events';

/* ---------- Rechargement du navigateur ---------- */

const clients = new Set();
let lastError = null;
const sendEvent = (res, event, data = '') => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
const broadcast = (event, data) => clients.forEach((res) => sendEvent(res, event, data));

const CLIENT = `<script>(()=>{const es=new EventSource(${JSON.stringify(EVENTS)});let box;
es.addEventListener('reload',()=>location.reload());
es.addEventListener('build-error',(e)=>{const msg=JSON.parse(e.data);if(!box){box=document.createElement('pre');box.style.cssText='position:fixed;inset:auto 0 0 0;z-index:9999;max-height:50vh;overflow:auto;margin:0;padding:1rem;background:#2a0f0a;color:#ffd9cf;font:13px/1.5 ui-monospace,monospace;white-space:pre-wrap;direction:ltr;text-align:left';document.body.append(box);}box.textContent='Build en erreur (le site affiché est la dernière version valide)\\n\\n'+msg;});})();</script>`;

const routes = {
  [EVENTS]: (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    res.write(': connecté\n\n');
    clients.add(res);
    if (lastError) sendEvent(res, 'build-error', lastError);
    req.on('close', () => clients.delete(res));
  },
};
const transformHtml = (html) => html.replace('</body>', `${CLIENT}</body>`);

/* ---------- Compilation ---------- */

let running = false;
let queued = false;
let first = true;

function build() {
  if (running) { queued = true; return; }
  running = true;
  const started = Date.now();
  const child = spawn(process.execPath, [BUILD], { cwd: ROOT, stdio: first ? 'inherit' : ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout?.on('data', (d) => { output += d; });
  child.stderr?.on('data', (d) => { output += d; });
  child.on('close', (code) => {
    running = false;
    const time = new Date().toLocaleTimeString('fr-FR');
    if (code === 0) {
      lastError = null;
      if (!first) console.log(`[${time}] ✓ recompilé en ${Date.now() - started} ms — navigateur rechargé`);
      broadcast('reload');
    } else {
      lastError = output.trim() || `Le build s'est arrêté (code ${code}).`;
      if (!first) console.error(`[${time}] ${lastError}`);
      broadcast('build-error', lastError);
    }
    if (first) {
      first = false;
      startServer();
    }
    if (queued) { queued = false; build(); }
  });
}

/* ---------- Surveillance des fichiers (dossier par dossier : compatible Node 18 sur tous les systèmes) ---------- */

const watchers = new Map();
let timer = null;
const IGNORED = /(^|[\\/])(\.|#)|~$|\.swp$|\.tmp$/;

function watchTree(dir) {
  if (!watchers.has(dir)) {
    try {
      const w = watch(dir, (event, name) => {
        if (name && IGNORED.test(String(name))) return;
        if (event === 'rename') WATCH.forEach(watchTree); // nouveau dossier éventuel
        clearTimeout(timer);
        timer = setTimeout(build, 80);
      });
      w.on('error', () => { w.close(); watchers.delete(dir); });
      watchers.set(dir, w);
    } catch {
      return;
    }
  }
  let entries = [];
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) if (e.isDirectory() && !e.name.startsWith('.')) watchTree(path.join(dir, e.name));
}

function startServer() {
  const server = createStaticServer({ root: DIST, home: HOME, transformHtml, routes });
  listen(server, PORT, () => {
    WATCH.forEach(watchTree);
    console.log(`→ http://localhost:${PORT}${HOME}   (rechargement automatique actif, Ctrl+C pour arrêter)`);
  });
}

build();
