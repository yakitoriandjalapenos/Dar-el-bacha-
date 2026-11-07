/*
  Limitation des envois par connexion (fenêtre fixe), en mémoire.
  L'adresse IP n'est jamais conservée en clair : seule une empreinte salée sert de clé, oubliée
  à la fin de la fenêtre. Sur un hébergement « serverless » (plusieurs instances), remplacer ce
  module par le mécanisme de la plateforme (même interface : hit(key) → { allowed, retryAfter }).
*/
import { createHash, randomBytes } from 'node:crypto';

export function createRateLimiter({ max = 5, windowMs = 10 * 60 * 1000, now = () => Date.now() } = {}) {
  const salt = randomBytes(16).toString('hex');
  const hits = new Map(); // empreinte → { count, reset }
  return {
    hit(ip) {
      const key = createHash('sha256').update(salt).update(String(ip || 'inconnu')).digest('hex');
      const t = now();
      for (const [k, e] of hits) if (e.reset <= t) hits.delete(k); // purge des fenêtres expirées
      const entry = hits.get(key) || { count: 0, reset: t + windowMs };
      entry.count += 1;
      hits.set(key, entry);
      return entry.count <= max ? { allowed: true } : { allowed: false, retryAfter: Math.ceil((entry.reset - t) / 1000) };
    },
    size: () => hits.size,
  };
}
