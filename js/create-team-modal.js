/* ==============================================
   CREATE TEAM MODAL — create-team-modal.js
   Drop this <script> AFTER teamfinder.js
   ============================================== */

(function () {

  /* ── HACKATHON OPTIONS (extend freely) ── */
  const HACKATHONS = [
    'HackIndia 2026',
    'BharatHacks 2026',
    'GreenCode Jam',
    'ETHIndia 2026',
    'AWS Build-On India',
    'GenAI Hackathon',
    'Smart India Hackathon',
    'MLH Global Hack Week',
    'DevFolio Hacks',
    'Other',
  ];

  const EXPERIENCE_LEVELS = [
    'Beginner Friendly',
    'All Levels',
    'Intermediate',
    'Advanced',
  ];

  /* ── STATE ── */
  let roles  = [];   // [{ n: string }]
  let stack  = [];   // [string]
  let currentStep = 1;

  /* ── INJECT HTML ── */
  function injectModal() {
    const hackOptions = HACKATHONS
      .map(h => `<option value="${h}">${h}</option>`)
      .join('');

    const expOptions = EXPERIENCE_LEVELS
      .map(e => `<option value="${e}">${e}</option>`)
      .join('');

    const html = `
      <!-- CREATE TEAM OVERLAY -->
      <div class="ctm-overlay" id="ctm-overlay">
        <div class="ctm-modal" id="ctm-modal" role="dialog" aria-modal="true" aria-labelledby="ctm-title-el">

          <!-- Header -->
          <div class="ctm-header">
            <div class="ctm-header-left">
              <span class="ctm-eyebrow">New Team</span>
              <span class="ctm-title" id="ctm-title-el">Create Your Squad</span>
            </div>
            <button class="ctm-close" id="ctm-close-btn" aria-label="Close">✕</button>
          </div>

          <!-- Progress Stepper -->
          <div class="ctm-stepper">
            <div class="ctm-step active" id="ctm-step-indicator-1">
              <span class="ctm-step-num">1</span>
              <span class="ctm-step-lbl">Basics</span>
            </div>
            <div class="ctm-step-line" id="ctm-step-line-1"></div>
            <div class="ctm-step" id="ctm-step-indicator-2">
              <span class="ctm-step-num">2</span>
              <span class="ctm-step-lbl">Details</span>
            </div>
            <div class="ctm-step-line" id="ctm-step-line-2"></div>
            <div class="ctm-step" id="ctm-step-indicator-3">
              <span class="ctm-step-num">3</span>
              <span class="ctm-step-lbl">Squad</span>
            </div>
          </div>

          <!-- Form body -->
          <div class="ctm-body" id="ctm-form-body">

            <!-- STEP 1: BASICS -->
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

            <!-- STEP 2: DETAILS & CAPACITY -->
            <div class="ctm-form-step" id="ctm-step-container-2" style="display: none;">
              <div class="ctm-section-label">About & Capacity</div>

              <div class="ctm-field full">
                <label class="ctm-label" for="ctm-desc">About the Team *</label>
                <textarea class="ctm-textarea" id="ctm-desc" placeholder="What are you building? What problem does it solve? Define your team's objective here." maxlength="280"></textarea>
              </div>

              <div class="ctm-row">
                <div class="ctm-field">
                  <label class="ctm-label" for="ctm-spots">Max Team Size *</label>
                  <input class="ctm-input" id="ctm-spots" type="number" min="2" max="12" placeholder="e.g. 7">
                </div>
                <div class="ctm-field">
                  <label class="ctm-label" for="ctm-current-members">Current Members *</label>
                  <input class="ctm-input" id="ctm-current-members" type="number" min="1" max="12" placeholder="e.g. 5">
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
            </div>

            <!-- STEP 3: SQUAD DETAILS -->
            <div class="ctm-form-step" id="ctm-step-container-3" style="display: none;">
              <div class="ctm-section-label">Your Squad Info</div>

              <div class="ctm-field">
                <label class="ctm-label" for="ctm-lead">Your Name (Team Lead) *</label>
                <input class="ctm-input" id="ctm-lead" type="text" placeholder="e.g. Shruti Gupta" maxlength="40" autocomplete="off">
              </div>

              <div class="ctm-section-divider"></div>

              <div class="ctm-field">
                <label class="ctm-label">Roles Needed</label>
                <div class="ctm-roles-list" id="ctm-roles-list"></div>
                <div class="ctm-role-input-row" style="display:flex; gap:8px;">
                  <input class="ctm-input" id="ctm-role-input" type="text" placeholder="e.g. UI Designer" maxlength="40" autocomplete="off" style="flex:1;">
                  <button class="ctm-add-role-btn" id="ctm-add-role-btn" type="button">+ Add</button>
                </div>
              </div>

              <div class="ctm-section-divider"></div>

              <div class="ctm-field">
                <label class="ctm-label">Tech Stack</label>
                <div class="ctm-stack-list" id="ctm-stack-list"></div>
                <div class="ctm-role-input-row">
                  <input class="ctm-input" id="ctm-stack-input" type="text" placeholder="e.g. React, Python" maxlength="30" autocomplete="off">
                  <button class="ctm-add-role-btn" id="ctm-add-stack-btn" type="button">+ Add</button>
                </div>
              </div>
            </div>

          </div><!-- /ctm-form-body -->

          <!-- Success state (hidden) -->
          <div class="ctm-success" id="ctm-success">
            <div class="ctm-success-icon">✓</div>
            <div class="ctm-success-title">Team Created!</div>
            <div class="ctm-success-sub">Your team is now live. Scroll down to see it in the grid.</div>
          </div>

          <!-- Footer -->
          <div class="ctm-footer" id="ctm-footer">
            <button class="ctm-back-btn" id="ctm-back-btn" type="button" style="display: none;">Back</button>
            <span class="ctm-hint" id="ctm-hint">* required fields</span>
            <button class="ctm-next-btn" id="ctm-next-btn" type="button">Next Step →</button>
            <button class="ctm-submit-btn" id="ctm-submit-btn" type="button" style="display: none;">Launch Team →</button>
          </div>

        </div>
      </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
  }

  function updateCurrentMembersCount() {
    const spotsEl = document.getElementById('ctm-spots');
    const currentEl = document.getElementById('ctm-current-members');
    if (!spotsEl || !currentEl) return;
    const spots = parseInt(spotsEl.value) || 0;
    if (spots > 0) {
      currentEl.value = Math.max(1, spots - roles.length);
    }
  }

  /* ── RENDER ROLE TAGS ── */
  function renderRoles() {
    const list = document.getElementById('ctm-roles-list');
    if (!list) return;
    list.innerHTML = roles.map((r, i) => `
      <span class="ctm-role-tag">
        ${r.n}
        <button type="button" aria-label="Remove" onclick="CreateTeamModal._removeRole(${i})">✕</button>
      </span>`).join('');
    updateCurrentMembersCount();
  }

  /* ── RENDER STACK TAGS ── */
  function renderStack() {
    const list = document.getElementById('ctm-stack-list');
    if (!list) return;
    list.innerHTML = stack.map((s, i) => `
      <span class="ctm-stack-tag">
        ${s}
        <button type="button" aria-label="Remove" onclick="CreateTeamModal._removeStack(${i})">✕</button>
      </span>`).join('');
  }

  /* ── ADD / REMOVE ROLE ── */
  function addRole() {
    const input = document.getElementById('ctm-role-input');
    const val   = (input.value || '').trim();
    if (!val) return;
    roles.push({ n: val, o: true });
    input.value = '';
    input.focus();
    renderRoles();
  }

  function removeRole(i) {
    roles.splice(i, 1);
    renderRoles();
  }

  /* ── ADD / REMOVE STACK ── */
  function addStack() {
    const input = document.getElementById('ctm-stack-input');
    const val   = (input.value || '').trim();
    if (!val) return;
    stack.push(val);
    input.value = '';
    input.focus();
    renderStack();
  }

  function removeStack(i) {
    stack.splice(i, 1);
    renderStack();
  }

  /* ── STEP NAVIGATION ── */
  function showStep(stepNum) {
    currentStep = stepNum;
    
    // Hide all step containers, show active one
    for (let i = 1; i <= 3; i++) {
      const el = document.getElementById(`ctm-step-container-${i}`);
      if (el) el.style.display = i === stepNum ? 'flex' : 'none';
    }

    // Update stepper indicators
    for (let i = 1; i <= 3; i++) {
      const stepInd = document.getElementById(`ctm-step-indicator-${i}`);
      if (stepInd) {
        stepInd.classList.toggle('active', i === stepNum);
        stepInd.classList.toggle('completed', i < stepNum);
      }
    }

    // Update stepper line highlights
    for (let i = 1; i <= 2; i++) {
      const line = document.getElementById(`ctm-step-line-${i}`);
      if (line) {
        line.classList.toggle('active', i === stepNum - 1);
        line.classList.toggle('completed', i < stepNum);
      }
    }

    // Update footer buttons
    const backBtn = document.getElementById('ctm-back-btn');
    const nextBtn = document.getElementById('ctm-next-btn');
    const submitBtn = document.getElementById('ctm-submit-btn');

    if (backBtn) backBtn.style.display = stepNum > 1 ? 'inline-block' : 'none';
    if (nextBtn) nextBtn.style.display = stepNum < 3 ? 'inline-block' : 'none';
    if (submitBtn) submitBtn.style.display = stepNum === 3 ? 'inline-block' : 'none';

    // Focus first input of the active step
    setTimeout(() => {
      if (stepNum === 1) document.getElementById('ctm-team-name')?.focus();
      else if (stepNum === 2) document.getElementById('ctm-desc')?.focus();
      else if (stepNum === 3) document.getElementById('ctm-lead')?.focus();
    }, 100);
  }

  function shakeElement(el) {
    if (!el) return;
    el.classList.add('shake-error');
    setTimeout(() => el.classList.remove('shake-error'), 400);
  }

  function validateStep(stepNum) {
    if (stepNum === 1) {
      const teamName = document.getElementById('ctm-team-name');
      const hackathon = document.getElementById('ctm-hackathon');
      const theme = document.getElementById('ctm-theme');
      
      let valid = true;
      if (!teamName || !teamName.value.trim()) { shakeElement(teamName); valid = false; }
      if (!hackathon || !hackathon.value) { shakeElement(hackathon); valid = false; }
      if (!theme || !theme.value.trim()) { shakeElement(theme); valid = false; }
      return valid;
    }
    
    if (stepNum === 2) {
      const desc = document.getElementById('ctm-desc');
      const spots = document.getElementById('ctm-spots');
      const current = document.getElementById('ctm-current-members');
      const deadline = document.getElementById('ctm-deadline');
      
      let valid = true;
      if (!desc || !desc.value.trim()) { shakeElement(desc); valid = false; }
      
      const spotsVal = parseInt(spots?.value) || 0;
      const curVal = parseInt(current?.value) || 0;

      if (!spots || spotsVal < 2 || spotsVal > 12) { shakeElement(spots); valid = false; }
      if (!current || curVal < 1 || curVal > 12) { shakeElement(current); valid = false; }
      
      if (valid && curVal >= spotsVal) {
        // current members must be less than max spots
        shakeElement(spots);
        shakeElement(current);
        valid = false;
      }

      if (deadline && deadline.value) {
        const selectedDate = new Date(deadline.value + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
          shakeElement(deadline);
          if (window.HackToast && window.HackToast.show) {
            window.HackToast.show("Deadline cannot be in the past.", "error");
          } else {
            alert("Deadline cannot be in the past.");
          }
          valid = false;
        }
      }
      return valid;
    }

    if (stepNum === 3) {
      const lead = document.getElementById('ctm-lead');
      let valid = true;
      if (!lead || !lead.value.trim()) { shakeElement(lead); valid = false; }
      return valid;
    }

    return true;
  }

  /* ── OPEN / CLOSE ── */
  function open() {
    const currentUserEmail = (localStorage.getItem('currentUserEmail') || '').trim().toLowerCase();
    if (!currentUserEmail) {
      alert("Please log in to create a team.");
      return;
    }
    
    // Check if free user has reached team creation limit (3 teams per month)
    const profiles = JSON.parse(localStorage.getItem('hk_profiles') || '{}');
    const userProfile = profiles[currentUserEmail] || {};
    const membership = userProfile.membership || 'free';
    
    if (membership === 'free') {
      const userTeams = JSON.parse(localStorage.getItem('hk_user_teams') || '[]');
      const currentMonthPrefix = new Date().toISOString().slice(0, 7); // e.g. "2026-06"
      const creationsThisMonth = userTeams.filter(t => (t.creatorEmail || '').trim().toLowerCase() === currentUserEmail && t.creationDate && t.creationDate.startsWith(currentMonthPrefix));
      
      if (creationsThisMonth.length >= 3) {
        const msg = "Free tier limit reached: You can create a maximum of 3 teams per month. Redirecting to upgrade page...";
        if (window.HackToast && window.HackToast.show) {
          window.HackToast.show(msg, "error");
        } else {
          alert(msg);
        }
        setTimeout(() => {
          window.location.href = 'upgrade.html?reason=create_limit&redirect=' + encodeURIComponent(window.location.href);
        }, 1200);
        return;
      }
    }

    // Reset state
    roles = [];
    stack = [];
    renderRoles();
    renderStack();

    // Reset form fields
    ['ctm-team-name','ctm-theme','ctm-desc','ctm-lead',
     'ctm-role-input','ctm-stack-input','ctm-spots','ctm-current-members','ctm-deadline']
      .forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
    ['ctm-hackathon','ctm-exp'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.selectedIndex = 0;
    });

    // Reset Success Overlay and footer
    const formBody = document.getElementById('ctm-form-body');
    const success  = document.getElementById('ctm-success');
    const footer   = document.getElementById('ctm-footer');
    if (formBody) formBody.style.display = '';
    if (success)  success.classList.remove('show');
    if (footer)   footer.style.display   = '';

    document.getElementById('ctm-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
    
    // Switch to step 1
    showStep(1);
  }

  function close() {
    document.getElementById('ctm-overlay').classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ── SUBMIT ── */
  function submit() {
    if (!validateStep(3)) return;

    const teamName      = (document.getElementById('ctm-team-name')?.value || '').trim();
    const hackathon     = document.getElementById('ctm-hackathon')?.value || '';
    const theme         = (document.getElementById('ctm-theme')?.value    || '').trim();
    const desc          = (document.getElementById('ctm-desc')?.value     || '').trim();
    const lead          = (document.getElementById('ctm-lead')?.value     || '').trim();
    const spots         = parseInt(document.getElementById('ctm-spots')?.value) || 4;
    const currentMembersRaw = parseInt(document.getElementById('ctm-current-members')?.value);
    const currentMembers    = isNaN(currentMembersRaw) ? 1 : Math.max(1, Math.min(currentMembersRaw, spots));
    const exp           = document.getElementById('ctm-exp')?.value  || 'All Levels';
    const deadline      = document.getElementById('ctm-deadline')?.value || '';

    // Build members array: lead + (currentMembers - 1) placeholder members
    const membersArr = [{ n: lead, r: 'Team Lead' }];
    for (let i = 1; i < currentMembers; i++) {
      membersArr.push({ n: `Member ${i + 1}`, r: 'Member' });
    }

    // Build new team object
    const randomAvatar = (window.TMCards && typeof window.TMCards.getRandomAvatar === 'function')
      ? window.TMCards.getRandomAvatar()
      : null;

    const currentUserEmail = (localStorage.getItem('currentUserEmail') || 'unknown').trim().toLowerCase();

    const newTeam = {
      id:              Date.now(),
      team:            teamName,
      name:            hackathon,
      avatar:          randomAvatar,
      avatarInitials:  teamName.slice(0, 2).toUpperCase(),
      theme,
      description:     desc,
      deadline:        deadline || null,
      creationDate:    new Date().toISOString().split('T')[0],
      totalSpots:      spots,
      experienceLevel: exp,
      techStack:       stack.slice(),
      members:         membersArr,
      roles:           roles.map(r => ({ n: r.n, o: true })),
      applied:         false,
      userCreated:     true,
      creatorEmail:    currentUserEmail,
      applications:    []
    };

    // Persist
    saveUserTeam(newTeam);

    // Inject into TMCards (if loaded)
    if (window.TMCards && typeof window.TMCards.addTeam === 'function') {
      window.TMCards.addTeam(newTeam);
    } else {
      appendCardToGrid(newTeam);
    }

    // Show success state
    const formBody = document.getElementById('ctm-form-body');
    const success  = document.getElementById('ctm-success');
    const footer   = document.getElementById('ctm-footer');
    if (formBody) formBody.style.display = 'none';
    if (success)  success.classList.add('show');
    if (footer)   footer.style.display   = 'none';

    // Auto-close after 1.6s
    setTimeout(() => {
      close();
      const grid = document.getElementById('teams-grid');
      if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 1600);
  }

  function saveUserTeam(team) {
    try {
      const existing = JSON.parse(localStorage.getItem('hk_user_teams') || '[]');
      existing.push(team);
      localStorage.setItem('hk_user_teams', JSON.stringify(existing));

      window.dispatchEvent(new CustomEvent('teamCreated', { detail: team }));

      if (window.Auth && window.Auth.notify) {
        window.Auth.notify(
          team.creatorEmail,
          'team_created',
          'Team Created Successfully!',
          `Your team ${team.team} is now live and waiting for applicants.`
        );
      }
    } catch {}
  }

  /* ── FALLBACK CARD INJECTOR ── */
  function appendCardToGrid(t) {
    const grid = document.getElementById('teams-grid');
    if (!grid) return;

    const empty = grid.querySelector('.tm-empty');
    if (empty) empty.remove();

    const openCount = t.roles.filter(r => r.o).length;
    const filled    = t.members.length;
    const chips     = t.roles.slice(0, 3)
      .map(r => `<span class="tm-chip">${r.n}</span>`)
      .join('');

    const avatarHTML = `
      <div style="
        width:100%; height:100%;
        background: linear-gradient(135deg, #d9a441 0%, #a8720e 100%);
        border-radius:14px;
        display:flex; align-items:center; justify-content:center;
        font-family:var(--font-mono); font-size:15px; font-weight:700;
        color:#000; letter-spacing:0.04em;">
        ${t.avatarInitials}
      </div>`;

    const card = document.createElement('div');
    card.className  = 'tm-card';
    card.dataset.id = t.id;
    card.style.animation = 'ctm-pop 0.35s cubic-bezier(0.22,1,0.36,1) both';
    card.innerHTML = `
      <div class="tm-avatar-wrap">
        <div class="tm-avatar">${avatarHTML}</div>
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
        <div class="tm-roles">${chips || '<span class="tm-chip">TBD</span>'}</div>
        <div class="tm-footer">
          <button class="tm-view-btn"
            onclick="event.stopPropagation(); CreateTeamModal._openDrawerFallback(${t.id})">
            View Details
          </button>
          <button class="tm-apply-btn">Apply</button>
        </div>
      </div>`;

    grid.appendChild(card);
  }

  /* ── LOAD TEAMS ── */
  function loadUserTeams() {
    if (window.TMCards) return;
    try {
      const saved = JSON.parse(localStorage.getItem('hk_user_teams') || '[]');
      saved.forEach(t => appendCardToGrid(t));
    } catch {}
  }

  function openDrawerFallback(id) {
    try {
      const saved = JSON.parse(localStorage.getItem('hk_user_teams') || '[]');
      const t = saved.find(x => x.id === id);
      if (!t || !window.TMCards) return;
      if (typeof window.TMCards.addTeam === 'function') {
        window.TMCards.openDrawer(id);
      }
    } catch {}
  }

  function wireButtons() {
    document.querySelectorAll('[data-open-create-team], .secondary-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const text = btn.textContent.trim().toLowerCase();
        if (text.includes('create') || btn.dataset.openCreateTeam !== undefined) {
          e.preventDefault();
          open();
        }
      });
    });
  }

  /* ── BIND EVENTS ── */
  function bindEvents() {
    document.getElementById('ctm-close-btn')?.addEventListener('click', close);

    document.getElementById('ctm-overlay')?.addEventListener('click', e => {
      if (e.target.id === 'ctm-overlay') close();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && document.getElementById('ctm-overlay')?.classList.contains('open')) {
        close();
      }
    });

    // Wizard navigation button listeners
    document.getElementById('ctm-back-btn')?.addEventListener('click', () => {
      if (currentStep > 1) showStep(currentStep - 1);
    });

    document.getElementById('ctm-next-btn')?.addEventListener('click', () => {
      if (validateStep(currentStep)) {
        showStep(currentStep + 1);
      }
    });

    document.getElementById('ctm-spots')?.addEventListener('input', updateCurrentMembersCount);
    document.getElementById('ctm-add-role-btn')?.addEventListener('click', addRole);
    document.getElementById('ctm-role-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); addRole(); }
    });

    document.getElementById('ctm-add-stack-btn')?.addEventListener('click', addStack);
    document.getElementById('ctm-stack-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); addStack(); }
    });

    document.getElementById('ctm-submit-btn')?.addEventListener('click', submit);
  }

  /* ── INIT ── */
  function init() {
    injectModal();
    bindEvents();
    wireButtons();
    loadUserTeams();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ── PUBLIC API ── */
  window.CreateTeamModal = {
    open,
    close,
    _removeRole:         removeRole,
    _removeStack:        removeStack,
    _openDrawerFallback: openDrawerFallback,
  };

})();