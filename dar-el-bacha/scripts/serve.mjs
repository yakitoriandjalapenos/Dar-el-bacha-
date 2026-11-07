#!/usr/bin/env node
// Serveur local de prévisualisation pour dist/ (aucune dépendance). Usage : npm run serve
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer, listen } from './lib/static-server.mjs';
import { DEFAULT_LANG, pathFor } from '../src/routes.mjs';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const PORT = Number(process.env.PORT) || 4321;
const HOME = pathFor('home', DEFAULT_LANG);

listen(createStaticServer({ root: DIST, home: HOME }), PORT, () => console.log(`→ http://localhost:${PORT}${HOME}`));
