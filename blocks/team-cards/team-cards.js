import { initDrawer } from './drawer.js';
import { initApplyModal } from './apply-modal.js';
import { initCreateModal } from './create-modal.js';

const AVATARS = [
  '/assets/avatar/a1.webp',
  '/assets/avatar/a2.webp',
  '/assets/avatar/a3.webp',
  '/assets/avatar/a4.webp',
  '/assets/avatar/a5.webp',
  '/assets/avatar/a6.webp',
  '/assets/avatar/a7.webp',
  '/assets/avatar/a8.webp',
  '/assets/avatar/a9.webp',
  '/assets/avatar/a10.webp',
  '/assets/avatar/a11.webp',
];

const ROLE_ALIASES = {
  backend: 'Backend',
  'backend dev': 'Backend',
  'backend developer': 'Backend',
  'backend engineer': 'Backend',
  'backend engineering': 'Backend',
  backebd: 'Backend',
  frontend: 'Frontend',
  'frontend dev': 'Frontend',
  'frontend developer': 'Frontend',
  'frontend engineer': 'Frontend',
  'ui designer': 'Design',
  'ux designer': 'Design',
  'ui/ux designer': 'Design',
  design: 'Design',
  designer: 'Design',
};

function getRandomAvatar() {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function getNormalizedRole(name) {
  const lower = name.trim().toLowerCase();
  if (ROLE_ALIASES[lower]) return ROLE_ALIASES[lower];
  return lower.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function getEmail() {
  return (localStorage.getItem('currentUserEmail') || '').trim().toLowerCase();
}

function parseBlockRows(container) {
  const data = {};
  [...container.querySelectorAll(':scope > div')].forEach((row) => {
    const cols = [...row.querySelectorAll(':scope > div')];
    if (cols.length < 2) return;
    const key = cols[0].textContent.trim().toLowerCase();
    if (key === 'avatar') {
      const img = cols[1].querySelector('img');
      data.avatar = img ? img.src : '';
    } else {
      data[key] = cols[1].textContent.trim();
    }
  });
  return data;
}

function buildTeam(data) {
  const name = data.name || '';
  if (!name) return null;

  const roles = (data.roles || '').split(',').map((s) => {
    const parts = s.trim().split(':');
    return { n: parts[0].trim(), o: (parts[1] || 'open').trim() === 'open' };
  }).filter((r) => r.n);

  const members = (data.members || '').split(',').map((s, i) => {
    const clean = s.trim().replace(/\s*\([^)]*\)/, '');
    const roleMatch = s.match(/\(([^)]+)\)/);
    return { n: clean, r: roleMatch ? roleMatch[1] : (i === 0 ? 'Team Lead' : 'Member') };
  }).filter((m) => m.n);

  const techStack = (data['tech-stack'] || '').split(',').map((s) => s.trim()).filter(Boolean);

  return {
    id: slugify(name),
    team: name,
    name: data.hackathon || '',
    avatar: data.avatar || getRandomAvatar(),
    theme: data.theme || '',
    description: data.description || '',
    deadline: data.deadline || '',
    creationDate: data['creation-date'] || '',
    totalSpots: parseInt(data['total-spots'], 10) || 5,
    experienceLevel: data.experience || 'All Levels',
    techStack,
    members,
    roles,
    applied: false,
    userCreated: false,
  };
}

async function fetchTeamsData(dataPage) {
  try {
    const res = await fetch(`${dataPage}.plain.html`);
    if (!res.ok) return { config: { categories: ['All Events'], hackathons: [] }, teams: [] };
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    const config = {
      categories: ['All Events'], hackathons: [], experienceLevels: [], extraFields: [],
    };
    const teams = [];

    // da.live returns EDS block-div format: <div class="team-config">, <div class="team-data">
    const configDiv = doc.querySelector('.team-config');
    if (configDiv) {
      const d = parseBlockRows(configDiv);
      if (d.categories) config.categories = d.categories.split(',').map((s) => s.trim()).filter(Boolean);
      if (d.hackathons) config.hackathons = d.hackathons.split(',').map((s) => s.trim()).filter(Boolean);
      if (d['experience-levels']) config.experienceLevels = d['experience-levels'].split(',').map((s) => s.trim()).filter(Boolean);
      if (d['extra-fields']) config.extraFields = d['extra-fields'].split(',').map((s) => s.trim()).filter(Boolean);
    }

    [...doc.querySelectorAll('.team-data')].forEach((teamDiv) => {
      const team = buildTeam(parseBlockRows(teamDiv));
      if (team) teams.push(team);
    });

    return { config, teams };
  } catch {
    return { config: { categories: ['All Events'], hackathons: [] }, teams: [] };
  }
}

function loadAppliedState(TEAMS) {
  const email = getEmail();
  try {
    const stored = JSON.parse(localStorage.getItem(`hk_tm_v2_${email}`) || localStorage.getItem('hk_tm_v2') || '[]');
    if (Array.isArray(stored)) {
      stored.forEach((item) => {
        const t = TEAMS.find((x) => String(x.id) === String(item.id) && !x.userCreated);
        if (t) t.applied = item.applied;
      });
    }
  } catch { /* */ }

  if (email) {
    try {
      const userTeams = JSON.parse(localStorage.getItem('hk_user_teams') || '[]');
      TEAMS.filter((t) => t.userCreated).forEach((t) => {
        const match = userTeams.find((ut) => String(ut.id) === String(t.id));
        if (match?.applications) {
          if (match.applications.some((a) => (a.email || '').trim().toLowerCase() === email)) t.applied = true;
        }
      });
    } catch { /* */ }
  }
}

function saveStaticApplied(TEAMS) {
  const email = getEmail();
  if (!email) return;
  try {
    localStorage.setItem(
      `hk_tm_v2_${email}`,
      JSON.stringify(TEAMS.filter((t) => !t.userCreated).map((t) => ({ id: t.id, applied: t.applied }))),
    );
  } catch { /* */ }
}

function loadUserCreatedTeams(TEAMS) {
  try {
    const saved = JSON.parse(localStorage.getItem('hk_user_teams') || '[]');
    if (!Array.isArray(saved)) return;
    let needsSave = false;
    saved.forEach((t) => {
      if (!t.avatar) { t.avatar = getRandomAvatar(); needsSave = true; }
      // Recompute role.o from approved applications so the grid filter stays accurate
      // after approve/withdraw actions performed on the profile page.
      if (Array.isArray(t.roles) && Array.isArray(t.applications)) {
        t.roles.forEach((role) => {
          const approvedCount = t.applications.filter(
            (a) => a.role === role.n && a.status === 'approve',
          ).length;
          role.o = approvedCount === 0;
        });
      }
      TEAMS.push(t);
    });
    if (needsSave) localStorage.setItem('hk_user_teams', JSON.stringify(saved));
  } catch { /* */ }
}

function initConfirmModal() {
  document.body.insertAdjacentHTML('beforeend', `
    <div class="tm-confirm-overlay" id="tm-confirm-overlay">
      <div class="tm-confirm-box">
        <div class="tm-confirm-accent-bar"></div>
        <div class="tm-confirm-content">
          <div class="tm-confirm-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h3 class="tm-confirm-title">Withdraw Application?</h3>
          <p class="tm-confirm-msg">This will remove your application from this team. You can always re-apply later.</p>
          <div class="tm-confirm-actions">
            <button class="tm-confirm-yes" id="tm-confirm-yes" type="button">Yes, Withdraw</button>
            <button class="tm-confirm-cancel" id="tm-confirm-cancel" type="button">Cancel</button>
          </div>
        </div>
      </div>
    </div>`);

  return function showConfirm() {
    return new Promise((resolve) => {
      const overlay = document.getElementById('tm-confirm-overlay');
      const yesBtn = document.getElementById('tm-confirm-yes');
      const noBtn = document.getElementById('tm-confirm-cancel');
      overlay.classList.add('open');

      function cleanup(result) {
        overlay.classList.remove('open');
        yesBtn.removeEventListener('click', onYes);
        noBtn.removeEventListener('click', onNo);
        overlay.removeEventListener('click', onBg);
        resolve(result);
      }
      function onYes() { cleanup(true); }
      function onNo() { cleanup(false); }
      function onBg(e) { if (e.target === overlay) cleanup(false); }

      yesBtn.addEventListener('click', onYes);
      noBtn.addEventListener('click', onNo);
      overlay.addEventListener('click', onBg);
    });
  };
}

export default async function decorate(block) {
  // ── 1. Parse authored config row ──────────────────────────────────────────
  let dataPage = '/find-teams-data';
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const key = (cells[0]?.textContent || '').trim().toLowerCase();
    const val = (cells[1]?.textContent || '').trim();
    if (key === 'data-page' && val) dataPage = val;
  });

  // ── 2. Fonts ───────────────────────────────────────────────────────────────
  if (!document.querySelector('link[data-font="tc-fonts"]')) {
    const pc1 = document.createElement('link'); pc1.rel = 'preconnect'; pc1.href = 'https://fonts.googleapis.com';
    const pc2 = document.createElement('link'); pc2.rel = 'preconnect'; pc2.href = 'https://fonts.gstatic.com'; pc2.crossOrigin = '';
    const fl = document.createElement('link'); fl.rel = 'stylesheet'; fl.dataset.font = 'tc-fonts';
    fl.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500;600&display=swap';
    document.head.append(pc1, pc2, fl);
  }

  // ── 3. Fetch + merge teams ─────────────────────────────────────────────────
  const { config, teams: staticTeams } = await fetchTeamsData(dataPage);
  const TEAMS = [...staticTeams];
  loadUserCreatedTeams(TEAMS);
  loadAppliedState(TEAMS);

  // ── 4. Filter state ────────────────────────────────────────────────────────
  let _query = '';
  let _filter = 'All Events';
  let _roleFilter = 'All Roles';

  function getCurrentList() {
    const q = _query.toLowerCase().trim();
    return TEAMS.filter((t) => {
      if (t.roles && t.roles.length > 0 && t.roles.every((r) => !r.o)) return false;
      const matchQ = !q || t.team.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || t.theme.toLowerCase().includes(q);
      const matchF = _filter === 'All Events' || t.theme.toLowerCase().includes(_filter.toLowerCase().split(' ')[0].toLowerCase());
      const matchR = _roleFilter === 'All Roles' || t.roles.some((r) => r.o && getNormalizedRole(r.n) === _roleFilter);
      return matchQ && matchF && matchR;
    });
  }

  // ── 5. Build shell HTML ────────────────────────────────────────────────────
  const pillsHtml = config.categories.map((c, i) => `<button class="filter-pill${i === 0 ? ' active' : ''}" type="button">${c}</button>`).join('');

  block.innerHTML = `
    <div class="tc-panel" id="tc-panel-find">
      <div class="tf-toolbar">
        <div class="tf-toolbar-right">
          <div class="search-container" style="display:flex;gap:16px;">
            <div style="position:relative;flex:1;">
              <input type="text" class="search-input" id="tc-search" placeholder="Search by team, hackathon, theme…">
              <span class="search-icon"></span>
            </div>
            <select class="search-input" id="tc-role-filter" style="width:auto;padding-right:32px;flex-shrink:0;min-width:150px;appearance:none;">
              <option value="All Roles">All Roles</option>
            </select>
          </div>
          <div class="filter-pills" id="tc-pills">${pillsHtml}</div>
        </div>
      </div>
      <section class="teams-section tf-teams-section">
        <div class="teams-grid" id="tc-grid"></div>
      </section>
    </div>
    <div class="tc-panel" id="tc-panel-create" style="display:none;">
      <div class="tf-create-panel">
        <div class="tf-create-inner">
          <div class="tf-create-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h2 class="tf-create-title">Start Your Team</h2>
          <p class="tf-create-desc">Can't find the right team? Take the lead — define your vision, pick your stack, and invite the right people to build something great.</p>
          <button class="tf-create-cta" id="tc-open-create-btn" type="button">Create a Team →</button>
          <div class="tf-create-hints">
            <div class="tf-hint"><span class="tf-hint-num">01</span><span>Define your hackathon &amp; theme</span></div>
            <div class="tf-hint"><span class="tf-hint-num">02</span><span>Set open roles &amp; team size</span></div>
            <div class="tf-hint"><span class="tf-hint-num">03</span><span>Your team goes live instantly</span></div>
          </div>
        </div>
      </div>
    </div>`;

  // ── 6. Init modals ─────────────────────────────────────────────────────────
  const showConfirm = initConfirmModal();

  function processWithdraw(t) {
    const email = getEmail();
    if (!email) { alert('Please log in.'); return false; }
    t.applied = false;
    try {
      let allApps = JSON.parse(localStorage.getItem('hk_applications') || '[]');
      allApps = allApps.filter((a) => !((a.applicantId || '').trim().toLowerCase() === email && String(a.teamId) === String(t.id)));
      localStorage.setItem('hk_applications', JSON.stringify(allApps));
    } catch { /* */ }
    if (t.userCreated) {
      try {
        const userTeams = JSON.parse(localStorage.getItem('hk_user_teams') || '[]');
        const ut = userTeams.find((x) => String(x.id) === String(t.id));
        if (ut) {
          ut.applications = (ut.applications || []).filter((a) => (a.email || '').trim().toLowerCase() !== email);
          localStorage.setItem('hk_user_teams', JSON.stringify(userTeams));
        }
      } catch { /* */ }
    } else {
      saveStaticApplied(TEAMS);
    }
    return true;
  }

  const { openDrawer } = initDrawer({
    getTeam: (id) => TEAMS.find((t) => String(t.id) === String(id)),
    onApplyDrawer: (id) => {
      const t = TEAMS.find((x) => String(x.id) === String(id));
      if (!t) return;
      const drawerApplyBtn = document.getElementById('tm-d-apply-btn');
      if (t.applied) {
        showConfirm().then((yes) => {
          if (!yes) return;
          if (processWithdraw(t)) {
            if (drawerApplyBtn) { drawerApplyBtn.textContent = 'Apply to Join'; drawerApplyBtn.classList.remove('applied'); }
            doRenderGrid();
          }
        });
      } else {
        openApply(id, drawerApplyBtn);
      }
    },
  });

  const { openApply } = initApplyModal({
    getTeams: () => TEAMS,
    onSuccess: () => doRenderGrid(),
    onStaticSave: () => saveStaticApplied(TEAMS),
  });

  const { openCreate } = initCreateModal({
    hackathons: config.hackathons,
    experienceLevels: config.experienceLevels,
    extraFields: config.extraFields,
    getRandomAvatar,
    onCreated: (newTeam) => {
      TEAMS.push(newTeam);
      populateRoleFilter();
      doRenderGrid();
    },
  });

  // ── 7. Grid rendering ──────────────────────────────────────────────────────
  function doRenderGrid() {
    const list = getCurrentList();
    const grid = block.querySelector('#tc-grid');
    if (!grid) return;

    if (!list.length) {
      grid.innerHTML = '<div class="tc-empty">No teams found. Try a different search.</div>';
      return;
    }

    grid.innerHTML = '';
    list.forEach((t) => {
      const openCount = t.roles.filter((r) => r.o).length;
      const filled = t.members.length;
      const chips = t.roles.slice(0, 3).map((r) => `<span class="tm-chip">${r.n}</span>`).join('');

      const card = document.createElement('div');
      card.className = 'tm-card';
      card.dataset.id = String(t.id);
      card.innerHTML = `
        <div class="tm-avatar-wrap">
          <div class="tm-avatar">
            <img src="${t.avatar}" alt="${t.team}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">
          </div>
        </div>
        <div class="tm-card-body">
          <div class="tm-team">${t.team}</div>
          <div class="tm-hackname">${t.name}</div>
          <div class="tm-status-row">
            <span class="tm-size">${filled}/${t.totalSpots} Members</span>
            <div class="tm-dot-wrap">
              <div class="tm-dot ${openCount > 0 ? 'open' : 'full'}"></div>
              <span class="tm-dot-label">${openCount > 0 ? 'Open' : 'Full'}</span>
            </div>
          </div>
          <div class="tm-divider"></div>
          <div class="tm-roles-label">Roles needed</div>
          <div class="tm-roles">${chips}</div>
          <div class="tm-footer">
            <button class="tm-view-btn" type="button">View Details</button>
            <button class="tm-apply-btn ${t.applied ? 'applied' : ''}" type="button">${t.applied ? '✓ Applied' : 'Apply'}</button>
          </div>
        </div>`;

      card.querySelector('.tm-view-btn').addEventListener('click', (e) => { e.stopPropagation(); openDrawer(t.id); });
      card.querySelector('.tm-apply-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const applyBtn = card.querySelector('.tm-apply-btn');
        if (t.applied) {
          showConfirm().then((yes) => {
            if (!yes) return;
            if (processWithdraw(t)) {
              applyBtn.textContent = 'Apply';
              applyBtn.classList.remove('applied');
              doRenderGrid();
            }
          });
        } else {
          openApply(t.id, applyBtn);
        }
      });

      grid.appendChild(card);
    });
  }

  // ── 8. Role filter ─────────────────────────────────────────────────────────
  function populateRoleFilter() {
    const roleSelect = block.querySelector('#tc-role-filter');
    if (!roleSelect) return;
    const uniqueRoles = new Set();
    TEAMS.forEach((t) => t.roles.filter((r) => r.o).forEach((r) => uniqueRoles.add(getNormalizedRole(r.n))));
    const sorted = [...uniqueRoles].sort();
    roleSelect.innerHTML = `<option value="All Roles">All Roles</option>${sorted.map((r) => `<option value="${r}">${r}</option>`).join('')}`;
  }

  populateRoleFilter();

  // ── 9. Search + filter events ──────────────────────────────────────────────
  block.querySelector('#tc-search').addEventListener('input', (e) => { _query = e.target.value; doRenderGrid(); });

  block.querySelector('#tc-role-filter').addEventListener('change', (e) => { _roleFilter = e.target.value; doRenderGrid(); });

  block.querySelector('#tc-pills').addEventListener('click', (e) => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;
    block.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
    pill.classList.add('active');
    _filter = pill.textContent.trim();
    doRenderGrid();
  });

  // ── 9b. If filter-bar block is on the page, delegate all filtering to it ───
  if (document.querySelector('.filter-bar')) {
    const toolbar = block.querySelector('.tf-toolbar');
    if (toolbar) toolbar.style.display = 'none';
    document.addEventListener('filter-bar:change', (e) => {
      const { type, value } = e.detail || {};
      if (type === 'search') { _query = value; doRenderGrid(); }
      if (type === 'filters') { _filter = value; doRenderGrid(); }
      if (type === 'dropdown') {
        _roleFilter = value === 'all-roles' ? 'All Roles'
          : value.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        doRenderGrid();
      }
    });
  }

  // ── 10. Tab switching via sh-tab-switch event ──────────────────────────────
  document.addEventListener('sh-tab-switch', (e) => {
    const tab = e.detail?.tab;
    const findPanel = block.querySelector('#tc-panel-find');
    const createPanel = block.querySelector('#tc-panel-create');
    if (tab === 0) {
      if (findPanel) findPanel.style.display = '';
      if (createPanel) createPanel.style.display = 'none';
    } else if (tab === 1) {
      if (findPanel) findPanel.style.display = 'none';
      if (createPanel) createPanel.style.display = '';
    }
  });

  // ── 11. Auth gates (capture phase) — temporarily disabled for testing ───────
  // TODO: re-enable auth gates after testing
  // block.querySelector('#tc-grid')?.addEventListener('click', (e) => {
  //   const btn = e.target.closest('.tm-apply-btn');
  //   if (btn && !btn.disabled && !btn.classList.contains('applied')) {
  //     if (window.Auth && !window.Auth.isLoggedIn()) {
  //       e.stopImmediatePropagation();
  //       window.Auth.showLoginRequired();
  //     }
  //   }
  // }, true);

  block.querySelector('#tc-open-create-btn')?.addEventListener('click', () => {
    openCreate();
  }, true);

  // ── 12. Global APIs ────────────────────────────────────────────────────────
  window.TMCards = {
    openDrawer,
    close: () => document.getElementById('tm-overlay')?.classList.remove('open'),
    applyCard: (id, btn) => {
      const t = TEAMS.find((x) => String(x.id) === String(id));
      if (!t) return;
      if (t.applied) {
        showConfirm().then((yes) => { if (yes && processWithdraw(t)) { if (btn) { btn.textContent = 'Apply'; btn.classList.remove('applied'); } doRenderGrid(); } });
      } else { openApply(id, btn); }
    },
    applyDrawer: (id) => {
      const t = TEAMS.find((x) => String(x.id) === String(id));
      if (!t) return;
      const drawerBtn = document.getElementById('tm-d-apply-btn');
      if (t.applied) {
        showConfirm().then((yes) => { if (yes && processWithdraw(t)) { if (drawerBtn) { drawerBtn.textContent = 'Apply to Join'; drawerBtn.classList.remove('applied'); } doRenderGrid(); } });
      } else { openApply(id, drawerBtn); }
    },
    getRandomAvatar,
    addTeam: (newTeam) => { TEAMS.push(newTeam); populateRoleFilter(); doRenderGrid(); },
  };

  window.CreateTeamModal = {
    open: openCreate,
    close: () => document.getElementById('ctm-overlay')?.classList.remove('open'),
    _removeRole: () => {},
    _removeStack: () => {},
    _openDrawerFallback: (id) => openDrawer(id),
  };

  // ── 13. Initial render ─────────────────────────────────────────────────────
  doRenderGrid();
}
