// organiser-workflow.js — EDS block
// Simulates the full Organisation → Admin → Student workflow client-side.
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
// TODO(backend): replace these three with real API calls (GET/POST) when a
// server exists — the rest of this file only talks to these functions.
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

// TODO(backend): replace with a real organiser auth/session lookup.
function getOrgIdentity() { return lsGet('hk_org_identity', null); }
function setOrgIdentity(identity) { lsSet('hk_org_identity', identity); }

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

// ── Shell ─────────────────────────────────────────────────────────────────
function buildShell(block) {
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
      <button type="button" class="ow-cta-btn" id="ow-start-btn">${esc(p('cta-label', 'Start Organising'))}</button>
    </div>

    <div class="ow-workflow" id="ow-workflow" hidden>
      <div class="ow-role-switch" id="ow-role-switch" role="tablist">
        <button type="button" class="ow-role-btn active" data-role="organisation">${esc(p('role-organisation', 'Organisation'))}</button>
        <button type="button" class="ow-role-btn" data-role="admin">${esc(p('role-admin', 'Admin'))}</button>
        <button type="button" class="ow-role-btn" data-role="student">${esc(p('role-student', 'Student'))}</button>
      </div>

      <div class="ow-panel" id="ow-panel-organisation"></div>
      <div class="ow-panel" id="ow-panel-admin" hidden></div>
      <div class="ow-panel" id="ow-panel-student" hidden></div>
    </div>

    <div class="ow-toast-wrap" id="ow-toast-wrap"></div>`;
}

// ── ORGANISATION panel ───────────────────────────────────────────────────
function renderOrganisationPanel(block) {
  const panel = block.querySelector('#ow-panel-organisation');
  const identity = getOrgIdentity();

  if (!identity) {
    panel.innerHTML = `
      <div class="ow-card ow-login-card">
        <h2>${esc(p('login-title', 'Continue as Organiser'))}</h2>
        <p class="ow-hint">${esc(p('login-hint', 'Just your name and email — no password needed for this demo.'))}</p>
        <div class="ow-field">
          <label>${esc(p('login-name-label', 'Your Name'))}</label>
          <input type="text" id="ow-login-name" placeholder="Jane Doe">
        </div>
        <div class="ow-field">
          <label>${esc(p('login-email-label', 'Work Email'))}</label>
          <input type="email" id="ow-login-email" placeholder="jane@company.com">
        </div>
        <button type="button" class="ow-btn-primary" id="ow-login-submit">${esc(p('login-submit-label', 'Continue'))}</button>
      </div>`;

    panel.querySelector('#ow-login-submit').addEventListener('click', () => {
      const name = panel.querySelector('#ow-login-name').value.trim();
      const email = panel.querySelector('#ow-login-email').value.trim();
      if (!name || !email) { showToast(block, 'Please enter your name and email.'); return; }
      setOrgIdentity({ name, email });
      renderOrganisationPanel(block);
    });
    return;
  }

  panel.innerHTML = `
    <div class="ow-panel-header">
      <span class="ow-logged-in">${esc(p('logged-in-as', 'Logged in as'))} <strong>${esc(identity.name)}</strong> (${esc(identity.email)})</span>
      <button type="button" class="ow-link-btn" id="ow-org-switch">${esc(p('switch-account-label', 'Switch account'))}</button>
    </div>
    <div class="ow-card">
      <h2>${esc(p('form-title', 'Submit Your Hackathon'))}</h2>
      <div class="ow-field-row">
        <div class="ow-field">
          <label>${esc(p('label-company', 'Company Name'))}</label>
          <input type="text" id="ow-f-company" placeholder="Acme Inc.">
        </div>
        <div class="ow-field">
          <label>${esc(p('label-contact', 'Contact Person'))}</label>
          <input type="text" id="ow-f-contact" value="${esc(identity.name)}">
        </div>
      </div>
      <div class="ow-field-row">
        <div class="ow-field">
          <label>${esc(p('label-contact-email', 'Contact Email'))}</label>
          <input type="email" id="ow-f-contact-email" value="${esc(identity.email)}">
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

  panel.querySelector('#ow-org-switch').addEventListener('click', () => {
    setOrgIdentity(null);
    renderOrganisationPanel(block);
  });

  let bannerDataUrl = '';
  const bannerInput = panel.querySelector('#ow-f-banner');
  bannerInput.addEventListener('change', () => {
    const file = bannerInput.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast(block, 'Banner must be under 2MB.'); bannerInput.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (ev) => { bannerDataUrl = ev.target.result; };
    reader.readAsDataURL(file);
  });

  panel.querySelector('#ow-org-submit').addEventListener('click', () => {
    const company = panel.querySelector('#ow-f-company').value.trim();
    const contact = panel.querySelector('#ow-f-contact').value.trim();
    const contactEmail = panel.querySelector('#ow-f-contact-email').value.trim();
    const hackName = panel.querySelector('#ow-f-hack-name').value.trim();
    const description = panel.querySelector('#ow-f-description').value.trim();
    const deadline = panel.querySelector('#ow-f-deadline').value;
    const teamSize = panel.querySelector('#ow-f-team-size').value.trim();
    const prize = panel.querySelector('#ow-f-prize').value.trim();

    if (!company || !hackName || !deadline) {
      showToast(block, p('error-required', 'Please fill in Company Name, Hackathon Name, and Deadline.'));
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

    showToast(block, p('success-message', 'Your hackathon has been submitted for review.'));
    renderOrganisationPanel(block);
  });
}

// ── ADMIN panel ───────────────────────────────────────────────────────────
let _adminTab = 'pending';
let _adminSelectedHackathonId = null;
let _regSearch = '';
let _regSort = 'newest';

function renderAdminPanel(block) {
  const panel = block.querySelector('#ow-panel-admin');
  const pending = getPending();
  const approved = getApproved();

  panel.innerHTML = `
    <div class="ow-subtabs">
      <button type="button" class="ow-subtab ${_adminTab === 'pending' ? 'active' : ''}" data-tab="pending">
        ${esc(p('admin-pending-tab', 'Pending Approvals'))} (${pending.length})
      </button>
      <button type="button" class="ow-subtab ${_adminTab === 'all' ? 'active' : ''}" data-tab="all">
        ${esc(p('admin-all-tab', 'All Hackathons'))} (${approved.length})
      </button>
    </div>
    <div class="ow-card" id="ow-admin-body"></div>`;

  panel.querySelectorAll('.ow-subtab').forEach((btn) => {
    btn.addEventListener('click', () => {
      _adminTab = btn.dataset.tab;
      _adminSelectedHackathonId = null;
      renderAdminPanel(block);
    });
  });

  const body = panel.querySelector('#ow-admin-body');

  if (_adminTab === 'pending') {
    if (!pending.length) {
      body.innerHTML = `<div class="ow-empty">${esc(p('empty-pending', 'No pending hackathons.'))}</div>`;
      return;
    }
    body.innerHTML = pending.map((h) => `
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
        showToast(block, p('approved-message', 'Hackathon approved and is now live.'));
        renderAdminPanel(block);
      });
    });
    body.querySelectorAll('.ow-btn-reject').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        setPending(getPending().filter((h) => h.id !== id));
        showToast(block, p('rejected-message', 'Hackathon rejected.'));
        renderAdminPanel(block);
      });
    });
    return;
  }

  // ── "All Hackathons" tab ──
  if (!_adminSelectedHackathonId) {
    if (!approved.length) {
      body.innerHTML = `<div class="ow-empty">${esc(p('empty-approved', 'No approved hackathons yet.'))}</div>`;
      return;
    }
    body.innerHTML = approved.map((h) => {
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

    body.querySelectorAll('.ow-btn-secondary').forEach((btn) => {
      btn.addEventListener('click', () => {
        _adminSelectedHackathonId = btn.dataset.id;
        _regSearch = '';
        renderAdminPanel(block);
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

  body.innerHTML = `
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

  body.querySelector('#ow-back-to-list').addEventListener('click', () => {
    _adminSelectedHackathonId = null;
    renderAdminPanel(block);
  });
  body.querySelector('#ow-reg-search').addEventListener('input', (e) => {
    _regSearch = e.target.value;
    renderAdminPanel(block);
  });
  body.querySelector('#ow-reg-sort').addEventListener('change', (e) => {
    _regSort = e.target.value;
    renderAdminPanel(block);
  });
  body.querySelector('#ow-download-csv')?.addEventListener('click', () => {
    downloadCSV(
      `${(hack?.hackathonName || 'registrations').replace(/\s+/g, '-')}.csv`,
      ['Name', 'College', 'Email', 'GitHub', 'LinkedIn', 'Skills', 'Registered On'],
      regs.map((r) => [r.studentName, r.college, r.email, r.github, r.linkedin, r.skills, r.registrationDate]),
    );
  });
}

// ── STUDENT panel ─────────────────────────────────────────────────────────
let _studentSelectedId = null;

function renderStudentPanel(block) {
  const panel = block.querySelector('#ow-panel-student');
  const approved = getApproved();

  if (!_studentSelectedId) {
    if (!approved.length) {
      panel.innerHTML = `<div class="ow-card"><div class="ow-empty">${esc(p('empty-approved-student', 'No hackathons available yet. Check back soon!'))}</div></div>`;
      return;
    }
    panel.innerHTML = `<div class="ow-student-grid">${approved.map((h) => `
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

    panel.querySelectorAll('.ow-student-register-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        _studentSelectedId = btn.dataset.id;
        renderStudentPanel(block);
      });
    });
    return;
  }

  const hack = approved.find((h) => h.id === _studentSelectedId);
  panel.innerHTML = `
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

  panel.querySelector('#ow-student-back').addEventListener('click', () => {
    _studentSelectedId = null;
    renderStudentPanel(block);
  });

  panel.querySelector('#ow-r-submit').addEventListener('click', () => {
    const studentName = panel.querySelector('#ow-r-name').value.trim();
    const college = panel.querySelector('#ow-r-college').value.trim();
    const email = panel.querySelector('#ow-r-email').value.trim();
    const github = panel.querySelector('#ow-r-github').value.trim();
    const linkedin = panel.querySelector('#ow-r-linkedin').value.trim();
    const skills = panel.querySelector('#ow-r-skills').value.trim();

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
    renderStudentPanel(block);
  });
}

// ── MAIN DECORATE ─────────────────────────────────────────────────────────
export default function decorate(block) {
  _cfg = parseConfig(block);

  if (!document.querySelector('link[data-font="ow-fonts"], link[data-font="hc-fonts"], link[data-font="bebas-neue"], link[data-font="fb-fonts"], link[data-font="hof-fonts"]')) {
    const pc1 = document.createElement('link'); pc1.rel = 'preconnect'; pc1.href = 'https://fonts.googleapis.com';
    const pc2 = document.createElement('link'); pc2.rel = 'preconnect'; pc2.href = 'https://fonts.gstatic.com'; pc2.crossOrigin = '';
    const fl = document.createElement('link'); fl.rel = 'stylesheet'; fl.dataset.font = 'ow-fonts';
    fl.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap';
    document.head.append(pc1, pc2, fl);
  }

  buildShell(block);

  const workflow = block.querySelector('#ow-workflow');
  block.querySelector('#ow-start-btn').addEventListener('click', () => {
    workflow.hidden = false;
    workflow.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  block.querySelector('#ow-role-switch').addEventListener('click', (e) => {
    const btn = e.target.closest('.ow-role-btn');
    if (!btn) return;
    block.querySelectorAll('.ow-role-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const role = btn.dataset.role;
    block.querySelectorAll('.ow-panel').forEach((panel) => { panel.hidden = panel.id !== `ow-panel-${role}`; });
    if (role === 'organisation') renderOrganisationPanel(block);
    if (role === 'admin') renderAdminPanel(block);
    if (role === 'student') renderStudentPanel(block);
  });

  renderOrganisationPanel(block);
}
