/*
  Service des demandes de réservation, configuré par les variables d'environnement :
    MAIL_PROVIDER, MAIL_API_KEY, MAIL_TO, MAIL_FROM   (voir reservation/mailer.mjs ; simulation par défaut)
    ALLOWED_ORIGINS                                    origines autorisées, séparées par des virgules
                                                       (par défaut : siteUrl de site.json et les adresses locales)
    RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MIN              limite d'envois par connexion (5 par 10 minutes)
    RESERVATION_MAX_DAYS                               horizon de réservation en jours (180)
  Les horaires d'ouverture sont lus dans src/content/site.json (contrôle des jours et heures).
*/
import { readFileSync } from 'node:fs';
import { createReservationHandler } from './reservation/handler.mjs';
import { createRateLimiter } from './reservation/rate-limit.mjs';
import { mailerFromEnv } from './reservation/mailer.mjs';
import { toNodeHandler } from './node-adapter.mjs';

export function createReservationService(env = process.env, { port } = {}) {
  const site = JSON.parse(readFileSync(new URL('../src/content/site.json', import.meta.url), 'utf8'));
  const local = port ? [`http://localhost:${port}`, `http://127.0.0.1:${port}`] : [];
  const allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean) : [site.siteUrl, ...local].filter(Boolean);
  const mailer = mailerFromEnv(env);
  const handle = createReservationHandler({
    mailer,
    limiter: createRateLimiter({ max: Number(env.RATE_LIMIT_MAX) || 5, windowMs: (Number(env.RATE_LIMIT_WINDOW_MIN) || 10) * 60 * 1000 }),
    openingHours: site.openingHours,
    allowedOrigins,
    maxDaysAhead: Number(env.RESERVATION_MAX_DAYS) || 180,
  });
  return { handle, node: toNodeHandler(handle), mailer };
}
