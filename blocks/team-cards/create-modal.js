const EXPERIENCE_LEVELS = ['Beginner Friendly', 'All Levels', 'Intermediate', 'Advanced'];

export function initCreateModal({
  hackathons, experienceLevels, extraFields, getRandomAvatar, onCreated,
}) {
  let roles = [];
  let stack = [];
  let currentStep = 1;

  const LEVELS = (experienceLevels && experienceLevels.length) ? experienceLevels : EXPERIENCE_LEVELS;
  const hackOptions = hackathons.map((h) => `<option value="${h}">${h}</option>`).join('');
  const expOptions = LEVELS.map((e) => `<option value="${e}">${e}</option>`).join('');
  const toFieldId = (label) => `ctm-extra-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const extraFieldsHTML = (extraFields || []).map((f) => `
    <div class="ctm-field">
      <label class="ctm-label" for="${toFieldId(f)}">${f}</label>
      <input class="ctm-input" id="${toFieldId(f)}" type="text" placeholder="${f}" autocomplete="off">
    </div>`).join('');

  document.body.insertAdjacentHTML('beforeend', `
    <div class="ctm-overlay" id="ctm-overlay">
      <div class="ctm-modal" id="ctm-modal" role="dialog" aria-modal="true" aria-labelledby="ctm-title-el">
        <div class="ctm-header">
          <div class="ctm-header-left">
            <span class="ctm-eyebrow">New Team</span>
            <span class="ctm-title" id="ctm-title-el">Create Your Squad</span>
          </div>
          <button class="ctm-close" id="ctm-close-btn" type="button" aria-label="Close">✕</button>
        </div>
        <div class="ctm-stepper">
          <div class="ctm-step active" id="ctm-step-indicator-1"><span class="ctm-step-num">1</span><span class="ctm-step-lbl">Basics</span></div>
          <div class="ctm-step-line" id="ctm-step-line-1"></div>
          <div class="ctm-step" id="ctm-step-indicator-2"><span class="ctm-step-num">2</span><span class="ctm-step-lbl">Details</span></div>
          <div class="ctm-step-line" id="ctm-step-line-2"></div>
          <div class="ctm-step" id="ctm-step-indicator-3"><span class="ctm-step-num">3</span><span class="ctm-step-lbl">Squad</span></div>
        </div>
        <div class="ctm-body" id="ctm-form-body">
          <div class="ctm-form-step" id="ctm-step-container-1">
            <div class="ctm-section-label">Team Identity</div>
            <div class="ctm-field">
              <label class="ctm-label" for="ctm-team-name">Team Name *</label>
              <input class="ctm-input" id="ctm-team-name" type="text" placeholder="e.g. Alpha Builders" maxlength="40" autocomplete="off">
            </div>
            <div class="ctm-row">
              <div class="ctm-field">
                <label class="ctm-label" for="ctm-hackathon">Hackathon *</label>
                <select class="ctm-select" id="ctm-hackathon">
                  <option value="" disabled selected>Choose one</option>
                  ${hackOptions}
                </select>
              </div>
              <div class="ctm-field">
                <label class="ctm-label" for="ctm-theme">Theme / Focus Area *</label>
                <input class="ctm-input" id="ctm-theme" type="text" placeholder="e.g. AI for Healthcare" maxlength="60" autocomplete="off">
              </div>
            </div>
          </div>
          <div class="ctm-form-step" id="ctm-step-container-2" style="display:none;">
            <div class="ctm-section-label">About &amp; Capacity</div>
            <div class="ctm-field full">
              <label class="ctm-label" for="ctm-desc">About the Team *</label>
              <textarea class="ctm-textarea" id="ctm-desc" placeholder="What are you building? What problem does it solve?" maxlength="280"></textarea>
            </div>
            <div class="ctm-row">
              <div class="ctm-field">
                <label class="ctm-label" for="ctm-spots">Max Team Size *</label>
                <input class="ctm-input" id="ctm-spots" type="number" min="2" max="12" placeholder="e.g. 7">
              </div>
              <div class="ctm-field">
                <label class="ctm-label" for="ctm-current-members">Current Members *</label>
                <input class="ctm-input" id="ctm-current-members" type="number" min="1" max="12" placeholder="e.g. 1">
              </div>
            </div>
            <div class="ctm-row">
              <div class="ctm-field">
                <label class="ctm-label" for="ctm-exp">Experience Level</label>
                <select class="ctm-select" id="ctm-exp">
                  <option value="" disabled selected>Choose</option>
                  ${expOptions}
                </select>
              </div>
              <div class="ctm-field">
                <label class="ctm-label" for="ctm-deadline">Application Deadline</label>
                <input class="ctm-input" id="ctm-deadline" type="date">
              </div>
            </div>
            ${extraFieldsHTML}
          </div>
          <div class="ctm-form-step" id="ctm-step-container-3" style="display:none;">
            <div class="ctm-section-label">Your Squad Info</div>
            <div class="ctm-field">
              <label class="ctm-label" for="ctm-lead">Your Name (Team Lead) *</label>
              <input class="ctm-input" id="ctm-lead" type="text" placeholder="e.g. Shruti Gupta" maxlength="40" autocomplete="off">
            </div>
            <div class="ctm-section-divider"></div>
            <div class="ctm-field">
              <label class="ctm-label">Roles Needed</label>
              <div class="ctm-roles-list" id="ctm-roles-list"></div>
              <div class="ctm-role-input-row" style="display:flex;gap:8px;">
                <input class="ctm-input" id="ctm-role-input" type="text" placeholder="e.g. UI Designer" maxlength="40" autocomplete="off" style="flex:1;">
                <button class="ctm-add-role-btn" id="ctm-add-role-btn" type="button">+ Add</button>
              </div>
            </div>
            <div class="ctm-section-divider"></div>
            <div class="ctm-field">
              <label class="ctm-label">Tech Stack</label>
              <div class="ctm-stack-list" id="ctm-stack-list"></div>
              <div class="ctm-role-input-row" style="display:flex;gap:8px;">
                <input class="ctm-input" id="ctm-stack-input" type="text" placeholder="e.g. React, Python" maxlength="30" autocomplete="off" style="flex:1;">
                <button class="ctm-add-role-btn" id="ctm-add-stack-btn" type="button">+ Add</button>
              </div>
            </div>
          </div>
        </div>
        <div class="ctm-success" id="ctm-success">
          <div class="ctm-success-icon">✓</div>
          <div class="ctm-success-title">Team Created!</div>
          <div class="ctm-success-sub">Your team is now live. Scroll down to see it in the grid.</div>
        </div>
        <div class="ctm-footer" id="ctm-footer">
          <button class="ctm-back-btn" id="ctm-back-btn" type="button" style="display:none;">Back</button>
          <span class="ctm-hint">* required fields</span>
          <button class="ctm-next-btn" id="ctm-next-btn" type="button">Next Step →</button>
          <button class="ctm-submit-btn" id="ctm-submit-btn" type="button" style="display:none;">Launch Team →</button>
        </div>
      </div>
    </div>`);

  function $ (id) { return document.getElementById(id); }

  function updateCurrentMembersCount() {
    const spotsEl = $('ctm-spots');
    const currentEl = $('ctm-current-members');
    if (!spotsEl || !currentEl) return;
    const spots = parseInt(spotsEl.value, 10) || 0;
    if (spots > 0) currentEl.value = Math.max(1, spots - roles.length);
  }

  function renderRoles() {
    const list = $('ctm-roles-list');
    if (!list) return;
    list.innerHTML = '';
    roles.forEach((r, i) => {
      const span = document.createElement('span');
      span.className = 'ctm-role-tag';
      span.appendChild(document.createTextNode(r.n));
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Remove');
      btn.textContent = '✕';
      btn.addEventListener('click', () => { roles.splice(i, 1); renderRoles(); });
      span.appendChild(btn);
      list.appendChild(span);
    });
    updateCurrentMembersCount();
  }

  function renderStack() {
    const list = $('ctm-stack-list');
    if (!list) return;
    list.innerHTML = '';
    stack.forEach((s, i) => {
      const span = document.createElement('span');
      span.className = 'ctm-stack-tag';
      span.appendChild(document.createTextNode(s));
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Remove');
      btn.textContent = '✕';
      btn.addEventListener('click', () => { stack.splice(i, 1); renderStack(); });
      span.appendChild(btn);
      list.appendChild(span);
    });
  }

  function addRole() {
    const input = $('ctm-role-input');
    const val = (input.value || '').trim();
    if (!val) return;
    roles.push({ n: val, o: true });
    input.value = '';
    input.focus();
    renderRoles();
  }

  function addStack() {
    const input = $('ctm-stack-input');
    const val = (input.value || '').trim();
    if (!val) return;
    stack.push(val);
    input.value = '';
    input.focus();
    renderStack();
  }

  function shakeElement(el) {
    if (!el) return;
    el.classList.add('shake-error');
    setTimeout(() => el.classList.remove('shake-error'), 400);
  }

  function validateStep(stepNum) {
    if (stepNum === 1) {
      const teamName = $('ctm-team-name');
      const hackathon = $('ctm-hackathon');
      const theme = $('ctm-theme');
      let valid = true;
      if (!teamName?.value.trim()) { shakeElement(teamName); valid = false; }
      if (!hackathon?.value) { shakeElement(hackathon); valid = false; }
      if (!theme?.value.trim()) { shakeElement(theme); valid = false; }
      return valid;
    }
    if (stepNum === 2) {
      const desc = $('ctm-desc');
      const spots = $('ctm-spots');
      const current = $('ctm-current-members');
      const deadline = $('ctm-deadline');
      let valid = true;
      if (!desc?.value.trim()) { shakeElement(desc); valid = false; }
      const spotsVal = parseInt(spots?.value, 10) || 0;
      const curVal = parseInt(current?.value, 10) || 0;
      if (!spots || spotsVal < 2 || spotsVal > 12) { shakeElement(spots); valid = false; }
      if (!current || curVal < 1 || curVal > 12) { shakeElement(current); valid = false; }
      if (valid && curVal >= spotsVal) { shakeElement(spots); shakeElement(current); valid = false; }
      if (deadline?.value) {
        const sel = new Date(`${deadline.value}T00:00:00`);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (sel < today) {
          shakeElement(deadline);
          if (window.HackToast?.show) window.HackToast.show('Deadline cannot be in the past.', 'error');
          else alert('Deadline cannot be in the past.');
          valid = false;
        }
      }
      return valid;
    }
    if (stepNum === 3) {
      const lead = $('ctm-lead');
      if (!lead?.value.trim()) { shakeElement(lead); return false; }
    }
    return true;
  }

  function showStep(stepNum) {
    currentStep = stepNum;
    for (let i = 1; i <= 3; i += 1) {
      const el = $(`ctm-step-container-${i}`);
      if (el) el.style.display = i === stepNum ? 'flex' : 'none';
      const ind = $(`ctm-step-indicator-${i}`);
      if (ind) { ind.classList.toggle('active', i === stepNum); ind.classList.toggle('completed', i < stepNum); }
    }
    for (let i = 1; i <= 2; i += 1) {
      const line = $(`ctm-step-line-${i}`);
      if (line) { line.classList.toggle('active', i === stepNum - 1); line.classList.toggle('completed', i < stepNum); }
    }
    const backBtn = $('ctm-back-btn');
    const nextBtn = $('ctm-next-btn');
    const submitBtn = $('ctm-submit-btn');
    if (backBtn) backBtn.style.display = stepNum > 1 ? 'inline-block' : 'none';
    if (nextBtn) nextBtn.style.display = stepNum < 3 ? 'inline-block' : 'none';
    if (submitBtn) submitBtn.style.display = stepNum === 3 ? 'inline-block' : 'none';
    setTimeout(() => {
      if (stepNum === 1) $('ctm-team-name')?.focus();
      else if (stepNum === 2) $('ctm-desc')?.focus();
      else $('ctm-lead')?.focus();
    }, 100);
  }

  function closeCreate() {
    $('ctm-overlay').classList.remove('open');
    document.body.style.overflow = '';
  }

  function openCreate() {
    const email = (localStorage.getItem('currentUserEmail') || 'test@hackhub.dev').trim().toLowerCase();
    // TODO: restore auth gate — if (!email) { alert('Please log in to create a team.'); return; }

    const profiles = (() => { try { return JSON.parse(localStorage.getItem('hk_profiles') || '{}'); } catch { return {}; } })();
    const membership = (profiles[email] || {}).membership || 'free';
    if (membership === 'free') {
      const userTeams = (() => { try { return JSON.parse(localStorage.getItem('hk_user_teams') || '[]'); } catch { return []; } })();
      const monthPrefix = new Date().toISOString().slice(0, 7);
      const thisMonth = userTeams.filter((t) => (t.creatorEmail || '').trim().toLowerCase() === email && (t.creationDate || '').startsWith(monthPrefix));
      if (thisMonth.length >= 3) {
        const msg = 'Free tier limit reached: You can create a maximum of 3 teams per month. Redirecting to upgrade page…';
        if (window.HackToast?.show) window.HackToast.show(msg, 'error'); else alert(msg);
        setTimeout(() => { window.location.href = `/upgrade?reason=create_limit&redirect=${encodeURIComponent(window.location.href)}`; }, 1200);
        return;
      }
    }

    roles = [];
    stack = [];
    renderRoles();
    renderStack();

    ['ctm-team-name', 'ctm-theme', 'ctm-desc', 'ctm-lead', 'ctm-role-input', 'ctm-stack-input', 'ctm-spots', 'ctm-current-members', 'ctm-deadline'].forEach((id) => {
      const el = $(id); if (el) el.value = '';
    });
    (extraFields || []).forEach((f) => { const el = $(toFieldId(f)); if (el) el.value = ''; });
    ['ctm-hackathon', 'ctm-exp'].forEach((id) => { const el = $(id); if (el) el.selectedIndex = 0; });

    const formBody = $('ctm-form-body');
    const success = $('ctm-success');
    const footer = $('ctm-footer');
    if (formBody) formBody.style.display = '';
    if (success) success.classList.remove('show');
    if (footer) footer.style.display = '';

    $('ctm-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
    showStep(1);
  }

  function submit() {
    if (!validateStep(3)) return;

    const teamName = ($('ctm-team-name')?.value || '').trim();
    const hackathon = $('ctm-hackathon')?.value || '';
    const theme = ($('ctm-theme')?.value || '').trim();
    const desc = ($('ctm-desc')?.value || '').trim();
    const lead = ($('ctm-lead')?.value || '').trim();
    const spots = parseInt($('ctm-spots')?.value, 10) || 4;
    const currentMembersRaw = parseInt($('ctm-current-members')?.value, 10);
    const currentMembers = Number.isNaN(currentMembersRaw) ? 1 : Math.max(1, Math.min(currentMembersRaw, spots));
    const exp = $('ctm-exp')?.value || 'All Levels';
    const deadline = $('ctm-deadline')?.value || '';
    const email = (localStorage.getItem('currentUserEmail') || 'unknown').trim().toLowerCase();

    const membersArr = [{ n: lead, r: 'Team Lead' }];
    for (let i = 1; i < currentMembers; i += 1) membersArr.push({ n: `Member ${i + 1}`, r: 'Member' });

    const extras = {};
    (extraFields || []).forEach((f) => {
      extras[f] = ($(toFieldId(f))?.value || '').trim();
    });

    const newTeam = {
      id: Date.now(),
      team: teamName,
      name: hackathon,
      avatar: getRandomAvatar(),
      avatarInitials: teamName.slice(0, 2).toUpperCase(),
      theme,
      description: desc,
      deadline: deadline || null,
      creationDate: new Date().toISOString().split('T')[0],
      totalSpots: spots,
      experienceLevel: exp,
      techStack: stack.slice(),
      members: membersArr,
      roles: roles.map((r) => ({ n: r.n, o: true })),
      applied: false,
      userCreated: true,
      creatorEmail: email,
      applications: [],
      ...extras,
    };

    try {
      const existing = JSON.parse(localStorage.getItem('hk_user_teams') || '[]');
      existing.push(newTeam);
      localStorage.setItem('hk_user_teams', JSON.stringify(existing));
      window.dispatchEvent(new CustomEvent('teamCreated', { detail: newTeam }));
      if (window.Auth?.notify) window.Auth.notify(email, 'team_created', 'Team Created Successfully!', `Your team ${newTeam.team} is now live.`);
    } catch { /* */ }

    onCreated(newTeam);

    const formBody = $('ctm-form-body');
    const success = $('ctm-success');
    const footer = $('ctm-footer');
    if (formBody) formBody.style.display = 'none';
    if (success) success.classList.add('show');
    if (footer) footer.style.display = 'none';

    setTimeout(() => {
      closeCreate();
      document.getElementById('tc-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 1600);
  }

  // Wire modal events
  $('ctm-close-btn').addEventListener('click', closeCreate);
  $('ctm-overlay').addEventListener('click', (e) => { if (e.target.id === 'ctm-overlay') closeCreate(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $('ctm-overlay')?.classList.contains('open')) closeCreate();
  });
  $('ctm-back-btn').addEventListener('click', () => { if (currentStep > 1) showStep(currentStep - 1); });
  $('ctm-next-btn').addEventListener('click', () => { if (validateStep(currentStep)) showStep(currentStep + 1); });
  $('ctm-spots').addEventListener('input', updateCurrentMembersCount);
  $('ctm-add-role-btn').addEventListener('click', addRole);
  $('ctm-role-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addRole(); } });
  $('ctm-add-stack-btn').addEventListener('click', addStack);
  $('ctm-stack-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addStack(); } });
  $('ctm-submit-btn').addEventListener('click', submit);

  return { openCreate, closeCreate };
}
