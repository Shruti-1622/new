window.HackModals = (function() {
  let currentStep = 1;
  let activeHackathon = null;
  let resumeRegId = null;

  function closeModal(id) { document.getElementById(id).classList.remove('open'); }

  function openLogin() {
    closeAllModals();
    let c = document.getElementById('auth-modal-overlay');
    if(!c) { c = document.createElement('div'); c.id = 'auth-modal-overlay'; c.className = 'modal-overlay'; document.body.appendChild(c); }
    c.innerHTML = `
      <div class="modal-box">
        <button class="modal-close" onclick="HackModals.closeModal('auth-modal-overlay')">✕</button>
        <div class="modal-header"><h2>Welcome Back</h2><p>Sign in to HackVerse to continue</p></div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">Email</label><input type="email" id="l-email" class="form-input"></div>
          <div class="form-group"><label class="form-label">Password</label><input type="password" id="l-pass" class="form-input"></div>
          <button class="form-btn" id="l-btn" onclick="HackModals.doLogin()">Login</button>
          <div class="form-link-text">Don't have an account? <button onclick="HackModals.openSignup()">Sign up</button></div>
        </div>
      </div>`;
    c.classList.add('open');
  }

  function doLogin() {
    const email = document.getElementById('l-email').value.trim().toLowerCase();
    const btn = document.getElementById('l-btn');
    if(!email || !email.includes('@')) { window.HackToast.show('Enter a valid email', 'error'); return; }
    
    btn.innerHTML = `<div class="btn-spinner"></div>`; btn.disabled = true;
    setTimeout(() => {
      window.HackState.setUser({ name: email.split('@')[0], email });
      if(window.Auth) window.Auth.updateNav();
      closeModal('auth-modal-overlay');
      window.HackToast.show(`Welcome back, ${email.split('@')[0]}!`, 'success');
      if(resumeRegId) { openReg(resumeRegId); resumeRegId = null; }
    }, 1000);
  }

  function openSignup() {
    closeAllModals();
    let c = document.getElementById('signup-modal-overlay');
    if(!c) { c = document.createElement('div'); c.id = 'signup-modal-overlay'; c.className = 'modal-overlay'; document.body.appendChild(c); }
    c.innerHTML = `
      <div class="modal-box">
        <button class="modal-close" onclick="HackModals.closeModal('signup-modal-overlay')">✕</button>
        <div class="modal-header"><h2>Create Account</h2><p>Join HackVerse</p></div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group"><label class="form-label">First Name <span class="required">*</span></label><input type="text" id="s-first" class="form-input"></div>
            <div class="form-group"><label class="form-label">Last Name <span class="required">*</span></label><input type="text" id="s-last" class="form-input"></div>
          </div>
          <div class="form-group"><label class="form-label">Email <span class="required">*</span></label><input type="email" id="s-email" class="form-input"></div>
          <div class="form-group">
            <label class="form-label">Password <span class="required">*</span></label>
            <input type="password" id="s-pass" class="form-input" oninput="HackModals.checkStrength(this.value)">
            <div class="password-strength">
              <div class="strength-bar"><div id="s-str-fill" class="strength-fill"></div></div>
              <div id="s-str-txt" class="strength-text" style="color:var(--muted)">Password strength</div>
            </div>
          </div>
          <div class="form-group"><label class="form-label">Confirm Password <span class="required">*</span></label><input type="password" id="s-pass2" class="form-input"></div>
          <div class="form-group"><label class="form-label">Primary Role <span class="required">*</span></label><select id="s-role" class="form-select"><option value="">Select a role</option><option value="Frontend">Frontend Dev</option><option value="Backend">Backend Dev</option><option value="Design">UI/UX Designer</option></select></div>
          <label class="form-checkbox" style="margin-bottom:16px;"><input type="checkbox" id="s-terms"> <span class="form-checkbox-label">I agree to Terms of Service</span></label>
          <button class="form-btn" id="s-btn" onclick="HackModals.doSignup()">Create Account</button>
          <div class="form-link-text">Already have an account? <button onclick="HackModals.openLogin()">Log in</button></div>
        </div>
      </div>`;
    c.classList.add('open');
  }

  function checkStrength(v) {
    const f = document.getElementById('s-str-fill');
    const t = document.getElementById('s-str-txt');
    if(!v) { f.style.width='0'; t.textContent=''; return; }
    let s=0; if(v.length>=8)s++; if(/[A-Z]/.test(v))s++; if(/[0-9]/.test(v))s++; if(/[^A-Za-z0-9]/.test(v))s++;
    if(s<=1) { f.style.width='25%'; f.style.background='#ef4444'; t.textContent='Weak'; t.style.color='#ef4444'; }
    else if(s===2) { f.style.width='50%'; f.style.background='#f59e0b'; t.textContent='Fair'; t.style.color='#f59e0b'; }
    else if(s===3) { f.style.width='75%'; f.style.background='#10b981'; t.textContent='Good'; t.style.color='#10b981'; }
    else { f.style.width='100%'; f.style.background='#10b981'; t.textContent='Strong'; t.style.color='#10b981'; }
  }

  function doSignup() {
    const email = document.getElementById('s-email').value.trim().toLowerCase();
    const pass = document.getElementById('s-pass').value;
    const term = document.getElementById('s-terms').checked;
    if(!email || !pass || !term) { window.HackToast.show('Please fill required fields', 'error'); return; }
    const btn = document.getElementById('s-btn');
    btn.innerHTML = `<div class="btn-spinner"></div>`; btn.disabled = true;
    setTimeout(() => {
      window.HackState.setUser({ name: document.getElementById('s-first').value, email });
      if(window.Auth) window.Auth.updateNav();
      closeModal('signup-modal-overlay');
      window.HackToast.show('Account created! Welcome to HackVerse 🎉', 'success');
      if(resumeRegId) { openReg(resumeRegId); resumeRegId = null; }
    }, 1200);
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
  }

  // --- REGISTRATION WIZARD ---
  function openReg(id) {
    if(!window.HackState.isLoggedIn()) { resumeRegId = id; window.HackToast.show('Please login to register', 'info'); openLogin(); return; }
    if(window.HackState.isReg(id)) { window.HackToast.show("You're already registered for this hackathon!", 'info'); return; }
    
    activeHackathon = window.HackState.getH(id);
    if(!activeHackathon) return;
    if(activeHackathon.registeredCount >= activeHackathon.totalSlots) { window.HackToast.show("This hackathon is full. Join the waitlist.", 'error'); return; }

    currentStep = 1;
    let c = document.getElementById('reg-modal-overlay');
    if(!c) { c = document.createElement('div'); c.id = 'reg-modal-overlay'; c.className = 'modal-overlay'; document.body.appendChild(c); }
    
    c.innerHTML = `
      <div class="modal-box">
        <button class="modal-close" onclick="HackModals.closeModal('reg-modal-overlay')">✕</button>
        <div class="step-indicator">
          <div class="step-dot active" id="dot1">1</div><div class="step-line" id="lin1"></div>
          <div class="step-dot" id="dot2">2</div><div class="step-line" id="lin2"></div>
          <div class="step-dot" id="dot3">3</div>
        </div>
        <div class="modal-body" id="wizard-body"></div>
      </div>`;
    c.classList.add('open');
    renderStep();
  }

  function renderStep() {
    const wb = document.getElementById('wizard-body');
    const u = window.HackState.getUser() || {};
    
    // Update dots
    for(let i=1; i<=3; i++) {
      const d = document.getElementById('dot'+i);
      const l = document.getElementById('lin'+i);
      if(d) {
        d.className = `step-dot ${i<currentStep?'completed':(i===currentStep?'active':'')}`;
        if(i<currentStep) d.innerHTML = '✓'; else d.innerHTML = i;
      }
      if(l) l.className = `step-line ${i<currentStep?'completed':''}`;
    }

    if(currentStep === 1) {
      wb.innerHTML = `
        <h2 style="color:#fff; margin-bottom:20px; font-family:var(--font-display); font-size:1.6rem;">Your Details</h2>
        <div class="form-group"><label class="form-label">Full Name <span class="required">*</span></label><input type="text" id="r-name" class="form-input" value="${u.name||''}"></div>
        <div class="form-group"><label class="form-label">Email <span class="required">*</span></label><input type="email" id="r-email" class="form-input" value="${u.email||''}" readonly></div>
        <div class="form-group"><label class="form-label">GitHub URL <span class="required">*</span></label><input type="url" id="r-gh" class="form-input" placeholder="https://github.com/..."></div>
        <div class="form-group"><label class="form-label">Experience <span class="required">*</span></label><select id="r-exp" class="form-select"><option value="">Select experience</option><option value="student">Student</option><option value="beg">Beginner (0-1 yr)</option><option value="int">Intermediate (1-3 yrs)</option></select></div>
        <div class="form-group"><label class="form-label">Skills <span class="required">*</span></label>
          <div class="skills-container" id="r-skills">
            ${['React','Node.js','Python','ML/AI','AWS','Figma','Docker'].map(s => `<div class="skill-chip" onclick="this.classList.toggle('selected')">${s}</div>`).join('')}
          </div>
        </div>
        <button class="form-btn" onclick="HackModals.nextStep(1)">Continue →</button>
      `;
    } 
    else if(currentStep === 2) {
      const isReq = activeHackathon.teamRequired;
      let pBox = '';
      if(isReq) pBox = `<div class="policy-box warning">⚠️ This hackathon requires a team of ${activeHackathon.minTeam}–${activeHackathon.maxTeam} members. You can register solo and form your team before ${activeHackathon.teamFormationDeadline.split('T')[0]}.</div>`;
      else pBox = `<div class="policy-box info">ℹ️ Solo participation is allowed. You may optionally form a team of up to ${activeHackathon.maxTeam} members.</div>`;

      wb.innerHTML = `
        <h2 style="color:#fff; margin-bottom:20px; font-family:var(--font-display); font-size:1.6rem;">Team Preference</h2>
        ${pBox}
        <div class="form-group">
          <label class="form-label">Preference <span class="required">*</span></label>
          <select id="r-team" class="form-select" onchange="document.getElementById('t-name-wrap').style.display=this.value==='have_team'?'block':'none'">
            <option value="">Select option</option>
            ${!isReq ? '<option value="solo">I\'ll participate solo</option>' : ''}
            <option value="have_team">I already have a team</option>
            <option value="find_team">I want to find a team after registering</option>
          </select>
        </div>
        <div id="t-name-wrap" style="display:none;">
          <div class="form-group"><label class="form-label">Team Name <span class="required">*</span></label><input type="text" id="r-tname" class="form-input"></div>
          <div class="form-group"><label class="form-label">Teammate Emails <span style="color:var(--muted); font-size:0.75rem; font-weight:normal;">(comma separated, up to ${activeHackathon.maxTeam - 1})</span></label><input type="text" id="r-temails" class="form-input" placeholder="alice@example.com, bob@example.com"></div>
        </div>
        <button class="form-btn" onclick="HackModals.nextStep(2)">Continue →</button>
      `;
    }
    else if(currentStep === 3) {
      const uEmail = (window.HackState.getUser() || {}).email || 'your email';
      const pref = activeHackathon._tmpPref || 'solo';
      let extraMsg = '';
      let btnHtml = `<button class="form-btn" onclick="HackModals.closeModal('reg-modal-overlay')">Go to Dashboard →</button>`;
      
      if(pref === 'have_team' && activeHackathon._tmpEmailsCount > 0) {
        extraMsg = `<div class="success-checklist-item"><span class="check">✓</span> Invitations sent to ${activeHackathon._tmpEmailsCount} teammate(s)</div>`;
      } else if (pref === 'find_team') {
        extraMsg = `<div class="success-checklist-item"><span class="check" style="color:#f59e0b">ℹ️</span> Looking for teammates</div>`;
        btnHtml = `<button class="form-btn" onclick="window.location.href='teamfinder.html'">Go to Team Finder →</button>`;
      }

      wb.innerHTML = `
        <div class="success-content">
          <span class="success-emoji">🎉</span>
          <h2 class="success-heading">You're registered!</h2>
          <p style="color:var(--muted); margin-bottom:24px;">Confirmation sent to ${uEmail}</p>
          <div class="success-checklist">
            <div class="success-checklist-item"><span class="check">✓</span> Check your email for confirmation</div>
            <div class="success-checklist-item"><span class="check">✓</span> Mark your calendar for ${activeHackathon.startDate}</div>
            ${extraMsg}
          </div>
          <div class="success-buttons">
            ${btnHtml}
          </div>
        </div>
      `;
      // Save reg
      window.HackState.addReg({ hackathonId: activeHackathon.id, status: 'confirmed' });
      activeHackathon.registeredCount++; // Optimistic UI update
      window.HackToast.show('🎉 Registered successfully!', 'success');
      window.HackDetail.render(activeHackathon); // Refresh detail sidebar
      
      // Instantly update carousel and grid cards
      document.querySelectorAll(`[data-explore-id="${activeHackathon.id}"]`).forEach(btn => {
        btn.classList.add('registered');
        btn.textContent = '✓ Registered';
      });
    }
  }

  function nextStep(s) {
    if(s === 1) {
      const gh = document.getElementById('r-gh').value;
      const exp = document.getElementById('r-exp').value;
      const sk = document.querySelectorAll('#r-skills .selected');
      if(!gh.includes('github.com')) { window.HackToast.show('Valid GitHub URL required', 'error'); return; }
      if(!exp || sk.length === 0) { window.HackToast.show('Please fill all required fields', 'error'); return; }
    }
    if(s === 2) {
      const tp = document.getElementById('r-team').value;
      if(!tp) { window.HackToast.show('Select team preference', 'error'); return; }
      activeHackathon._tmpPref = tp;
      if(tp === 'have_team') {
        if(!document.getElementById('r-tname').value) { window.HackToast.show('Enter team name', 'error'); return; }
        const emails = document.getElementById('r-temails').value.split(',').map(e=>e.trim()).filter(Boolean);
        if(emails.length > activeHackathon.maxTeam - 1) { window.HackToast.show(`Max ${activeHackathon.maxTeam - 1} teammates allowed`, 'error'); return; }
        activeHackathon._tmpEmailsCount = emails.length;
      }
    }
    currentStep++;
    renderStep();
  }

  return { openLogin, doLogin, openSignup, doSignup, checkStrength, closeModal, openReg, nextStep };
})();
