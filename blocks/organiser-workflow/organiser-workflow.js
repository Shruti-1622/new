// organiser-workflow.js — EDS block
// Simulates the HackVerse organisation → admin → student workflow.
// Model: organisations only ever fill a form (no account, no dashboard for
// them) -- HackVerse's admin team manages everything on their behalf from a
// single Admin Dashboard. Login/signup is NOT reinvented -- Admins use the
// site's existing /auth-form page and isLoggedIn/currentUserEmail session
// (same one every other block already uses); whether a logged-in email is
// an admin is decided purely by checking it against a da.live-configured
// list, nothing hardcoded.
//   Organiser Workflow            -> landing/pitch page with the hackathon
//                                     submission form built right in (no
//                                     login required to submit a request)
//   Organiser Workflow (dashboard)-> gated to admins only; five-tab sidebar:
//                                     Dashboard, Organisation Requests,
//                                     Hackathons, Registrations, Export.
//                                     Hackathon/registration counts merge this
//                                     workflow's own data with the real site's
//                                     pre-existing hackathon pages (author-
//                                     configured slug list, since there's no
//                                     query-index) and real per-user
//                                     registrations already recorded by
//                                     hackathon-detail.js.
//   Organiser Workflow (student)  -> student browse + register page
// Dynamic data (submissions/approvals/registrations) lives in localStorage,
// standing in for a real backend. All copy/labels are author-editable via
// da.live config rows (see parseConfig) — nothing user-facing is hardcoded.

// ── da.live config ──────────────────────────────────────────────────────────
function parseConfig(block) {
  const cfg = {};
  [...block.querySelectorAll(':scope > div')].forEach((row) => {
    const cols = [...row.querySelectorAll(':scope > div')];
    if (cols.length < 2) return;
    const key = cols[0].textContent.trim().toLowerCase().replace(/\s+/g, '-');
    cfg[key] = cols[1].textContent.trim();
  });
  return cfg;
}

let _cfg = {};
function p(key, fallback) {
  return _cfg[key] || fallback;
}

// ── localStorage helpers (isolated so a real backend can swap in later) ─────
// TODO(backend): replace these with real API calls (GET/POST) when a server
// exists — the rest of this file only talks to these functions.
function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* */ }
}

function getPending() { return lsGet('pendingHackathons', []); }
function setPending(v) { lsSet('pendingHackathons', v); }
function getApproved() { return lsGet('approvedHackathons', []); }
function setApproved(v) { lsSet('approvedHackathons', v); }
function getRegistrations() { return lsGet('registrations', []); }
function setRegistrations(v) { lsSet('registrations', v); }

// ── Real site session (same keys/pages every other block already uses) ──────
function isSiteLoggedIn() { return localStorage.getItem('isLoggedIn') === 'true'; }
function getSessionEmail() { return (localStorage.getItem('currentUserEmail') || '').trim().toLowerCase(); }
function siteLogout() {
  ['isLoggedIn', 'currentUserEmail', 'hk_profile', 'hk_notifications', 'hackhub_user'].forEach((k) => localStorage.removeItem(k));
}
function isAdminEmail(email) {
  const list = p('admin-emails', '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(email);
}

// ── Real site data: registrations already made on live hackathon pages ─────
// hackathon-detail.js writes one array per user to `hackhub_registrations_<email>`
// (shape: {hackathonId, registeredAt}) whenever a student registers on a real
// /hackathons/<slug> page. Scanning every such key (rather than one fixed key)
// is the only way to see registrations made by more than one account in this
// browser, since there's no backend to aggregate them centrally.
function getSiteRegistrations() {
  const out = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('hackhub_registrations_')) continue;
    const email = key.slice('hackhub_registrations_'.length);
    let list;
    try { list = JSON.parse(localStorage.getItem(key)) || []; } catch { list = []; }
    list.forEach((r) => out.push({ email, hackathonId: r.hackathonId, registeredAt: r.registeredAt }));
  }
  return out;
}

function getSiteProfile(email) {
  try {
    const profiles = JSON.parse(localStorage.getItem('hk_profiles') || '{}');
    return profiles[email] || null;
  } catch {
    return null;
  }
}

// ── Real site data: hackathons that already exist as da.live pages ─────────
// There's no query-index (forbidden for this project) and no site-wide slug
// list, so the admin page's `legacy-hackathon-slugs` config row is the only
// way to tell this block which pre-existing /hackathons/<slug> pages to fold
// in. Fetched lazily/fire-and-forget so it never blocks page load.
async function fetchLegacyHackathons() {
  const slugs = p('legacy-hackathon-slugs', '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!slugs.length) return [];

  const results = await Promise.all(slugs.map(async (slug) => {
    const path = slug.startsWith('/') ? slug : `/hackathons/${slug}`;
    try {
      const res = await fetch(`${path}.plain.html`);
      if (!res.ok) return null;
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const detail = doc.querySelector('.hackathon-detail');
      if (!detail) return null;
      const data = {};
      [...detail.querySelectorAll(':scope > div')].forEach((row) => {
        const cols = [...row.querySelectorAll(':scope > div')];
        if (cols.length < 2) return;
        data[cols[0].textContent.trim().toLowerCase()] = cols[1].textContent.trim();
      });
      return {
        id: path,
        hackathonName: data.title || slug,
        company: data.organiser || data.organizer || '—',
        deadline: data.deadline || '',
        prize: data.prize || '',
        source: 'legacy',
      };
    } catch {
      return null;
    }
  }));

  return results.filter(Boolean);
}

function genId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Toast ─────────────────────────────────────────────────────────────────
function showToast(block, msg) {
  let wrap = block.querySelector('#ow-toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'ow-toast-wrap';
    wrap.id = 'ow-toast-wrap';
    block.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = 'ow-toast';
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => { t.classList.add('ow-toast-out'); setTimeout(() => t.remove(), 300); }, 3200);
}

// ── CSV export ────────────────────────────────────────────────────────────
function downloadCSV(filename, headerRow, rows) {
  const escCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headerRow, ...rows].map((r) => r.map(escCell).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function loadFonts() {
  if (document.querySelector('link[data-font="ow-fonts"], link[data-font="hc-fonts"], link[data-font="bebas-neue"], link[data-font="fb-fonts"], link[data-font="hof-fonts"]')) return;
  const pc1 = document.createElement('link'); pc1.rel = 'preconnect'; pc1.href = 'https://fonts.googleapis.com';
  const pc2 = document.createElement('link'); pc2.rel = 'preconnect'; pc2.href = 'https://fonts.gstatic.com'; pc2.crossOrigin = '';
  const fl = document.createElement('link'); fl.rel = 'stylesheet'; fl.dataset.font = 'ow-fonts';
  fl.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap';
  document.head.append(pc1, pc2, fl);
}

// ── LANDING page: pitch + submission form + thank-you ──────────────────────
function decorateLanding(block) {
  block.innerHTML = `
    <div class="ow-hero">
      <span class="ow-eyebrow">${esc(p('eyebrow', 'Partner With Us'))}</span>
      <h1 class="ow-title">${esc(p('title', 'Reach Thousands of Student Innovators'))}</h1>
      <p class="ow-story">${esc(p('story', 'HackVerse connects your hackathon with a growing community of students who are actively browsing, comparing, and applying to events every week. We bring the audience — you bring the challenge.'))}</p>
      <div class="ow-usp-grid">
        <div class="ow-usp-card">
          <h3>${esc(p('usp1-title', 'Built-In Reach'))}</h3>
          <p>${esc(p('usp1-desc', 'Your event gets discovered by students already looking for hackathons — no marketing spend required.'))}</p>
        </div>
        <div class="ow-usp-card">
          <h3>${esc(p('usp2-title', 'Skill-Matched Applicants'))}</h3>
          <p>${esc(p('usp2-desc', 'Students see how well their skills fit before applying, so you get relevant sign-ups, not just noise.'))}</p>
        </div>
        <div class="ow-usp-card">
          <h3>${esc(p('usp3-title', 'Zero Setup, Fully Managed'))}</h3>
          <p>${esc(p('usp3-desc', 'We handle the page, the applicants, and the registrations — you just review and approve.'))}</p>
        </div>
      </div>
      <a class="ow-cta-btn" href="#ow-submit-section">${esc(p('cta-label', 'Start Organising'))}</a>
    </div>
    <div class="ow-hero" id="ow-submit-section">
      <div class="ow-card" id="ow-submit-card"></div>
    </div>
    <div class="ow-toast-wrap" id="ow-toast-wrap"></div>`;

  renderSubmissionForm(block);
}

function renderSubmissionForm(block) {
  const card = block.querySelector('#ow-submit-card');
  card.innerHTML = `
    <h2>${esc(p('form-title', 'Submit Your Hackathon'))}</h2>
    <div class="ow-field-row">
      <div class="ow-field">
        <label>${esc(p('label-company', 'Company Name'))}</label>
        <input type="text" id="ow-f-company" placeholder="Acme Inc.">
      </div>
      <div class="ow-field">
        <label>${esc(p('label-contact', 'Contact Person'))}</label>
        <input type="text" id="ow-f-contact" placeholder="Jane Doe">
      </div>
    </div>
    <div class="ow-field-row">
      <div class="ow-field">
        <label>${esc(p('label-contact-email', 'Contact Email'))}</label>
        <input type="email" id="ow-f-contact-email" placeholder="jane@company.com">
      </div>
      <div class="ow-field">
        <label>${esc(p('label-hackathon-name', 'Hackathon Name'))}</label>
        <input type="text" id="ow-f-hack-name" placeholder="InnovateTech 2026">
      </div>
    </div>
    <div class="ow-field">
      <label>${esc(p('label-description', 'Description'))}</label>
      <textarea id="ow-f-description" rows="3" placeholder="Themes, goals, what makes your hackathon worth joining…"></textarea>
    </div>
    <div class="ow-field-row">
      <div class="ow-field">
        <label>${esc(p('label-deadline', 'Registration Deadline'))}</label>
        <input type="date" id="ow-f-deadline">
      </div>
      <div class="ow-field">
        <label>${esc(p('label-team-size', 'Team Size'))}</label>
        <input type="text" id="ow-f-team-size" placeholder="2-4">
      </div>
    </div>
    <div class="ow-field-row">
      <div class="ow-field">
        <label>${esc(p('label-prize', 'Prize Pool'))}</label>
        <input type="text" id="ow-f-prize" placeholder="₹5,00,000">
      </div>
      <div class="ow-field">
        <label>${esc(p('label-banner', 'Banner Image'))}</label>
        <input type="file" id="ow-f-banner" accept="image/*">
      </div>
    </div>
    <button type="button" class="ow-btn-primary" id="ow-org-submit">${esc(p('submit-label', 'Submit for Review'))}</button>`;

  let bannerDataUrl = '';
  const bannerInput = card.querySelector('#ow-f-banner');
  bannerInput.addEventListener('change', () => {
    const file = bannerInput.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast(block, 'Banner must be under 2MB.'); bannerInput.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (ev) => { bannerDataUrl = ev.target.result; };
    reader.readAsDataURL(file);
  });

  card.querySelector('#ow-org-submit').addEventListener('click', () => {
    const company = card.querySelector('#ow-f-company').value.trim();
    const contact = card.querySelector('#ow-f-contact').value.trim();
    const contactEmail = card.querySelector('#ow-f-contact-email').value.trim();
    const hackName = card.querySelector('#ow-f-hack-name').value.trim();
    const description = card.querySelector('#ow-f-description').value.trim();
    const deadline = card.querySelector('#ow-f-deadline').value;
    const teamSize = card.querySelector('#ow-f-team-size').value.trim();
    const prize = card.querySelector('#ow-f-prize').value.trim();

    if (!company || !contactEmail || !hackName || !deadline) {
      showToast(block, p('error-required', 'Please fill in Company Name, Contact Email, Hackathon Name, and Deadline.'));
      return;
    }

    const pending = getPending();
    pending.push({
      id: genId('hack'),
      company,
      contactPerson: contact,
      contactEmail,
      hackathonName: hackName,
      description,
      deadline,
      teamSize,
      prize,
      banner: bannerDataUrl,
      status: 'Pending Approval',
      submittedAt: new Date().toISOString(),
    });
    setPending(pending);

    renderSubmissionSuccess(block);
  });
}

function renderSubmissionSuccess(block) {
  const card = block.querySelector('#ow-submit-card');
  const socialLinks = [
    { key: 'social-instagram', label: 'Instagram' },
    { key: 'social-linkedin', label: 'LinkedIn' },
    { key: 'social-twitter', label: 'Twitter / X' },
  ].filter((s) => p(s.key, ''));

  const storyStats = p('story-stats', '50+: Hackathons Hosted | 1,200+: Active Student Innovators | ₹2Cr+: Prizes Awarded')
    .split('|').map((s) => s.trim()).filter(Boolean)
    .map((s) => {
      const [value, ...rest] = s.split(':');
      return { value: (value || '').trim(), label: rest.join(':').trim() };
    });

  card.innerHTML = `
    <h2>${esc(p('success-title', "Thank You — We've Got This Covered"))}</h2>
    <p class="ow-hint">${esc(p('success-message', "Our partnerships team will personally reach out to you within 24 hours to walk through the details and get your hackathon ready to go live. From there, we handle everything — hosting your event page, managing the full registration pipeline, and actively promoting it to our community — so your team can stay focused on running a great event, not chasing logistics."))}</p>

    <div class="ow-expect">
      <h3>${esc(p('expect-title', 'What Happens Next'))}</h3>
      <ul>
        <li><span class="ow-step-check">${CHECK_ICON}</span>${esc(p('expect-1', 'A dedicated HackVerse partner manager will call or email you within 24 hours to confirm the details and answer any questions.'))}</li>
        <li><span class="ow-step-check">${CHECK_ICON}</span>${esc(p('expect-2', "We'll build and publish your hackathon page, then open registrations to our community — no setup work needed on your end."))}</li>
        <li><span class="ow-step-check">${CHECK_ICON}</span>${esc(p('expect-3', "We'll actively promote your hackathon across our platform, social channels, and student network to drive quality sign-ups."))}</li>
      </ul>
    </div>

    ${storyStats.length ? `
    <div class="ow-story-band">
      <p class="ow-story-label">${esc(p('story-label', "You're joining a community that's already delivering results"))}</p>
      <div class="ow-story-stats">
        ${storyStats.map((s) => `
        <div class="ow-story-stat">
          <span class="ow-story-stat-value">${esc(s.value)}</span>
          <span class="ow-story-stat-label">${esc(s.label)}</span>
        </div>`).join('')}
      </div>
    </div>` : ''}

    ${socialLinks.length ? `
    <div class="ow-social-row">
      <span class="ow-social-label">${esc(p('social-follow-label', 'Follow us for updates'))}</span>
      <div class="ow-social-links">
        ${socialLinks.map((s) => `<a href="${esc(p(s.key, ''))}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join('')}
      </div>
    </div>` : ''}`;
}

// ── DASHBOARD page (admins only) ────────────────────────────────────────────
let _adminTab = 'overview';
let _legacyHackathons = [];
let _legacyLoaded = false;
let _justApproved = null;

const STAT_ICONS = {
  pending: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/><path d="M9 12h6M9 16h6"/></svg>',
  live: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h7l-1 8 11-14h-7l1-6z"/></svg>',
  regs: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  partners: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 9h1M9 13h1M14 9h1M14 13h1M10 21v-4h4v4"/></svg>',
};

function tpl(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars?.[k] != null ? vars[k] : ''));
}

function getAllLiveHackathons() {
  return [...getApproved(), ..._legacyHackathons];
}

function regCountFor(hack) {
  if (hack.source === 'legacy') return getSiteRegistrations().filter((r) => r.hackathonId === hack.id).length;
  return getRegistrations().filter((r) => r.hackathonId === hack.id).length;
}

function openModal(block, title, bodyHtml) {
  const root = block.querySelector('#ow-modal-root');
  if (!root) return;
  root.innerHTML = `
    <div class="ow-modal-overlay" id="ow-modal-overlay">
      <div class="ow-modal">
        <div class="ow-modal-head">
          <h2>${esc(title)}</h2>
          <button type="button" class="ow-modal-close" id="ow-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="ow-modal-body">${bodyHtml}</div>
      </div>
    </div>`;
  const overlay = root.querySelector('#ow-modal-overlay');
  const close = () => { root.innerHTML = ''; };
  root.querySelector('#ow-modal-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

function decorateDashboard(block) {
  if (!isSiteLoggedIn()) {
    window.location.replace(`/auth-form?mode=login&redirect=${encodeURIComponent(window.location.href)}`);
    return;
  }

  const email = getSessionEmail();

  if (!isAdminEmail(email)) {
    block.innerHTML = `
      <div class="ow-hero">
        <div class="ow-card ow-login-card">
          <h2>${esc(p('restricted-title', 'Admins Only'))}</h2>
          <p class="ow-hint">${esc(p('restricted-desc', 'This dashboard is only available to HackVerse admins.'))}</p>
          <a class="ow-btn-primary" href="/">${esc(p('restricted-cta', 'Back to Home'))}</a>
        </div>
      </div>`;
    return;
  }

  block.innerHTML = `
    <div class="ow-admin-shell">
      <nav class="ow-sidebar">
        <div class="ow-sidebar-brand">${esc(p('admin-brand', 'HackVerse Admin'))}</div>
        <button type="button" class="ow-sidebar-link active" data-tab="overview">${esc(p('tab-dashboard', 'Dashboard'))}</button>
        <button type="button" class="ow-sidebar-link" data-tab="requests">${esc(p('tab-requests', 'Organisation Requests'))}</button>
        <button type="button" class="ow-sidebar-link" data-tab="hackathons">${esc(p('tab-hackathons', 'Hackathons'))}</button>
        <button type="button" class="ow-sidebar-link" data-tab="registrations">${esc(p('tab-registrations', 'Registrations'))}</button>
        <button type="button" class="ow-sidebar-link" data-tab="export">${esc(p('tab-export', 'Export'))}</button>
        <button type="button" class="ow-sidebar-logout" id="ow-logout">${esc(p('logout-label', 'Log Out'))}</button>
      </nav>
      <main class="ow-admin-content" id="ow-admin-content"></main>
    </div>
    <div class="ow-modal-root" id="ow-modal-root"></div>
    <div class="ow-toast-wrap" id="ow-toast-wrap"></div>`;

  block.querySelector('#ow-logout').addEventListener('click', () => {
    siteLogout();
    window.location.href = '/';
  });

  block.querySelectorAll('.ow-sidebar-link').forEach((btn) => {
    btn.addEventListener('click', () => {
      block.querySelectorAll('.ow-sidebar-link').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      _adminTab = btn.dataset.tab;
      renderAdminTab(block);
    });
  });

  renderAdminTab(block);

  if (!_legacyLoaded) {
    fetchLegacyHackathons().then((list) => {
      _legacyHackathons = list;
      _legacyLoaded = true;
      renderAdminTab(block);
    });
  }
}

function renderAdminTab(block) {
  const content = block.querySelector('#ow-admin-content');
  if (!content) return;
  if (_adminTab === 'overview') { renderTabOverview(content); return; }
  if (_adminTab === 'requests') { renderTabRequests(block, content); return; }
  if (_adminTab === 'hackathons') { renderTabHackathons(block, content); return; }
  if (_adminTab === 'registrations') { renderTabRegistrations(block, content); return; }
  if (_adminTab === 'export') { renderTabExport(block, content); }
}

// ── Tab 1: Dashboard overview ───────────────────────────────────────────────
function renderTabOverview(content) {
  const pending = getPending();
  const live = getAllLiveHackathons();
  const totalRegs = getRegistrations().length + getSiteRegistrations().length;
  const partners = new Set([
    ...getApproved().map((h) => h.company),
    ..._legacyHackathons.map((h) => h.company),
  ].filter(Boolean)).size;

  content.innerHTML = `
    <div class="ow-content-header">
      <h1 class="ow-content-title">${esc(p('tab-dashboard', 'Dashboard'))}</h1>
      <p class="ow-content-sub">${esc(p('dashboard-sub', 'Live snapshot of everything happening on HackVerse right now.'))}</p>
    </div>
    <div class="ow-stats-grid">
      <div class="ow-stat-card">
        <div class="ow-stat-icon ow-stat-icon-pending">${STAT_ICONS.pending}</div>
        <div class="ow-stat-label">${esc(p('stat-pending-label', 'Pending Organisation Requests'))}</div>
        <div class="ow-stat-value">${pending.length}</div>
      </div>
      <div class="ow-stat-card">
        <div class="ow-stat-icon ow-stat-icon-live">${STAT_ICONS.live}</div>
        <div class="ow-stat-label">${esc(p('stat-live-label', 'Live Hackathons'))}</div>
        <div class="ow-stat-value">${live.length}</div>
      </div>
      <div class="ow-stat-card">
        <div class="ow-stat-icon ow-stat-icon-regs">${STAT_ICONS.regs}</div>
        <div class="ow-stat-label">${esc(p('stat-regs-label', 'Total Student Registrations'))}</div>
        <div class="ow-stat-value">${totalRegs}</div>
      </div>
      <div class="ow-stat-card">
        <div class="ow-stat-icon ow-stat-icon-partners">${STAT_ICONS.partners}</div>
        <div class="ow-stat-label">${esc(p('stat-partners-label', 'Partner Organisations'))}</div>
        <div class="ow-stat-value">${partners}</div>
      </div>
    </div>
    ${!_legacyLoaded && p('legacy-hackathon-slugs', '') ? `<p class="ow-sync-note">${esc(p('syncing-label', 'Syncing live site data…'))}</p>` : ''}`;
}

const CHECK_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
const BIG_CHECK_ICON = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

// ── Tab 2: Organisation Requests ────────────────────────────────────────────
function renderTabRequests(block, content) {
  const pending = getPending();
  content.innerHTML = `
    <div class="ow-content-header">
      <h1 class="ow-content-title">${esc(p('tab-requests', 'Organisation Requests'))}</h1>
    </div>
    <div id="ow-requests-banner"></div>
    <div id="ow-requests-body" class="ow-requests-list"></div>`;

  const bannerWrap = content.querySelector('#ow-requests-banner');
  if (_justApproved) {
    bannerWrap.innerHTML = `
      <div class="ow-next-steps-banner">
        <button type="button" class="ow-next-steps-close" id="ow-next-steps-dismiss" aria-label="${esc(p('dismiss-label', 'Dismiss'))}">&times;</button>
        <div class="ow-next-steps-icon">${BIG_CHECK_ICON}</div>
        <div class="ow-next-steps-content">
          <strong>${esc(tpl(p('next-steps-title', '{company} Approved'), _justApproved))}</strong>
          <p>${esc(tpl(p('next-steps-subtitle', 'Here’s what happens next for {hackathon}:'), _justApproved))}</p>
          <ul>
            <li><span class="ow-step-check">${CHECK_ICON}</span>${esc(tpl(p('next-step-1', 'We will reach out to {company} within 24 hours.'), _justApproved))}</li>
            <li><span class="ow-step-check">${CHECK_ICON}</span>${esc(tpl(p('next-step-2', 'We will manage {hackathon} and its registrations on their behalf.'), _justApproved))}</li>
            <li><span class="ow-step-check">${CHECK_ICON}</span>${esc(tpl(p('next-step-3', 'We will promote {hackathon} across our social channels.'), _justApproved))}</li>
          </ul>
        </div>
      </div>`;
    bannerWrap.querySelector('#ow-next-steps-dismiss').addEventListener('click', () => {
      _justApproved = null;
      renderTabRequests(block, content);
    });
  }

  const body = content.querySelector('#ow-requests-body');
  if (!pending.length) {
    body.innerHTML = `<div class="ow-card"><div class="ow-empty">${esc(p('empty-pending', 'No pending organisation requests.'))}</div></div>`;
    return;
  }

  body.innerHTML = pending.map((h) => `
    <div class="ow-request-card" data-id="${esc(h.id)}">
      <div class="ow-request-card-head">
        <div>
          <div class="ow-request-title">${esc(h.hackathonName)}</div>
          <div class="ow-request-company">${esc(h.company)}</div>
        </div>
        <span class="ow-status-badge ow-status-pending">${esc(p('status-pending-label', 'Pending Approval'))}</span>
      </div>
      ${h.description ? `<p class="ow-request-desc">${esc(h.description)}</p>` : ''}
      <div class="ow-request-info-grid">
        <div class="ow-info-item">
          <span class="ow-info-label">${esc(p('label-contact', 'Contact Person'))}</span>
          <span class="ow-info-value">${esc(h.contactPerson) || '—'}</span>
        </div>
        <div class="ow-info-item">
          <span class="ow-info-label">${esc(p('label-contact-email', 'Contact Email'))}</span>
          <span class="ow-info-value">${esc(h.contactEmail) || '—'}</span>
        </div>
        <div class="ow-info-item">
          <span class="ow-info-label">${esc(p('label-deadline', 'Registration Deadline'))}</span>
          <span class="ow-info-value">${esc(h.deadline) || '—'}</span>
        </div>
        <div class="ow-info-item">
          <span class="ow-info-label">${esc(p('label-team-size', 'Team Size'))}</span>
          <span class="ow-info-value">${esc(h.teamSize) || '—'}</span>
        </div>
        <div class="ow-info-item">
          <span class="ow-info-label">${esc(p('label-prize', 'Prize Pool'))}</span>
          <span class="ow-info-value">${esc(h.prize) || '—'}</span>
        </div>
        <div class="ow-info-item">
          <span class="ow-info-label">${esc(p('submitted-label', 'Submitted'))}</span>
          <span class="ow-info-value">${new Date(h.submittedAt).toLocaleDateString()}</span>
        </div>
      </div>
      <div class="ow-request-actions">
        <button type="button" class="ow-btn-reject" data-id="${esc(h.id)}">${esc(p('reject-label', 'Reject'))}</button>
        <button type="button" class="ow-btn-approve" data-id="${esc(h.id)}">${esc(p('approve-label', 'Approve'))}</button>
      </div>
    </div>`).join('');

  body.querySelectorAll('.ow-btn-approve').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const list = getPending();
      const idx = list.findIndex((h) => h.id === id);
      if (idx === -1) return;
      const [item] = list.splice(idx, 1);
      item.status = 'Approved';
      const app = getApproved();
      app.push(item);
      setApproved(app);
      setPending(list);
      _justApproved = { company: item.company, hackathon: item.hackathonName };
      showToast(block, p('approved-message', 'Hackathon approved and is now live.'));
      renderTabRequests(block, content);
    });
  });
  body.querySelectorAll('.ow-btn-reject').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      setPending(getPending().filter((h) => h.id !== id));
      showToast(block, p('rejected-message', 'Hackathon rejected.'));
      renderTabRequests(block, content);
    });
  });
}

// ── Tab 3: Hackathons (this workflow's approvals + real site pages) ───────
function renderTabHackathons(block, content) {
  const all = getAllLiveHackathons();

  content.innerHTML = `
    <div class="ow-content-header ow-content-header-row">
      <div>
        <h1 class="ow-content-title">${esc(p('tab-hackathons', 'Hackathons'))}</h1>
      </div>
      <button type="button" class="ow-btn-primary" id="ow-post-hackathon-btn">${esc(p('post-hackathon-label', '+ Post New Hackathon'))}</button>
    </div>
    <div class="ow-card">
      ${!all.length ? `<div class="ow-empty">${esc(p('empty-approved', 'No approved hackathons yet.'))}</div>` : `
      <div class="ow-reg-table-wrap">
        <table class="ow-reg-table">
          <thead><tr>
            <th>${esc(p('label-hackathon-name', 'Hackathon Name'))}</th>
            <th>${esc(p('label-company', 'Organisation'))}</th>
            <th>${esc(p('reg-count-label', 'Registration Count'))}</th>
            <th>${esc(p('status-label', 'Status'))}</th>
          </tr></thead>
          <tbody>
            ${all.map((h) => `<tr>
              <td>${esc(h.hackathonName)}</td>
              <td>${esc(h.company)}</td>
              <td>${regCountFor(h)}</td>
              <td><span class="ow-status-badge ow-status-approved">${esc(p('status-live-label', 'Live'))}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`}
    </div>`;

  content.querySelector('#ow-post-hackathon-btn').addEventListener('click', () => openPostHackathonModal(block));
}

// ── Admin: post a hackathon directly (bypasses the org submission form) ────
// Goes through the same pending → approve pipeline as organisation
// submissions, so the Requests tab remains the single approval funnel
// regardless of whether a hackathon came from the public form or was
// entered by an admin directly (e.g. a deal closed over email/call).
function openPostHackathonModal(block) {
  const bodyHtml = `
    <div class="ow-field-row">
      <div class="ow-field">
        <label>${esc(p('label-company', 'Company Name'))}</label>
        <input type="text" id="ow-ap-company" placeholder="Acme Inc.">
      </div>
      <div class="ow-field">
        <label>${esc(p('label-contact', 'Contact Person'))}</label>
        <input type="text" id="ow-ap-contact" placeholder="Jane Doe">
      </div>
    </div>
    <div class="ow-field-row">
      <div class="ow-field">
        <label>${esc(p('label-contact-email', 'Contact Email'))}</label>
        <input type="email" id="ow-ap-contact-email" placeholder="jane@company.com">
      </div>
      <div class="ow-field">
        <label>${esc(p('label-hackathon-name', 'Hackathon Name'))}</label>
        <input type="text" id="ow-ap-hack-name" placeholder="InnovateTech 2026">
      </div>
    </div>
    <div class="ow-field">
      <label>${esc(p('label-description', 'Description'))}</label>
      <textarea id="ow-ap-description" rows="3" placeholder="Themes, goals, what makes it worth joining…"></textarea>
    </div>
    <div class="ow-field-row">
      <div class="ow-field">
        <label>${esc(p('label-deadline', 'Registration Deadline'))}</label>
        <input type="date" id="ow-ap-deadline">
      </div>
      <div class="ow-field">
        <label>${esc(p('label-team-size', 'Team Size'))}</label>
        <input type="text" id="ow-ap-team-size" placeholder="2-4">
      </div>
    </div>
    <div class="ow-field-row">
      <div class="ow-field">
        <label>${esc(p('label-prize', 'Prize Pool'))}</label>
        <input type="text" id="ow-ap-prize" placeholder="₹5,00,000">
      </div>
      <div class="ow-field">
        <label>${esc(p('label-banner', 'Banner Image'))}</label>
        <input type="file" id="ow-ap-banner" accept="image/*">
      </div>
    </div>
    <button type="button" class="ow-btn-primary" id="ow-ap-submit">${esc(p('post-hackathon-submit-label', 'Post Hackathon'))}</button>`;

  openModal(block, p('post-hackathon-title', 'Post a New Hackathon'), bodyHtml);

  const root = block.querySelector('#ow-modal-root');
  if (!root) return;

  let bannerDataUrl = '';
  root.querySelector('#ow-ap-banner').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast(block, p('error-banner-size', 'Banner must be under 2MB.')); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (ev) => { bannerDataUrl = ev.target.result; };
    reader.readAsDataURL(file);
  });

  root.querySelector('#ow-ap-submit').addEventListener('click', () => {
    const company = root.querySelector('#ow-ap-company').value.trim();
    const contactPerson = root.querySelector('#ow-ap-contact').value.trim();
    const contactEmail = root.querySelector('#ow-ap-contact-email').value.trim();
    const hackathonName = root.querySelector('#ow-ap-hack-name').value.trim();
    const description = root.querySelector('#ow-ap-description').value.trim();
    const deadline = root.querySelector('#ow-ap-deadline').value;
    const teamSize = root.querySelector('#ow-ap-team-size').value.trim();
    const prize = root.querySelector('#ow-ap-prize').value.trim();

    if (!company || !hackathonName || !deadline) {
      showToast(block, p('error-required-admin-post', 'Please fill in Company Name, Hackathon Name, and Deadline.'));
      return;
    }

    const pending = getPending();
    pending.push({
      id: genId('hack'),
      company,
      contactPerson,
      contactEmail,
      hackathonName,
      description,
      deadline,
      teamSize,
      prize,
      banner: bannerDataUrl,
      status: 'Pending Approval',
      submittedAt: new Date().toISOString(),
      postedByAdmin: true,
    });
    setPending(pending);

    root.innerHTML = '';
    showToast(block, p('posted-message', 'Hackathon posted — approve it below to make it live.'));

    _adminTab = 'requests';
    block.querySelectorAll('.ow-sidebar-link').forEach((b) => b.classList.toggle('active', b.dataset.tab === 'requests'));
    renderAdminTab(block);
  });
}

// ── Tab 4: Registrations — grouped by hackathon, detail view in a modal ────
function renderTabRegistrations(block, content) {
  const all = getAllLiveHackathons();

  content.innerHTML = `
    <div class="ow-content-header">
      <h1 class="ow-content-title">${esc(p('tab-registrations', 'Registrations'))}</h1>
    </div>
    <div class="ow-card">
      ${!all.length ? `<div class="ow-empty">${esc(p('empty-registrations', 'No registrations yet.'))}</div>` : `
      <div class="ow-reg-table-wrap">
        <table class="ow-reg-table">
          <thead><tr>
            <th>${esc(p('label-hackathon-name', 'Hackathon'))}</th>
            <th>${esc(p('label-company', 'Organisation'))}</th>
            <th>${esc(p('reg-count-label', 'Registrations'))}</th>
            <th></th>
          </tr></thead>
          <tbody>
            ${all.map((h) => `<tr>
              <td>${esc(h.hackathonName)}</td>
              <td>${esc(h.company)}</td>
              <td>${regCountFor(h)}</td>
              <td><button type="button" class="ow-btn-secondary ow-view-regs-btn" data-id="${esc(h.id)}">${esc(p('view-label', 'View'))}</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`}
    </div>`;

  content.querySelectorAll('.ow-view-regs-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const hack = all.find((h) => h.id === btn.dataset.id);
      if (hack) openRegistrationsModal(block, hack);
    });
  });
}

function openRegistrationsModal(block, hack) {
  let rows;
  if (hack.source === 'legacy') {
    rows = getSiteRegistrations()
      .filter((r) => r.hackathonId === hack.id)
      .map((r) => {
        const prof = getSiteProfile(r.email);
        return {
          name: prof?.name || r.email,
          college: '—',
          skills: Array.isArray(prof?.skills) ? prof.skills.join(', ') : (prof?.skills || '—'),
          date: r.registeredAt,
        };
      });
  } else {
    rows = getRegistrations()
      .filter((r) => r.hackathonId === hack.id)
      .map((r) => ({
        name: r.studentName, college: r.college, skills: r.skills, date: r.registrationDate,
      }));
  }

  const bodyHtml = !rows.length
    ? `<div class="ow-empty">${esc(p('empty-registrations', 'No registrations yet.'))}</div>`
    : `<div class="ow-reg-table-wrap">
        <table class="ow-reg-table">
          <thead><tr>
            <th>${esc(p('label-student-name', 'Student Name'))}</th>
            <th>${esc(p('label-college', 'College'))}</th>
            <th>${esc(p('label-skills', 'Skills'))}</th>
            <th>${esc(p('registered-on-label', 'Registration Date'))}</th>
          </tr></thead>
          <tbody>
            ${rows.map((r) => `<tr>
              <td>${esc(r.name)}</td>
              <td>${esc(r.college)}</td>
              <td>${esc(r.skills)}</td>
              <td>${new Date(r.date).toLocaleDateString()}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

  openModal(block, hack.hackathonName, bodyHtml);
}

// ── Tab 5: Export ────────────────────────────────────────────────────────────
let _exportId = '';

function renderTabExport(block, content) {
  const all = getAllLiveHackathons();
  content.innerHTML = `
    <div class="ow-content-header">
      <h1 class="ow-content-title">${esc(p('tab-export', 'Export'))}</h1>
    </div>
    <div class="ow-card">
      <div class="ow-field">
        <label>${esc(p('export-select-label', 'Select a Hackathon'))}</label>
        <select id="ow-export-select">
          <option value="">${esc(p('export-select-placeholder', 'Choose a hackathon…'))}</option>
          ${all.map((h) => `<option value="${esc(h.id)}" ${h.id === _exportId ? 'selected' : ''}>${esc(h.hackathonName)}</option>`).join('')}
        </select>
      </div>
      <button type="button" class="ow-btn-primary" id="ow-export-btn">${esc(p('download-csv-label', 'Download CSV'))}</button>
    </div>`;

  content.querySelector('#ow-export-select').addEventListener('change', (e) => { _exportId = e.target.value; });
  content.querySelector('#ow-export-btn').addEventListener('click', () => {
    if (!_exportId) { showToast(block, p('error-no-hackathon-selected', 'Please select a hackathon first.')); return; }
    const hack = all.find((h) => h.id === _exportId);
    if (!hack) return;

    let rows;
    if (hack.source === 'legacy') {
      rows = getSiteRegistrations().filter((r) => r.hackathonId === hack.id).map((r) => {
        const prof = getSiteProfile(r.email);
        return [
          prof?.name || '', '', r.email, prof?.github || '', prof?.linkedin || '',
          Array.isArray(prof?.skills) ? prof.skills.join(', ') : '', r.registeredAt,
        ];
      });
    } else {
      rows = getRegistrations().filter((r) => r.hackathonId === hack.id)
        .map((r) => [r.studentName, r.college, r.email, r.github, r.linkedin, r.skills, r.registrationDate]);
    }

    downloadCSV(
      `${hack.hackathonName.replace(/\s+/g, '-')}.csv`,
      ['Name', 'College', 'Email', 'GitHub', 'LinkedIn', 'Skills', 'Registered On'],
      rows,
    );
  });
}

// ── STUDENT page ─────────────────────────────────────────────────────────
let _studentSelectedId = null;

function decorateStudent(block) {
  block.innerHTML = `<div class="ow-workflow-page"><div id="ow-student-body"></div></div><div class="ow-toast-wrap" id="ow-toast-wrap"></div>`;
  renderStudentBody(block);
}

function renderStudentBody(block) {
  const body = block.querySelector('#ow-student-body');
  const approved = getApproved();

  if (!_studentSelectedId) {
    if (!approved.length) {
      body.innerHTML = `<div class="ow-card"><div class="ow-empty">${esc(p('empty-approved-student', 'No hackathons available yet. Check back soon!'))}</div></div>`;
      return;
    }
    body.innerHTML = `<div class="ow-student-grid">${approved.map((h) => `
      <div class="ow-student-card" data-id="${esc(h.id)}">
        ${h.banner ? `<div class="ow-student-banner" style="background-image:url('${h.banner}')"></div>` : '<div class="ow-student-banner ow-student-banner-empty"></div>'}
        <div class="ow-student-card-body">
          <div class="ow-student-company">${esc(h.company)}</div>
          <h3>${esc(h.hackathonName)}</h3>
          <p>${esc(h.description).slice(0, 110)}${h.description && h.description.length > 110 ? '…' : ''}</p>
          <div class="ow-student-meta">
            ${h.prize ? `<span>${esc(h.prize)}</span>` : ''}
            <span>${esc(p('label-deadline', 'Deadline'))}: ${esc(h.deadline)}</span>
          </div>
          <button type="button" class="ow-btn-primary ow-student-register-btn" data-id="${esc(h.id)}">${esc(p('register-label', 'Register'))}</button>
        </div>
      </div>`).join('')}</div>`;

    body.querySelectorAll('.ow-student-register-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        _studentSelectedId = btn.dataset.id;
        renderStudentBody(block);
      });
    });
    return;
  }

  const hack = approved.find((h) => h.id === _studentSelectedId);
  body.innerHTML = `
    <div class="ow-card">
      <button type="button" class="ow-link-btn" id="ow-student-back">&larr; ${esc(p('back-label', 'Back'))}</button>
      <h2>${esc(p('reg-form-title', 'Register for This Hackathon'))}</h2>
      <p class="ow-hint">${esc(hack?.hackathonName || '')}</p>
      <div class="ow-field-row">
        <div class="ow-field">
          <label>${esc(p('label-student-name', 'Full Name'))}</label>
          <input type="text" id="ow-r-name" placeholder="Jane Doe">
        </div>
        <div class="ow-field">
          <label>${esc(p('label-college', 'College'))}</label>
          <input type="text" id="ow-r-college" placeholder="IIT Bombay">
        </div>
      </div>
      <div class="ow-field-row">
        <div class="ow-field">
          <label>${esc(p('label-student-email', 'Email'))}</label>
          <input type="email" id="ow-r-email" placeholder="jane@college.edu">
        </div>
        <div class="ow-field">
          <label>${esc(p('label-skills', 'Skills'))}</label>
          <input type="text" id="ow-r-skills" placeholder="React, Python, Figma">
        </div>
      </div>
      <div class="ow-field-row">
        <div class="ow-field">
          <label>${esc(p('label-github', 'GitHub'))}</label>
          <input type="url" id="ow-r-github" placeholder="https://github.com/...">
        </div>
        <div class="ow-field">
          <label>${esc(p('label-linkedin', 'LinkedIn'))}</label>
          <input type="url" id="ow-r-linkedin" placeholder="https://linkedin.com/in/...">
        </div>
      </div>
      <button type="button" class="ow-btn-primary" id="ow-r-submit">${esc(p('reg-submit-label', 'Submit Registration'))}</button>
    </div>`;

  body.querySelector('#ow-student-back').addEventListener('click', () => {
    _studentSelectedId = null;
    renderStudentBody(block);
  });

  body.querySelector('#ow-r-submit').addEventListener('click', () => {
    const studentName = body.querySelector('#ow-r-name').value.trim();
    const college = body.querySelector('#ow-r-college').value.trim();
    const email = body.querySelector('#ow-r-email').value.trim();
    const github = body.querySelector('#ow-r-github').value.trim();
    const linkedin = body.querySelector('#ow-r-linkedin').value.trim();
    const skills = body.querySelector('#ow-r-skills').value.trim();

    if (!studentName || !email) {
      showToast(block, p('error-required-student', 'Please fill in your name and email.'));
      return;
    }

    const regs = getRegistrations();
    regs.push({
      registrationId: genId('reg'),
      hackathonId: _studentSelectedId,
      studentName,
      college,
      email,
      github,
      linkedin,
      skills,
      registrationDate: new Date().toISOString(),
    });
    setRegistrations(regs);

    showToast(block, p('reg-success-message', "You're registered! Good luck."));
    _studentSelectedId = null;
    renderStudentBody(block);
  });
}

// ── MAIN DECORATE ─────────────────────────────────────────────────────────
export default function decorate(block) {
  _cfg = parseConfig(block);
  loadFonts();

  if (block.classList.contains('dashboard')) { decorateDashboard(block); return; }
  if (block.classList.contains('student')) { decorateStudent(block); return; }
  decorateLanding(block);
}
