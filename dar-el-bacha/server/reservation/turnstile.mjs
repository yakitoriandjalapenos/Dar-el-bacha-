/*
  Vérification anti-robot Cloudflare Turnstile (facultative). Active uniquement si la clé secrète
  TURNSTILE_SECRET est configurée côté serveur ET la clé publique dans site.json › reservation.antiSpam.
  Sans configuration, la protection repose sur le piège invisible, le délai de saisie et la limite d'envois.
  Turnstile nécessite JavaScript : un visiteur sans JavaScript est alors invité à téléphoner ou à écrire sur WhatsApp.
*/
export const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function createTurnstileVerifier({ secret, fetch = globalThis.fetch, timeoutMs = 8000 } = {}) {
  if (!secret) return null;
  return async function verify(token, ip) {
    if (!token) return false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const body = new URLSearchParams({ secret, response: token, ...(ip && { remoteip: ip }) });
      const res = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body, signal: controller.signal });
      if (!res.ok) return false;
      const data = await res.json();
      return data.success === true;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  };
}
