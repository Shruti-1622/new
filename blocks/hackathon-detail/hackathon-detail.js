const MONTHS = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

// Parses the freeform authored `date` text ("July 9 – 10, 2026" or
// "November 15, 2026 – March 1, 2027" or "July 8, 2026") into real start/end
// Date objects, so the calendar link doesn't need its own ISO date field.
function parseEventDates(dateText) {
  if (!dateText) return null;
  let m = dateText.match(/^([A-Za-z]+)\s+(\d{1,2})(?:\s*[–-]\s*(\d{1,2}))?,\s*(\d{4})$/);
  if (m) {
    const [, monthName, d1, d2, year] = m;
    const month = MONTHS[monthName.toLowerCase()];
    if (month === undefined) return null;
    const start = new Date(Number(year), month, Number(d1));
    const end = new Date(Number(year), month, Number(d2 || d1));
    return { start, end };
  }
  m = dateText.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})\s*[–-]\s*([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (m) {
    const [, m1, d1, y1, m2, d2, y2] = m;
    const month1 = MONTHS[m1.toLowerCase()];
    const month2 = MONTHS[m2.toLowerCase()];
    if (month1 === undefined || month2 === undefined) return null;
    return { start: new Date(Number(y1), month1, Number(d1)), end: new Date(Number(y2), month2, Number(d2)) };
  }
  return null;
}

// Deliberately uses local getters, not toISOString() -- these dates were built
// with `new Date(y, m, d)` (local midnight), and converting to UTC first can
// shift the calendar day by one depending on the viewer's timezone.
function toGCalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

// Google Calendar all-day events treat the end date as exclusive, so it needs
// bumping by one day to actually cover the last day of the hackathon.
function buildGoogleCalendarUrl({ title, description, location, start, end }) {
  const endExclusive = new Date(end);
  endExclusive.setDate(endExclusive.getDate() + 1);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${toGCalDate(start)}/${toGCalDate(endExclusive)}`,
    details: description,
    location: location || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

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

  // ── State (localStorage — same real site session every other block uses) ──
  const state = {
    isLoggedIn() { return localStorage.getItem('isLoggedIn') === 'true'; },
    email() { return (localStorage.getItem('currentUserEmail') || '').trim().toLowerCase(); },
    getUser() {
      const email = this.email();
      if (!email) return null;
      let name = email.split('@')[0];
      try {
        const profile = JSON.parse(localStorage.getItem('hk_profile') || 'null');
        if (profile?.name) name = profile.name;
      } catch { /* fall back to email-derived name */ }
      return { name, email };
    },
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
  const eventDates = parseEventDates(dateText);
  const calendarUrl = eventDates ? buildGoogleCalendarUrl({
    title,
    description: description.slice(0, 900),
    location: format,
    start: eventDates.start,
    end: eventDates.end,
  }) : null;
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

          ${calendarUrl ? `
          <a class="hd-calendar-btn" href="${calendarUrl}" target="_blank" rel="noopener">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>Add to Calendar</span>
          </a>` : ''}
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

  // ── Registration wizard ───────────────────────────────────────────
  let wizStep = 1;
  let wizPref = '';
  let wizTeamEmailCount = 0;

  function openReg() {
    if (!state.isLoggedIn()) {
      window.location.href = `/auth-form?mode=login&redirect=${encodeURIComponent(window.location.href)}`;
      return;
    }
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
