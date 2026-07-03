/* =============================================
   PROFILE PAGE — js/profile.js
   Reads real data from:
     hk_tm_v2       → applied teams state (set by teamfinder.js)
     hk_user_teams  → user-created teams (set by create-team-modal.js)
     hk_profile     → user profile info (saved here)
     hk_approvals   → approve/reject decisions (saved here)
   ============================================= */

(function () {

  /* ────────────────────────────────────────────
     TEAM DATA (same as teamfinder.js TEAMS array)
     We embed the base data here so profile.js
     can resolve team names from applied IDs.
     Only ids + names + hackathon are needed.
  ──────────────────────────────────────────── */
  const BASE_TEAMS = [
    { id: 1, team: 'Alpha Builders', name: 'HackIndia 2026', theme: 'AI for Healthcare', deadline: '2026-08-15', description: 'Building an AI-powered diagnostic tool for rural healthcare.', techStack: ['Python', 'TensorFlow', 'React', 'FastAPI'], experienceLevel: 'Intermediate' },
    { id: 2, team: 'FinForce', name: 'BharatHacks 2026', theme: 'FinTech Innovation', deadline: '2026-09-01', description: 'Reimagining financial inclusion for Bharat. Micro-lending platform.', techStack: ['Node.js', 'PostgreSQL', 'React Native', 'Stripe'], experienceLevel: 'All Levels' },
    { id: 3, team: 'GreenStack', name: 'GreenCode Jam', theme: 'Climate Tech', deadline: '2026-07-30', description: 'Real-time carbon footprint tracker for Indian cities.', techStack: ['Arduino', 'Python', 'MongoDB', 'Next.js'], experienceLevel: 'Beginner Friendly' },
    { id: 4, team: 'Web3 Wolves', name: 'ETHIndia 2026', theme: 'DeFi & DAOs', deadline: '2026-10-12', description: 'Decentralized autonomous organization toolkit for Indian startups.', techStack: ['Solidity', 'Hardhat', 'ethers.js', 'Next.js'], experienceLevel: 'Advanced' },
    { id: 5, team: 'Cloud9 Crew', name: 'AWS Build-On India', theme: 'Cloud Infrastructure', deadline: '2026-08-20', description: 'Automating DevOps pipelines for startups using serverless AWS.', techStack: ['AWS Lambda', 'Terraform', 'Docker', 'Go'], experienceLevel: 'Intermediate' },
    { id: 6, team: 'MindBridge', name: 'GenAI Hackathon', theme: 'Mental Health Tech', deadline: '2026-09-15', description: 'LLM-powered mental wellness companion for college students.', techStack: ['OpenAI API', 'LangChain', 'Flutter', 'Supabase'], experienceLevel: 'All Levels' },
  ];

  /* Dummy applicants shown per created team */
  const DUMMY_APPLICANTS = [
    { init: 'AK', name: 'Arjun Kumar', role: 'Frontend Dev' },
    { init: 'PS', name: 'Priya Singh', role: 'UI Designer' },
    { init: 'MR', name: 'Meera Rao', role: 'Full Stack Dev' },
    { init: 'VK', name: 'Vikram Khanna', role: 'Backend Dev' },
    { init: 'SR', name: 'Sneha Reddy', role: 'ML Engineer' },
    { init: 'RG', name: 'Rahul Gupta', role: 'DevOps Engineer' },
    { init: 'AT', name: 'Aman Tiwari', role: 'Android Dev' },
    { init: 'NK', name: 'Nisha Kulkarni', role: 'UX Researcher' },
    { init: 'DS', name: 'Dev Shah', role: 'Blockchain Dev' },
  ];

  /* ────────────────────────────────────────────
     STATE
  ──────────────────────────────────────────── */
  let profile = {
    name: 'Harish Ramachandran',
    role: 'UI/UX Designer',
    bio: 'Passionate about crafting intuitive design experiences.',
    city: 'Hyderabad',
    phone: '+91 76661875209',
    linkedin: '',
    github: '',
    avatar: 'assets/avatar/shruti.webp',
    skills: ['Figma', 'UI/UX', 'Prototyping'],
  };

  let editSkills = [];
  let approvals = {};  // { [teamId_appIndex]: 'approve' | 'reject' }
  let activeAppliedId = null;
  let activeCreatedId = null;
  let tempAvatar = null;
  let withdrawTeamId = null;

  /* ────────────────────────────────────────────
     LOCALSTORAGE HELPERS
  ──────────────────────────────────────────── */
  function lsGet(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  }

  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { }
  }

  /* ── Applied teams from teamfinder.js ──
     hk_tm_v2 stores: [{ id, applied }]
     We cross-reference with BASE_TEAMS + hk_user_teams.
  */
  function getAppliedTeams() {
    const currentUserEmail = (localStorage.getItem('currentUserEmail') || '').trim().toLowerCase();
    if (!currentUserEmail) return [];

    const state = lsGet('hk_tm_v2_' + currentUserEmail, []);
    const userTeams = lsGet('hk_user_teams', []);
    const allTeams = [...BASE_TEAMS, ...userTeams];

    const allApps = lsGet('hk_applications', []);
    const myApps = allApps.filter(a => (a.applicantId || '').trim().toLowerCase() === currentUserEmail).reverse();

    const appliedStatic = state
      .filter(s => s.applied)
      .map(s => {
        const t = allTeams.find(x => String(x.id) === String(s.id));
        if (!t) return null;
        const appDetails = myApps.find(a => String(a.teamId) === String(t.id)) || {};
        return { ...t, applied: true, myStatus: appDetails.status || 'pending', myAppDetails: appDetails };
      })
      .filter(Boolean);

    const appliedUserCreated = userTeams
      .filter(t => t.applications && t.applications.some(a => (a.email || '').trim().toLowerCase() === currentUserEmail))
      .map(t => {
         const app = t.applications.find(a => (a.email || '').trim().toLowerCase() === currentUserEmail);
         const appDetails = myApps.find(a => String(a.teamId) === String(t.id)) || app;
         return { ...t, applied: true, myStatus: app.status, myAppDetails: appDetails };
      });

    // Merge by team ID to avoid duplicates just in case
    const merged = [...appliedStatic, ...appliedUserCreated];
    const unique = [];
    const seen = new Set();
    for (const t of merged) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        unique.push(t);
      }
    }
    return unique;
  }

  function getCreatedTeams() {
    const currentUserEmail = (localStorage.getItem('currentUserEmail') || '').trim().toLowerCase();
    if (!currentUserEmail) return [];
    const allUserTeams = lsGet('hk_user_teams', []);
    return allUserTeams.filter(t => (t.creatorEmail || '').trim().toLowerCase() === currentUserEmail);
  }

  /* ────────────────────────────────────────────
     PROFILE LOAD / SAVE
  ──────────────────────────────────────────── */
  function loadProfile() {
    const email = (localStorage.getItem('currentUserEmail') || '').trim().toLowerCase();
    if (email) {
       const profiles = lsGet('hk_profiles', {});
       if (profiles[email]) {
           profile = { 
               name: '', role: '', bio: '', city: '', phone: '', linkedin: '', github: '', avatar: '', skills: [],
               ...profiles[email] 
           };
       }
    } else {
       const saved = lsGet('hk_profile', null);
       if (saved) profile = { ...profile, ...saved };
    }
  }

  function saveProfile() {
    const email = (localStorage.getItem('currentUserEmail') || '').trim().toLowerCase();
    if (email) {
       const profiles = lsGet('hk_profiles', {});
       profiles[email] = profile;
       lsSet('hk_profiles', profiles);
    }
    lsSet('hk_profile', profile);
  }

  /* ────────────────────────────────────────────
     RENDER PROFILE CARD
  ──────────────────────────────────────────── */
  function renderProfile() {
    const avatarEl = document.getElementById('pfAvatar');
    const avatarUrl = profile.avatar || 'assets/avatar/shruti.webp';
    avatarEl.innerHTML = `<img src="${esc(avatarUrl)}" alt="${esc(profile.name)}">`;

    const nameEl = document.getElementById('pfName');
    const membership = profile.membership || 'free';
    if (membership === 'premium') {
      nameEl.innerHTML = `${esc(profile.name)} <span class="premium-crown" title="Premium Member" style="color: #c9a441; margin-left: 6px; font-size: 20px; vertical-align: middle; cursor: help;">👑</span>`;
    } else {
      nameEl.textContent = profile.name || '';
    }
    document.getElementById('pfRole').textContent = profile.role || '';
    document.getElementById('pfBio').textContent = profile.bio || '';
    document.getElementById('pfCity').textContent = profile.city || '';
    document.getElementById('pfPhone').textContent = profile.phone || '';

    const liLink = document.getElementById('pfLinkedinLink');
    const liText = document.getElementById('pfLinkedinText');
    if (profile.linkedin) {
      liLink.href = profile.linkedin;
      liText.textContent = 'LinkedIn';
      liLink.style.display = 'flex';
    } else {
      liLink.style.display = 'none';
    }

    const ghLink = document.getElementById('pfGithubLink');
    const ghText = document.getElementById('pfGithubText');
    if (profile.github) {
      ghLink.href = profile.github;
      ghText.textContent = 'GitHub';
      ghLink.style.display = 'flex';
    } else {
      ghLink.style.display = 'none';
    }

    const skillsEl = document.getElementById('pfSkillsDisplay');
    skillsEl.innerHTML = (profile.skills || [])
      .map(s => `<span class="pf-skill-chip">${esc(s)}</span>`)
      .join('');

    const badgeEl = document.getElementById('pfMembershipBadge');
    const upgradeBtn = document.getElementById('pfUpgradeBtn');
    if (badgeEl && upgradeBtn) {
      if (membership === 'premium') {
        badgeEl.textContent = 'Premium Member';
        badgeEl.style.background = 'rgba(217, 164, 65, 0.15)';
        badgeEl.style.color = '#c9a84c';
        badgeEl.style.border = '1px solid rgba(217, 164, 65, 0.4)';
        badgeEl.style.borderStyle = 'solid';
        upgradeBtn.textContent = 'Downgrade to Free';
      } else {
        badgeEl.textContent = 'Free Member';
        badgeEl.style.background = 'rgba(255, 255, 255, 0.05)';
        badgeEl.style.color = '#a1a1aa';
        badgeEl.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        badgeEl.style.borderStyle = 'solid';
        upgradeBtn.textContent = 'Upgrade to Premium';
      }
    }
  }

  /* ────────────────────────────────────────────
     STATS
  ──────────────────────────────────────────── */
  function renderStats() {
    const applied = getAppliedTeams();
    const created = getCreatedTeams();
    
    let accepted = 0;
    let pending = 0;
    applied.forEach(t => {
      if (t.myStatus === 'approve') accepted++;
      else if (t.myStatus === 'pending') pending++;
    });

    document.getElementById('statApplied').textContent = applied.length;
    document.getElementById('statCreated').textContent = created.length;
    document.getElementById('statAccepted').textContent = accepted;
    document.getElementById('statPending').textContent = pending;
  }

  /* ────────────────────────────────────────────
     REGISTERED HACKATHONS LIST & NEXT STEPS
     ──────────────────────────────────────────── */
  function renderRegistered() {
    const list = document.getElementById('registeredHackathonsList');
    if (!list) return;

    const currentUserEmail = (localStorage.getItem('currentUserEmail') || '').trim().toLowerCase();
    if (!currentUserEmail) return;

    // Get registered hackathons
    let regs = [];
    try {
      regs = window.HackState.getRegs();
    } catch (e) {}

    if (!regs.length) {
      list.innerHTML = `
        <div class="pf-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:12px; opacity:0.6;">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <div style="font-size: 15px; color: #aaa; margin-top: 8px;">You are not registered for any hackathons yet.</div>
          <div style="font-size: 13px; color: #666; margin-top: 4px;">Explore and register for events to get started!</div>
          <a href="/hackathon" class="pf-ns-btn-link" style="display:inline-flex; margin-top: 14px;">Explore Hackathons</a>
        </div>`;
      return;
    }

    const createdTeams = getCreatedTeams();
    const appliedTeams = getAppliedTeams();

    list.innerHTML = '';

    regs.forEach(reg => {
      const h = (window.HACKATHONS || []).find(x => x.id === parseInt(reg.hackathonId));
      if (!h) return;

      const wrap = document.createElement('div');
      wrap.className = 'pf-reg-card';

      // Determine team status
      const myCreatedTeam = createdTeams.find(t => t.name === h.title);
      const myApprovedTeam = appliedTeams.find(t => t.name === h.title && t.myStatus === 'approve');
      const pendingTeamsForHack = appliedTeams.filter(t => t.name === h.title && t.myStatus === 'pending');

      let statusHtml = '';
      let nextStepHtml = '';

      if (myCreatedTeam) {
        const filled = myCreatedTeam.members ? myCreatedTeam.members.length : 1;
        const total = myCreatedTeam.totalSpots || 4;
        const vacantSpots = total - filled;
        const statusBadgeText = vacantSpots > 0 ? `Looking for ${vacantSpots} members` : 'Team Full';
        const statusBadgeClass = vacantSpots > 0 ? 'pf-b-pending' : 'pf-b-accepted';

        statusHtml = `
          <div class="pf-reg-status-row">
            <span class="pf-reg-status-label">Your Team:</span>
            <span class="pf-badge ${statusBadgeClass}">${statusBadgeText}</span>
            <span class="pf-reg-team-name">${esc(myCreatedTeam.team)} (${filled}/${total} members)</span>
          </div>`;

        if (vacantSpots <= 0) {
          nextStepHtml = `
            <div class="pf-next-step-box pf-ns-success">
              <div class="pf-ns-header">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #3fc980; vertical-align:middle; margin-right:6px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <strong>Next Step: Squad is Ready!</strong>
              </div>
              <p class="pf-ns-desc">Your team is fully staffed and ready to roll. Connect with your team members, start planning your project architecture, and be ready when the hackathon begins on ${h.startDate || 'start date'}.</p>
              <button class="pf-ns-btn" onclick="Profile.switchTab('tab-created')">View Team Squad</button>
            </div>`;
        } else {
          nextStepHtml = `
            <div class="pf-next-step-box pf-ns-warning">
              <div class="pf-ns-header">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #c9a227; vertical-align:middle; margin-right:6px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <strong>Next Step: Recruit Team Members</strong>
              </div>
              <p class="pf-ns-desc">You still have <strong>${vacantSpots}</strong> open spots in your squad. Review incoming applications, approve applicants, or share your team details to find matching hackers.</p>
              <button class="pf-ns-btn" onclick="Profile.switchTab('tab-created')">Manage Applicants</button>
            </div>`;
        }
      } else if (myApprovedTeam) {
        const filled = myApprovedTeam.members ? myApprovedTeam.members.length : 1;
        const total = myApprovedTeam.totalSpots || 4;
        const vacantSpots = total - filled;
        const statusBadgeText = vacantSpots > 0 ? `Looking for ${vacantSpots} members` : 'Team Full';
        const statusBadgeClass = vacantSpots > 0 ? 'pf-b-pending' : 'pf-b-accepted';

        statusHtml = `
          <div class="pf-reg-status-row">
            <span class="pf-reg-status-label">Your Team:</span>
            <span class="pf-badge ${statusBadgeClass}">${statusBadgeText}</span>
            <span class="pf-reg-team-name">${esc(myApprovedTeam.team)} (${filled}/${total} members)</span>
          </div>`;

        nextStepHtml = `
          <div class="pf-next-step-box pf-ns-success">
            <div class="pf-ns-header">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #3fc980; vertical-align:middle; margin-right:6px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <strong>Next Step: Connect and Brainstorm</strong>
            </div>
            <p class="pf-ns-desc">You are an approved member of <strong>${esc(myApprovedTeam.team)}</strong>! Connect with your team lead, align on the project theme/focus area, and start planning for the competition.</p>
            <button class="pf-ns-btn" onclick="Profile.switchTab('tab-applied')">View Team Details</button>
          </div>`;
      } else if (pendingTeamsForHack.length > 0) {
        const teamNames = pendingTeamsForHack.map(t => esc(t.team)).join(', ');
        statusHtml = `
          <div class="pf-reg-status-row">
            <span class="pf-reg-status-label">Your Status:</span>
            <span class="pf-badge pf-b-pending">Pending Approval</span>
            <span class="pf-reg-team-name">Applied to: ${teamNames}</span>
          </div>`;

        nextStepHtml = `
          <div class="pf-next-step-box pf-ns-info">
            <div class="pf-ns-header">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #4a9edd; vertical-align:middle; margin-right:6px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <strong>Next Step: Awaiting Approval</strong>
            </div>
            <p class="pf-ns-desc">Your applications are currently pending with the team leads. You can wait for an approval or, to maximize your chances, apply to other teams or create your own squad.</p>
            <div class="pf-ns-btn-row">
              <a href="/teamfinder" class="pf-ns-btn-link">Find More Teams</a>
              <button class="pf-ns-btn pf-btn-secondary" onclick="CreateTeamModal.open()">Create Team</button>
            </div>
          </div>`;
      } else {
        statusHtml = `
          <div class="pf-reg-status-row">
            <span class="pf-reg-status-label">Your Status:</span>
            <span class="pf-badge" style="background:#1c0f0a; color:#f97316; border: 1px solid rgba(249,115,22,0.3);">No Team Joined</span>
            <span class="pf-reg-team-name" style="color:#f97316; font-weight:600;">Action Required!</span>
          </div>`;

        nextStepHtml = `
          <div class="pf-next-step-box pf-ns-error">
            <div class="pf-ns-header">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:#ef4444; vertical-align:middle; margin-right:6px;"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <strong>Next Step: Build or Join a Squad</strong>
            </div>
            <p class="pf-ns-desc">This hackathon requires a team to participate. Since you do not have a squad yet, you must join an existing team or create your own team now.</p>
            <div class="pf-ns-btn-row">
              <a href="teamfinder.html" class="pf-ns-btn-link">Find a Team</a>
              <button class="pf-ns-btn pf-btn-primary" onclick="CreateTeamModal.open()">Create Team</button>
            </div>
          </div>`;
      }

      wrap.innerHTML = `
        <div class="pf-reg-card-header" style="background: ${h.bannerGradient || 'linear-gradient(135deg, #1a150e, #0a0a0a)'}">
          <div class="pf-reg-logo">${h.organiserLogo || 'H'}</div>
          <div style="flex:1; min-width:0;">
            <div class="pf-reg-title">${esc(h.title)}</div>
            <div class="pf-reg-meta">${esc(h.organiser)} · ${esc(h.format || 'Online')}</div>
          </div>
        </div>
        <div class="pf-reg-card-body">
          <div class="pf-reg-grid">
            <div class="pf-reg-grid-item">
              <div class="pf-reg-grid-label">Start Date</div>
              <div class="pf-reg-grid-val">${h.startDate || 'TBD'}</div>
            </div>
            <div class="pf-reg-grid-item">
              <div class="pf-reg-grid-label">End Date</div>
              <div class="pf-reg-grid-val">${h.endDate || 'TBD'}</div>
            </div>
            <div class="pf-reg-grid-item">
              <div class="pf-reg-grid-label">Formation Deadline</div>
              <div class="pf-reg-grid-val">${formatDate(h.teamFormationDeadline)}</div>
            </div>
          </div>
          ${statusHtml}
          ${nextStepHtml}
        </div>`;

      list.appendChild(wrap);
    });
  }

  /* ────────────────────────────────────────────
     APPLIED TEAMS LIST
  ──────────────────────────────────────────── */
  function renderApplied() {
    const list = document.getElementById('appliedTeamsList');
    const teams = getAppliedTeams();

    if (!teams.length) {
      list.innerHTML = `
        <div class="pf-empty">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          No applications yet.<br>Find teams on the <a href="/teamfinder" style="color:#c9a227;">Team Finder</a> page.
        </div>`;
      return;
    }

    list.innerHTML = '';
    teams.forEach(t => {
      const wrap = document.createElement('div');
      wrap.style.marginBottom = '8px';

      const btn = document.createElement('button');
      btn.className = 'pf-team-btn';
      btn.dataset.id = t.id;
      btn.innerHTML = `
        <div style="min-width:0;flex:1">
          <div class="pf-t-name">${esc(t.team)}</div>
          <div class="pf-t-sub">${esc(t.name)} · ${esc(t.theme || '')}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          <span class="pf-badge pf-b-pending">Applied</span>
          <span class="pf-chevron">▼</span>
        </div>`;

      const content = document.createElement('div');
      content.className = 'pf-inline-detail';
      content.style.display = 'none';
      content.style.background = '#111';
      content.style.border = '1px solid #222';
      content.style.borderTop = 'none';
      content.style.borderRadius = '0 0 8px 8px';
      content.style.padding = '16px';
      content.style.marginTop = '-8px';
      
      const stack = (t.techStack || []).map(s => `<span class="pf-tech-chip">${esc(s)}</span>`).join('');
      const statusBadgeText = t.myStatus === 'approve' ? 'Approved' : (t.myStatus === 'reject' ? 'Rejected' : 'Pending');
      const badgeColorClass = t.myStatus === 'approve' ? 'pf-b-open' : (t.myStatus === 'reject' ? '' : 'pf-b-pending');

      content.innerHTML = `
        <div class="pf-detail-name" style="margin-top: 8px;">${esc(t.team)}</div>
        <div class="pf-detail-hackathon">${esc(t.name)}</div>
        <div class="pf-detail-grid">
          <div class="pf-detail-item">
            <div class="pf-detail-key">Theme</div>
            <div class="pf-detail-val">${esc(t.theme || '—')}</div>
          </div>
          <div class="pf-detail-item">
            <div class="pf-detail-key">Deadline</div>
            <div class="pf-detail-val">${formatDate(t.deadline)}</div>
          </div>
          <div class="pf-detail-item">
            <div class="pf-detail-key">Status</div>
            <div class="pf-detail-val"><span class="pf-badge ${badgeColorClass}">${statusBadgeText}</span></div>
          </div>
        </div>
        <div class="pf-detail-label">About</div>
        <div class="pf-detail-desc">${esc(t.description || '—')}</div>
        ${stack ? `<div class="pf-detail-label">Tech Stack</div><div class="pf-tech-chips" style="margin-bottom: 20px;">${stack}</div>` : ''}
        
        ${t.myAppDetails && t.myAppDetails.role ? `
        <div class="pf-detail-label" style="margin-top: 16px;">My Application</div>
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 12px; font-size: 14px; color: #ffffff; opacity: 0.9; margin-bottom: 20px;">
          <div style="margin-bottom: 6px;"><strong>Role:</strong> <span style="color:#fff;">${esc(t.myAppDetails.role)}</span></div>
          <div style="margin-bottom: 6px;"><strong>Skills:</strong> <span style="color:#fff;">${esc(t.myAppDetails.skills || '—')}</span></div>
          <div style="margin-bottom: 6px;"><strong>Portfolio:</strong> <a href="${esc(t.myAppDetails.portfolio || '#')}" target="_blank" style="color:#D9A441; text-decoration:none;">${esc(t.myAppDetails.portfolio || '—')}</a></div>
          ${t.myAppDetails.message ? `<div><strong>Message:</strong> <span style="color:#fff;">${esc(t.myAppDetails.message)}</span></div>` : ''}
        </div>
        ` : ''}
        <button class="pf-unapply-btn" id="btnUnapply_${t.id}" data-id="${t.id}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <line x1="23" y1="11" x2="17" y2="11"/>
          </svg>
          Withdraw Application
        </button>`;

      btn.addEventListener('click', () => {
        const isActive = btn.classList.contains('active');
        list.querySelectorAll('.pf-team-btn').forEach(b => {
          b.classList.remove('active');
          b.style.borderRadius = '8px';
        });
        list.querySelectorAll('.pf-inline-detail').forEach(c => c.style.display = 'none');
        
        if (!isActive) {
          btn.classList.add('active');
          btn.style.borderRadius = '8px 8px 0 0';
          content.style.display = 'block';
        }
      });

      wrap.appendChild(btn);
      wrap.appendChild(content);
      list.appendChild(wrap);

      const btnUnapply = content.querySelector(`#btnUnapply_${t.id}`);
      if (btnUnapply) {
        btnUnapply.addEventListener('click', () => {
          showConfirmModal(t.id);
        });
      }
    });
  }

  /* ────────────────────────────────────────────
     CREATED TEAMS LIST
  ──────────────────────────────────────────── */
  function renderCreated() {
    const activeList = document.getElementById('createdTeamsList');
    const completedList = document.getElementById('completedTeamsList');
    const teams = getCreatedTeams();

    const activeTeams = teams.filter(t => t.roles.some(r => r.o));
    const completedTeams = teams.filter(t => t.roles.every(r => !r.o));

    const renderList = (container, listTeams, emptyText, badgeText) => {
      if (!listTeams.length) {
        container.innerHTML = `
          <div class="pf-empty">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            ${emptyText}
          </div>`;
        return;
      }
      container.innerHTML = '';
      listTeams.forEach(t => {
        const wrap = document.createElement('div');
        wrap.style.marginBottom = '8px';

        const btn = document.createElement('button');
        btn.className = 'pf-team-btn';
        btn.dataset.id = t.id;
        const filled = (t.members || []).length;
        const total = t.totalSpots || '?';
        btn.innerHTML = `
          <div style="min-width:0;flex:1">
            <div class="pf-t-name">${esc(t.team || t.name || 'Team')}</div>
            <div class="pf-t-sub">${esc(t.name || '')} · ${filled}/${total} members</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
            <span class="pf-badge ${badgeText === 'Full' ? 'pf-b-accepted' : 'pf-b-open'}">${badgeText}</span>
            <span class="pf-chevron">▼</span>
          </div>`;

        const content = document.createElement('div');
        content.className = 'pf-inline-detail';
        content.style.display = 'none';
        content.style.background = '#111';
        content.style.border = '1px solid #222';
        content.style.borderTop = 'none';
        content.style.borderRadius = '0 0 8px 8px';
        content.style.padding = '16px';
        content.style.marginTop = '-8px';
        
        const apps = t.applications || [];
        const appRows = apps.length === 0 ? '<div style="color:#ffffff; opacity:0.8; font-size:14px;">No applications yet.</div>' : apps.map((a, i) => {
          const dec = a.status !== 'pending' ? a.status : null;
          const btns = dec
            ? `<span class="pf-decided" style="color:${dec === 'approve' ? '#3fc980' : '#e05050'}">${dec === 'approve' ? '✓ Approved' : '✕ Rejected'}</span>`
            : `<div class="pf-action-btns">
                 <button class="pf-btn-approve" onclick="Profile.decide('${t.id}','${a.email}')">Approve</button>
                 <button class="pf-btn-reject"  onclick="Profile.reject('${t.id}','${a.email}')">Reject</button>
               </div>`;
          return `
            <div class="pf-applicant-row" id="app_row_${t.id}_${CSS.escape(a.email)}" style="flex-direction: column; align-items: stretch; gap: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div class="pf-app-info">
                  <div class="pf-app-av" style="overflow:hidden;border-radius:50%;"><img src="${a.avatar || 'assets/avatar/shruti.webp'}" style="width:100%;height:100%;object-fit:cover;"></div>
                  <div>
                    <div class="pf-app-name">${esc(a.name)}</div>
                    <div class="pf-app-role">${esc(a.role)}</div>
                  </div>
                </div>
                ${btns}
              </div>
              <div style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px; font-size: 14px; color: #ffffff; opacity: 0.9;">
                <div style="margin-bottom: 6px;"><strong>Skills:</strong> <span style="color:#fff;">${esc(a.skills || 'N/A')}</span></div>
                <div style="margin-bottom: 6px;"><strong>Portfolio:</strong> <a href="${esc(a.portfolio || '#')}" target="_blank" style="color:#D9A441; text-decoration:none;">${esc(a.portfolio || 'N/A')}</a></div>
                ${a.msg ? `<div><strong>Message:</strong> <span style="color:#fff;">${esc(a.msg)}</span></div>` : ''}
              </div>
            </div>`;
        }).join('');

        const stack = (t.techStack || []).map(s => `<span class="pf-tech-chip">${esc(s)}</span>`).join('');

        content.innerHTML = `
          <div class="pf-detail-name" style="margin-top: 8px;">${esc(t.team || t.name || 'Team')}</div>
          <div class="pf-detail-hackathon">${esc(t.name || '')} · ${esc(t.theme || '')}</div>
          <div class="pf-detail-grid">
            <div class="pf-detail-item">
              <div class="pf-detail-key">Max Size</div>
              <div class="pf-detail-val">${t.totalSpots || '?'}</div>
            </div>
            <div class="pf-detail-item">
              <div class="pf-detail-key">Level</div>
              <div class="pf-detail-val">${esc(t.experienceLevel || 'Any')}</div>
            </div>
            <div class="pf-detail-item">
              <div class="pf-detail-key">Deadline</div>
              <div class="pf-detail-val">${formatDate(t.deadline)}</div>
            </div>
          </div>
          ${t.description ? `<div class="pf-detail-label">About</div><div class="pf-detail-desc">${esc(t.description)}</div>` : ''}
          ${stack ? `<div class="pf-detail-label">Tech Stack</div><div class="pf-tech-chips" style="margin-bottom:16px">${stack}</div>` : ''}
          <div class="pf-detail-label">Applicants</div>
          <div id="appRows_${t.id}">${appRows}</div>`;

        btn.addEventListener('click', () => {
          const isActive = btn.classList.contains('active');
          container.querySelectorAll('.pf-team-btn').forEach(b => {
            b.classList.remove('active');
            b.style.borderRadius = '8px';
          });
          container.querySelectorAll('.pf-inline-detail').forEach(c => c.style.display = 'none');
          
          if (!isActive) {
            btn.classList.add('active');
            btn.style.borderRadius = '8px 8px 0 0';
            content.style.display = 'block';
          }
        });

        wrap.appendChild(btn);
        wrap.appendChild(content);
        container.appendChild(wrap);
      });
    };

    if (activeList) renderList(activeList, activeTeams, `No active teams yet.<br>Go to <a href="/teamfinder" style="color:#c9a227;">Team Finder</a> to create one.`, 'Open');
    if (completedList) renderList(completedList, completedTeams, `No completed teams yet.`, 'Full');
  }

  /* ────────────────────────────────────────────
     APPROVE / REJECT
  ──────────────────────────────────────────── */
  function decide(teamId, applicantEmail) {
    updateApplicationStatus(teamId, applicantEmail, 'approve');
  }

  function reject(teamId, applicantEmail) {
    updateApplicationStatus(teamId, applicantEmail, 'reject');
  }

  function updateApplicationStatus(teamId, applicantEmail, status) {
    const normApplicantEmail = (applicantEmail || '').trim().toLowerCase();
    const userTeams = lsGet('hk_user_teams', []);
    const team = userTeams.find(t => String(t.id) === String(teamId));
    if (team && team.applications) {
      const app = team.applications.find(a => (a.email || '').trim().toLowerCase() === normApplicantEmail);
      if (app) {
        const oldStatus = app.status;
        app.status = status;
        
        if (status === 'approve' && oldStatus !== 'approve') {
          // Add to team members
          if (!team.members) team.members = [];
          if (!team.members.find(m => m.n === app.name)) {
            team.members.push({ n: app.name, r: app.role });
          }
          // Decrease role opening quantity
          if (team.roles) {
            const role = team.roles.find(r => r.n === app.role);
            if (role) {
              if (role.qty !== undefined && role.qty > 0) role.qty--;
              if (!role.qty || role.qty <= 0) role.o = false;
            }
          }
        } else if (status === 'reject' && oldStatus === 'approve') {
          // Remove from team members
          if (team.members) {
            team.members = team.members.filter(m => !(m.r === app.role && m.n === app.name));
          }
          // Re-open the role
          if (team.roles) {
            const role = team.roles.find(r => r.n === app.role);
            if (role) {
              if (role.qty !== undefined) role.qty++;
              role.o = true;
            }
          }
        }
        
        lsSet('hk_user_teams', userTeams);
        refreshApplicantRow(teamId, applicantEmail, status);

        if (window.Auth && window.Auth.notify) {
          window.Auth.notify(
            applicantEmail,
            `application_${status}`,
            `Application ${status === 'approve' ? 'Approved' : 'Rejected'}`,
            `Your application for the ${app.role} role in team ${team.team} was ${status === 'approve' ? 'approved' : 'rejected'}.`
          );

          if (status === 'approve' && team.roles && team.roles.every(r => !r.o)) {
            window.Auth.notify(
              team.creatorEmail,
              'team_full',
              'Team Completed!',
              `Your team ${team.team} is now fully staffed and has been moved to the Completed Teams tab.`
            );
          }
        }
        
        // Re-render created teams to reflect new state
        renderCreated();
        
        // Also update hk_applications
        const allApps = JSON.parse(localStorage.getItem('hk_applications') || '[]');
        const globalApp = allApps.find(a => String(a.teamId) === String(teamId) && (a.applicantId || '').trim().toLowerCase() === normApplicantEmail);
        if (globalApp) {
          globalApp.status = status;
          localStorage.setItem('hk_applications', JSON.stringify(allApps));
        }
      }
    }
  }

  function refreshApplicantRow(teamId, applicantEmail, dec) {
    const row = document.getElementById(`app_row_${teamId}_${CSS.escape(applicantEmail)}`);
    if (!row) return;
    const btnsWrap = row.querySelector('.pf-action-btns');
    if (btnsWrap) {
      btnsWrap.outerHTML = `<span class="pf-decided" style="color:${dec === 'approve' ? '#3fc980' : '#e05050'}">${dec === 'approve' ? '✓ Approved' : '✕ Rejected'}</span>`;
    }
  }

  /* ────────────────────────────────────────────
     EDIT PROFILE MODAL
  ──────────────────────────────────────────── */
  function openEditModal() {
    document.getElementById('inpName').value = profile.name || '';
    document.getElementById('inpRole').value = profile.role || '';
    document.getElementById('inpBio').value = profile.bio || '';
    document.getElementById('inpCity').value = profile.city || '';
    document.getElementById('inpPhone').value = profile.phone || '';
    document.getElementById('inpLinkedin').value = profile.linkedin || '';
    document.getElementById('inpGithub').value = profile.github || '';

    // Set preview image and store in tempAvatar
    tempAvatar = profile.avatar || 'assets/avatar/shruti.webp';
    const previewImg = document.getElementById('imgEditAvatarPreview');
    if (previewImg) {
      previewImg.src = tempAvatar;
    }

    editSkills = [...(profile.skills || [])];
    renderEditSkills();
    document.getElementById('pfEditModal').classList.add('open');
    document.getElementById('pfEditModal').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function closeEditModal() {
    document.getElementById('pfEditModal').classList.remove('open');
  }

  function saveProfileFromModal() {
    profile.name = document.getElementById('inpName').value.trim() || profile.name;
    profile.role = document.getElementById('inpRole').value.trim() || profile.role;
    profile.bio = document.getElementById('inpBio').value.trim();
    profile.city = document.getElementById('inpCity').value.trim() || profile.city;
    profile.phone = document.getElementById('inpPhone').value.trim() || profile.phone;
    profile.linkedin = document.getElementById('inpLinkedin').value.trim();
    profile.github = document.getElementById('inpGithub').value.trim();
    if (tempAvatar) {
      profile.avatar = tempAvatar;
    }
    profile.skills = [...editSkills];
    saveProfile();
    renderProfile();
    if (window.Auth && typeof window.Auth.updateNav === 'function') {
      window.Auth.updateNav();
    }
    closeEditModal();
  }

  function renderEditSkills() {
    const el = document.getElementById('editSkillsList');
    if (!el) return;
    el.innerHTML = editSkills.map((s, i) => `
      <span class="pf-edit-skill-tag">
        ${esc(s)}
        <button type="button" aria-label="Remove ${esc(s)}" onclick="Profile._removeSkill(${i})">×</button>
      </span>`).join('');
  }

  function addSkill() {
    const inp = document.getElementById('inpSkill');
    const val = (inp.value || '').trim();
    if (val && !editSkills.includes(val)) {
      editSkills.push(val);
      renderEditSkills();
    }
    inp.value = '';
    inp.focus();
  }

  function removeSkill(i) {
    editSkills.splice(i, 1);
    renderEditSkills();
  }

  function showConfirmModal(teamId) {
    withdrawTeamId = teamId;
    const overlay = document.getElementById('tm-confirm-overlay');
    if (overlay) overlay.classList.add('open');
  }

  function hideConfirmModal() {
    withdrawTeamId = null;
    const overlay = document.getElementById('tm-confirm-overlay');
    if (overlay) overlay.classList.remove('open');
  }

  /* ────────────────────────────────────────────
     UTILS
  ──────────────────────────────────────────── */
  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function formatDate(iso) {
    if (!iso) return 'TBD';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function hashCode(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return h;
  }

  /* ────────────────────────────────────────────
     BIND DOM EVENTS
  ──────────────────────────────────────────── */
  function bindEvents() {
    const uploadBtn = document.getElementById('btnUploadAvatar');
    const fileInp = document.getElementById('inpAvatarFile');
    if (uploadBtn && fileInp) {
      uploadBtn.addEventListener('click', () => fileInp.click());
      fileInp.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) {
          if (file.size > 2 * 1024 * 1024) {
            alert('Image size should be less than 2MB');
            return;
          }
          const reader = new FileReader();
          reader.onload = function (evt) {
            tempAvatar = evt.target.result;
            const previewImg = document.getElementById('imgEditAvatarPreview');
            if (previewImg) {
              previewImg.src = tempAvatar;
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }

    document.getElementById('pfEditBtn')
      .addEventListener('click', openEditModal);

    document.getElementById('pfCancelBtn')
      .addEventListener('click', closeEditModal);

    document.getElementById('pfSaveBtn')
      .addEventListener('click', saveProfileFromModal);

    document.getElementById('pfAddSkillBtn')
      .addEventListener('click', addSkill);

    document.getElementById('inpSkill')
      .addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } });


    // Custom confirm modal event bindings
    const confirmOverlay = document.getElementById('tm-confirm-overlay');
    const confirmYes = document.getElementById('tm-confirm-yes');
    const confirmCancel = document.getElementById('tm-confirm-cancel');

    if (confirmCancel) {
      confirmCancel.addEventListener('click', hideConfirmModal);
    }
    if (confirmOverlay) {
      confirmOverlay.addEventListener('click', (e) => {
        if (e.target === confirmOverlay) hideConfirmModal();
      });
    }
    if (confirmYes) {
      confirmYes.addEventListener('click', () => {
        if (!withdrawTeamId) return;

        // Update localStorage applied state
        const currentUserEmail = (localStorage.getItem('currentUserEmail') || '').trim().toLowerCase();
        
        // Check static first
        let staticState = lsGet('hk_tm_v2_' + currentUserEmail, []);
        let foundStatic = false;
        const staticIndex = staticState.findIndex(x => String(x.id) === String(withdrawTeamId));
        if (staticIndex !== -1) {
          staticState[staticIndex].applied = false;
          lsSet('hk_tm_v2_' + currentUserEmail, staticState);
          foundStatic = true;
        }

        // Check userTeams
        if (!foundStatic) {
          const userTeams = lsGet('hk_user_teams', []);
          const t = userTeams.find(x => String(x.id) === String(withdrawTeamId));
          if (t && t.applications) {
            const app = t.applications.find(a => (a.email || '').trim().toLowerCase() === currentUserEmail);
            if (app) {
              if (app.status === 'approve') {
                // If it was approved, remove from t.members
                if (t.members) {
                  t.members = t.members.filter(m => !(m.r === app.role && m.n === app.name));
                }
                // Re-open the role
                if (t.roles) {
                  const role = t.roles.find(r => r.n === app.role);
                  if (role) {
                    if (role.qty !== undefined) role.qty++;
                    role.o = true;
                  }
                }
              }
              // Filter out the application
              t.applications = t.applications.filter(a => (a.email || '').trim().toLowerCase() !== currentUserEmail);
            }
            lsSet('hk_user_teams', userTeams);
          }
        }

        // Remove from hk_applications
        const allApps = lsGet('hk_applications', []);
        const newApps = allApps.filter(a => !((a.applicantId || '').trim().toLowerCase() === currentUserEmail && String(a.teamId) === String(withdrawTeamId)));
        lsSet('hk_applications', newApps);

        // Close modal
        hideConfirmModal();

        // Refresh stats and applied list dynamically
        renderStats();
        renderApplied();
      });
    }

    const upgradeBtn = document.getElementById('pfUpgradeBtn');
    if (upgradeBtn) {
      upgradeBtn.addEventListener('click', () => {
        const email = (localStorage.getItem('currentUserEmail') || '').trim().toLowerCase();
        if (email) {
          const profiles = lsGet('hk_profiles', {});
          if (profiles[email]) {
            const current = profiles[email].membership || 'free';
            if (current === 'free') {
              window.location.href = '/upgrade?reason=profile_upgrade&redirect=' + encodeURIComponent(window.location.href);
            } else {
              if (confirm("Would you like to downgrade to Free for testing?")) {
                profiles[email].membership = 'free';
                lsSet('hk_profiles', profiles);
                
                profile.membership = 'free';
                lsSet('hk_profile', profile);
                
                renderProfile();
                
                if (window.HackToast && window.HackToast.show) {
                  window.HackToast.show("Successfully downgraded to Free tier!", "success");
                }
              }
            }
          }
        }
      });
    }
  }

  /* ────────────────────────────────────────────
     INIT
  ──────────────────────────────────────────── */
  function init() {
    if (localStorage.getItem('isLoggedIn') !== 'true') {
      window.location.replace('/signup?mode=login&redirect=' + encodeURIComponent(window.location.href));
      return;
    }
    approvals = lsGet('hk_approvals', {});
    loadProfile();
    renderProfile();
    renderStats();
    renderRegistered();
    renderApplied();
    renderCreated();
    bindEvents();

    window.addEventListener('teamCreated', () => {
      renderStats();
      renderRegistered();
      renderCreated();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ── TAB NAVIGATION ── */
  function switchTab(tabId) {
    // Hide all sections
    document.querySelectorAll('.pf-section-card').forEach(el => {
      el.style.display = 'none';
      el.classList.remove('active');
    });
    // Remove active from all tabs
    document.querySelectorAll('.pf-tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    // Show target section
    const target = document.getElementById(tabId);
    if (target) {
      target.style.display = 'block';
      setTimeout(() => target.classList.add('active'), 10);
    }
    
    // Activate clicked tab button
    const btn = document.querySelector(`.pf-tab-btn[onclick="Profile.switchTab('${tabId}')"]`);
    if (btn) btn.classList.add('active');
    
    // No global panels to hide anymore
  }

  /* ── PUBLIC API (called from inline onclick) ── */
  window.Profile = {
    decide,
    reject,
    _removeSkill: removeSkill,
    switchTab
  };

})();