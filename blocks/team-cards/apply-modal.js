export function initApplyModal({ getTeams, onSuccess, onStaticSave }) {
  let currentApplyTeamId = null;
  let currentApplyBtn = null;

  const html = `
    <div class="tm-apply-overlay" id="tm-apply-overlay">
      <div class="tm-apply-box">
        <button class="tm-apply-close" id="tm-apply-close-btn" type="button" aria-label="Close">✕</button>
        <div class="tm-apply-header">
          <h2 id="tm-apply-title">Apply to Join</h2>
          <p id="tm-apply-sub">Complete your application</p>
        </div>
        <div class="tm-apply-body">
          <div class="tm-apply-field">
            <label class="tm-apply-label">Role Applying For *</label>
            <select class="tm-apply-input" id="tm-apply-role"></select>
          </div>
          <div class="tm-apply-field">
            <label class="tm-apply-label">Key Skills *</label>
            <input class="tm-apply-input" id="tm-apply-skills" type="text" placeholder="e.g. React, Node.js, Figma">
          </div>
          <div class="tm-apply-field">
            <label class="tm-apply-label">Portfolio / GitHub Link *</label>
            <input class="tm-apply-input" id="tm-apply-portfolio" type="text" placeholder="e.g. github.com/username">
            <div class="tm-apply-error" id="tm-apply-error-url" style="display:none;color:#ef4444;font-size:12px;margin-top:4px;">Please enter a valid URL</div>
          </div>
          <div class="tm-apply-field">
            <label class="tm-apply-label">Message (Optional)</label>
            <textarea class="tm-apply-textarea" id="tm-apply-msg" placeholder="Why are you a good fit for this team?"></textarea>
          </div>
        </div>
        <div class="tm-apply-footer">
          <button class="tm-apply-btn-cancel" id="tm-apply-cancel-btn" type="button">Cancel</button>
          <button class="tm-apply-btn-submit" id="tm-apply-submit" type="button">Submit Application</button>
        </div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  document.getElementById('tm-apply-close-btn').addEventListener('click', closeApply);
  document.getElementById('tm-apply-cancel-btn').addEventListener('click', closeApply);
  document.getElementById('tm-apply-submit').addEventListener('click', submitApplication);

  function closeApply() {
    document.getElementById('tm-apply-overlay').classList.remove('open');
    currentApplyTeamId = null;
    currentApplyBtn = null;
  }

  function openApply(teamId, btn) {
    const email = (localStorage.getItem('currentUserEmail') || 'test@hackhub.dev').trim().toLowerCase();
    // TODO: restore auth gate — if (!email) { alert('Please log in to apply.'); return; }

    const TEAMS = getTeams();
    const t = TEAMS.find((x) => String(x.id) === String(teamId));
    if (!t) return;

    if ((t.creatorEmail || '').trim().toLowerCase() === email) {
      alert('You cannot apply to a team you created.');
      return;
    }

    const profiles = (() => { try { return JSON.parse(localStorage.getItem('hk_profiles') || '{}'); } catch { return {}; } })();
    const membership = (profiles[email] || {}).membership || 'free';
    if (membership === 'free') {
      const allApps = (() => { try { return JSON.parse(localStorage.getItem('hk_applications') || '[]'); } catch { return []; } })();
      const myActive = allApps.filter((a) => (a.applicantId || '').trim().toLowerCase() === email && a.status !== 'reject');
      if (myActive.length >= 3) {
        const msg = 'Free tier limit reached: You can apply to a maximum of 3 active teams. Redirecting to upgrade page…';
        if (window.HackToast?.show) window.HackToast.show(msg, 'error'); else alert(msg);
        setTimeout(() => { window.location.href = `/upgrade?reason=apply_limit&redirect=${encodeURIComponent(window.location.href)}`; }, 1200);
        return;
      }
    }

    currentApplyTeamId = teamId;
    currentApplyBtn = btn;

    document.getElementById('tm-apply-title').textContent = `Apply to ${t.team}`;
    const roleSelect = document.getElementById('tm-apply-role');
    roleSelect.innerHTML = t.roles.map((r) => `<option value="${r.n}">${r.n}</option>`).join('');
    document.getElementById('tm-apply-skills').value = '';
    document.getElementById('tm-apply-portfolio').value = '';
    document.getElementById('tm-apply-msg').value = '';
    document.getElementById('tm-apply-error-url').style.display = 'none';
    document.getElementById('tm-apply-overlay').classList.add('open');
  }

  function submitApplication() {
    const role = document.getElementById('tm-apply-role').value;
    const skills = document.getElementById('tm-apply-skills').value.trim();
    let portfolio = document.getElementById('tm-apply-portfolio').value.trim();
    const msg = document.getElementById('tm-apply-msg').value.trim();
    const errorUrl = document.getElementById('tm-apply-error-url');

    if (!skills || !portfolio) { alert('Please fill in the required fields: Skills and Portfolio.'); return; }

    if (!/^https?:\/\//i.test(portfolio)) portfolio = `https://${portfolio}`;
    try {
      // eslint-disable-next-line no-new
      new URL(portfolio);
      errorUrl.style.display = 'none';
    } catch {
      errorUrl.style.display = 'block';
      return;
    }

    const btnSubmit = document.getElementById('tm-apply-submit');
    btnSubmit.textContent = 'Submitting…';
    btnSubmit.disabled = true;

    setTimeout(() => {
      const TEAMS = getTeams();
      const t = TEAMS.find((x) => String(x.id) === String(currentApplyTeamId));
      if (t) {
        processApplyEnhanced(t, {
          role, skills, portfolio, msg,
        }, TEAMS);

        const savedBtn = currentApplyBtn;
        if (savedBtn) {
          const isDrawerBtn = savedBtn.id === 'tm-d-apply-btn';
          savedBtn.textContent = isDrawerBtn ? '✓ Applied — All the best!' : '✓ Applied';
          savedBtn.classList.add('applied');
        }
        onSuccess();
      }
      btnSubmit.textContent = 'Submit Application';
      btnSubmit.disabled = false;
      closeApply();
      if (window.HackToast?.show) window.HackToast.show('Application submitted successfully!', 'success');
      else alert('Application submitted successfully!');
    }, 600);
  }

  function processApplyEnhanced(t, appData, TEAMS) {
    const email = (localStorage.getItem('currentUserEmail') || '').trim().toLowerCase();
    t.applied = true;

    let allApps = (() => { try { return JSON.parse(localStorage.getItem('hk_applications') || '[]'); } catch { return []; } })();
    allApps = allApps.filter((a) => !((a.applicantId || '').trim().toLowerCase() === email && String(a.teamId) === String(t.id)));
    const newApp = {
      applicantId: email,
      teamId: t.id,
      role: appData.role,
      skills: appData.skills,
      portfolio: appData.portfolio,
      message: appData.msg,
      status: 'pending',
      appliedAt: new Date().toISOString(),
    };
    allApps.push(newApp);
    localStorage.setItem('hk_applications', JSON.stringify(allApps));

    if (t.userCreated) {
      try {
        const userTeams = JSON.parse(localStorage.getItem('hk_user_teams') || '[]');
        const ut = userTeams.find((x) => String(x.id) === String(t.id));
        if (ut) {
          if (!ut.applications) ut.applications = [];
          const profiles = (() => { try { return JSON.parse(localStorage.getItem('hk_profiles') || '{}'); } catch { return {}; } })();
          const p = profiles[email] || { email, name: email };
          ut.applications.push({
            email: p.email,
            name: p.name,
            role: appData.role,
            skills: appData.skills,
            portfolio: appData.portfolio,
            msg: appData.msg,
            avatar: p.avatar,
            status: 'pending',
            timestamp: newApp.appliedAt,
          });
          localStorage.setItem('hk_user_teams', JSON.stringify(userTeams));
        }
      } catch { /* */ }
    } else {
      onStaticSave(TEAMS);
    }

    if (window.Auth?.notify && t.creatorEmail && (t.creatorEmail || '').trim().toLowerCase() !== email) {
      const applicantName = email ? email.split('@')[0] : 'Someone';
      window.Auth.notify(t.creatorEmail, 'application_received', 'New Application!', `${applicantName} applied for the ${appData.role} role in your team ${t.team}.`);
    }
  }

  return { openApply, closeApply };
}
