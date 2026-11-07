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
    window.matchMedia('(min-width: 72rem)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
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

  /* ---------- Fondu des photographies différées (jamais l'image principale, chargée en priorité) ---------- */
  safely('images', () => {
    if (reduceMotion) return;
    document.querySelectorAll('.media img[loading="lazy"]').forEach((img) => {
      if (img.complete) return;
      img.classList.add('is-loading');
      const done = () => img.classList.remove('is-loading');
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    });
  });

  /* ---------- Modules externes chargés à la demande (plan Google Maps, système de réservation) ----------
     Rien n'est demandé au service tiers avant le clic ; sans JavaScript, le lien ouvre le service. */
  safely('modules à la demande', () => {
    document.querySelectorAll('[data-embed]').forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        const target = document.getElementById(trigger.dataset.embedTarget);
        if (!target) return;
        e.preventDefault();
        const frame = document.createElement('iframe');
        frame.src = trigger.dataset.embed;
        frame.title = trigger.dataset.embedTitle || '';
        frame.loading = 'lazy';
        frame.referrerPolicy = 'no-referrer-when-downgrade';
        frame.className = 'embed-frame__iframe';
        target.hidden = false;
        target.classList.add('is-loaded');
        target.replaceChildren(frame);
        if (trigger.isConnected && !target.contains(trigger)) trigger.remove();
        frame.focus();
      });
    });
  });

  /* ---------- Galerie : agrandissement des photographies ----------
     Fenêtre modale native (<dialog>) : focus contenu, Échap pour fermer, retour du focus,
     flèches du clavier (sens inversé en arabe), glissement au doigt. */
  safely('galerie', () => {
    const grid = document.querySelector('[data-gallery]');
    const links = grid ? Array.from(grid.querySelectorAll('[data-lightbox]')) : [];
    if (!links.length || typeof HTMLDialogElement !== 'function') return;
    const L = JSON.parse(grid.dataset.labels || '{}');
    const rtl = root.dir === 'rtl';
    const dialog = document.createElement('dialog');
    dialog.className = 'lightbox';
    dialog.setAttribute('aria-label', L.dialog || '');
    dialog.innerHTML = `<figure class="lightbox__figure"><div class="lightbox__frame"></div><figcaption class="lightbox__caption"></figcaption></figure>
      <p class="lightbox__counter" aria-live="polite"></p>
      <button class="lightbox__btn lightbox__close" type="button"><span aria-hidden="true">×</span></button>
      <button class="lightbox__btn lightbox__prev" type="button"><span aria-hidden="true">‹</span></button>
      <button class="lightbox__btn lightbox__next" type="button"><span aria-hidden="true">›</span></button>`;
    const [btnClose, btnPrev, btnNext] = ['close', 'prev', 'next'].map((k) => {
      const b = dialog.querySelector(`.lightbox__${k}`);
      b.setAttribute('aria-label', L[k] || k);
      return b;
    });
    if (links.length < 2) { btnPrev.hidden = true; btnNext.hidden = true; }
    document.body.append(dialog);
    const frame = dialog.querySelector('.lightbox__frame');
    const caption = dialog.querySelector('.lightbox__caption');
    const counter = dialog.querySelector('.lightbox__counter');
    let index = 0;
    let opener = null;

    const show = (i) => {
      index = (i + links.length) % links.length;
      const link = links[index];
      const pic = link.querySelector('picture');
      const clone = pic ? pic.cloneNode(true) : document.createElement('img');
      clone.querySelectorAll('source').forEach((s) => s.setAttribute('sizes', '100vw'));
      const img = clone.tagName === 'IMG' ? clone : clone.querySelector('img');
      if (!pic) img.src = link.href;
      img.removeAttribute('loading');
      img.classList.remove('is-loading');
      img.draggable = false; // le glissement sert à changer de photo, pas à déplacer l'image
      frame.replaceChildren(clone);
      caption.textContent = img.alt || '';
      counter.textContent = (L.counter || '{n} / {total}').replace('{n}', index + 1).replace('{total}', links.length);
    };
    const open = (i) => {
      opener = document.activeElement;
      show(i);
      dialog.showModal();
      root.classList.add('lightbox-open');
      btnClose.focus();
    };
    const close = () => dialog.close();
    dialog.addEventListener('close', () => {
      root.classList.remove('lightbox-open');
      frame.replaceChildren();
      if (opener && opener.focus) opener.focus();
    });

    links.forEach((link, i) => link.addEventListener('click', (e) => { e.preventDefault(); open(i); }));
    btnClose.addEventListener('click', close);
    btnPrev.addEventListener('click', () => show(index - 1));
    btnNext.addEventListener('click', () => show(index + 1));
    dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); show(index + (rtl ? -1 : 1)); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(index + (rtl ? 1 : -1)); }
    });
    // Glissement horizontal (écrans tactiles) : vers la gauche = suivante (inversé en arabe)
    let startX = null;
    dialog.addEventListener('pointerdown', (e) => { startX = e.clientX; });
    dialog.addEventListener('pointercancel', () => { startX = null; });
    dialog.addEventListener('pointerup', (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 50) show(index + ((dx < 0) !== rtl ? 1 : -1));
    });
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
    // Avec JavaScript, la validation est faite ici (messages traduits) ; sans JavaScript, le navigateur s'en charge.
    form.noValidate = true;

    // Dates au fuseau du restaurant (mêmes règles que le serveur : server/reservation/rules.mjs)
    const isoInMorocco = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca' }).format(d);
    const todayISO = isoInMorocco(new Date());
    const maxDays = Number(form.dataset.maxDays) || 180;
    const maxISO = isoInMorocco(new Date(Date.now() + maxDays * 864e5));
    if (dateInput) { dateInput.min = todayISO; dateInput.max = maxISO; }

    // Horaires d'ouverture publiés par le build (site.json › openingHours), s'ils sont fournis
    let hours = null;
    safely('horaires', () => { if (form.dataset.openingHours) hours = JSON.parse(form.dataset.openingHours); });
    const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const minutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
    const rangesOf = (date) => hours.days[DAYS[(new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7]] || [];
    // Jour : fermeture exceptionnelle ou jour de fermeture habituel
    const dayError = (date) => {
      if (!hours || !hours.days || !date) return '';
      if ((hours.closures || []).includes(date)) return errorsText.closure;
      return rangesOf(date).length ? '' : errorsText.closedDay;
    };
    // Heure : en dehors des plages du jour choisi (jour ouvert)
    const timeError = (date, time) => {
      if (!hours || !hours.days || !date || !time || dayError(date)) return '';
      const t = minutes(time);
      const inside = rangesOf(date).some(([a, b]) => { const s = minutes(a); const e = minutes(b); return e > s ? t >= s && t < e : t >= s || t < e; });
      return inside ? '' : errorsText.outsideHours;
    };

    // Temps de saisie (anti-robot côté serveur) : mesuré à la première interaction
    const started = form.elements.started;
    // Anti-robot Turnstile (seulement s'il est configuré) : script tiers chargé à la première interaction, jamais avant
    const turnstileBox = form.querySelector('.cf-turnstile');
    form.addEventListener('focusin', () => {
      if (started && !started.value) started.value = String(Date.now());
      if (turnstileBox) {
        const s = document.createElement('script');
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        s.async = true;
        document.head.append(s);
      }
    }, { once: true });

    const errorFor = (input) => {
      if (input.type === 'checkbox') return input.required && !input.checked ? errorsText.consent : '';
      const v = input.value.trim();
      if (input.required && !v) return errorsText.required;
      if (!v) return '';
      if (input.maxLength > 0 && v.length > input.maxLength) return errorsText.tooLong;
      if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return errorsText.email;
      if (input.type === 'tel') {
        const digits = v.replace(/\D/g, '');
        if (!/^[+0-9 ().-]+$/.test(v) || digits.length < 8 || digits.length > 15) return errorsText.phone;
      }
      if (input.name === 'date') {
        if (v < todayISO) return errorsText.date;
        if (v > maxISO) return errorsText.dateTooFar;
        const closed = dayError(v);
        if (closed) return closed;
      }
      if (input.name === 'time') {
        if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(v) || Number(v.slice(3)) % 15) return errorsText.time;
        const outside = timeError(dateInput?.value, v);
        if (outside) return outside;
      }
      return '';
    };

    const showError = (input, text) => {
      const box = document.getElementById(`e-${input.name}`);
      if (box) box.textContent = text || '';
      input.setAttribute('aria-invalid', text ? 'true' : 'false');
    };

    const fields = Array.from(form.querySelectorAll('input:not([type="hidden"]):not([name="website"]), select, textarea'));
    fields.forEach((input) => {
      input.addEventListener('blur', () => { if (input.value && input.type !== 'checkbox') showError(input, errorFor(input)); });
      input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') showError(input, errorFor(input)); });
      input.addEventListener('change', () => { if (input.type === 'checkbox' && input.getAttribute('aria-invalid') === 'true') showError(input, errorFor(input)); });
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
        data.consent = form.elements.consent?.checked ? 'yes' : '';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(data),
          signal: controller?.signal,
        });
        const body = await res.json().catch(() => ({}));
        if (res.status === 202 && body.status === 'pending') {
          form.reset();
          if (started) started.value = '';
          fields.forEach((input) => input.removeAttribute('aria-invalid'));
          // Demande transmise ≠ réservation confirmée : elle reste en attente de la réponse du restaurant.
          // L'accusé de réception n'est mentionné que s'il a réellement été envoyé au client.
          setStatus('success', body.acknowledged && msg.ackSent ? `${msg.success} ${msg.ackSent}` : msg.success);
        } else if (res.ok && body.status === 'simulated') {
          // Mode test : rien n'a été transmis au restaurant, on le dit
          setStatus('error', msg.simulated);
        } else if (res.status === 422 && body.fields) {
          // Contrôle serveur : on affiche les mêmes messages que dans le navigateur
          let first = null;
          Object.entries(body.fields).forEach(([name, code]) => {
            const input = form.elements[name];
            if (input && input.nodeType === 1) { showError(input, errorsText[code] || errorsText.required); first = first || input; }
          });
          setStatus('invalid', msg.invalid);
          if (first) first.focus();
        } else if (res.status === 429) {
          setStatus('error', msg.rateLimited);
        } else {
          throw new Error(String(res.status));
        }
      } catch {
        setStatus('error', msg.error);
      } finally {
        clearTimeout(timeout);
        submit.disabled = false;
        // Un jeton anti-robot ne sert qu'une fois
        if (turnstileBox && window.turnstile) safely('turnstile', () => window.turnstile.reset(turnstileBox));
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
