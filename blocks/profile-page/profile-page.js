// profile-page.js — EDS block
// Dynamic data: localStorage only (hk_profile, hk_profiles, hk_user_teams,
// hk_applications, hackhub_registrations_${email})
// Author-editable labels: da.live config table

// ── Module state ──────────────────────────────────────────────────────────────
let _block = null;
let _email = '';
let _profile = {};
let _cfg = {};
let _editSkills = [];
let _tempAvatar = null;
let _withdrawTeamId = null;
// Parsed static team definitions from /find-teams-data.plain.html
// (populated once in decorate; used by getAppliedTeams to resolve slug IDs)
let _staticTeams = [];

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseRows(block) {
  const cfg = {};
  [...block.querySelectorAll(':scope > div')].forEach((row) => {
    const cols = [...row.querySelectorAll(':scope > div')];
    if (cols.length < 2) return;
    const key = cols[0].textContent.trim().toLowerCase().replace(/\s+/g, '-');
    cfg[key] = cols[1].textContent.trim();
  });
  return cfg;
}

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

function getEmail() {
  return (localStorage.getItem('currentUserEmail') || '').trim().toLowerCase();
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return 'TBD';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function p(key, fallback) {
  return _cfg[key] || fallback;
}

// ── Profile data ──────────────────────────────────────────────────────────────
const DEFAULTS = {
  name: '', role: '', bio: '', city: '', phone: '', linkedin: '', github: '',
  avatar: '', skills: [], membership: 'free',
};

function loadProfile(email) {
  if (email) {
    const profiles = lsGet('hk_profiles', {});
    if (profiles[email]) return { ...DEFAULTS, ...profiles[email] };
  }
  const saved = lsGet('hk_profile', null);
  return saved ? { ...DEFAULTS, ...saved } : { ...DEFAULTS };
}

function saveProfile(profile, email) {
  if (email) {
    const profiles = lsGet('hk_profiles', {});
    profiles[email] = profile;
    lsSet('hk_profiles', profiles);
  }
  lsSet('hk_profile', profile);
}

function normalizeSkills(skills) {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills.filter(Boolean);
  if (typeof skills === 'string') return skills.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

// ── Team data ─────────────────────────────────────────────────────────────────

// Fetch + parse /find-teams-data.plain.html using the same pattern as team-cards.js.
// Returns an array of static team objects (each with an `id` that is a slug).
async function fetchStaticTeams(dataPage = '/find-teams-data') {
  try {
    const res = await fetch(`${dataPage}.plain.html`);
    if (!res.ok) return [];
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const teams = [];
    [...doc.querySelectorAll('.team-data')].forEach((teamDiv) => {
      const data = {};
      [...teamDiv.querySelectorAll(':scope > div')].forEach((row) => {
        const cols = [...row.querySelectorAll(':scope > div')];
        if (cols.length < 2) return;
        const key = cols[0].textContent.trim().toLowerCase();
        const img = cols[1].querySelector('img');
        data[key] = img ? img.src : cols[1].textContent.trim();
      });
      const name = data.name || '';
      if (!name) return;
      // Replicate the same slugify used in team-cards.js
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      teams.push({
        id,
        team: name,
        name: data.hackathon || '',
        theme: data.theme || '',
        description: data.description || '',
        deadline: data.deadline || '',
        totalSpots: parseInt(data['total-spots'], 10) || 5,
        experienceLevel: data.experience || 'All Levels',
        techStack: (data['tech-stack'] || '').split(',').map((s) => s.trim()).filter(Boolean),
        members: (data.members || '').split(',').map((s) => s.trim().replace(/\s*\([^)]*\)/, '')).filter(Boolean).map((n) => ({ n })),
        roles: (data.roles || '').split(',').map((s) => { const p = s.trim().split(':'); return { n: p[0].trim(), o: (p[1] || 'open').trim() === 'open' }; }).filter((r) => r.n),
        applications: [],
      });
    });
    return teams;
  } catch {
    return [];
  }
}

function getAppliedTeams(email) {
  if (!email) return [];
  const staticState = lsGet(`hk_tm_v2_${email}`, []);
  const userTeams = lsGet('hk_user_teams', []);
  const allApps = lsGet('hk_applications', []);
  const myApps = allApps
    .filter((a) => (a.applicantId || '').trim().toLowerCase() === email)
    .reverse();

  // Resolve slug-based applied entries from hk_tm_v2_${email} using _staticTeams
  const appliedFromStatic = staticState
    .filter((s) => s.applied)
    .map((s) => {
      const t = _staticTeams.find((x) => String(x.id) === String(s.id));
      if (!t) return null;
      const appDetails = myApps.find((a) => String(a.teamId) === String(t.id)) || {};
      return { ...t, myStatus: appDetails.status || 'pending', myAppDetails: appDetails };
    })
    .filter(Boolean);

  // Resolve user-created teams from hk_user_teams (existing behaviour)
  const appliedFromTeams = userTeams
    .filter(
      (t) => t.applications
        && t.applications.some((a) => (a.email || '').trim().toLowerCase() === email),
    )
    .map((t) => {
      const app = t.applications.find((a) => (a.email || '').trim().toLowerCase() === email);
      const appDetails = myApps.find((a) => String(a.teamId) === String(t.id)) || app || {};
      return {
        ...t,
        myStatus: app?.status || 'pending',
        myAppDetails: appDetails,
      };
    });

  const seen = new Set();
  return [...appliedFromStatic, ...appliedFromTeams].filter((t) => {
    if (seen.has(String(t.id))) return false;
    seen.add(String(t.id));
    return true;
  });
}

function getCreatedTeams(email) {
  if (!email) return [];
  return lsGet('hk_user_teams', []).filter(
    (t) => (t.creatorEmail || '').trim().toLowerCase() === email,
  );
}

// ── HTML helpers ──────────────────────────────────────────────────────────────
const SVG = {
  pin: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  phone: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.63 3.42 2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.84a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  linkedin: '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>',
  github: '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>',
  info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/></svg>',
  warn: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  edit: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
};

function avatarHTML(profile, size = 'lg') {
  const cls = size === 'sm' ? 'pp-avatar-img pp-avatar-img-sm' : 'pp-avatar-img';
  if (profile.avatar) {
    return `<img src="${esc(profile.avatar)}" alt="${esc(profile.name)}" class="${cls}">`;
  }
  const initials = (profile.name || '?')
    .split(' ')
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return `<span class="pp-avatar-initials">${initials}</span>`;
}

function emptyState(msg, link = '') {
  return `<div class="pp-empty">
    ${SVG.info}
    <p>${esc(msg)}</p>
    ${link}
  </div>`;
}

function statusBadge(status) {
  if (status === 'approve') return '<span class="pp-badge pp-b-green">Approved</span>';
  if (status === 'reject') return '<span class="pp-badge pp-b-red">Rejected</span>';
  return '<span class="pp-badge pp-b-gold">Pending</span>';
}

// ── Page skeleton ─────────────────────────────────────────────────────────────
function buildHTML() {
  _block.innerHTML = `
    <div class="pp-main">

      <div class="pp-profile-card" id="pp-card">
        <div class="pp-avatar" id="pp-avatar"></div>
        <div class="pp-info">
          <h2 id="pp-name" class="pp-name"></h2>
          <div class="pp-role" id="pp-role"></div>
          <div class="pp-bio" id="pp-bio"></div>
          <div class="pp-meta" id="pp-meta"></div>
          <div class="pp-skills-display" id="pp-skills"></div>
          <div class="pp-membership-row" id="pp-membership"></div>
        </div>
        <button class="pp-edit-btn" id="pp-edit-btn">
          ${SVG.edit}
          ${p('edit-btn', 'Edit Profile')}
        </button>
      </div>

      <div class="pp-edit-modal" id="pp-edit-modal">
        <div class="pp-edit-inner">
          <div class="pp-edit-header">
            <span class="pp-edit-eyebrow">Your Info</span>
            <span class="pp-edit-title">${p('edit-btn', 'Edit Profile')}</span>
          </div>
          <div class="pp-edit-body">
            <div class="pp-edit-row">
              <div class="pp-edit-field">
                <label class="pp-edit-label">${p('label-name', 'Full Name')}</label>
                <input class="pp-edit-input" id="pp-inp-name" type="text" placeholder="Your full name" maxlength="60">
              </div>
              <div class="pp-edit-field">
                <label class="pp-edit-label">${p('label-role', 'Role / Title')}</label>
                <input class="pp-edit-input" id="pp-inp-role" type="text" placeholder="e.g. Full Stack Dev" maxlength="50">
              </div>
            </div>
            <div class="pp-edit-field">
              <label class="pp-edit-label">${p('label-bio', 'Bio')}</label>
              <textarea class="pp-edit-input pp-edit-textarea" id="pp-inp-bio" placeholder="Short intro about yourself…" maxlength="200" rows="3"></textarea>
            </div>
            <div class="pp-edit-field">
              <label class="pp-edit-label">${p('label-avatar', 'Profile Image')}</label>
              <div class="pp-avatar-upload">
                <div class="pp-avatar pp-avatar-sm" id="pp-edit-preview"></div>
                <div>
                  <input type="file" id="pp-inp-avatar-file" accept="image/*" style="display:none">
                  <button type="button" class="pp-upload-btn" id="pp-upload-btn">${p('upload-btn', 'Upload Image')}</button>
                  <div class="pp-upload-hint">Max 2 MB</div>
                </div>
              </div>
            </div>
            <div class="pp-edit-row">
              <div class="pp-edit-field">
                <label class="pp-edit-label">${p('label-city', 'City')}</label>
                <input class="pp-edit-input" id="pp-inp-city" type="text" placeholder="e.g. Hyderabad" maxlength="40">
              </div>
              <div class="pp-edit-field">
                <label class="pp-edit-label">${p('label-phone', 'Phone')}</label>
                <input class="pp-edit-input" id="pp-inp-phone" type="text" placeholder="+91 ..." maxlength="20">
              </div>
            </div>
            <div class="pp-edit-row">
              <div class="pp-edit-field">
                <label class="pp-edit-label">${p('label-linkedin', 'LinkedIn URL')}</label>
                <input class="pp-edit-input" id="pp-inp-linkedin" type="url" placeholder="https://linkedin.com/in/...">
              </div>
              <div class="pp-edit-field">
                <label class="pp-edit-label">${p('label-github', 'GitHub URL')}</label>
                <input class="pp-edit-input" id="pp-inp-github" type="url" placeholder="https://github.com/...">
              </div>
            </div>
            <div class="pp-edit-field">
              <label class="pp-edit-label">
                ${p('label-skills', 'Skills')}
                <span class="pp-edit-hint">(Enter to add)</span>
              </label>
              <div class="pp-skills-input-row">
                <input class="pp-edit-input" id="pp-inp-skill" type="text" placeholder="e.g. React, Figma…" maxlength="30">
                <button type="button" class="pp-add-skill-btn" id="pp-add-skill-btn">+ Add</button>
              </div>
              <div class="pp-edit-skills-list" id="pp-edit-skills-list"></div>
            </div>
          </div>
          <div class="pp-edit-footer">
            <button type="button" class="pp-cancel-btn" id="pp-cancel-btn">${p('cancel-btn', 'Cancel')}</button>
            <button type="button" class="pp-save-btn" id="pp-save-btn">${p('save-btn', 'Save Changes')}</button>
          </div>
        </div>
      </div>

      <div class="pp-stats-grid">
        <div class="pp-stat-card">
          <div class="pp-stat-label">${p('stat-applied', 'Teams Applied')}</div>
          <div class="pp-stat-value" id="pp-stat-applied">0</div>
          <div class="pp-stat-sub">${p('stat-applied-sub', 'Total applications')}</div>
        </div>
        <div class="pp-stat-card">
          <div class="pp-stat-label">${p('stat-created', 'Teams Created')}</div>
          <div class="pp-stat-value" id="pp-stat-created">0</div>
          <div class="pp-stat-sub">${p('stat-created-sub', 'By you')}</div>
        </div>
        <div class="pp-stat-card">
          <div class="pp-stat-label">${p('stat-accepted', 'Accepted')}</div>
          <div class="pp-stat-value" id="pp-stat-accepted">0</div>
          <div class="pp-stat-sub pp-green">${p('stat-accepted-sub', 'Confirmed')}</div>
        </div>
        <div class="pp-stat-card">
          <div class="pp-stat-label">${p('stat-pending', 'Pending')}</div>
          <div class="pp-stat-value" id="pp-stat-pending">0</div>
          <div class="pp-stat-sub pp-gold">${p('stat-pending-sub', 'Awaiting reply')}</div>
        </div>
      </div>

      <div class="pp-tabs" role="tablist">
        <button class="pp-tab-btn active" data-tab="pp-tab-hackathons" role="tab">${p('tab-hackathons', 'My Hackathons &amp; Teams')}</button>
        <button class="pp-tab-btn" data-tab="pp-tab-applied" role="tab">${p('tab-applied', 'Teams I Applied To')}</button>
        <button class="pp-tab-btn" data-tab="pp-tab-created" role="tab">${p('tab-created', 'Teams I Created')}</button>
        <button class="pp-tab-btn" data-tab="pp-tab-completed" role="tab">${p('tab-completed', 'Completed Teams')}</button>
      </div>

      <div class="pp-tab-content">
        <div class="pp-panel active" id="pp-tab-hackathons">
          <div class="pp-loading"><div class="pp-spinner"></div></div>
        </div>
        <div class="pp-panel" id="pp-tab-applied" hidden></div>
        <div class="pp-panel" id="pp-tab-created" hidden></div>
        <div class="pp-panel" id="pp-tab-completed" hidden></div>
      </div>

    </div>

    <div class="pp-confirm-overlay" id="pp-confirm-overlay">
      <div class="pp-confirm-box">
        <div class="pp-confirm-accent"></div>
        <div class="pp-confirm-content">
          <div class="pp-confirm-icon">${SVG.warn}</div>
          <h3 class="pp-confirm-title">${p('withdraw-confirm-title', 'Withdraw Application?')}</h3>
          <p class="pp-confirm-msg">${p('withdraw-confirm-msg', 'This will remove your application from this team. You can always re-apply later.')}</p>
          <div class="pp-confirm-actions">
            <button class="pp-confirm-yes" id="pp-confirm-yes">${p('withdraw-confirm-yes', 'Yes, Withdraw')}</button>
            <button class="pp-confirm-cancel" id="pp-confirm-cancel">${p('withdraw-confirm-cancel', 'Cancel')}</button>
          </div>
        </div>
      </div>
    </div>`;
}

// ── Render profile card ───────────────────────────────────────────────────────
function renderProfileCard() {
  const profile = _profile;
  _block.querySelector('#pp-avatar').innerHTML = avatarHTML(profile);
  _block.querySelector('#pp-name').textContent = profile.name || 'User';

  const memberEl = _block.querySelector('#pp-membership');
  if (profile.membership === 'premium') {
    _block.querySelector('#pp-name').innerHTML = `${esc(profile.name || 'User')} <span class="pp-crown" title="Premium">👑</span>`;
    memberEl.innerHTML = `<span class="pp-badge-member pp-badge-premium">Premium Member</span>
      <button class="pp-upgrade-btn" id="pp-upgrade-btn">${p('downgrade-btn', 'Downgrade to Free')}</button>`;
  } else {
    memberEl.innerHTML = `<span class="pp-badge-member pp-badge-free">Free Member</span>
      <button class="pp-upgrade-btn" id="pp-upgrade-btn">${p('upgrade-btn', 'Upgrade to Premium')}</button>`;
  }

  _block.querySelector('#pp-role').textContent = profile.role || '';
  _block.querySelector('#pp-bio').textContent = profile.bio || '';

  const metaEl = _block.querySelector('#pp-meta');
  const parts = [];
  if (profile.city) parts.push(`<span>${SVG.pin}${esc(profile.city)}</span>`);
  if (profile.phone) parts.push(`<span>${SVG.phone}${esc(profile.phone)}</span>`);
  if (profile.linkedin) parts.push(`<a href="${esc(profile.linkedin)}" target="_blank" rel="noopener">${SVG.linkedin}LinkedIn</a>`);
  if (profile.github) parts.push(`<a href="${esc(profile.github)}" target="_blank" rel="noopener">${SVG.github}GitHub</a>`);
  metaEl.innerHTML = parts.join('');

  const skills = normalizeSkills(profile.skills);
  _block.querySelector('#pp-skills').innerHTML = skills
    .map((s) => `<span class="pp-skill-chip">${esc(s)}</span>`)
    .join('');

  const upgradeBtn = memberEl.querySelector('#pp-upgrade-btn');
  if (upgradeBtn) {
    upgradeBtn.addEventListener('click', () => {
      if (profile.membership === 'premium') return;
      const redir = encodeURIComponent(window.location.href);
      window.location.href = `/upgrade?reason=profile_upgrade&redirect=${redir}`;
    });
  }
}

// ── Render stats ──────────────────────────────────────────────────────────────
function renderStats(applied, created) {
  const accepted = applied.filter((t) => t.myStatus === 'approve').length;
  const pending = applied.filter((t) => t.myStatus === 'pending').length;
  _block.querySelector('#pp-stat-applied').textContent = applied.length;
  _block.querySelector('#pp-stat-created').textContent = created.length;
  _block.querySelector('#pp-stat-accepted').textContent = accepted;
  _block.querySelector('#pp-stat-pending').textContent = pending;
}

// ── Tab 1: Registered hackathons ──────────────────────────────────────────────
async function renderRegistered() {
  const container = _block.querySelector('#pp-tab-hackathons');
  const regs = lsGet(`hackhub_registrations_${_email}`, []);

  if (!regs.length) {
    container.innerHTML = emptyState(
      p('empty-hackathons', 'You are not registered for any hackathons yet.'),
      '<a href="/hackathon" class="pp-link-btn">Explore Hackathons</a>',
    );
    return;
  }

  container.innerHTML = '<div class="pp-loading"><div class="pp-spinner"></div></div>';

  const results = await Promise.allSettled(
    regs.map(async ({ hackathonId }) => {
      try {
        const resp = await fetch(`${hackathonId}.plain.html`);
        if (!resp.ok) return null;
        const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
        const hackBlock = doc.querySelector('.hackathon-detail');
        if (!hackBlock) return null;
        const data = {};
        [...hackBlock.children].forEach((row) => {
          const cells = [...row.children];
          const key = cells[0]?.textContent.trim().toLowerCase();
          if (key && cells[1]) data[key] = cells[1].textContent.trim();
        });
        return {
          hackathonId,
          title: data.title || '',
          organiser: data.organiser || data.organizer || '',
          format: data.format || '',
          date: data.date || '',
          teamDeadline: data.teamdeadline || '',
        };
      } catch {
        return null;
      }
    }),
  );

  const hackathons = results
    .filter((r) => r.status === 'fulfilled' && r.value)
    .map((r) => r.value);

  if (!hackathons.length) {
    container.innerHTML = emptyState(p('empty-hackathons', 'You are not registered for any hackathons yet.'));
    return;
  }

  const applied = getAppliedTeams(_email);
  const created = getCreatedTeams(_email);
  container.innerHTML = '';

  hackathons.forEach((h) => {
    const myCreated = created.find((t) => t.name === h.title);
    const myApproved = applied.find((t) => t.name === h.title && t.myStatus === 'approve');
    const myPending = applied.filter((t) => t.name === h.title && t.myStatus === 'pending');

    let statusHtml = '';
    let nextStepHtml = '';

    if (myCreated) {
      const filled = (myCreated.members || []).length;
      const total = myCreated.totalSpots || 4;
      const vacant = total - filled;
      const badgeCls = vacant > 0 ? 'pp-b-gold' : 'pp-b-green';
      const badgeTxt = vacant > 0 ? `Recruiting (${filled}/${total})` : 'Team Full';
      statusHtml = `<div class="pp-reg-status-row">
        <span class="pp-reg-status-label">Your Team:</span>
        <span class="pp-badge ${badgeCls}">${badgeTxt}</span>
        <span class="pp-reg-team-name">${esc(myCreated.team)}</span>
      </div>`;
      if (vacant <= 0) {
        nextStepHtml = `<div class="pp-next-step-box pp-ns-success">
          <div class="pp-ns-header">✅ <strong>Next Step: Squad is Ready!</strong></div>
          <p class="pp-ns-desc">Your team is fully staffed. Start planning and be ready when the hackathon begins.</p>
          <div class="pp-ns-btn-row">
            <button class="pp-ns-btn" data-switch-tab="pp-tab-created">View Team</button>
          </div>
        </div>`;
      } else {
        nextStepHtml = `<div class="pp-next-step-box pp-ns-warning">
          <div class="pp-ns-header">⚠️ <strong>Next Step: Recruit Members</strong></div>
          <p class="pp-ns-desc">You have <strong>${vacant}</strong> open spot${vacant > 1 ? 's' : ''}. Review applications or share your team.</p>
          <div class="pp-ns-btn-row">
            <button class="pp-ns-btn" data-switch-tab="pp-tab-created">Manage Applicants</button>
          </div>
        </div>`;
      }
    } else if (myApproved) {
      const filled = (myApproved.members || []).length;
      const total = myApproved.totalSpots || 4;
      statusHtml = `<div class="pp-reg-status-row">
        <span class="pp-reg-status-label">Your Team:</span>
        <span class="pp-badge pp-b-green">Approved</span>
        <span class="pp-reg-team-name">${esc(myApproved.team)} (${filled}/${total})</span>
      </div>`;
      nextStepHtml = `<div class="pp-next-step-box pp-ns-success">
        <div class="pp-ns-header">✅ <strong>Next Step: Connect &amp; Brainstorm</strong></div>
        <p class="pp-ns-desc">You are an approved member of <strong>${esc(myApproved.team)}</strong>. Align on the project theme and start planning.</p>
        <div class="pp-ns-btn-row">
          <button class="pp-ns-btn" data-switch-tab="pp-tab-applied">View Details</button>
        </div>
      </div>`;
    } else if (myPending.length) {
      const names = myPending.map((t) => esc(t.team)).join(', ');
      statusHtml = `<div class="pp-reg-status-row">
        <span class="pp-reg-status-label">Your Status:</span>
        <span class="pp-badge pp-b-gold">Pending Approval</span>
        <span class="pp-reg-team-name">Applied to: ${names}</span>
      </div>`;
      nextStepHtml = `<div class="pp-next-step-box pp-ns-info">
        <div class="pp-ns-header">ℹ️ <strong>Next Step: Awaiting Approval</strong></div>
        <p class="pp-ns-desc">Your application is pending with the team lead. You can also apply to more teams.</p>
        <div class="pp-ns-btn-row">
          <a href="/find-teams" class="pp-ns-btn pp-ns-btn-link pf-btn-secondary">Find More Teams</a>
        </div>
      </div>`;
    } else {
      statusHtml = `<div class="pp-reg-status-row">
        <span class="pp-reg-status-label">Your Status:</span>
        <span class="pp-badge pp-b-red">No Team</span>
        <span class="pp-reg-team-name" style="color:#f97316;font-weight:700;">Action Required!</span>
      </div>`;
      nextStepHtml = `<div class="pp-next-step-box pp-ns-error">
        <div class="pp-ns-header">❌ <strong>Next Step: Build or Join a Squad</strong></div>
        <p class="pp-ns-desc">This hackathon requires a team. Join an existing team or create your own.</p>
        <div class="pp-ns-btn-row">
          <a href="/find-teams" class="pp-ns-btn pp-ns-btn-link">Find a Team</a>
        </div>
      </div>`;
    }

    const card = document.createElement('div');
    card.className = 'pp-reg-card';
    const initial = (h.organiser || h.title || 'H')[0].toUpperCase();
    card.innerHTML = `
      <div class="pp-reg-card-header">
        <div class="pp-reg-logo">${initial}</div>
        <div>
          <div class="pp-reg-title">${esc(h.title)}</div>
          <div class="pp-reg-meta">${esc(h.organiser)}${h.format ? ` · ${esc(h.format)}` : ''}</div>
        </div>
      </div>
      <div class="pp-reg-card-body">
        <div class="pp-reg-grid">
          ${h.date ? `<div class="pp-reg-grid-item"><div class="pp-reg-grid-label">Date</div><div class="pp-reg-grid-val">${esc(h.date)}</div></div>` : ''}
          ${h.teamDeadline ? `<div class="pp-reg-grid-item"><div class="pp-reg-grid-label">Team Deadline</div><div class="pp-reg-grid-val">${esc(h.teamDeadline)}</div></div>` : ''}
        </div>
        ${statusHtml}
        ${nextStepHtml}
      </div>`;

    card.querySelectorAll('[data-switch-tab]').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.switchTab));
    });

    container.appendChild(card);
  });
}

// ── Tab 2: Applied teams ──────────────────────────────────────────────────────
function renderApplied(applied) {
  const container = _block.querySelector('#pp-tab-applied');
  if (!applied.length) {
    container.innerHTML = emptyState(
      p('empty-applied', 'No applications yet.'),
      '<a href="/find-teams" class="pp-link-btn">Find Teams</a>',
    );
    return;
  }

  container.innerHTML = '';
  applied.forEach((t) => {
    const wrap = document.createElement('div');
    wrap.className = 'pp-accordion-item';

    const btn = document.createElement('button');
    btn.className = 'pp-team-btn';
    btn.innerHTML = `
      <div class="pp-team-btn-info">
        <div class="pp-t-name">${esc(t.team)}</div>
        <div class="pp-t-sub">${esc(t.name || '')}${t.theme ? ` · ${esc(t.theme)}` : ''}</div>
      </div>
      <div class="pp-team-btn-right">
        ${statusBadge(t.myStatus)}
        <span class="pp-chevron">▼</span>
      </div>`;

    const detail = document.createElement('div');
    detail.className = 'pp-inline-detail';
    detail.hidden = true;

    const techStack = (t.techStack || []).map((s) => `<span class="pp-tech-chip">${esc(s)}</span>`).join('');
    const appD = t.myAppDetails || {};

    detail.innerHTML = `
      <div class="pp-detail-name">${esc(t.team)}</div>
      <div class="pp-detail-hackathon">${esc(t.name || '')}</div>
      <div class="pp-detail-grid">
        <div class="pp-detail-item"><div class="pp-detail-key">Theme</div><div class="pp-detail-val">${esc(t.theme || '—')}</div></div>
        <div class="pp-detail-item"><div class="pp-detail-key">Deadline</div><div class="pp-detail-val">${formatDate(t.deadline)}</div></div>
        <div class="pp-detail-item"><div class="pp-detail-key">Status</div><div class="pp-detail-val">${statusBadge(t.myStatus)}</div></div>
      </div>
      ${t.description ? `<div class="pp-detail-label">About</div><div class="pp-detail-desc">${esc(t.description)}</div>` : ''}
      ${techStack ? `<div class="pp-detail-label" style="margin-top:12px">Tech Stack</div><div class="pp-tech-chips" style="margin-bottom:12px">${techStack}</div>` : ''}
      ${appD.role ? `
      <div class="pp-detail-label">My Application</div>
      <div class="pp-my-app">
        ${appD.role ? `<div><strong>Role:</strong> ${esc(appD.role)}</div>` : ''}
        ${appD.skills ? `<div><strong>Skills:</strong> ${esc(appD.skills)}</div>` : ''}
        ${appD.portfolio ? `<div><strong>Portfolio:</strong> <a href="${esc(appD.portfolio)}" target="_blank" rel="noopener">${esc(appD.portfolio)}</a></div>` : ''}
        ${appD.msg || appD.message ? `<div><strong>Message:</strong> ${esc(appD.msg || appD.message)}</div>` : ''}
      </div>` : ''}
      <button class="pp-unapply-btn" data-action="withdraw" data-team-id="${t.id}">
        ✕ ${p('withdraw-btn', 'Withdraw Application')}
      </button>`;

    btn.addEventListener('click', () => {
      const open = !detail.hidden;
      container.querySelectorAll('.pp-inline-detail').forEach((d) => { d.hidden = true; });
      container.querySelectorAll('.pp-team-btn').forEach((b) => b.classList.remove('active'));
      if (!open) { detail.hidden = false; btn.classList.add('active'); }
    });

    wrap.appendChild(btn);
    wrap.appendChild(detail);
    container.appendChild(wrap);
  });
}

// ── Completed Teams tab ───────────────────────────────────────────────────────
// Separate renderer for completed teams with rich detail: members, leader actions,
// next-step buttons, and coordination link.
function renderCompletedTeamList(container, teams) {
  if (!teams.length) {
    container.innerHTML = emptyState(
      p('empty-completed', 'No completed teams yet.'),
      '<a href="/find-teams" class="pp-link-btn">Go to Team Finder</a>',
    );
    return;
  }

  container.innerHTML = '';
  teams.forEach((t) => {
    const isLeader = (t.creatorEmail || '').trim().toLowerCase() === _email;
    const filled = (t.members || []).length;
    const total = t.totalSpots || '?';

    const wrap = document.createElement('div');
    wrap.className = 'pp-accordion-item';

    // ── Accordion header button ──
    const btn = document.createElement('button');
    btn.className = 'pp-team-btn';
    btn.innerHTML = `
      <div class="pp-team-btn-info">
        <div class="pp-t-name">${esc(t.team || 'Team')}</div>
        <div class="pp-t-sub">${esc(t.name || '')} · ${filled}/${total} members</div>
      </div>
      <div class="pp-team-btn-right">
        <span class="pp-badge pp-b-green">Full</span>
        <span class="pp-chevron">▼</span>
      </div>`;

    // ── Expanded detail panel ──
    const detail = document.createElement('div');
    detail.className = 'pp-inline-detail';
    detail.hidden = true;

    const techStack = (t.techStack || []).map((s) => `<span class="pp-tech-chip">${esc(s)}</span>`).join('');

    // Members list — approved applications only
    const approvedApps = (t.applications || []).filter((a) => a.status === 'approve');
    const membersHTML = approvedApps.length
      ? approvedApps.map((a) => {
        const initial = (a.name || '?')[0].toUpperCase();
        const removeBtnHTML = isLeader
          ? `<button class="pp-unapply-btn pp-ct-remove" style="margin-top:0;padding:5px 12px;font-size:9px;"
               data-action="ct-remove-member" data-team-id="${t.id}" data-member-email="${esc(a.email)}"
               data-member-role="${esc(a.role)}" data-member-name="${esc(a.name)}">✕ Remove</button>`
          : '';
        return `<div class="pp-applicant-row">
          <div class="pp-app-header">
            <div class="pp-app-info">
              <div class="pp-app-av">${a.avatar ? `<img src="${esc(a.avatar)}" alt="${esc(a.name)}" class="pp-app-av-img">` : initial}</div>
              <div>
                <div class="pp-app-name">${esc(a.name || 'Member')}</div>
                <div class="pp-app-role">${esc(a.role || '')}</div>
                <div class="pp-ct-member-email">${esc(a.email || '')}</div>
              </div>
            </div>
            ${removeBtnHTML}
          </div>
        </div>`;
      }).join('')
      : (() => {
        // Fall back to members array; try to find email from applications
        const appsByName = {};
        (t.applications || []).forEach((a) => { if (a.name) appsByName[a.name] = a.email || ''; });
        return (t.members || []).map((m) => {
          const initial = (m.n || '?')[0].toUpperCase();
          const email = appsByName[m.n] || '';
          return `<div class="pp-applicant-row">
            <div class="pp-app-header">
              <div class="pp-app-info">
                <div class="pp-app-av">${initial}</div>
                <div>
                  <div class="pp-app-name">${esc(m.n || 'Member')}</div>
                  <div class="pp-app-role">${esc(m.r || '')}</div>
                  ${email ? `<div class="pp-ct-member-email">${esc(email)}</div>` : ''}
                </div>
              </div>
            </div>
          </div>`;
        }).join('');
      })();

    // Leader-only actions
    const leaderActionsHTML = isLeader ? `
      <div class="pp-detail-label" style="margin-top:20px;">Leader Actions</div>
      <div class="pp-ct-leader-actions">
        <button class="pp-ct-action-btn pp-ct-btn-danger"
          data-action="ct-delete-team" data-team-id="${t.id}">
          Delete Team
        </button>
      </div>` : '';

    detail.innerHTML = `
      <div class="pp-detail-name">${esc(t.team || 'Team')}</div>
      <div class="pp-detail-hackathon">${esc(t.name || '')}${t.theme ? ` · ${esc(t.theme)}` : ''}</div>
      <div class="pp-detail-grid">
        <div class="pp-detail-item">
          <div class="pp-detail-key">Status</div>
          <div class="pp-detail-val"><span class="pp-badge pp-b-green">Complete</span></div>
        </div>
        <div class="pp-detail-item">
          <div class="pp-detail-key">Members</div>
          <div class="pp-detail-val">${filled} / ${total}</div>
        </div>
        <div class="pp-detail-item">
          <div class="pp-detail-key">Deadline</div>
          <div class="pp-detail-val">${formatDate(t.deadline)}</div>
        </div>
      </div>
      ${t.description ? `<div class="pp-detail-label">About</div><div class="pp-detail-desc">${esc(t.description)}</div>` : ''}
      ${techStack ? `<div class="pp-detail-label">Tech Stack</div><div class="pp-tech-chips" style="margin-bottom:16px">${techStack}</div>` : ''}
      <div class="pp-detail-label">Team Members (${filled})</div>
      <div class="pp-ct-invite-banner">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3fc980" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        Invitation link sent to all members
      </div>
      <div class="pp-applicants-list">${membersHTML}</div>
      <div class="pp-ct-next-actions">
        <a href="/hackathon" class="pp-ct-action-btn pp-ct-btn-secondary">View Hackathon</a>
        <button class="pp-ct-action-btn pp-ct-btn-primary"
          data-action="ct-register" data-team-id="${t.id}">
          Register Team
        </button>
      </div>
      ${leaderActionsHTML}`;

    btn.addEventListener('click', () => {
      const open = !detail.hidden;
      container.querySelectorAll('.pp-inline-detail').forEach((d) => { d.hidden = true; });
      container.querySelectorAll('.pp-team-btn').forEach((b) => b.classList.remove('active'));
      if (!open) { detail.hidden = false; btn.classList.add('active'); }
    });

    wrap.appendChild(btn);
    wrap.appendChild(detail);
    container.appendChild(wrap);
  });
}

// ── Completed team actions ────────────────────────────────────────────────────
// Remove a member from a completed team.
// The freed role slot is re-opened → team moves back to Recruiting.
function removeMember(teamId, memberEmail, memberRole) {
  // eslint-disable-next-line no-alert
  if (!confirm(`Remove ${memberEmail} from the team? This will re-open the "${memberRole}" slot.`)) return;

  const normEmail = (memberEmail || '').trim().toLowerCase();
  const userTeams = lsGet('hk_user_teams', []);
  const team = userTeams.find((t) => String(t.id) === String(teamId));
  if (!team) return;

  // Remove from applications
  team.applications = (team.applications || []).filter(
    (a) => !((a.email || '').trim().toLowerCase() === normEmail && a.role === memberRole),
  );

  // Remove from members list
  team.members = (team.members || []).filter(
    (m) => !(m.r === memberRole && (m.n || '').trim() === (memberEmail || '').trim()),
  );

  // Re-open the freed role slot
  if (Array.isArray(team.roles)) {
    const role = team.roles.find((r) => r.n === memberRole);
    if (role) role.o = true;
  }

  lsSet('hk_user_teams', userTeams);

  // Remove from global applications
  const allApps = lsGet('hk_applications', []);
  lsSet('hk_applications', allApps.filter(
    (a) => !((a.applicantId || '').trim().toLowerCase() === normEmail && String(a.teamId) === String(teamId)),
  ));

  // Notify removed member
  if (window.Auth?.notify && memberEmail) {
    window.Auth.notify(memberEmail, 'application_reject', 'Removed from Team',
      `You have been removed from the team "${team.team}". The spot is now open again.`);
  }

  // Re-render — team will now appear in Recruiting since a role is open
  const created = getCreatedTeams(_email);
  const applied = getAppliedTeams(_email);
  renderStats(applied, created);
  renderCreated(created);
}

// Delete the entire team from localStorage.
function deleteTeam(teamId) {
  // eslint-disable-next-line no-alert
  if (!confirm('Delete this team permanently? This cannot be undone.')) return;

  const userTeams = lsGet('hk_user_teams', []);
  lsSet('hk_user_teams', userTeams.filter((t) => String(t.id) !== String(teamId)));

  // Remove all global applications for this team
  const allApps = lsGet('hk_applications', []);
  lsSet('hk_applications', allApps.filter((a) => String(a.teamId) !== String(teamId)));

  const created = getCreatedTeams(_email);
  const applied = getAppliedTeams(_email);
  renderStats(applied, created);
  renderCreated(created);
}

// Tabs 3 & 4: Created teams (active) — reuses existing renderTeamList
function renderTeamList(container, teams, emptyKey, emptyFallback, badgeCls, badgeTxt) {
  if (!teams.length) {
    container.innerHTML = emptyState(
      p(emptyKey, emptyFallback),
      '<a href="/find-teams" class="pp-link-btn">Go to Team Finder</a>',
    );
    return;
  }

  container.innerHTML = '';
  teams.forEach((t) => {
    const wrap = document.createElement('div');
    wrap.className = 'pp-accordion-item';
    const filled = (t.members || []).length;
    const total = t.totalSpots || '?';

    const btn = document.createElement('button');
    btn.className = 'pp-team-btn';
    btn.innerHTML = `
      <div class="pp-team-btn-info">
        <div class="pp-t-name">${esc(t.team || 'Team')}</div>
        <div class="pp-t-sub">${esc(t.name || '')} · ${filled}/${total} members</div>
      </div>
      <div class="pp-team-btn-right">
        <span class="pp-badge ${badgeCls}">${badgeTxt}</span>
        <span class="pp-chevron">▼</span>
      </div>`;

    const detail = document.createElement('div');
    detail.className = 'pp-inline-detail';
    detail.hidden = true;

    const apps = t.applications || [];
    const techStack = (t.techStack || []).map((s) => `<span class="pp-tech-chip">${esc(s)}</span>`).join('');

    let appRows;
    if (!apps.length) {
      appRows = '<div class="pp-no-apps">No applications yet.</div>';
    } else {
      appRows = apps.map((a) => {
        const decided = a.status && a.status !== 'pending';
        const decisionHtml = decided
          ? `<span class="pp-decided${a.status === 'approve' ? ' pp-decided-yes' : ' pp-decided-no'}">${a.status === 'approve' ? '✓ Approved' : '✕ Rejected'}</span>`
          : `<div class="pp-action-btns">
              <button class="pp-btn-approve" data-action="approve" data-team-id="${t.id}" data-email="${esc(a.email)}">
                ${p('approve-btn', 'Approve')}
              </button>
              <button class="pp-btn-reject" data-action="reject" data-team-id="${t.id}" data-email="${esc(a.email)}">
                ${p('reject-btn', 'Reject')}
              </button>
            </div>`;
        const initial = (a.name || '?')[0].toUpperCase();
        return `<div class="pp-applicant-row" data-app-row="${t.id}-${esc(a.email)}">
          <div class="pp-app-header">
            <div class="pp-app-info">
              <div class="pp-app-av">${a.avatar ? `<img src="${esc(a.avatar)}" alt="${esc(a.name)}" class="pp-app-av-img">` : initial}</div>
              <div>
                <div class="pp-app-name">${esc(a.name || 'Applicant')}</div>
                <div class="pp-app-role">${esc(a.role || '')}</div>
              </div>
            </div>
            ${decisionHtml}
          </div>
          ${a.skills || a.portfolio || a.msg || a.message ? `<div class="pp-app-detail">
            ${a.skills ? `<div><strong>Skills:</strong> ${esc(a.skills)}</div>` : ''}
            ${a.portfolio ? `<div><strong>Portfolio:</strong> <a href="${esc(a.portfolio)}" target="_blank" rel="noopener">${esc(a.portfolio)}</a></div>` : ''}
            ${a.msg || a.message ? `<div><strong>Message:</strong> ${esc(a.msg || a.message)}</div>` : ''}
          </div>` : ''}
        </div>`;
      }).join('');
    }

    detail.innerHTML = `
      <div class="pp-detail-name">${esc(t.team || 'Team')}</div>
      <div class="pp-detail-hackathon">${esc(t.name || '')}${t.theme ? ` · ${esc(t.theme)}` : ''}</div>
      <div class="pp-detail-grid">
        <div class="pp-detail-item"><div class="pp-detail-key">Max Size</div><div class="pp-detail-val">${total}</div></div>
        <div class="pp-detail-item"><div class="pp-detail-key">Level</div><div class="pp-detail-val">${esc(t.experienceLevel || 'Any')}</div></div>
        <div class="pp-detail-item"><div class="pp-detail-key">Deadline</div><div class="pp-detail-val">${formatDate(t.deadline)}</div></div>
      </div>
      ${t.description ? `<div class="pp-detail-label">About</div><div class="pp-detail-desc">${esc(t.description)}</div>` : ''}
      ${techStack ? `<div class="pp-detail-label">Tech Stack</div><div class="pp-tech-chips" style="margin-bottom:16px">${techStack}</div>` : ''}
      <div class="pp-detail-label">Applicants (${apps.length})</div>
      <div class="pp-applicants-list">${appRows}</div>`;

    btn.addEventListener('click', () => {
      const open = !detail.hidden;
      container.querySelectorAll('.pp-inline-detail').forEach((d) => { d.hidden = true; });
      container.querySelectorAll('.pp-team-btn').forEach((b) => b.classList.remove('active'));
      if (!open) { detail.hidden = false; btn.classList.add('active'); }
    });

    wrap.appendChild(btn);
    wrap.appendChild(detail);
    container.appendChild(wrap);
  });
}

function renderCreated(created) {
  // Re-derive each role's open/closed state directly from approved applications.
  // This self-heals existing localStorage data where role.o was never updated
  // (e.g. approved before the fix, or teams with no qty field).
  created.forEach((t) => {
    if (!Array.isArray(t.roles)) return;
    const apps = Array.isArray(t.applications) ? t.applications : [];
    t.roles.forEach((role) => {
      const approvedCount = apps.filter(
        (a) => a.role === role.n && a.status === 'approve',
      ).length;
      role.o = approvedCount === 0;
    });
  });

  // Active: has at least one open role (or has no roles defined yet — still recruiting)
  const active = created.filter((t) => !t.roles?.length || t.roles.some((r) => r.o));
  // Completed: has roles AND every role is filled (all closed)
  const completed = created.filter((t) => t.roles?.length > 0 && t.roles.every((r) => !r.o));

  renderTeamList(
    _block.querySelector('#pp-tab-created'),
    active,
    'empty-created',
    'No active teams yet.',
    'pp-b-gold',
    'Recruiting',
  );
  renderCompletedTeamList(
    _block.querySelector('#pp-tab-completed'),
    completed,
  );
}

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchTab(tabId) {
  _block.querySelectorAll('.pp-tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  _block.querySelectorAll('.pp-panel').forEach((panel) => {
    const active = panel.id === tabId;
    panel.classList.toggle('active', active);
    panel.hidden = !active;
  });
}

// ── Edit modal ────────────────────────────────────────────────────────────────
function renderEditSkills() {
  const el = _block.querySelector('#pp-edit-skills-list');
  if (!el) return;
  el.innerHTML = _editSkills
    .map(
      (s, i) => `<span class="pp-edit-skill-tag">
        ${esc(s)}
        <button type="button" data-action="remove-skill" data-index="${i}" aria-label="Remove ${esc(s)}">×</button>
      </span>`,
    )
    .join('');
}

function openEditModal() {
  const profile = _profile;
  _tempAvatar = profile.avatar || '';
  _editSkills = [...normalizeSkills(profile.skills)];

  _block.querySelector('#pp-inp-name').value = profile.name || '';
  _block.querySelector('#pp-inp-role').value = profile.role || '';
  _block.querySelector('#pp-inp-bio').value = profile.bio || '';
  _block.querySelector('#pp-inp-city').value = profile.city || '';
  _block.querySelector('#pp-inp-phone').value = profile.phone || '';
  _block.querySelector('#pp-inp-linkedin').value = profile.linkedin || '';
  _block.querySelector('#pp-inp-github').value = profile.github || '';

  const preview = _block.querySelector('#pp-edit-preview');
  if (preview) preview.innerHTML = avatarHTML(profile, 'sm');

  renderEditSkills();
  _block.querySelector('#pp-edit-modal').classList.add('open');
}

function closeEditModal() {
  _block.querySelector('#pp-edit-modal').classList.remove('open');
}

function saveEditModal() {
  const name = _block.querySelector('#pp-inp-name').value.trim();
  _profile.name = name || _profile.name;
  _profile.role = _block.querySelector('#pp-inp-role').value.trim() || _profile.role;
  _profile.bio = _block.querySelector('#pp-inp-bio').value.trim();
  _profile.city = _block.querySelector('#pp-inp-city').value.trim();
  _profile.phone = _block.querySelector('#pp-inp-phone').value.trim();
  _profile.linkedin = _block.querySelector('#pp-inp-linkedin').value.trim();
  _profile.github = _block.querySelector('#pp-inp-github').value.trim();
  if (_tempAvatar) _profile.avatar = _tempAvatar;
  _profile.skills = [..._editSkills];

  saveProfile(_profile, _email);
  renderProfileCard();
  if (window.Auth?.updateNav) window.Auth.updateNav();
  closeEditModal();
}

function addSkill() {
  const inp = _block.querySelector('#pp-inp-skill');
  const val = (inp?.value || '').trim();
  if (!val || _editSkills.includes(val) || _editSkills.length >= 20) return;
  _editSkills.push(val);
  inp.value = '';
  renderEditSkills();
}

function removeSkill(index) {
  _editSkills.splice(index, 1);
  renderEditSkills();
}

// ── Approve / Reject ──────────────────────────────────────────────────────────
function decide(teamId, applicantEmail, status) {
  const normEmail = (applicantEmail || '').trim().toLowerCase();
  const userTeams = lsGet('hk_user_teams', []);
  const team = userTeams.find((t) => String(t.id) === String(teamId));
  if (!team?.applications) return;

  const app = team.applications.find((a) => (a.email || '').trim().toLowerCase() === normEmail);
  if (!app) return;

  const prev = app.status;
  app.status = status;

  if (status === 'approve' && prev !== 'approve') {
    if (!team.members) team.members = [];
    if (!team.members.find((m) => m.n === app.name)) {
      team.members.push({ n: app.name, r: app.role });
    }
    if (team.roles) {
      const role = team.roles.find((r) => r.n === app.role);
      if (role) {
        // Count how many approved applicants fill this role slot
        const approvedCount = (team.applications || [])
          .filter((a) => (a.role === role.n) && a.status === 'approve').length;
        // Close the role once at least one person is approved for it
        if (approvedCount >= 1) role.o = false;
      }
    }
  } else if (status === 'reject' && prev === 'approve') {
    if (team.members) {
      team.members = team.members.filter((m) => !(m.r === app.role && m.n === app.name));
    }
    if (team.roles) {
      const role = team.roles.find((r) => r.n === app.role);
      if (role) {
        // Re-open the role — the approved person left
        role.o = true;
      }
    }
  }

  lsSet('hk_user_teams', userTeams);

  const allApps = lsGet('hk_applications', []);
  const gApp = allApps.find(
    (a) => String(a.teamId) === String(teamId) && (a.applicantId || '').trim().toLowerCase() === normEmail,
  );
  if (gApp) { gApp.status = status; lsSet('hk_applications', allApps); }

  if (window.Auth?.notify) {
    const verb = status === 'approve' ? 'approved' : 'rejected';
    window.Auth.notify(
      applicantEmail,
      `application_${status}`,
      `Application ${status === 'approve' ? 'Approved' : 'Rejected'}`,
      `Your application for the ${app.role} role in team "${team.team}" was ${verb}.`,
    );
    if (status === 'approve' && team.roles?.every((r) => !r.o)) {
      window.Auth.notify(
        team.creatorEmail,
        'team_full',
        'Team Completed!',
        `Your team "${team.team}" is now fully staffed.`,
      );
    }
  }

  const created = getCreatedTeams(_email);
  const applied = getAppliedTeams(_email);
  renderCreated(created);
  renderStats(applied, created);
}

// ── Withdraw ──────────────────────────────────────────────────────────────────
function showConfirm(teamId) {
  _withdrawTeamId = teamId;
  _block.querySelector('#pp-confirm-overlay').classList.add('open');
}

function hideConfirm() {
  _withdrawTeamId = null;
  _block.querySelector('#pp-confirm-overlay').classList.remove('open');
}

function confirmWithdraw() {
  if (!_withdrawTeamId) return;
  const teamId = _withdrawTeamId;
  const email = _email;

  // Clear static team state
  const staticState = lsGet(`hk_tm_v2_${email}`, []);
  const idx = staticState.findIndex((x) => String(x.id) === String(teamId));
  if (idx !== -1) {
    staticState[idx].applied = false;
    lsSet(`hk_tm_v2_${email}`, staticState);
  } else {
    // Remove from user-created team applications
    const userTeams = lsGet('hk_user_teams', []);
    const t = userTeams.find((x) => String(x.id) === String(teamId));
    if (t?.applications) {
      const app = t.applications.find((a) => (a.email || '').trim().toLowerCase() === email);
      if (app) {
        if (app.status === 'approve') {
          if (t.members) {
            t.members = t.members.filter((m) => !(m.r === app.role && m.n === app.name));
          }
          if (t.roles) {
            const role = t.roles.find((r) => r.n === app.role);
            // Re-open the slot — the approved member withdrew
            if (role) role.o = true;
          }
        }
        t.applications = t.applications.filter((a) => (a.email || '').trim().toLowerCase() !== email);
      }
      lsSet('hk_user_teams', userTeams);
    }
  }

  // Remove from global applications
  const allApps = lsGet('hk_applications', []);
  lsSet(
    'hk_applications',
    allApps.filter(
      (a) => !(
        (a.applicantId || '').trim().toLowerCase() === email
        && String(a.teamId) === String(teamId)
      ),
    ),
  );

  hideConfirm();

  const applied = getAppliedTeams(email);
  const created = getCreatedTeams(email);
  renderStats(applied, created);
  renderApplied(applied);
}

// ── Event delegation ──────────────────────────────────────────────────────────
function bindEvents() {
  // Tab buttons
  _block.querySelectorAll('.pp-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Edit modal open/close/save
  _block.querySelector('#pp-edit-btn').addEventListener('click', openEditModal);
  _block.querySelector('#pp-cancel-btn').addEventListener('click', closeEditModal);
  _block.querySelector('#pp-save-btn').addEventListener('click', saveEditModal);

  // Avatar upload
  const uploadBtn = _block.querySelector('#pp-upload-btn');
  const fileInput = _block.querySelector('#pp-inp-avatar-file');
  uploadBtn?.addEventListener('click', () => fileInput.click());
  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      // eslint-disable-next-line no-alert
      alert('Image must be under 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      _tempAvatar = ev.target.result;
      const preview = _block.querySelector('#pp-edit-preview');
      if (preview) preview.innerHTML = `<img src="${_tempAvatar}" class="pp-avatar-img pp-avatar-img-sm">`;
    };
    reader.readAsDataURL(file);
  });

  // Skill add
  _block.querySelector('#pp-add-skill-btn')?.addEventListener('click', addSkill);
  _block.querySelector('#pp-inp-skill')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addSkill(); }
  });

  // Withdraw confirm
  _block.querySelector('#pp-confirm-yes').addEventListener('click', confirmWithdraw);
  _block.querySelector('#pp-confirm-cancel').addEventListener('click', hideConfirm);
  _block.querySelector('#pp-confirm-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) hideConfirm();
  });

  // Event delegation for approve / reject / withdraw / remove-skill / completed team actions
  _block.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const {
      action, teamId, email, index,
      memberEmail, memberRole,
    } = btn.dataset;
    if (action === 'approve') decide(teamId, email, 'approve');
    else if (action === 'reject') decide(teamId, email, 'reject');
    else if (action === 'withdraw') showConfirm(teamId);
    else if (action === 'remove-skill') removeSkill(parseInt(index, 10));
    else if (action === 'ct-remove-member') removeMember(teamId, memberEmail, memberRole);
    else if (action === 'ct-delete-team') deleteTeam(teamId);
    else if (action === 'ct-register') {
      // Navigate to hackathon registration — extend as needed
      window.location.href = '/hackathon';
    }
  });

  // Close edit modal on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeEditModal();
  });
}

// ── UPGRADE variant (/upgrade page) ─────────────────────────────────────────
// Reuses this block instead of a new one: membership already lives on the
// same profile object (DEFAULTS.membership), and profile-page.js already
// links here from three places (this file's own Upgrade button, plus the
// free-tier limit gates in team-cards/apply-modal.js and create-modal.js) --
// all three already pass ?reason=&redirect= expecting this exact page to exist.
function showUpgToast(block, msg, type = 'error') {
  const wrap = block.querySelector('#pp-upg-toast');
  if (!wrap) return;
  const t = document.createElement('div');
  t.className = `pp-upg-toast-item ${type}`;
  t.textContent = msg;
  wrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3500);
}

async function decorateUpgrade(block) {
  if (localStorage.getItem('isLoggedIn') !== 'true') {
    const redir = encodeURIComponent(window.location.href);
    window.location.replace(`/auth-form?mode=login&redirect=${redir}`);
    return;
  }

  _cfg = parseRows(block);
  const email = getEmail();
  const profile = loadProfile(email);
  document.body.classList.add('profile-page');

  const params = new URLSearchParams(window.location.search);
  const reason = params.get('reason') || 'default';
  const redirect = params.get('redirect') ? decodeURIComponent(params.get('redirect')) : '/profile';

  const copyByReason = {
    apply_limit: {
      title: p('apply-limit-title', 'Application Limit Reached!'),
      subtitle: p('apply-limit-subtitle', "You've reached the maximum of 3 active team applications. Upgrade to Premium to apply to unlimited teams."),
    },
    create_limit: {
      title: p('create-limit-title', 'Creation Limit Reached!'),
      subtitle: p('create-limit-subtitle', 'Free accounts are limited to 3 team creations per month. Go Premium for unlimited creations.'),
    },
    profile_upgrade: {
      title: p('profile-title', 'Upgrade to Premium'),
      subtitle: p('profile-subtitle', 'Get unlimited applications, team creations, priority applicant status, and a premium badge.'),
    },
    default: {
      title: p('default-title', 'Elevate Your Team Search'),
      subtitle: p('default-subtitle', 'Unlock unlimited powers and connect with the best minds in tech.'),
    },
  };
  const copy = copyByReason[reason] || copyByReason.default;

  if (profile.membership === 'premium') {
    block.innerHTML = `
      <div class="pp-upg-page">
        <div class="pp-upg-already">
          <span class="pp-crown">👑</span>
          <h1>${esc(p('already-title', "You're Already Premium"))}</h1>
          <p>${esc(p('already-subtitle', 'You already have full access to every premium feature.'))}</p>
          <a class="pp-save-btn" href="${esc(redirect)}">${esc(p('back-btn', 'Back'))}</a>
        </div>
      </div>`;
    return;
  }

  const eyebrow = p('eyebrow', 'HackHub Pro');
  const price = p('price', '₹99');
  const period = p('period', '/ month');
  const priceNote = p('price-note', 'Minimal subscription. Cancel anytime from your profile settings.');
  const planLabel = p('plan-label', 'Premium Plan');
  const features = p(
    'features',
    'Unlimited Active Applications: Apply to as many active teams as you want. '
    + '| Unlimited Team Creations: Create and lead multiple project squads every month. '
    + '| Premium Profile Badge: Display a golden badge to signal your commitment. '
    + '| Priority Candidate Status: Get featured near the top of applicant lists.',
  ).split('|').map((f) => {
    const idx = f.indexOf(':');
    return idx === -1 ? { t: f.trim(), d: '' } : { t: f.slice(0, idx).trim(), d: f.slice(idx + 1).trim() };
  }).filter((f) => f.t);

  block.innerHTML = `
    <div class="pp-upg-page">
      <div class="pp-upg-grid">
        <div class="pp-upg-benefits">
          <span class="pp-upg-eyebrow">${esc(eyebrow)}</span>
          <h1 class="pp-upg-title">${esc(copy.title)}</h1>
          <p class="pp-upg-sub">${esc(copy.subtitle)}</p>
          <div class="pp-upg-features">
            ${features.map((f) => `
              <div class="pp-upg-feature">
                <span class="pp-upg-check">✓</span>
                <div>
                  <h3>${esc(f.t)}</h3>
                  ${f.d ? `<p>${esc(f.d)}</p>` : ''}
                </div>
              </div>`).join('')}
          </div>
          <div class="pp-upg-price-card">
            <span class="pp-upg-price-label">${esc(planLabel)}</span>
            <div class="pp-upg-price">${esc(price)} <span>${esc(period)}</span></div>
            <p class="pp-upg-price-note">${esc(priceNote)}</p>
          </div>
        </div>
        <div class="pp-upg-checkout">
          <h2>${esc(p('checkout-title', 'Payment Details'))}</h2>
          <p class="pp-upg-checkout-sub">${esc(p('checkout-subtitle', 'Enter details securely below to instantly unlock Premium benefits.'))}</p>
          <form id="pp-upg-form" novalidate>
            <div class="pp-edit-field">
              <label class="pp-edit-label">${esc(p('label-name', 'Name on Card'))}</label>
              <input class="pp-edit-input" id="pp-upg-name" type="text" placeholder="Jane Doe" value="${esc(profile.name || '')}">
            </div>
            <div class="pp-edit-field">
              <label class="pp-edit-label">${esc(p('label-card', 'Card Number'))}</label>
              <input class="pp-edit-input" id="pp-upg-card" type="text" inputmode="numeric" maxlength="19" placeholder="4242 4242 4242 4242">
            </div>
            <div class="pp-edit-row">
              <div class="pp-edit-field">
                <label class="pp-edit-label">${esc(p('label-expiry', 'Expiry'))}</label>
                <input class="pp-edit-input" id="pp-upg-expiry" type="text" maxlength="5" placeholder="MM/YY">
              </div>
              <div class="pp-edit-field">
                <label class="pp-edit-label">${esc(p('label-cvv', 'CVV'))}</label>
                <input class="pp-edit-input" id="pp-upg-cvv" type="text" inputmode="numeric" maxlength="4" placeholder="123">
              </div>
            </div>
            <button type="submit" class="pp-save-btn pp-upg-pay-btn" id="pp-upg-pay-btn">${esc(p('pay-btn', `Pay & Upgrade — ${price}${period}`))}</button>
          </form>
        </div>
      </div>
    </div>
    <div class="pp-upg-toast-wrap" id="pp-upg-toast"></div>`;

  block.querySelector('#pp-upg-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = block.querySelector('#pp-upg-name').value.trim();
    const card = block.querySelector('#pp-upg-card').value.replace(/\s+/g, '');
    const expiry = block.querySelector('#pp-upg-expiry').value.trim();
    const cvv = block.querySelector('#pp-upg-cvv').value.trim();

    if (!name || card.length < 12 || !/^\d{2}\/\d{2}$/.test(expiry) || cvv.length < 3) {
      showUpgToast(block, p('error-invalid', 'Please fill in valid payment details.'));
      return;
    }

    const btn = block.querySelector('#pp-upg-pay-btn');
    btn.disabled = true;
    btn.textContent = p('processing-label', 'Processing…');

    setTimeout(() => {
      profile.membership = 'premium';
      saveProfile(profile, email);

      try {
        if (window.Auth?.notify && email) {
          window.Auth.notify(
            email,
            'membership_upgrade',
            p('notify-title', 'Welcome to HackHub Premium!'),
            p('notify-message', 'Your membership was upgraded to Premium. Enjoy unlimited creations and applications.'),
          );
        }
      } catch { /* */ }

      showUpgToast(block, p('success-message', 'Upgrade successful! Redirecting…'), 'success');
      setTimeout(() => { window.location.href = redirect; }, 1000);
    }, 900);
  });

  const cardInput = block.querySelector('#pp-upg-card');
  cardInput.addEventListener('input', () => {
    cardInput.value = cardInput.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
  });
  const expiryInput = block.querySelector('#pp-upg-expiry');
  expiryInput.addEventListener('input', () => {
    let v = expiryInput.value.replace(/\D/g, '').slice(0, 4);
    if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`;
    expiryInput.value = v;
  });
}

// ── ADMIN variant (/organiser-dashboard) ────────────────────────────────────
// Reuses this block instead of a new one: same login-gated, role-branched
// dashboard shell as the rest of profile-page.js, just gated to admins
// (checked against a da.live-configured admin-emails list, same convention
// as organiser-workflow.js used) instead of "any logged-in user". Data model
// (pendingHackathons/approvedHackathons/registrations queues, real site
// registrations + legacy hackathon slugs) is carried over unchanged from
// that block so nothing already submitted is lost.
let _admTab = 'overview';
let _admLegacyHackathons = [];
let _admLegacyLoaded = false;
let _admJustApproved = null;
let _admExportId = '';

function admIsAdminEmail(email) {
  const list = p('admin-emails', '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(email);
}

function admGetPending() { return lsGet('pendingHackathons', []); }
function admSetPending(v) { lsSet('pendingHackathons', v); }
function admGetApproved() { return lsGet('approvedHackathons', []); }
function admSetApproved(v) { lsSet('approvedHackathons', v); }
function admGetRegistrations() { return lsGet('registrations', []); }
function admGetSiteRegistrations() {
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
function admGetSiteProfile(email) {
  const profiles = lsGet('hk_profiles', {});
  return profiles[email] || null;
}

// Site has no query-index (forbidden for this project), so the admin-only
// legacy-hackathon-slugs config row is the only way to fold pre-existing
// /hackathons/<slug> pages into this dashboard's Hackathons/Registrations views.
async function admFetchLegacyHackathons() {
  const slugs = p('legacy-hackathon-slugs', '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!slugs.length) return [];
  const results = await Promise.all(slugs.map(async (slug) => {
    const path = slug.startsWith('/') ? slug : `/hackathons/${slug}`;
    try {
      const res = await fetch(`${path}.plain.html`);
      if (!res.ok) return null;
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
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

function admGenId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function admShowToast(block, msg) {
  let wrap = block.querySelector('#pp-adm-toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'pp-adm-toast-wrap';
    wrap.id = 'pp-adm-toast-wrap';
    block.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = 'pp-adm-toast';
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => { t.classList.add('pp-adm-toast-out'); setTimeout(() => t.remove(), 300); }, 3200);
}

function admDownloadCSV(filename, headerRow, rows) {
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

function admOpenModal(block, title, bodyHtml) {
  const root = block.querySelector('#pp-adm-modal-root');
  if (!root) return;
  root.innerHTML = `
    <div class="pp-adm-modal-overlay" id="pp-adm-modal-overlay">
      <div class="pp-adm-modal">
        <div class="pp-adm-modal-head">
          <h2>${esc(title)}</h2>
          <button type="button" class="pp-adm-modal-close" id="pp-adm-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="pp-adm-modal-body">${bodyHtml}</div>
      </div>
    </div>`;
  const overlay = root.querySelector('#pp-adm-modal-overlay');
  const close = () => { root.innerHTML = ''; };
  root.querySelector('#pp-adm-modal-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

function admGetAllLiveHackathons() {
  return [...admGetApproved(), ..._admLegacyHackathons];
}

function admRegCountFor(hack) {
  if (hack.source === 'legacy') return admGetSiteRegistrations().filter((r) => r.hackathonId === hack.id).length;
  return admGetRegistrations().filter((r) => r.hackathonId === hack.id).length;
}

// Team stats — hk_user_teams is one flat array shared across every team a
// user created in this browser, so site-wide team aggregates are just a
// read-only pass over it; no new storage, no new write paths.
function admGetTeamStats() {
  const teams = lsGet('hk_user_teams', []);
  let fullyStaffed = 0;
  let totalApps = 0;
  let pendingApps = 0;
  teams.forEach((t) => {
    const roles = Array.isArray(t.roles) ? t.roles : [];
    if (roles.length && roles.every((r) => !r.o)) fullyStaffed += 1;
    const apps = Array.isArray(t.applications) ? t.applications : [];
    totalApps += apps.length;
    pendingApps += apps.filter((a) => a.status === 'pending').length;
  });
  return {
    teams,
    total: teams.length,
    fullyStaffed,
    recruiting: teams.length - fullyStaffed,
    totalApps,
    pendingApps,
  };
}

function admTpl(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars?.[k] != null ? vars[k] : ''));
}

const ADM_CHECK_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
const ADM_BIG_CHECK_ICON = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

const ADM_ICONS = {
  overview: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  requests: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/><path d="M9 12h6M9 16h6"/></svg>',
  hackathons: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h7l-1 8 11-14h-7l1-6z"/></svg>',
  teams: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  registrations: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  export: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  partners: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 9h1M9 13h1M14 9h1M14 13h1M10 21v-4h4v4"/></svg>',
};

const ADM_NAV = [
  { tab: 'overview', icon: ADM_ICONS.overview, labelKey: 'tab-dashboard', fallback: 'Dashboard' },
  { tab: 'requests', icon: ADM_ICONS.requests, labelKey: 'tab-requests', fallback: 'Organisation Requests' },
  { tab: 'hackathons', icon: ADM_ICONS.hackathons, labelKey: 'tab-hackathons', fallback: 'Hackathons' },
  { tab: 'teams', icon: ADM_ICONS.teams, labelKey: 'tab-teams', fallback: 'Teams' },
  { tab: 'registrations', icon: ADM_ICONS.registrations, labelKey: 'tab-registrations', fallback: 'Registrations' },
  { tab: 'export', icon: ADM_ICONS.export, labelKey: 'tab-export', fallback: 'Export' },
];

function admStatCard(icon, label, value, sub = '') {
  return `
    <div class="pp-adm-stat-card">
      <div class="pp-adm-stat-icon">${icon}</div>
      <div class="pp-adm-stat-body">
        <div class="pp-adm-stat-label">${esc(label)}</div>
        <div class="pp-adm-stat-value">${value}${sub ? ` <span class="pp-adm-stat-sub">${esc(sub)}</span>` : ''}</div>
      </div>
    </div>`;
}

function admTable(headers, rows, emptyLabel) {
  if (!rows.length) return `<div class="pp-adm-empty">${esc(emptyLabel)}</div>`;
  return `
    <div class="pp-adm-table-wrap">
      <table class="pp-adm-table">
        <thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    </div>`;
}

async function decorateAdmin(block) {
  _cfg = parseRows(block);

  if (localStorage.getItem('isLoggedIn') !== 'true') {
    window.location.replace(`/auth-form?mode=login&redirect=${encodeURIComponent(window.location.href)}`);
    return;
  }

  const email = getEmail();
  document.body.classList.add('profile-page');

  if (!admIsAdminEmail(email)) {
    block.innerHTML = `
      <div class="pp-adm-restricted">
        <h2>${esc(p('restricted-title', 'Admins Only'))}</h2>
        <p>${esc(p('restricted-desc', 'This dashboard is only available to HackHub admins.'))}</p>
        <a class="pp-save-btn" href="/">${esc(p('restricted-cta', 'Back to Home'))}</a>
      </div>`;
    return;
  }

  block.innerHTML = `
    <div class="pp-adm-shell">
      <nav class="pp-adm-sidebar">
        <div class="pp-adm-brand">${esc(p('admin-brand', 'HackHub Admin'))}</div>
        <div class="pp-adm-nav">
          ${ADM_NAV.map((n, i) => `
            <button type="button" class="pp-adm-nav-link${i === 0 ? ' active' : ''}" data-tab="${n.tab}">
              <span class="pp-adm-nav-icon">${n.icon}</span>${esc(p(n.labelKey, n.fallback))}
            </button>`).join('')}
        </div>
        <button type="button" class="pp-adm-logout" id="pp-adm-logout">${esc(p('logout-label', 'Log Out'))}</button>
      </nav>
      <main class="pp-adm-content" id="pp-adm-content"></main>
    </div>
    <div class="pp-adm-modal-root" id="pp-adm-modal-root"></div>
    <div class="pp-adm-toast-wrap" id="pp-adm-toast-wrap"></div>`;

  block.querySelector('#pp-adm-logout').addEventListener('click', () => {
    ['isLoggedIn', 'currentUserEmail', 'hk_profile', 'hk_notifications'].forEach((k) => localStorage.removeItem(k));
    window.location.href = '/';
  });

  block.querySelectorAll('.pp-adm-nav-link').forEach((btn) => {
    btn.addEventListener('click', () => {
      block.querySelectorAll('.pp-adm-nav-link').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      _admTab = btn.dataset.tab;
      admRenderTab(block);
    });
  });

  admRenderTab(block);

  if (!_admLegacyLoaded) {
    admFetchLegacyHackathons().then((list) => {
      _admLegacyHackathons = list;
      _admLegacyLoaded = true;
      admRenderTab(block);
    });
  }
}

function admRenderTab(block) {
  const content = block.querySelector('#pp-adm-content');
  if (!content) return;
  if (_admTab === 'overview') { admRenderOverview(content); return; }
  if (_admTab === 'requests') { admRenderRequests(block, content); return; }
  if (_admTab === 'hackathons') { admRenderHackathons(block, content); return; }
  if (_admTab === 'teams') { admRenderTeams(content); return; }
  if (_admTab === 'registrations') { admRenderRegistrations(block, content); return; }
  if (_admTab === 'export') { admRenderExport(block, content); }
}

function admRenderOverview(content) {
  const pending = admGetPending();
  const live = admGetAllLiveHackathons();
  const totalRegs = admGetRegistrations().length + admGetSiteRegistrations().length;
  const { total: teamTotal, fullyStaffed } = admGetTeamStats();

  content.innerHTML = `
    <div class="pp-adm-content-header">
      <h1>${esc(p('tab-dashboard', 'Dashboard'))}</h1>
      <p>${esc(p('dashboard-sub', 'Live snapshot of everything happening on HackHub right now.'))}</p>
    </div>
    <div class="pp-adm-stats-grid">
      ${admStatCard(ADM_ICONS.requests, p('stat-pending-label', 'Pending Organisation Requests'), pending.length)}
      ${admStatCard(ADM_ICONS.hackathons, p('stat-live-label', 'Live Hackathons'), live.length)}
      ${admStatCard(ADM_ICONS.registrations, p('stat-regs-label', 'Total Student Registrations'), totalRegs)}
      ${admStatCard(ADM_ICONS.teams, p('stat-teams-label', 'Teams Formed'), teamTotal, `${fullyStaffed} fully staffed`)}
    </div>
    ${!_admLegacyLoaded && p('legacy-hackathon-slugs', '') ? `<p class="pp-adm-sync-note">${esc(p('syncing-label', 'Syncing live site data…'))}</p>` : ''}`;
}

function admRenderRequests(block, content) {
  const pending = admGetPending();
  content.innerHTML = `
    <div class="pp-adm-content-header"><h1>${esc(p('tab-requests', 'Organisation Requests'))}</h1></div>
    <div id="pp-adm-requests-banner"></div>
    <div id="pp-adm-requests-body" class="pp-adm-requests-list"></div>`;

  const bannerWrap = content.querySelector('#pp-adm-requests-banner');
  if (_admJustApproved) {
    bannerWrap.innerHTML = `
      <div class="pp-adm-next-steps-banner">
        <button type="button" class="pp-adm-next-steps-close" id="pp-adm-next-steps-dismiss" aria-label="${esc(p('dismiss-label', 'Dismiss'))}">&times;</button>
        <div class="pp-adm-next-steps-icon">${ADM_BIG_CHECK_ICON}</div>
        <div class="pp-adm-next-steps-content">
          <strong>${esc(admTpl(p('next-steps-title', '{company} Approved'), _admJustApproved))}</strong>
          <p>${esc(admTpl(p('next-steps-subtitle', 'Here’s what happens next for {hackathon}:'), _admJustApproved))}</p>
          <ul>
            <li><span class="pp-adm-step-check">${ADM_CHECK_ICON}</span>${esc(admTpl(p('next-step-1', 'We will reach out to {company} within 24 hours.'), _admJustApproved))}</li>
            <li><span class="pp-adm-step-check">${ADM_CHECK_ICON}</span>${esc(admTpl(p('next-step-2', 'We will manage {hackathon} and its registrations on their behalf.'), _admJustApproved))}</li>
            <li><span class="pp-adm-step-check">${ADM_CHECK_ICON}</span>${esc(admTpl(p('next-step-3', 'We will promote {hackathon} across our social channels.'), _admJustApproved))}</li>
          </ul>
        </div>
      </div>`;
    bannerWrap.querySelector('#pp-adm-next-steps-dismiss').addEventListener('click', () => {
      _admJustApproved = null;
      admRenderRequests(block, content);
    });
  }

  const body = content.querySelector('#pp-adm-requests-body');
  if (!pending.length) {
    body.innerHTML = `<div class="pp-adm-empty">${esc(p('empty-pending', 'No pending organisation requests.'))}</div>`;
    return;
  }

  body.innerHTML = pending.map((h) => `
    <div class="pp-adm-request-card" data-id="${esc(h.id)}">
      <div class="pp-adm-request-head">
        <div>
          <div class="pp-adm-request-title">${esc(h.hackathonName)}</div>
          <div class="pp-adm-request-company">${esc(h.company)}</div>
        </div>
        <span class="pp-adm-status pp-adm-status-pending">${esc(p('status-pending-label', 'Pending Approval'))}</span>
      </div>
      ${h.description ? `<p class="pp-adm-request-desc">${esc(h.description)}</p>` : ''}
      <div class="pp-adm-info-grid">
        <div class="pp-adm-info-item"><span>${esc(p('label-contact', 'Contact Person'))}</span><strong>${esc(h.contactPerson) || '—'}</strong></div>
        <div class="pp-adm-info-item"><span>${esc(p('label-contact-email', 'Contact Email'))}</span><strong>${esc(h.contactEmail) || '—'}</strong></div>
        <div class="pp-adm-info-item"><span>${esc(p('label-deadline', 'Registration Deadline'))}</span><strong>${esc(h.deadline) || '—'}</strong></div>
        <div class="pp-adm-info-item"><span>${esc(p('label-team-size', 'Team Size'))}</span><strong>${esc(h.teamSize) || '—'}</strong></div>
        <div class="pp-adm-info-item"><span>${esc(p('label-prize', 'Prize Pool'))}</span><strong>${esc(h.prize) || '—'}</strong></div>
        <div class="pp-adm-info-item"><span>${esc(p('submitted-label', 'Submitted'))}</span><strong>${new Date(h.submittedAt).toLocaleDateString()}</strong></div>
      </div>
      <div class="pp-adm-request-actions">
        <button type="button" class="pp-adm-btn-reject" data-id="${esc(h.id)}">${esc(p('reject-label', 'Reject'))}</button>
        <button type="button" class="pp-adm-btn-approve" data-id="${esc(h.id)}">${esc(p('approve-label', 'Approve'))}</button>
      </div>
    </div>`).join('');

  body.querySelectorAll('.pp-adm-btn-approve').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const list = admGetPending();
      const idx = list.findIndex((h) => h.id === id);
      if (idx === -1) return;
      const [item] = list.splice(idx, 1);
      item.status = 'Approved';
      const app = admGetApproved();
      app.push(item);
      admSetApproved(app);
      admSetPending(list);
      _admJustApproved = { company: item.company, hackathon: item.hackathonName };
      admShowToast(block, p('approved-message', 'Hackathon approved and is now live.'));
      admRenderRequests(block, content);
    });
  });
  body.querySelectorAll('.pp-adm-btn-reject').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      admSetPending(admGetPending().filter((h) => h.id !== id));
      admShowToast(block, p('rejected-message', 'Hackathon rejected.'));
      admRenderRequests(block, content);
    });
  });
}

function admRenderHackathons(block, content) {
  const all = admGetAllLiveHackathons();
  content.innerHTML = `
    <div class="pp-adm-content-header pp-adm-content-header-row">
      <div><h1>${esc(p('tab-hackathons', 'Hackathons'))}</h1></div>
      <button type="button" class="pp-adm-btn-primary" id="pp-adm-post-hackathon-btn">${esc(p('post-hackathon-label', '+ Post New Hackathon'))}</button>
    </div>
    ${admTable(
    [p('label-hackathon-name', 'Hackathon Name'), p('label-company', 'Organisation'), p('reg-count-label', 'Registration Count'), p('status-label', 'Status')],
    all.map((h) => `<tr>
        <td>${esc(h.hackathonName)}</td>
        <td>${esc(h.company)}</td>
        <td>${admRegCountFor(h)}</td>
        <td><span class="pp-adm-status pp-adm-status-live">${esc(p('status-live-label', 'Live'))}</span></td>
      </tr>`),
    p('empty-approved', 'No approved hackathons yet.'),
  )}`;

  content.querySelector('#pp-adm-post-hackathon-btn').addEventListener('click', () => admOpenPostHackathonModal(block));
}

function admOpenPostHackathonModal(block) {
  const bodyHtml = `
    <div class="pp-adm-field-row">
      <div class="pp-adm-field"><label>${esc(p('label-company', 'Company Name'))}</label><input type="text" id="pp-adm-ap-company" placeholder="Acme Inc."></div>
      <div class="pp-adm-field"><label>${esc(p('label-contact', 'Contact Person'))}</label><input type="text" id="pp-adm-ap-contact" placeholder="Jane Doe"></div>
    </div>
    <div class="pp-adm-field-row">
      <div class="pp-adm-field"><label>${esc(p('label-contact-email', 'Contact Email'))}</label><input type="email" id="pp-adm-ap-contact-email" placeholder="jane@company.com"></div>
      <div class="pp-adm-field"><label>${esc(p('label-hackathon-name', 'Hackathon Name'))}</label><input type="text" id="pp-adm-ap-hack-name" placeholder="InnovateTech 2026"></div>
    </div>
    <div class="pp-adm-field"><label>${esc(p('label-description', 'Description'))}</label><textarea id="pp-adm-ap-description" rows="3" placeholder="Themes, goals, what makes it worth joining…"></textarea></div>
    <div class="pp-adm-field-row">
      <div class="pp-adm-field"><label>${esc(p('label-deadline', 'Registration Deadline'))}</label><input type="date" id="pp-adm-ap-deadline"></div>
      <div class="pp-adm-field"><label>${esc(p('label-team-size', 'Team Size'))}</label><input type="text" id="pp-adm-ap-team-size" placeholder="2-4"></div>
    </div>
    <div class="pp-adm-field-row">
      <div class="pp-adm-field"><label>${esc(p('label-prize', 'Prize Pool'))}</label><input type="text" id="pp-adm-ap-prize" placeholder="₹5,00,000"></div>
      <div class="pp-adm-field"><label>${esc(p('label-banner', 'Banner Image'))}</label><input type="file" id="pp-adm-ap-banner" accept="image/*"></div>
    </div>
    <button type="button" class="pp-adm-btn-primary" id="pp-adm-ap-submit">${esc(p('post-hackathon-submit-label', 'Post Hackathon'))}</button>`;

  admOpenModal(block, p('post-hackathon-title', 'Post a New Hackathon'), bodyHtml);
  const root = block.querySelector('#pp-adm-modal-root');
  if (!root) return;

  let bannerDataUrl = '';
  root.querySelector('#pp-adm-ap-banner').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { admShowToast(block, p('error-banner-size', 'Banner must be under 2MB.')); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (ev) => { bannerDataUrl = ev.target.result; };
    reader.readAsDataURL(file);
  });

  root.querySelector('#pp-adm-ap-submit').addEventListener('click', () => {
    const company = root.querySelector('#pp-adm-ap-company').value.trim();
    const contactPerson = root.querySelector('#pp-adm-ap-contact').value.trim();
    const contactEmail = root.querySelector('#pp-adm-ap-contact-email').value.trim();
    const hackathonName = root.querySelector('#pp-adm-ap-hack-name').value.trim();
    const description = root.querySelector('#pp-adm-ap-description').value.trim();
    const deadline = root.querySelector('#pp-adm-ap-deadline').value;
    const teamSize = root.querySelector('#pp-adm-ap-team-size').value.trim();
    const prize = root.querySelector('#pp-adm-ap-prize').value.trim();

    if (!company || !hackathonName || !deadline) {
      admShowToast(block, p('error-required-admin-post', 'Please fill in Company Name, Hackathon Name, and Deadline.'));
      return;
    }

    const pending = admGetPending();
    pending.push({
      id: admGenId('hack'), company, contactPerson, contactEmail, hackathonName, description, deadline, teamSize, prize, banner: bannerDataUrl, status: 'Pending Approval', submittedAt: new Date().toISOString(), postedByAdmin: true,
    });
    admSetPending(pending);

    root.innerHTML = '';
    admShowToast(block, p('posted-message', 'Hackathon posted — approve it below to make it live.'));
    _admTab = 'requests';
    block.querySelectorAll('.pp-adm-nav-link').forEach((b) => b.classList.toggle('active', b.dataset.tab === 'requests'));
    admRenderTab(block);
  });
}

// ── Teams tab — site-wide team stats, new in this port ─────────────────────
function admRenderTeams(content) {
  const {
    teams, total, fullyStaffed, recruiting, totalApps, pendingApps,
  } = admGetTeamStats();

  content.innerHTML = `
    <div class="pp-adm-content-header"><h1>${esc(p('tab-teams', 'Teams'))}</h1></div>
    <div class="pp-adm-stats-grid">
      ${admStatCard(ADM_ICONS.teams, p('stat-teams-total-label', 'Total Teams'), total)}
      ${admStatCard(ADM_ICONS.overview, p('stat-teams-staffed-label', 'Fully Staffed'), fullyStaffed)}
      ${admStatCard(ADM_ICONS.hackathons, p('stat-teams-recruiting-label', 'Still Recruiting'), recruiting)}
      ${admStatCard(ADM_ICONS.requests, p('stat-teams-apps-label', 'Total Applications'), totalApps, `${pendingApps} pending`)}
    </div>
    ${admTable(
    [p('label-team-name', 'Team Name'), p('label-hackathon-name', 'Hackathon'), p('label-members', 'Members'), p('status-label', 'Status'), p('label-pending-applicants', 'Pending Applicants')],
    teams.map((t) => {
      const roles = Array.isArray(t.roles) ? t.roles : [];
      const staffed = roles.length && roles.every((r) => !r.o);
      const filled = (t.members || []).length;
      const total2 = t.totalSpots || roles.length || '?';
      const pending = (t.applications || []).filter((a) => a.status === 'pending').length;
      return `<tr>
          <td>${esc(t.team || 'Team')}</td>
          <td>${esc(t.name || '')}</td>
          <td>${filled}/${total2}</td>
          <td><span class="pp-adm-status ${staffed ? 'pp-adm-status-live' : 'pp-adm-status-pending'}">${staffed ? esc(p('status-full-label', 'Full')) : esc(p('status-recruiting-label', 'Recruiting'))}</span></td>
          <td>${pending}</td>
        </tr>`;
    }),
    p('empty-teams', 'No teams created yet.'),
  )}`;
}

function admRenderRegistrations(block, content) {
  const all = admGetAllLiveHackathons();
  content.innerHTML = `
    <div class="pp-adm-content-header"><h1>${esc(p('tab-registrations', 'Registrations'))}</h1></div>
    ${admTable(
    [p('label-hackathon-name', 'Hackathon'), p('label-company', 'Organisation'), p('reg-count-label', 'Registrations'), ''],
    all.map((h) => `<tr>
        <td>${esc(h.hackathonName)}</td>
        <td>${esc(h.company)}</td>
        <td>${admRegCountFor(h)}</td>
        <td><button type="button" class="pp-adm-btn-secondary pp-adm-view-regs-btn" data-id="${esc(h.id)}">${esc(p('view-label', 'View'))}</button></td>
      </tr>`),
    p('empty-registrations', 'No registrations yet.'),
  )}`;

  content.querySelectorAll('.pp-adm-view-regs-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const hack = all.find((h) => h.id === btn.dataset.id);
      if (hack) admOpenRegistrationsModal(block, hack);
    });
  });
}

function admOpenRegistrationsModal(block, hack) {
  let rows;
  if (hack.source === 'legacy') {
    rows = admGetSiteRegistrations().filter((r) => r.hackathonId === hack.id).map((r) => {
      const prof = admGetSiteProfile(r.email);
      return {
        name: prof?.name || r.email, college: '—', skills: Array.isArray(prof?.skills) ? prof.skills.join(', ') : (prof?.skills || '—'), date: r.registeredAt,
      };
    });
  } else {
    rows = admGetRegistrations().filter((r) => r.hackathonId === hack.id)
      .map((r) => ({
        name: r.studentName, college: r.college, skills: r.skills, date: r.registrationDate,
      }));
  }

  const bodyHtml = admTable(
    [p('label-student-name', 'Student Name'), p('label-college', 'College'), p('label-skills', 'Skills'), p('registered-on-label', 'Registration Date')],
    rows.map((r) => `<tr><td>${esc(r.name)}</td><td>${esc(r.college)}</td><td>${esc(r.skills)}</td><td>${new Date(r.date).toLocaleDateString()}</td></tr>`),
    p('empty-registrations', 'No registrations yet.'),
  );
  admOpenModal(block, hack.hackathonName, bodyHtml);
}

function admRenderExport(block, content) {
  const all = admGetAllLiveHackathons();
  content.innerHTML = `
    <div class="pp-adm-content-header"><h1>${esc(p('tab-export', 'Export'))}</h1></div>
    <div class="pp-adm-card">
      <div class="pp-adm-field">
        <label>${esc(p('export-select-label', 'Select a Hackathon'))}</label>
        <select id="pp-adm-export-select">
          <option value="">${esc(p('export-select-placeholder', 'Choose a hackathon…'))}</option>
          ${all.map((h) => `<option value="${esc(h.id)}" ${h.id === _admExportId ? 'selected' : ''}>${esc(h.hackathonName)}</option>`).join('')}
        </select>
      </div>
      <button type="button" class="pp-adm-btn-primary" id="pp-adm-export-btn">${esc(p('download-csv-label', 'Download CSV'))}</button>
    </div>`;

  content.querySelector('#pp-adm-export-select').addEventListener('change', (e) => { _admExportId = e.target.value; });
  content.querySelector('#pp-adm-export-btn').addEventListener('click', () => {
    if (!_admExportId) { admShowToast(block, p('error-no-hackathon-selected', 'Please select a hackathon first.')); return; }
    const hack = all.find((h) => h.id === _admExportId);
    if (!hack) return;

    let rows;
    if (hack.source === 'legacy') {
      rows = admGetSiteRegistrations().filter((r) => r.hackathonId === hack.id).map((r) => {
        const prof = admGetSiteProfile(r.email);
        return [prof?.name || '', '', r.email, prof?.github || '', prof?.linkedin || '', Array.isArray(prof?.skills) ? prof.skills.join(', ') : '', r.registeredAt];
      });
    } else {
      rows = admGetRegistrations().filter((r) => r.hackathonId === hack.id)
        .map((r) => [r.studentName, r.college, r.email, r.github, r.linkedin, r.skills, r.registrationDate]);
    }

    admDownloadCSV(
      `${hack.hackathonName.replace(/\s+/g, '-')}.csv`,
      ['Name', 'College', 'Email', 'GitHub', 'LinkedIn', 'Skills', 'Registered On'],
      rows,
    );
  });
}

// ── Main decorate ─────────────────────────────────────────────────────────────
export default async function decorate(block) {
  if (block.classList.contains('admin')) {
    await decorateAdmin(block);
    return;
  }

  if (block.classList.contains('upgrade')) {
    await decorateUpgrade(block);
    return;
  }

  // Auth guard
  if (localStorage.getItem('isLoggedIn') !== 'true') {
    const redir = encodeURIComponent(window.location.href);
    window.location.replace(`/auth-form?mode=login&redirect=${redir}`);
    return;
  }

  _block = block;
  _email = getEmail();
  _cfg = parseRows(block);
  _profile = loadProfile(_email);
  _profile.skills = normalizeSkills(_profile.skills);

  document.body.classList.add('profile-page');

  // Fetch static team definitions once so getAppliedTeams() can resolve slug IDs
  // from hk_tm_v2_${email} (applied via the /find-teams page) into full team objects.
  _staticTeams = await fetchStaticTeams('/find-teams-data');

  buildHTML();
  renderProfileCard();

  const applied = getAppliedTeams(_email);
  const created = getCreatedTeams(_email);
  renderStats(applied, created);
  renderApplied(applied);
  renderCreated(created);
  bindEvents();

  // Async Tab 1 (doesn't block initial render)
  renderRegistered();
}
