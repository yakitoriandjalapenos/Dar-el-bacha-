/* DAR EL BACHA — script principal.
   Léger, sans dépendance, chargé en différé. Le site reste utilisable sans lui. */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Menu mobile ---------- */
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('primary-nav');
  if (toggle && nav) {
    const label = toggle.querySelector('.nav-toggle__label');
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
      label.textContent = open ? toggle.dataset.labelClose : toggle.dataset.labelOpen;
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    window.matchMedia('(min-width: 64rem)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
  }

  /* ---------- Apparition progressive (une seule fois par élément) ---------- */
  const revealables = document.querySelectorAll('[data-reveal]');
  if (revealables.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealables.forEach((el) => el.classList.add('is-visible'));
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -10% 0px' });
      revealables.forEach((el) => io.observe(el));
    }
  }

  /* ---------- Formulaire de demande de réservation ---------- */
  const form = document.getElementById('reservation-form');
  if (!form) return;

  const msg = JSON.parse(form.dataset.messages || '{}');
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
    if (input.required && !v) return msg.errors.required;
    if (!v) return '';
    if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return msg.errors.email;
    if (input.type === 'tel') {
      const digits = v.replace(/\D/g, '');
      if (!/^[+0-9 ().-]+$/.test(v) || digits.length < 8 || digits.length > 15) return msg.errors.phone;
    }
    if (input.name === 'date' && v < todayISO) return msg.errors.date;
    return '';
  };

  const showError = (input, text) => {
    const box = document.getElementById(`e-${input.name}`);
    if (box) box.textContent = text;
    input.setAttribute('aria-invalid', text ? 'true' : 'false');
  };

  const fields = Array.from(form.querySelectorAll('input:not([name="website"]), select, textarea'));
  fields.forEach((input) => {
    input.addEventListener('blur', () => { if (input.value) showError(input, errorFor(input)); });
    input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') showError(input, errorFor(input)); });
  });

  const setStatus = (state, text) => {
    status.dataset.state = state;
    status.textContent = text;
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
    try {
      const data = Object.fromEntries(new FormData(form));
      data.lang = document.documentElement.lang;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      fields.forEach((input) => input.removeAttribute('aria-invalid'));
      // Demande reçue ≠ réservation confirmée
      setStatus('success', msg.success);
    } catch {
      setStatus('error', msg.error);
    } finally {
      submit.disabled = false;
    }
  });

  /* ---------- WhatsApp : message prérempli à partir du formulaire ---------- */
  const wa = document.querySelector('[data-whatsapp]');
  if (wa) {
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
  }
})();
