/* ═════════════════════════════════════════
   Organise Page — Interactivity
   ═════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Animated counter (count-up on scroll) ─────────
  const counters = document.querySelectorAll('.org-counter-num');
  let countersDone = false;

  function animateCounters() {
    if (countersDone) return;
    countersDone = true;

    counters.forEach(el => {
      const target = +el.dataset.target;
      const duration = 2000;
      const start = performance.now();

      function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out quad
        const ease = 1 - (1 - progress) * (1 - progress);
        el.textContent = Math.round(ease * target).toLocaleString();
        if (progress < 1) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
    });
  }

  // trigger counters when hero-counters visible
  const counterSection = document.querySelector('.org-hero-counters');
  if (counterSection) {
    const cObserver = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) animateCounters();
    }, { threshold: 0.5 });
    cObserver.observe(counterSection);
  }

  // ── Scroll reveal ──────────────────────────────────
  const revealEls = document.querySelectorAll('.reveal-card');
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('revealed');
      }
    });
  }, { threshold: 0.12 });

  revealEls.forEach(el => revealObserver.observe(el));

  // ── Multi-step form ────────────────────────────────
  const form = document.getElementById('orgForm');
  const formContainer = document.getElementById('orgFormContainer');
  const successEl = document.getElementById('orgSuccess');
  const progressFill = document.getElementById('orgProgressFill');
  const progressSteps = document.querySelectorAll('.org-progress-step');
  const formSteps = document.querySelectorAll('.org-form-step');

  let currentStep = 1;

  function goToStep(step) {
    // hide all steps
    formSteps.forEach(s => s.classList.remove('active'));
    // show target
    const target = document.querySelector(`.org-form-step[data-step="${step}"]`);
    if (target) target.classList.add('active');

    // update progress bar
    progressFill.style.width = `${(step / 3) * 100}%`;

    // update step indicators
    progressSteps.forEach(ps => {
      const psStep = +ps.dataset.step;
      ps.classList.remove('active', 'completed');
      if (psStep === step) ps.classList.add('active');
      else if (psStep < step) ps.classList.add('completed');
    });

    currentStep = step;

    // If step 3, populate review
    if (step === 3) populateReview();

    // Smooth scroll to form top
    formContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Validation
  function validateStep(step) {
    let valid = true;

    // Clear previous errors
    document.querySelectorAll('.error, .error-msg').forEach(el => {
      if (el.classList.contains('error-msg')) el.remove();
      else el.classList.remove('error');
    });

    if (step === 1) {
      const name = document.getElementById('orgName');
      const email = document.getElementById('orgEmail');
      const company = document.getElementById('orgCompany');

      if (!name.value.trim()) { showError(name, 'Name is required'); valid = false; }
      if (!email.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        showError(email, 'Valid email is required'); valid = false;
      }
      if (!company.value.trim()) { showError(company, 'Company is required'); valid = false; }
    }

    if (step === 2) {
      const eventName = document.getElementById('orgEventName');
      const format = document.getElementById('orgFormat');

      if (!eventName.value.trim()) { showError(eventName, 'Event name is required'); valid = false; }
      if (!format.value) { showError(format, 'Please select a format'); valid = false; }
    }

    return valid;
  }

  function showError(el, msg) {
    el.classList.add('error');
    const err = document.createElement('span');
    err.className = 'error-msg';
    err.textContent = msg;
    el.parentElement.appendChild(err);

    // Shake animation
    el.style.animation = 'none';
    el.offsetHeight; // reflow
    el.style.animation = 'shake 0.4s ease';
  }

  // Add shake keyframe dynamically
  const shakeStyle = document.createElement('style');
  shakeStyle.textContent = `@keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }`;
  document.head.appendChild(shakeStyle);

  // Clear error on input
  document.querySelectorAll('.org-form-group input, .org-form-group select, .org-form-group textarea')
    .forEach(el => {
      el.addEventListener('input', () => {
        el.classList.remove('error');
        const errMsg = el.parentElement.querySelector('.error-msg');
        if (errMsg) errMsg.remove();
      });
    });



  // Step navigation buttons
  document.getElementById('step1Next').addEventListener('click', () => {
    if (validateStep(1)) goToStep(2);
  });

  document.getElementById('step2Back').addEventListener('click', () => goToStep(1));
  document.getElementById('step2Next').addEventListener('click', () => {
    if (validateStep(2)) goToStep(3);
  });

  document.getElementById('step3Back').addEventListener('click', () => goToStep(2));

  // Populate review
  function populateReview() {
    const personalGrid = document.getElementById('reviewPersonal');
    const eventGrid = document.getElementById('reviewEvent');

    personalGrid.innerHTML = makeReviewItem('Name', document.getElementById('orgName').value)
      + makeReviewItem('Email', document.getElementById('orgEmail').value)
      + makeReviewItem('Company', document.getElementById('orgCompany').value)
      + makeReviewItem('Role', document.getElementById('orgRole').value || '—');

    eventGrid.innerHTML = makeReviewItem('Event Name', document.getElementById('orgEventName').value)
      + makeReviewItem('Format', document.getElementById('orgFormat').value || '—')
      + makeReviewItem('Participants', document.getElementById('orgParticipants').value || '—')
      + makeReviewItem('Timeline', document.getElementById('orgTimeline').value || '—')
      + makeReviewItem('Details', document.getElementById('orgDetails').value || '—');
  }

  function makeReviewItem(label, value) {
    return `<div class="org-review-item">
      <span class="review-label">${label}</span>
      <span class="review-value">${escapeHtml(value)}</span>
    </div>`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Form submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const btn = document.getElementById('orgSubmitBtn');
    btn.disabled = true;
    btn.innerHTML = `
      <svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10" stroke-dasharray="31.4" stroke-dashoffset="10" stroke-linecap="round"/>
      </svg>
      Submitting...`;

    // Add spinner animation
    const spinStyle = document.createElement('style');
    spinStyle.textContent = `.spinner { animation: spin 0.8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(spinStyle);

    // Simulate API call
    setTimeout(() => {
      formContainer.style.display = 'none';
      successEl.style.display = 'block';
      successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Confetti burst
      launchConfetti();
    }, 1800);
  });

  // ── Confetti celebration ───────────────────────────
  function launchConfetti() {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#D9A441', '#e8b84a', '#f5c14e', '#b07d2e', '#ffffff', '#808080'];
    const particles = [];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 1) * 18 - 4,
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12,
        gravity: 0.35 + Math.random() * 0.15,
        opacity: 1,
        decay: 0.008 + Math.random() * 0.008
      });
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach(p => {
        if (p.opacity <= 0) return;
        alive = true;

        p.x += p.vx;
        p.vy += p.gravity;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.opacity -= p.decay;
        p.vx *= 0.99;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      if (alive) {
        requestAnimationFrame(animate);
      } else {
        canvas.remove();
      }
    }

    requestAnimationFrame(animate);
  }

  // ── Smooth scroll for CTA ─────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

})();
