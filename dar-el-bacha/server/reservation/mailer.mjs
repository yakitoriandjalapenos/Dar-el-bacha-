/*
  Envoi de la demande au restaurant, par un service d'e-mail configurable :
    MAIL_PROVIDER = simulation (par défaut) | resend | brevo
    MAIL_API_KEY  = clé du service (secret, uniquement côté serveur)
    MAIL_TO       = adresse du restaurant qui reçoit les demandes (jamais publiée)
    MAIL_FROM     = adresse d'expédition vérifiée auprès du service
  Mode simulation : rien n'est envoyé ; le résultat l'indique explicitement (delivered: false,
  simulated: true) et le site affiche « mode test », sans jamais prétendre que la demande est partie.
  Les adaptateurs resend et brevo suivent la documentation publique de ces services ; ils n'ont pas
  pu être testés avec un vrai compte et devront l'être lors de la mise en place.
*/

export class MailerConfigError extends Error {}

const PROVIDERS = {
  resend: (cfg, msg) => ({
    url: 'https://api.resend.com/emails',
    headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
    body: { from: cfg.from, to: [cfg.to], subject: msg.subject, text: msg.text, reply_to: msg.replyTo },
  }),
  brevo: (cfg, msg) => ({
    url: 'https://api.brevo.com/v3/smtp/email',
    headers: { 'api-key': cfg.apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: { sender: { email: cfg.from }, to: [{ email: cfg.to }], subject: msg.subject, textContent: msg.text, replyTo: { email: msg.replyTo } },
  }),
};

export function createMailer({ provider = 'simulation', apiKey, to, from, fetch = globalThis.fetch, timeoutMs = 10000 } = {}) {
  if (provider === 'simulation') {
    const outbox = [];
    return { provider, simulated: true, outbox, async send(msg) { outbox.push(msg); return { delivered: false, simulated: true }; } };
  }
  const build = PROVIDERS[provider];
  if (!build) throw new MailerConfigError(`Service d'e-mail inconnu : « ${provider} » (simulation, resend, brevo).`);
  const missing = Object.entries({ MAIL_API_KEY: apiKey, MAIL_TO: to, MAIL_FROM: from }).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) throw new MailerConfigError(`Configuration incomplète pour ${provider} : ${missing.join(', ')}.`);
  return {
    provider,
    simulated: false,
    async send(msg) {
      const req = build({ apiKey, to, from }, msg);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(req.body), signal: controller.signal });
        if (!res.ok) throw new Error(`service d'e-mail : HTTP ${res.status}`);
        return { delivered: true, simulated: false };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

/** Configuration lue dans les variables d'environnement (jamais dans le code ni dans le site publié). */
export const mailerFromEnv = (env = process.env, fetchImpl) =>
  createMailer({ provider: env.MAIL_PROVIDER || 'simulation', apiKey: env.MAIL_API_KEY, to: env.MAIL_TO, from: env.MAIL_FROM, fetch: fetchImpl });
