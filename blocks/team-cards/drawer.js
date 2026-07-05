function formatDate(str) {
  if (!str) return 'TBD';
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return str;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function initDrawer({ getTeam, onApplyDrawer }) {
  const overlayEl = document.createElement('div');
  overlayEl.className = 'tm-overlay';
  overlayEl.id = 'tm-overlay';

  const drawerEl = document.createElement('aside');
  drawerEl.className = 'tm-drawer';
  drawerEl.id = 'tm-drawer';

  const innerEl = document.createElement('div');
  innerEl.className = 'tm-drawer-inner';
  innerEl.id = 'tm-drawer-inner';
  drawerEl.appendChild(innerEl);

  document.body.append(overlayEl, drawerEl);

  function closeDrawer() {
    overlayEl.classList.remove('open');
    drawerEl.classList.remove('open');
    document.body.style.overflow = '';
  }

  overlayEl.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

  function openDrawer(id) {
    const t = getTeam(id);
    if (!t) return;

    const filled = t.members.length;
    const needed = Math.max(0, t.totalSpots - filled);
    const lead = t.members[0] || null;

    const membersHTML = t.members.length
      ? t.members.map((m) => `
          <div class="tm-d-member">
            <div>
              <div class="tm-d-m-name">${m.n}</div>
              <div class="tm-d-m-role">${m.r}</div>
            </div>
          </div>`).join('')
      : '<span style="font-size:.8rem;color:rgba(255,255,255,0.35)">No members yet</span>';

    const rolesHTML = t.roles.map((r) => `
      <div class="tm-d-role">
        <div class="${r.o ? 'dot-o' : 'dot-f'}"></div>
        <span>${r.n}</span>
        <span class="tm-d-role-status">${r.o ? 'open' : 'filled'}</span>
      </div>`).join('');

    const stackHTML = (t.techStack || []).map((s) => `<span class="tm-d-tag">${s}</span>`).join('');

    const leadHTML = lead
      ? `<div class="tm-d-lead">
           <div class="tm-d-lead-av">
             <img src="${t.avatar}" alt="${lead.n}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">
           </div>
           <div>
             <div class="tm-d-lead-name">${lead.n}</div>
             <div class="tm-d-lead-badge">Team Lead</div>
           </div>
         </div>`
      : '<span style="font-size:.8rem;color:rgba(255,255,255,0.35)">TBD</span>';

    innerEl.innerHTML = `
      <div class="tm-d-header">
        <div class="tm-d-header-left">
          <div class="tm-d-avatar" style="overflow:hidden;border-radius:16px;">
            <img src="${t.avatar}" alt="${t.team}" style="width:100%;height:100%;object-fit:cover;display:block;">
          </div>
          <div>
            <div class="tm-d-hackname">${t.name}</div>
            <div class="tm-d-teamname">${t.team}</div>
            <div class="tm-d-theme">${t.theme}</div>
          </div>
        </div>
        <button class="tm-d-close" id="tm-d-close-btn" type="button" aria-label="Close">✕</button>
      </div>
      <div class="tm-d-stats">
        <div class="tm-d-stat"><div class="tm-d-stat-n">${t.totalSpots}</div><div class="tm-d-stat-l">Max</div></div>
        <div class="tm-d-stat"><div class="tm-d-stat-n">${filled}</div><div class="tm-d-stat-l">Filled</div></div>
      </div>
      <div class="tm-d-info-grid">
        <div class="tm-d-info-item"><div class="tm-d-info-key">Experience</div><div class="tm-d-info-val">${t.experienceLevel || 'Any'}</div></div>
        <div class="tm-d-info-item"><div class="tm-d-info-key">Deadline</div><div class="tm-d-info-val">${formatDate(t.deadline)}</div></div>
        <div class="tm-d-info-item"><div class="tm-d-info-key">Created</div><div class="tm-d-info-val">${formatDate(t.creationDate)}</div></div>
        <div class="tm-d-info-item"><div class="tm-d-info-key">Status</div><div class="tm-d-info-val" style="color:${needed > 0 ? '#10B981' : '#71717a'}">${needed > 0 ? 'Recruiting' : 'Team Full'}</div></div>
      </div>
      <div class="tm-d-divider"></div>
      <div class="tm-d-label">About</div>
      <div class="tm-d-desc">${t.description}</div>
      <div class="tm-d-divider"></div>
      <div class="tm-d-label">Team Lead</div>
      ${leadHTML}
      <div class="tm-d-divider"></div>
      <div class="tm-d-label">Members</div>
      <div class="tm-d-members">${membersHTML}</div>
      <div class="tm-d-divider"></div>
      <div class="tm-d-label">Roles Required</div>
      <div class="tm-d-roles">${rolesHTML}</div>
      <div class="tm-d-divider"></div>
      <div class="tm-d-label">Tech Stack</div>
      <div class="tm-d-stack">${stackHTML}</div>
      <div class="tm-d-divider"></div>
      <button class="tm-d-apply${t.applied ? ' applied' : ''}" id="tm-d-apply-btn" type="button">
        ${t.applied ? '✓ Applied — All the best!' : 'Apply to Join'}
      </button>`;

    innerEl.querySelector('#tm-d-close-btn').addEventListener('click', closeDrawer);
    innerEl.querySelector('#tm-d-apply-btn').addEventListener('click', () => onApplyDrawer(id));

    overlayEl.classList.add('open');
    drawerEl.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  return { openDrawer, closeDrawer };
}
