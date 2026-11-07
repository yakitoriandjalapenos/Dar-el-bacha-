/* DAR EL BACHA — script principal.
   Léger, sans dépendance, chargé en différé. Le site reste utilisable sans lui :
   si ce script ne s'exécute pas, la page revient d'elle-même au mode sans JavaScript (voir layout.mjs).
   Chaque fonction est isolée : une erreur dans l'une n'empêche pas les autres de fonctionner. */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const safely = (name, fn) => {
    try { fn(); } catch (e) { console.error(`[Dar el Bacha] ${name} :`, e); }
  };

  /* ---------- Menu mobile ---------- */
  let menuReady = false;
  safely('menu', () => {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.getElementById('primary-nav');
    if (!toggle || !nav) { menuReady = true; return; }
    const label = toggle.querySelector('.nav-toggle__label');
    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
      if (label) label.textContent = open ? toggle.dataset.labelClose : toggle.dataset.labelOpen;
    };
    toggle.addEventListener('click', () => setOpen(!isOpen()));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) {
        setOpen(false);
        toggle.focus();
      }
    });
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    // Clic en dehors du menu, ou focus clavier qui quitte le menu : on referme (le panneau ne masque jamais l'élément actif).
    document.addEventListener('click', (e) => {
      if (isOpen() && !nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
    document.addEventListener('focusin', (e) => {
      if (isOpen() && !nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
    window.matchMedia('(min-width: 64rem)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
    menuReady = true;
  });
  // Signal pour layout.mjs : la navigation fonctionne, le mode JavaScript peut être conservé.
  if (menuReady) root.classList.add('js-ok');

  /* ---------- Apparition progressive (une seule fois par élément) ---------- */
  const revealables = document.querySelectorAll('[data-reveal]');
  const showAll = () => revealables.forEach((el) => el.classList.add('is-visible'));
  safely('apparitions', () => {
    if (!revealables.length) return;
    if (reduceMotion || !('IntersectionObserver' in window)) { showAll(); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    revealables.forEach((el) => io.observe(el));
  });

  /* ---------- Formulaire de demande de réservation ---------- */
  const form = document.getElementById('reservation-form');
  if (!form) return;

  let msg = {};
  safely('messages du formulaire', () => { msg = JSON.parse(form.dataset.messages || '{}'); });
  const errorsText = msg.errors || {};

  safely('formulaire', () => {
    const status = form.querySelector('.form-status');
    const submit = form.querySelector('[type="submit"]');
    const dateInput = form.elements.date;

    // Pas de date passée
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    const todayISO = today.toISOString().slice(0, 10);
    if (dateInput) dateInput.min = todayISO;

    const errorFor = (input) => {
      const v = input.value.trim();
      if (input.required && !v) return errorsText.required;
      if (!v) return '';
      if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return errorsText.email;
      if (input.type === 'tel') {
        const digits = v.replace(/\D/g, '');
        if (!/^[+0-9 ().-]+$/.test(v) || digits.length < 8 || digits.length > 15) return errorsText.phone;
      }
      if (input.name === 'date' && v < todayISO) return errorsText.date;
      return '';
    };

    const showError = (input, text) => {
      const box = document.getElementById(`e-${input.name}`);
      if (box) box.textContent = text || '';
      input.setAttribute('aria-invalid', text ? 'true' : 'false');
    };

    const fields = Array.from(form.querySelectorAll('input:not([name="website"]), select, textarea'));
    fields.forEach((input) => {
      input.addEventListener('blur', () => { if (input.value) showError(input, errorFor(input)); });
      input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') showError(input, errorFor(input)); });
    });

    const setStatus = (state, text) => {
      status.dataset.state = state;
      status.textContent = text || '';
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      let firstInvalid = null;
      fields.forEach((input) => {
        const err = errorFor(input);
        showError(input, err);
        if (err && !firstInvalid) firstInvalid = input;
      });
      if (firstInvalid) {
        setStatus('invalid', msg.invalid);
        firstInvalid.focus();
        return;
      }

      const endpoint = form.dataset.endpoint;
      if (!endpoint) {
        // Aucun service d'envoi branché : on le dit clairement, sans simuler de réussite.
        setStatus('error', msg.notConfigured);
        return;
      }

      submit.disabled = true;
      setStatus('sending', msg.sending);
      // Délai maximal : l'interface ne reste jamais bloquée sur « Envoi en cours ».
      const controller = 'AbortController' in window ? new AbortController() : null;
      const timeout = controller && setTimeout(() => controller.abort(), 15000);
      try {
        const data = Object.fromEntries(new FormData(form));
        data.lang = root.lang;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(data),
          signal: controller?.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        form.reset();
        fields.forEach((input) => input.removeAttribute('aria-invalid'));
        // Demande reçue ≠ réservation confirmée
        setStatus('success', msg.success);
      } catch {
        setStatus('error', msg.error);
      } finally {
        clearTimeout(timeout);
        submit.disabled = false;
      }
    });
  });

  /* ---------- WhatsApp : message prérempli à partir du formulaire ---------- */
  safely('WhatsApp', () => {
    const wa = document.querySelector('[data-whatsapp]');
    if (!wa || !msg.whatsapp) return;
    const build = () => {
      const f = msg.whatsapp.fields;
      const lines = [msg.whatsapp.intro];
      const add = (key, value) => { if (value) lines.push(`${f[key]} : ${value}`); };
      add('name', form.elements.name.value.trim());
      add('date', form.elements.date.value);
      add('time', form.elements.time.value);
      add('guests', form.elements.guests.value);
      wa.href = `https://wa.me/${wa.dataset.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`;
    };
    form.addEventListener('input', build);
    form.addEventListener('change', build);
  });
})();
