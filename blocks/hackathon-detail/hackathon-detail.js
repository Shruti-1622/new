export default function decorate(block) {
  if (!document.getElementById('hd-fonts')) {
    const link = document.createElement('link');
    link.id = 'hd-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&display=swap';
    document.head.appendChild(link);
  }

  // ── Parse TABLE data from da.live ─────────────────────────────────
  const data = {};
  const tracks = [];
  const timelineItems = [];
  const awards = [];

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const key = cells[0]?.textContent.trim().toLowerCase();
    if (!key) return;
    const val = cells[1];
    if (key === 'track' || key === 'timeline' || key === 'award') {
      const parts = (val?.textContent.trim() || '').split(';').map((p) => p.trim());
      if (key === 'track') tracks.push({ name: parts[0] || '', prize: parts[1] || '', description: parts[2] || '' });
      else if (key === 'timeline') timelineItems.push({ label: parts[0] || '', date: parts[1] || '' });
      else awards.push({ rank: parts[0] || '', amount: parts[1] || '' });
    } else {
      data[key] = val;
    }
  });

  document.body.classList.add('hk-detail-page');

  const hackId = window.location.pathname.replace(/\/$/, '');

  const title = data.title?.textContent.trim() || '';
  const organiser = (data.organiser || data.organizer)?.textContent.trim() || '';
  const tags = (data.tags?.textContent || '').split(',').map((t) => t.trim()).filter(Boolean);
  const status = data.status?.textContent.trim().toLowerCase() || 'upcoming';
  const format = data.format?.textContent.trim() || '';
  const description = data.description?.textContent.trim() || '';
  const prize = data.prize?.textContent.trim() || '';
  const dateText = data.date?.textContent.trim() || '';
  const teamText = data.team?.textContent.trim() || '';
  const deadline = data.deadline?.textContent.trim() || '';
  const teamDeadline = data.teamdeadline?.textContent.trim() || '';
  const registerEl = data.register?.querySelector('a');
  const sponsorText = data.sponsors?.textContent.trim() || '';
  const sponsors = sponsorText.split(',').map((s) => s.trim()).filter(Boolean);
  const registeredCount = parseInt(data.registered?.textContent.trim() || '0', 10);
  const totalSlots = parseInt(data.slots?.textContent.trim() || '0', 10);
  // Skills shown in registration form — authored in da.live `skills` row
  const skillsRaw = (data.skills?.textContent || 'React,Node.js,Python,ML/AI,AWS,Figma,Docker')
    .split(',').map((s) => s.trim()).filter(Boolean);

  const teamParts = teamText.split(/[-–]/);
  const minTeam = parseInt(teamParts[0]?.trim() || '1', 10);
  const maxTeam = parseInt(teamParts[1]?.trim() || '4', 10);
  const teamRequired = minTeam > 1;

  // ── State (localStorage — same keys as original) ──────────────────
  const state = {
    getUser() { try { return JSON.parse(localStorage.getItem('hackhub_user')); } catch { return null; } },
    setUser(u) { localStorage.setItem('hackhub_user', JSON.stringify(u)); localStorage.setItem('isLoggedIn', 'true'); },
    isLoggedIn() { return !!this.getUser() || localStorage.getItem('isLoggedIn') === 'true'; },
    email() { return (this.getUser()?.email) || ''; },
    regsKey() { return `hackhub_registrations_${this.email()}`; },
    isReg(id) { try { return (JSON.parse(localStorage.getItem(this.regsKey())) || []).some((r) => r.hackathonId === id); } catch { return false; } },
    addReg(id) {
      const rs = (() => { try { return JSON.parse(localStorage.getItem(this.regsKey())) || []; } catch { return []; } })();
      rs.push({ hackathonId: id, registeredAt: new Date().toISOString() });
      localStorage.setItem(this.regsKey(), JSON.stringify(rs));
    },
    isWish(id) {
      const slug = id.split('/').filter(Boolean).pop() || id;
      try { return JSON.parse(localStorage.getItem('hh-saved') || '[]').some((c) => c.key === slug); } catch { return false; }
    },
  };

  // ── Toast ─────────────────────────────────────────────────────────
  function showToast(msg, type = 'info') {
    let c = document.getElementById('hk-toast-wrap');
    if (!c) { c = document.createElement('div'); c.id = 'hk-toast-wrap'; c.className = 'hk-toast-wrap'; document.body.appendChild(c); }
    const icons = { success: '✅', error: '⚠️', info: 'ℹ️' };
    const t = document.createElement('div');
    t.className = `hk-toast hk-toast-${type}`;
    t.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.classList.add('hk-toast-out'); setTimeout(() => t.remove(), 300); }, 3500);
  }

  // ── Build page HTML ───────────────────────────────────────────────
  const perc = totalSlots ? Math.min(100, Math.round((registeredCount / totalSlots) * 100)) : 0;
  const spots = totalSlots - registeredCount;
  const alreadyReg = state.isReg(hackId);
  const wishSlug = hackId.split('/').filter(Boolean).pop() || hackId;
  const alreadyWish = (() => { try { return JSON.parse(localStorage.getItem('hh-saved') || '[]').some((c) => c.key === wishSlug); } catch { return false; } })();

  const tracksHtml = tracks.map((t) => `
    <div class="hd-track-card">
      <div class="hd-track-header">
        <span class="hd-track-name">${t.name}</span>
        <span class="hd-track-prize">${t.prize}</span>
      </div>
      <p class="hd-track-desc">${t.description}</p>
    </div>`).join('');

  const timelineHtml = timelineItems.map((t) => `
    <div class="hd-timeline-item">
      <div class="hd-timeline-label">${t.label}</div>
      <div class="hd-timeline-date">${t.date}</div>
    </div>`).join('');

  const sponsorsHtml = sponsors.map((s) => `<div class="hd-sponsor-chip">${s}</div>`).join('');

  const statusBadge = status === 'live'
    ? `<span class="hd-badge hd-badge-live"><span class="hd-badge-dot"></span>LIVE</span>`
    : `<span class="hd-badge">${status.toUpperCase()}</span>`;

  const teamBannerHtml = teamText ? (teamRequired
    ? `<div class="hd-team-banner">👥 This hackathon requires teams of ${minTeam}–${maxTeam}. You can register solo and find your team before the team deadline.</div>`
    : `<div class="hd-team-banner hd-team-solo">✓ Solo participation allowed. Teams up to ${maxTeam} members.</div>`) : '';

  const awardsTable = awards.length ? `
    <table class="hd-awards-table">
      <thead><tr><th>Rank</th><th>Amount</th></tr></thead>
      <tbody>${awards.map((a) => `<tr><td class="hd-award-rank">${a.rank}</td><td class="hd-award-amount">${a.amount}</td></tr>`).join('')}</tbody>
    </table>` : '';

  const heartSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
  const heartFilled = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;

  block.innerHTML = `
    <div class="hd-page">
      <a href="/hackathon" class="hd-back-btn">← Back to all hackathons</a>

      <div class="hd-tabs">
        <button class="hd-tab active" data-tab="hd-tab-overview">Overview</button>
        <button class="hd-tab" data-tab="hd-tab-tracks">Tracks &amp; Prizes</button>
        <button class="hd-tab" data-tab="hd-tab-timeline">Timeline</button>
        <button class="hd-tab" data-tab="hd-tab-sponsors">Sponsors</button>
      </div>

      <div class="hd-layout">
        <div class="hd-main">
          <div id="hd-tab-overview" class="hd-tab-content active">
            <h1 class="hd-title">${title}</h1>
            <p class="hd-organiser">Organised by ${organiser}</p>
            <div class="hd-badges">
              ${statusBadge}
              ${format ? `<span class="hd-badge">${format}</span>` : ''}
              ${tags.map((t) => `<span class="hd-badge">${t}</span>`).join('')}
            </div>
            ${teamBannerHtml}
            <p class="hd-description">${description}</p>
            ${tracksHtml ? `<h3 class="hd-section-h">Tracks</h3><div class="hd-tracks-grid">${tracksHtml}</div>` : ''}
          </div>

          <div id="hd-tab-tracks" class="hd-tab-content">
            ${tracksHtml ? `<h3 class="hd-section-h">Tracks</h3><div class="hd-tracks-grid">${tracksHtml}</div>` : ''}
            ${awardsTable}
          </div>

          <div id="hd-tab-timeline" class="hd-tab-content">
            <div class="hd-timeline-list">${timelineHtml}</div>
          </div>

          <div id="hd-tab-sponsors" class="hd-tab-content">
            <div class="hd-sponsors-flex">${sponsorsHtml}</div>
          </div>
        </div>

        <div class="hd-sidebar">
          <div class="hd-sidebar-prize">
            <div class="hd-sidebar-prize-label">Total Prize Pool</div>
            <div class="hd-sidebar-prize-value">${prize}</div>
          </div>

          <div class="hd-sidebar-grid">
            ${format ? `<div class="hd-sidebar-item"><div class="hd-sidebar-label">Format</div><div class="hd-sidebar-value">${format}</div></div>` : ''}
            ${teamText ? `<div class="hd-sidebar-item"><div class="hd-sidebar-label">Team Size</div><div class="hd-sidebar-value">${teamText}</div></div>` : ''}
            ${dateText ? `<div class="hd-sidebar-item hd-full"><div class="hd-sidebar-label">Dates</div><div class="hd-sidebar-value">${dateText}</div></div>` : ''}
          </div>

          ${totalSlots ? `
          <div class="hd-progress-wrap">
            <div class="hd-progress-header">
              <span class="hd-progress-label">Registered</span>
              <span class="hd-progress-count" id="hd-reg-count">${registeredCount} / ${totalSlots}</span>
            </div>
            <div class="hd-progress-bar"><div class="hd-progress-fill" id="hd-prog-fill" style="width:${perc}%"></div></div>
            <div class="hd-spots-left" id="hd-spots-left">${spots} spots left</div>
          </div>` : ''}

          ${deadline ? `<div class="hd-countdown" id="hd-cd-reg"></div>` : ''}
          ${teamDeadline ? `<div class="hd-countdown hd-cd-notop" id="hd-cd-team"></div>` : ''}

          <button class="hd-reg-btn${alreadyReg ? ' hd-registered' : ''}" id="hd-reg-btn">
            ${alreadyReg ? '✓ Registered — Go to Dashboard' : 'Register Now'}
          </button>
          <p class="hd-fee-info">Free to participate</p>

          <button class="hd-wish-btn${alreadyWish ? ' hd-wishlisted' : ''}" id="hd-wish-btn">
            ${alreadyWish ? heartFilled : heartSvg}
            <span id="hd-wish-label">${alreadyWish ? 'Wishlisted' : 'Add to Wishlist'}</span>
          </button>
        </div>
      </div>
    </div>`;

  // ── Tabs ──────────────────────────────────────────────────────────
  block.querySelectorAll('.hd-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      block.querySelectorAll('.hd-tab').forEach((b) => b.classList.remove('active'));
      block.querySelectorAll('.hd-tab-content').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      block.querySelector(`#${btn.dataset.tab}`)?.classList.add('active');
    });
  });

  // ── Countdowns ────────────────────────────────────────────────────
  function startCountdown(elId, iso, label) {
    const el = block.querySelector(`#${elId}`);
    if (!el) return;
    const end = new Date(iso).getTime();
    const tick = () => {
      const diff = end - Date.now();
      if (diff < 0) { el.innerHTML = `<div class="hd-cd-label">${label}</div><div class="hd-cd-closed">Closed</div>`; return; }
      const dd = Math.floor(diff / 86400000);
      const hh = Math.floor((diff % 86400000) / 3600000);
      const mm = Math.floor((diff % 3600000) / 60000);
      const ss = Math.floor((diff % 60000) / 1000);
      el.innerHTML = `
        <div class="hd-cd-label">${label}</div>
        <div class="hd-cd-timer">
          <div class="hd-cd-unit"><div class="hd-cd-val">${dd}</div><div class="hd-cd-sub">Days</div></div>
          <div class="hd-cd-sep">:</div>
          <div class="hd-cd-unit"><div class="hd-cd-val">${String(hh).padStart(2, '0')}</div><div class="hd-cd-sub">Hrs</div></div>
          <div class="hd-cd-sep">:</div>
          <div class="hd-cd-unit"><div class="hd-cd-val">${String(mm).padStart(2, '0')}</div><div class="hd-cd-sub">Mins</div></div>
          <div class="hd-cd-sep">:</div>
          <div class="hd-cd-unit"><div class="hd-cd-val">${String(ss).padStart(2, '0')}</div><div class="hd-cd-sub">Secs</div></div>
        </div>`;
    };
    tick(); setInterval(tick, 1000);
  }

  if (deadline) startCountdown('hd-cd-reg', deadline, 'Registration ends in');
  if (teamDeadline) startCountdown('hd-cd-team', teamDeadline, 'Team formation ends in');

  // ── Wishlist toggle — writes to hh-saved (same key/format as hackathon-cards) ─
  function hhGetSaved() { try { return JSON.parse(localStorage.getItem('hh-saved') || '[]'); } catch { return []; } }
  function hhIsSaved() { return hhGetSaved().some((c) => c.key === wishSlug); }
  function hhSave() {
    const saved = hhGetSaved();
    if (!saved.find((c) => c.key === wishSlug)) {
      saved.push({
        key: wishSlug, id: wishSlug,
        imgSrc: '', imgAlt: title,
        title, org: organiser, tag: tags[0] || '',
        date: dateText, prize, href: hackId,
      });
      localStorage.setItem('hh-saved', JSON.stringify(saved));
      window.dispatchEvent(new CustomEvent('hh:saved-change', { detail: { key: wishSlug, saved: true } }));
    }
  }
  function hhUnsave() {
    localStorage.setItem('hh-saved', JSON.stringify(hhGetSaved().filter((c) => c.key !== wishSlug)));
    window.dispatchEvent(new CustomEvent('hh:saved-change', { detail: { key: wishSlug, saved: false } }));
  }

  function doWishToggle() {
    const btn = block.querySelector('#hd-wish-btn');
    if (!btn) return;
    const isW = !hhIsSaved();
    if (isW) hhSave(); else hhUnsave();
    btn.classList.toggle('hd-wishlisted', isW);
    btn.innerHTML = `${isW ? heartFilled : heartSvg}<span id="hd-wish-label">${isW ? 'Wishlisted' : 'Add to Wishlist'}</span>`;
    showToast(isW ? 'Added to wishlist ❤️' : 'Removed from wishlist', 'info');
  }

  // ── Modal helpers ─────────────────────────────────────────────────
  function getModal(id) {
    let el = document.getElementById(id);
    if (!el) { el = document.createElement('div'); el.id = id; el.className = 'hk-overlay'; document.body.appendChild(el); }
    return el;
  }
  function openModal(id) { document.getElementById(id)?.classList.add('open'); }
  function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
  function closeAll() { document.querySelectorAll('.hk-overlay').forEach((m) => m.classList.remove('open')); }
  function onOutsideClick(overlay) {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAll(); });
  }

  // ── Login modal ───────────────────────────────────────────────────
  let pendingReg = false;

  function openLogin() {
    closeAll();
    const ov = getModal('hk-login-ov');
    ov.innerHTML = `
      <div class="hk-modal">
        <button class="hk-modal-x" id="hk-lx">✕</button>
        <div class="hk-modal-head"><h2>Welcome Back</h2><p>Sign in to HackHub to continue</p></div>
        <div class="hk-modal-body">
          <div class="hk-fg"><label class="hk-lbl">Email</label><input type="email" id="hk-le" class="hk-inp" placeholder="you@example.com"></div>
          <div class="hk-fg"><label class="hk-lbl">Password</label><input type="password" id="hk-lp" class="hk-inp" placeholder="••••••••"></div>
          <button class="hk-btn" id="hk-lgo">Login</button>
          <p class="hk-link-row">Don't have an account? <button id="hk-to-signup">Sign up</button></p>
        </div>
      </div>`;
    ov.classList.add('open');
    onOutsideClick(ov);
    ov.querySelector('#hk-lx').addEventListener('click', closeAll);
    ov.querySelector('#hk-to-signup').addEventListener('click', openSignup);
    ov.querySelector('#hk-lgo').addEventListener('click', doLogin);
    ov.querySelector('#hk-lp').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
  }

  function doLogin() {
    const email = document.getElementById('hk-le').value.trim().toLowerCase();
    if (!email || !email.includes('@')) { showToast('Enter a valid email', 'error'); return; }
    const btn = document.getElementById('hk-lgo');
    btn.innerHTML = '<span class="hk-spin"></span>'; btn.disabled = true;
    setTimeout(() => {
      state.setUser({ name: email.split('@')[0], email });
      closeAll();
      showToast(`Welcome back, ${email.split('@')[0]}!`, 'success');
      if (pendingReg) { pendingReg = false; openReg(); }
    }, 900);
  }

  // ── Signup modal ──────────────────────────────────────────────────
  function openSignup() {
    closeAll();
    const ov = getModal('hk-signup-ov');
    ov.innerHTML = `
      <div class="hk-modal">
        <button class="hk-modal-x" id="hk-sx">✕</button>
        <div class="hk-modal-head"><h2>Create Account</h2><p>Join HackHub</p></div>
        <div class="hk-modal-body">
          <div class="hk-form-row">
            <div class="hk-fg"><label class="hk-lbl">First Name <span class="hk-req">*</span></label><input type="text" id="hk-sfn" class="hk-inp"></div>
            <div class="hk-fg"><label class="hk-lbl">Last Name</label><input type="text" id="hk-sln" class="hk-inp"></div>
          </div>
          <div class="hk-fg"><label class="hk-lbl">Email <span class="hk-req">*</span></label><input type="email" id="hk-sem" class="hk-inp"></div>
          <div class="hk-fg">
            <label class="hk-lbl">Password <span class="hk-req">*</span></label>
            <input type="password" id="hk-spw" class="hk-inp">
            <div class="hk-pw-wrap"><div class="hk-pw-bar"><div id="hk-pw-fill" class="hk-pw-fill"></div></div><span id="hk-pw-lbl" class="hk-pw-lbl">Password strength</span></div>
          </div>
          <div class="hk-fg"><label class="hk-lbl">Role <span class="hk-req">*</span></label>
            <select id="hk-srl" class="hk-sel">
              <option value="">Select role</option>
              <option>Frontend Dev</option><option>Backend Dev</option><option>UI/UX Designer</option><option>ML Engineer</option><option>Other</option>
            </select>
          </div>
          <label class="hk-chk"><input type="checkbox" id="hk-stm"> <span>I agree to Terms of Service</span></label>
          <button class="hk-btn" id="hk-sgo">Create Account</button>
          <p class="hk-link-row">Already have an account? <button id="hk-to-login">Log in</button></p>
        </div>
      </div>`;
    ov.classList.add('open');
    onOutsideClick(ov);
    ov.querySelector('#hk-sx').addEventListener('click', closeAll);
    ov.querySelector('#hk-to-login').addEventListener('click', openLogin);
    ov.querySelector('#hk-sgo').addEventListener('click', doSignup);
    ov.querySelector('#hk-spw').addEventListener('input', (e) => checkStrength(e.target.value));
  }

  function checkStrength(v) {
    const fill = document.getElementById('hk-pw-fill');
    const lbl = document.getElementById('hk-pw-lbl');
    if (!fill) return;
    if (!v) { fill.style.width = '0'; lbl.textContent = 'Password strength'; return; }
    let s = 0;
    if (v.length >= 8) s += 1; if (/[A-Z]/.test(v)) s += 1;
    if (/[0-9]/.test(v)) s += 1; if (/[^A-Za-z0-9]/.test(v)) s += 1;
    const map = { 1: ['25%', '#ef4444', 'Weak'], 2: ['50%', '#f59e0b', 'Fair'], 3: ['75%', '#10b981', 'Good'], 4: ['100%', '#10b981', 'Strong'] };
    const [w, c, t] = map[s] || map[1];
    fill.style.width = w; fill.style.background = c; lbl.textContent = t; lbl.style.color = c;
  }

  function doSignup() {
    const fn = document.getElementById('hk-sfn').value.trim();
    const em = document.getElementById('hk-sem').value.trim().toLowerCase();
    const pw = document.getElementById('hk-spw').value;
    const tm = document.getElementById('hk-stm').checked;
    if (!fn || !em || !pw || !tm) { showToast('Please fill all required fields', 'error'); return; }
    const btn = document.getElementById('hk-sgo');
    btn.innerHTML = '<span class="hk-spin"></span>'; btn.disabled = true;
    setTimeout(() => {
      state.setUser({ name: fn, email: em });
      closeAll();
      showToast('Account created! Welcome to HackHub 🎉', 'success');
      if (pendingReg) { pendingReg = false; openReg(); }
    }, 1000);
  }

  // ── Registration wizard ───────────────────────────────────────────
  let wizStep = 1;
  let wizPref = '';
  let wizTeamEmailCount = 0;

  function openReg() {
    if (!state.isLoggedIn()) { pendingReg = true; showToast('Please login to register', 'info'); openLogin(); return; }
    if (state.isReg(hackId)) { showToast("You're already registered!", 'info'); return; }
    if (totalSlots && registeredCount >= totalSlots) { showToast('This hackathon is full.', 'error'); return; }
    wizStep = 1; renderWiz();
  }

  function renderWiz() {
    const ov = getModal('hk-reg-ov');
    const user = state.getUser() || {};
    const tdDate = teamDeadline ? teamDeadline.split('T')[0] : '';

    const dots = [1, 2, 3].map((i) => {
      const cls = i < wizStep ? 'hk-dot hk-done' : (i === wizStep ? 'hk-dot hk-active' : 'hk-dot');
      const inner = i < wizStep ? '✓' : i;
      return `<div class="${cls}">${inner}</div>${i < 3 ? `<div class="hk-dot-line${i < wizStep ? ' hk-done' : ''}"></div>` : ''}`;
    }).join('');

    let body = '';
    if (wizStep === 1) {
      const chips = skillsRaw.map((s) => `<div class="hk-chip" data-skill="${s}">${s}</div>`).join('');
      body = `
        <h2 class="hk-wiz-h">Your Details</h2>
        <div class="hk-fg"><label class="hk-lbl">Full Name <span class="hk-req">*</span></label><input type="text" id="hk-rn" class="hk-inp" value="${user.name || ''}"></div>
        <div class="hk-fg"><label class="hk-lbl">Email</label><input type="email" id="hk-re" class="hk-inp" value="${user.email || ''}" readonly></div>
        <div class="hk-fg"><label class="hk-lbl">GitHub URL <span class="hk-req">*</span></label><input type="url" id="hk-rg" class="hk-inp" placeholder="https://github.com/..."></div>
        <div class="hk-fg"><label class="hk-lbl">Experience <span class="hk-req">*</span></label>
          <select id="hk-rexp" class="hk-sel">
            <option value="">Select experience</option>
            <option value="student">Student</option>
            <option value="beg">Beginner (0–1 yr)</option>
            <option value="int">Intermediate (1–3 yrs)</option>
            <option value="sen">Senior (3+ yrs)</option>
          </select>
        </div>
        <div class="hk-fg"><label class="hk-lbl">Skills <span class="hk-req">*</span></label><div class="hk-chips-wrap" id="hk-chips">${chips}</div></div>
        <button class="hk-btn" id="hk-wn1">Continue →</button>`;
    } else if (wizStep === 2) {
      const policyBox = teamRequired
        ? `<div class="hk-policy hk-policy-warn">⚠️ This hackathon requires a team of ${minTeam}–${maxTeam} members. You can register solo and form your team before ${tdDate}.</div>`
        : `<div class="hk-policy hk-policy-info">ℹ️ Solo participation is allowed. You may optionally form a team of up to ${maxTeam} members.</div>`;
      body = `
        <h2 class="hk-wiz-h">Team Preference</h2>
        ${policyBox}
        <div class="hk-fg"><label class="hk-lbl">Preference <span class="hk-req">*</span></label>
          <select id="hk-rt" class="hk-sel">
            <option value="">Select option</option>
            ${!teamRequired ? "<option value='solo'>I'll participate solo</option>" : ''}
            <option value="have_team">I already have a team</option>
            <option value="find_team">I want to find a team after registering</option>
          </select>
        </div>
        <div id="hk-team-x" style="display:none;">
          <div class="hk-fg"><label class="hk-lbl">Team Name <span class="hk-req">*</span></label><input type="text" id="hk-rtn" class="hk-inp"></div>
          <div class="hk-fg"><label class="hk-lbl">Teammate Emails <span class="hk-muted">(comma separated, up to ${maxTeam - 1})</span></label><input type="text" id="hk-rte" class="hk-inp" placeholder="alice@example.com, bob@example.com"></div>
        </div>
        <button class="hk-btn" id="hk-wn2">Continue →</button>`;
    } else {
      let extra = '';
      let doneLabel = 'Go to Dashboard →';
      if (wizPref === 'have_team' && wizTeamEmailCount > 0) {
        extra = `<div class="hk-cl-item"><span class="hk-cl-chk">✓</span> Invitations sent to ${wizTeamEmailCount} teammate(s)</div>`;
      } else if (wizPref === 'find_team') {
        extra = `<div class="hk-cl-item"><span class="hk-cl-chk" style="color:#f59e0b">ℹ️</span> Looking for teammates</div>`;
        doneLabel = 'Go to Team Finder →';
      }
      body = `
        <div class="hk-success">
          <span class="hk-success-icon">🎉</span>
          <h2 class="hk-success-h">You're registered!</h2>
          <p class="hk-success-sub">Confirmation sent to ${user.email || 'your email'}</p>
          <div class="hk-checklist">
            <div class="hk-cl-item"><span class="hk-cl-chk">✓</span> Check your email for confirmation</div>
            <div class="hk-cl-item"><span class="hk-cl-chk">✓</span> Mark your calendar for ${dateText}</div>
            ${extra}
          </div>
          <button class="hk-btn" id="hk-wdone">${doneLabel}</button>
        </div>`;
    }

    ov.innerHTML = `
      <div class="hk-modal">
        <button class="hk-modal-x" id="hk-reg-close">✕</button>
        <div class="hk-steps">${dots}</div>
        <div class="hk-modal-body">${body}</div>
      </div>`;
    ov.classList.add('open');
    onOutsideClick(ov);
    ov.querySelector('#hk-reg-close').addEventListener('click', closeAll);

    if (wizStep === 1) {
      ov.querySelectorAll('.hk-chip').forEach((c) => c.addEventListener('click', () => c.classList.toggle('sel')));
      ov.querySelector('#hk-wn1').addEventListener('click', () => {
        const gh = ov.querySelector('#hk-rg').value;
        const expVal = ov.querySelector('#hk-rexp').value;
        const selChips = ov.querySelectorAll('.hk-chip.sel');
        if (!gh.includes('github.com')) { showToast('Valid GitHub URL required', 'error'); return; }
        if (!expVal || selChips.length === 0) { showToast('Please fill all required fields', 'error'); return; }
        wizStep = 2; renderWiz();
      });
    } else if (wizStep === 2) {
      ov.querySelector('#hk-rt').addEventListener('change', (e) => {
        const x = ov.querySelector('#hk-team-x');
        if (x) x.style.display = e.target.value === 'have_team' ? 'block' : 'none';
      });
      ov.querySelector('#hk-wn2').addEventListener('click', () => {
        const pref = ov.querySelector('#hk-rt').value;
        if (!pref) { showToast('Select team preference', 'error'); return; }
        if (pref === 'have_team') {
          const tn = ov.querySelector('#hk-rtn')?.value;
          if (!tn) { showToast('Enter team name', 'error'); return; }
          const emails = (ov.querySelector('#hk-rte')?.value || '').split(',').map((e) => e.trim()).filter(Boolean);
          if (emails.length > maxTeam - 1) { showToast(`Max ${maxTeam - 1} teammates allowed`, 'error'); return; }
          wizTeamEmailCount = emails.length;
        }
        wizPref = pref;
        wizStep = 3;
        state.addReg(hackId);
        // Optimistic sidebar update
        const newCount = registeredCount + 1;
        const newPerc = totalSlots ? Math.min(100, Math.round((newCount / totalSlots) * 100)) : 0;
        const cEl = block.querySelector('#hd-reg-count');
        const fEl = block.querySelector('#hd-prog-fill');
        const sEl = block.querySelector('#hd-spots-left');
        const rBtn = block.querySelector('#hd-reg-btn');
        if (cEl) cEl.textContent = `${newCount} / ${totalSlots}`;
        if (fEl) fEl.style.width = `${newPerc}%`;
        if (sEl) sEl.textContent = `${totalSlots - newCount} spots left`;
        if (rBtn) { rBtn.textContent = '✓ Registered — Go to Dashboard'; rBtn.classList.add('hd-registered'); }
        showToast('🎉 Registered successfully!', 'success');
        renderWiz();
      });
    } else {
      ov.querySelector('#hk-wdone').addEventListener('click', closeAll);
    }
  }

  // ── Register button click ─────────────────────────────────────────
  block.querySelector('#hd-reg-btn').addEventListener('click', () => {
    if (state.isReg(hackId)) { showToast("You're already registered!", 'info'); return; }
    openReg();
  });

  // ── Wishlist button click ─────────────────────────────────────────
  block.querySelector('#hd-wish-btn').addEventListener('click', () => {
    doWishToggle();
  });
}
