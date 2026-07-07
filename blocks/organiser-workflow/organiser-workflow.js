// organiser-workflow.js — EDS block
// Simulates the full Organisation/Admin → Student hackathon workflow using
// REAL page navigation (separate da.live pages), not in-page modals/tabs.
// Login/signup is NOT reinvented here -- it reuses the site's existing
// /auth-form page and isLoggedIn/currentUserEmail session (same one every
// other block already uses), so students keep the exact login they already
// have. This block only decides what to show *after* that shared login,
// based on the logged-in email:
//   Organiser Workflow            -> landing/pitch page ("Start Organising"
//                                     links to /auth-form, then back here)
//   Organiser Workflow (dashboard)-> gated by the real site session; shows
//                                     the Admin view if the email is in the
//                                     configured admin list, otherwise the
//                                     Organisation view (with a one-time
//                                     "what's your company" step for a
//                                     first-time organiser email)
//   Organiser Workflow (student)  -> student browse + register page
// Dynamic data (submissions/approvals/registrations/org profiles) lives in
// localStorage, standing in for a real backend. All copy/labels are
// author-editable via da.live config rows (see parseConfig) — nothing
// user-facing is hardcoded.

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
function getSiteProfileName(email) {
  try {
    const profiles = JSON.parse(localStorage.getItem('hk_profiles') || '{}');
    if (profiles[email]?.name) return profiles[email].name;
    const single = JSON.parse(localStorage.getItem('hk_profile') || 'null');
    return single?.name || '';
  } catch {
    return '';
  }
}
function siteLogout() {
  ['isLoggedIn', 'currentUserEmail', 'hk_profile', 'hk_notifications', 'hackhub_user'].forEach((k) => localStorage.removeItem(k));
}

// Organiser company profile -- keyed by the REAL site email, created lazily
// the first time that email reaches the dashboard. Not authentication;
// just "which company does this already-logged-in person represent".
function getOrgAccounts() { return lsGet('hk_org_accounts', {}); }
function saveOrgAccount(account) {
  const accounts = getOrgAccounts();
  accounts[account.email] = account;
  lsSet('hk_org_accounts', accounts);
}
function getOrgAccount(email) { return getOrgAccounts()[email] || null; }

function isAdminEmail(email) {
  const list = p('admin-emails', '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(email);
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

// ── LANDING page ─────────────────────────────────────────────────────────
function decorateLanding(block) {
  const dashboardHref = p('dashboard-href', '/organiser-dashboard');
  const startHref = `/auth-form?mode=login&redirect=${encodeURIComponent(dashboardHref)}`;
  block.innerHTML = `
    <div class="ow-hero">
      <span class="ow-eyebrow">${esc(p('eyebrow', 'Partner With Us'))}</span>
      <h1 class="ow-title">${esc(p('title', 'Reach Thousands of Student Innovators'))}</h1>
      <p class="ow-story">${esc(p('story', 'HackHub connects your hackathon with a growing community of students who are actively browsing, comparing, and applying to events every week. We bring the audience — you bring the challenge.'))}</p>
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
      <a class="ow-cta-btn" href="${esc(startHref)}">${esc(p('cta-label', 'Start Organising'))}</a>
    </div>`;
}

// ── DASHBOARD page (gated by the real site login; routes by email) ────────
function decorateDashboard(block) {
  if (!isSiteLoggedIn()) {
    window.location.replace(`/auth-form?mode=login&redirect=${encodeURIComponent(window.location.href)}`);
    return;
  }

  const email = getSessionEmail();

  block.innerHTML = `
    <div class="ow-workflow-page">
      <div class="ow-panel-header">
        <span class="ow-logged-in">${esc(p('logged-in-as', 'Logged in as'))} <strong>${esc(email)}</strong></span>
        <button type="button" class="ow-link-btn" id="ow-logout">${esc(p('logout-label', 'Log Out'))}</button>
      </div>
      <div id="ow-dash-body"></div>
    </div>
    <div class="ow-toast-wrap" id="ow-toast-wrap"></div>`;

  block.querySelector('#ow-logout').addEventListener('click', () => {
    siteLogout();
    window.location.href = '/';
  });

  if (isAdminEmail(email)) {
    renderAdminDashboard(block);
    return;
  }

  const account = getOrgAccount(email);
  if (!account) {
    renderOrgOnboarding(block, email);
    return;
  }
  renderOrgDashboard(block, account);
}

// One-time step for an email that isn't a recognised organiser yet -- we
// already know who they are (real site login), just need their company.
function renderOrgOnboarding(block, email) {
  const body = block.querySelector('#ow-dash-body');
  const name = getSiteProfileName(email);
  body.innerHTML = `
    <div class="ow-card ow-login-card">
      <h2>${esc(p('onboarding-title', 'Tell Us About Your Organisation'))}</h2>
      <p class="ow-hint">${esc(p('onboarding-hint', 'One quick step before you can start listing hackathons.'))}</p>
      <div class="ow-field">
        <label>${esc(p('label-org-name', 'Your Name'))}</label>
        <input type="text" id="ow-ob-name" value="${esc(name)}" placeholder="Jane Doe">
      </div>
      <div class="ow-field">
        <label>${esc(p('label-company', 'Company Name'))}</label>
        <input type="text" id="ow-ob-company" placeholder="Acme Inc.">
      </div>
      <button type="button" class="ow-btn-primary" id="ow-ob-submit">${esc(p('onboarding-submit-label', 'Continue'))}</button>
    </div>`;

  body.querySelector('#ow-ob-submit').addEventListener('click', () => {
    const nameVal = body.querySelector('#ow-ob-name').value.trim();
    const company = body.querySelector('#ow-ob-company').value.trim();
    if (!nameVal || !company) {
      showToast(block, p('error-required-onboarding', 'Please fill in both fields.'));
      return;
    }
    const account = {
      email, name: nameVal, company,
    };
    saveOrgAccount(account);
    renderOrgDashboard(block, account);
  });
}

// ── Organisation dashboard ─────────────────────────────────────────────────
let _orgShowCreateForm = false;

function renderCreateHackathonForm(block, account) {
  const body = block.querySelector('#ow-dash-body');
  body.innerHTML = `
    <div class="ow-card">
      <button type="button" class="ow-link-btn" id="ow-cancel-create">&larr; ${esc(p('back-to-dashboard-label', 'Back to Dashboard'))}</button>
      <h2>${esc(p('form-title', 'Create New Hackathon'))}</h2>
      <div class="ow-field-row">
        <div class="ow-field">
          <label>${esc(p('label-company', 'Company Name'))}</label>
          <input type="text" id="ow-f-company" value="${esc(account.company)}">
        </div>
        <div class="ow-field">
          <label>${esc(p('label-contact', 'Contact Person'))}</label>
          <input type="text" id="ow-f-contact" value="${esc(account.name)}">
        </div>
      </div>
      <div class="ow-field-row">
        <div class="ow-field">
          <label>${esc(p('label-contact-email', 'Contact Email'))}</label>
          <input type="email" id="ow-f-contact-email" value="${esc(account.email)}">
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
      <button type="button" class="ow-btn-primary" id="ow-org-submit">${esc(p('submit-label', 'Submit for Review'))}</button>
    </div>`;

  body.querySelector('#ow-cancel-create').addEventListener('click', () => {
    _orgShowCreateForm = false;
    renderOrgDashboard(block, account);
  });

  let bannerDataUrl = '';
  const bannerInput = body.querySelector('#ow-f-banner');
  bannerInput.addEventListener('change', () => {
    const file = bannerInput.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast(block, 'Banner must be under 2MB.'); bannerInput.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (ev) => { bannerDataUrl = ev.target.result; };
    reader.readAsDataURL(file);
  });

  body.querySelector('#ow-org-submit').addEventListener('click', () => {
    const company = body.querySelector('#ow-f-company').value.trim();
    const contact = body.querySelector('#ow-f-contact').value.trim();
    const contactEmail = body.querySelector('#ow-f-contact-email').value.trim();
    const hackName = body.querySelector('#ow-f-hack-name').value.trim();
    const description = body.querySelector('#ow-f-description').value.trim();
    const deadline = body.querySelector('#ow-f-deadline').value;
    const teamSize = body.querySelector('#ow-f-team-size').value.trim();
    const prize = body.querySelector('#ow-f-prize').value.trim();

    if (!company || !hackName || !deadline) {
      showToast(block, p('error-required', 'Please fill in Company Name, Hackathon Name, and Deadline.'));
      return;
    }

    const pending = getPending();
    pending.push({
      id: genId('hack'),
      organiserEmail: account.email,
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

    showToast(block, p('success-message', 'Your hackathon has been submitted for review.'));
    _orgShowCreateForm = false;
    renderOrgDashboard(block, account);
  });
}

function renderOrgDashboard(block, account) {
  if (_orgShowCreateForm) {
    renderCreateHackathonForm(block, account);
    return;
  }

  const body = block.querySelector('#ow-dash-body');
  const myPending = getPending().filter((h) => h.organiserEmail === account.email);
  const myApproved = getApproved().filter((h) => h.organiserEmail === account.email);
  const myHackathons = [...myPending, ...myApproved];
  const regs = getRegistrations();

  body.innerHTML = `
    <div class="ow-card">
      <div class="ow-panel-header">
        <h2>${esc(p('my-hackathons-title', 'My Hackathons'))}</h2>
        <button type="button" class="ow-btn-primary" id="ow-open-create">${esc(p('create-hackathon-btn', '+ Create New Hackathon'))}</button>
      </div>
      ${!myHackathons.length ? `<div class="ow-empty">${esc(p('empty-my-hackathons', "You haven't created any hackathons yet."))}</div>` : `
      <div class="ow-my-hack-list">
        ${myHackathons.map((h) => {
          const isApproved = h.status === 'Approved';
          const count = isApproved ? regs.filter((r) => r.hackathonId === h.id).length : 0;
          return `
          <div class="ow-pending-row">
            <div class="ow-pending-info">
              <div class="ow-pending-name">${esc(h.hackathonName)}</div>
              <div class="ow-pending-meta">
                <span class="ow-status-badge ${isApproved ? 'ow-status-approved' : 'ow-status-pending'}">${isApproved ? esc(p('status-approved-label', 'Approved')) : esc(p('status-pending-label', 'Pending Approval'))}</span>
              </div>
            </div>
            ${isApproved ? `<div class="ow-reg-count"><strong>${count}</strong> ${esc(p('registered-count-label', 'students registered'))}</div>` : ''}
          </div>`;
        }).join('')}
      </div>`}
    </div>`;

  body.querySelector('#ow-open-create').addEventListener('click', () => {
    _orgShowCreateForm = true;
    renderOrgDashboard(block, account);
  });
}

// ── Admin dashboard ─────────────────────────────────────────────────────────
let _adminTab = 'pending';
let _adminSelectedHackathonId = null;
let _regSearch = '';
let _regSort = 'newest';

function renderAdminDashboard(block) {
  const body = block.querySelector('#ow-dash-body');
  const pending = getPending();
  const approved = getApproved();

  body.innerHTML = `
    <div class="ow-subtabs">
      <button type="button" class="ow-subtab ${_adminTab === 'pending' ? 'active' : ''}" data-tab="pending">
        ${esc(p('admin-pending-tab', 'Pending Approvals'))} (${pending.length})
      </button>
      <button type="button" class="ow-subtab ${_adminTab === 'all' ? 'active' : ''}" data-tab="all">
        ${esc(p('admin-all-tab', 'All Hackathons'))} (${approved.length})
      </button>
    </div>
    <div class="ow-card" id="ow-admin-body"></div>`;

  body.querySelectorAll('.ow-subtab').forEach((btn) => {
    btn.addEventListener('click', () => {
      _adminTab = btn.dataset.tab;
      _adminSelectedHackathonId = null;
      renderAdminDashboard(block);
    });
  });

  const admin = body.querySelector('#ow-admin-body');

  if (_adminTab === 'pending') {
    if (!pending.length) {
      admin.innerHTML = `<div class="ow-empty">${esc(p('empty-pending', 'No pending hackathons.'))}</div>`;
      return;
    }
    admin.innerHTML = pending.map((h) => `
      <div class="ow-pending-row" data-id="${esc(h.id)}">
        <div class="ow-pending-info">
          <div class="ow-pending-name">${esc(h.hackathonName)}</div>
          <div class="ow-pending-meta">${esc(h.company)} · ${esc(h.contactEmail)} · ${esc(p('label-deadline', 'Deadline'))}: ${esc(h.deadline)}</div>
          <div class="ow-pending-desc">${esc(h.description)}</div>
        </div>
        <div class="ow-pending-actions">
          <button type="button" class="ow-btn-approve" data-id="${esc(h.id)}">${esc(p('approve-label', 'Approve'))}</button>
          <button type="button" class="ow-btn-reject" data-id="${esc(h.id)}">${esc(p('reject-label', 'Reject'))}</button>
        </div>
      </div>`).join('');

    admin.querySelectorAll('.ow-btn-approve').forEach((btn) => {
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
        showToast(block, p('approved-message', 'Hackathon approved and is now live.'));
        renderAdminDashboard(block);
      });
    });
    admin.querySelectorAll('.ow-btn-reject').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        setPending(getPending().filter((h) => h.id !== id));
        showToast(block, p('rejected-message', 'Hackathon rejected.'));
        renderAdminDashboard(block);
      });
    });
    return;
  }

  // ── "All Hackathons" tab ──
  if (!_adminSelectedHackathonId) {
    if (!approved.length) {
      admin.innerHTML = `<div class="ow-empty">${esc(p('empty-approved', 'No approved hackathons yet.'))}</div>`;
      return;
    }
    admin.innerHTML = approved.map((h) => {
      const count = getRegistrations().filter((r) => r.hackathonId === h.id).length;
      return `
      <div class="ow-approved-row">
        <div class="ow-pending-info">
          <div class="ow-pending-name">${esc(h.hackathonName)}</div>
          <div class="ow-pending-meta">${esc(h.company)} · ${count} ${esc(p('registrations-label', 'registrations'))}</div>
        </div>
        <button type="button" class="ow-btn-secondary" data-id="${esc(h.id)}">${esc(p('view-registrations-label', 'View Registrations'))}</button>
      </div>`;
    }).join('');

    admin.querySelectorAll('.ow-btn-secondary').forEach((btn) => {
      btn.addEventListener('click', () => {
        _adminSelectedHackathonId = btn.dataset.id;
        _regSearch = '';
        renderAdminDashboard(block);
      });
    });
    return;
  }

  // ── Registrations viewer for one hackathon ──
  const hack = approved.find((h) => h.id === _adminSelectedHackathonId);
  let regs = getRegistrations().filter((r) => r.hackathonId === _adminSelectedHackathonId);

  if (_regSearch) {
    const q = _regSearch.toLowerCase();
    regs = regs.filter((r) => [r.studentName, r.college, r.skills].join(' ').toLowerCase().includes(q));
  }
  regs = [...regs].sort((a, b) => {
    if (_regSort === 'name') return a.studentName.localeCompare(b.studentName);
    if (_regSort === 'oldest') return new Date(a.registrationDate) - new Date(b.registrationDate);
    return new Date(b.registrationDate) - new Date(a.registrationDate);
  });

  admin.innerHTML = `
    <div class="ow-panel-header">
      <button type="button" class="ow-link-btn" id="ow-back-to-list">&larr; ${esc(p('back-label', 'Back'))}</button>
      <h3 class="ow-reg-title">${esc(hack?.hackathonName || '')}</h3>
    </div>
    <div class="ow-reg-toolbar">
      <input type="text" id="ow-reg-search" placeholder="${esc(p('search-label', 'Search'))}…" value="${esc(_regSearch)}">
      <select id="ow-reg-sort">
        <option value="newest" ${_regSort === 'newest' ? 'selected' : ''}>${esc(p('sort-newest', 'Newest first'))}</option>
        <option value="oldest" ${_regSort === 'oldest' ? 'selected' : ''}>${esc(p('sort-oldest', 'Oldest first'))}</option>
        <option value="name" ${_regSort === 'name' ? 'selected' : ''}>${esc(p('sort-name', 'Name A-Z'))}</option>
      </select>
      <button type="button" class="ow-btn-secondary" id="ow-download-csv">${esc(p('download-csv-label', 'Download CSV'))}</button>
    </div>
    ${!regs.length ? `<div class="ow-empty">${esc(p('empty-registrations', 'No registrations yet.'))}</div>` : `
    <div class="ow-reg-table-wrap">
      <table class="ow-reg-table">
        <thead><tr>
          <th>${esc(p('label-student-name', 'Name'))}</th>
          <th>${esc(p('label-college', 'College'))}</th>
          <th>${esc(p('label-github', 'GitHub'))}</th>
          <th>${esc(p('label-linkedin', 'LinkedIn'))}</th>
          <th>${esc(p('label-skills', 'Skills'))}</th>
          <th>${esc(p('registered-on-label', 'Registered On'))}</th>
        </tr></thead>
        <tbody>
          ${regs.map((r) => `<tr>
            <td>${esc(r.studentName)}</td>
            <td>${esc(r.college)}</td>
            <td>${r.github ? `<a href="${esc(r.github)}" target="_blank" rel="noopener">${esc(r.github)}</a>` : ''}</td>
            <td>${r.linkedin ? `<a href="${esc(r.linkedin)}" target="_blank" rel="noopener">${esc(r.linkedin)}</a>` : ''}</td>
            <td>${esc(r.skills)}</td>
            <td>${new Date(r.registrationDate).toLocaleDateString()}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`}`;

  admin.querySelector('#ow-back-to-list').addEventListener('click', () => {
    _adminSelectedHackathonId = null;
    renderAdminDashboard(block);
  });
  admin.querySelector('#ow-reg-search').addEventListener('input', (e) => {
    _regSearch = e.target.value;
    renderAdminDashboard(block);
  });
  admin.querySelector('#ow-reg-sort').addEventListener('change', (e) => {
    _regSort = e.target.value;
    renderAdminDashboard(block);
  });
  admin.querySelector('#ow-download-csv')?.addEventListener('click', () => {
    downloadCSV(
      `${(hack?.hackathonName || 'registrations').replace(/\s+/g, '-')}.csv`,
      ['Name', 'College', 'Email', 'GitHub', 'LinkedIn', 'Skills', 'Registered On'],
      regs.map((r) => [r.studentName, r.college, r.email, r.github, r.linkedin, r.skills, r.registrationDate]),
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
