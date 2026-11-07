import { raw } from '../../scripts/lib/html.mjs';

// Icônes en ligne (SVG), décoratives par défaut : aria-hidden.
const wrap = (body, viewBox = '0 0 24 24') =>
  raw(`<svg viewBox="${viewBox}" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`);

export const icons = {
  // Étoile à huit branches (khatam) — motif signature
  star: () => wrap('<rect x="6" y="6" width="12" height="12"/><path d="M12 3.5 20.5 12 12 20.5 3.5 12Z"/>'),
  chat: () => wrap('<path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.1A8 8 0 1 1 20 11.5Z"/>'),
  phone: () => wrap('<path d="M5 4h3l1.5 4-2 1.3a11 11 0 0 0 7.2 7.2L16 14.5l4 1.5v3a2 2 0 0 1-2.2 2A16 16 0 0 1 3 6.2 2 2 0 0 1 5 4Z"/>'),
  pin: () => wrap('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>'),
};
