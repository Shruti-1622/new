function parseRows(block) {
  const cfg = {};
  [...block.querySelectorAll(':scope > div')].forEach((row) => {
    const cols = [...row.querySelectorAll(':scope > div')];
    if (cols.length < 2) return;
    const key = cols[0].textContent.trim().toLowerCase().replace(/\s+/g, '-');
    const img = cols[1].querySelector('img');
    const link = cols[1].querySelector('a');
    if (img) {
      cfg[key] = img.src;
    } else if (link && link.href) {
      cfg[key] = link.href;
    } else {
      cfg[key] = cols[1].textContent.trim();
    }
  });
  return cfg;
}

function buildOptions(csv, placeholder) {
  const opts = (csv || '').split(',').map((s) => s.trim()).filter(Boolean);
  return `<option value="" disabled selected>${placeholder}</option>${opts.map((o) => `<option value="${o}">${o}</option>`).join('')}`;
}

const AVATARS = [
  '/assets/avatar/a1.webp', '/assets/avatar/a2.webp', '/assets/avatar/a3.webp',
  '/assets/avatar/a4.webp', '/assets/avatar/a5.webp', '/assets/avatar/a6.webp',
  '/assets/avatar/a7.webp', '/assets/avatar/a8.webp', '/assets/avatar/a9.webp',
  '/assets/avatar/a10.webp', '/assets/avatar/a11.webp',
];

function randomAvatar() {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}

function showToast(container, msg, type = 'error') {
  const t = document.createElement('div');
  t.className = `af-toast-item ${type}`;
  t.textContent = msg;
  container.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, 4000);
}

function getProfiles() {
  try { return JSON.parse(localStorage.getItem('hk_profiles') || '{}'); } catch { return {}; }
}

// ── SVG icon strings ──────────────────────────────────────────────────────────
const ICON = {
  email: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  lock: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  shield: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  github: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>',
  linkedin: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/><path d="M10 21v-8M10 13a4 4 0 0 1 8 0v8"/></svg>',
  eyeOff: '<svg class="af-eye-off" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
  eye: '<svg class="af-eye" style="display:none" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
};

function pwToggle(targetId) {
  return `<button type="button" class="af-pw-toggle" data-target="${targetId}" aria-label="Toggle password visibility">${ICON.eyeOff}${ICON.eye}</button>`;
}

export default function decorate(block) {
  if (localStorage.getItem('isLoggedIn') === 'true') {
    window.location.replace('/');
    return;
  }

  // Immediately hide header/footer so there's no flash
  const pageStyle = document.createElement('style');
  pageStyle.textContent = 'header,footer{display:none!important}';
  document.head.appendChild(pageStyle);
  document.body.classList.add('auth-page');

  const cfg = parseRows(block);
  const params = new URLSearchParams(window.location.search);
  const initMode = params.get('mode') === 'login' ? 'login' : 'signup';
  const redirect = params.get('redirect') ? decodeURIComponent(params.get('redirect')) : '/';
  const ph = (key, fb) => cfg[key] || fb;

  block.innerHTML = `
    <div class="af-container">

      <!-- ── LEFT VISUAL PANEL ── -->
      <div class="af-visual">
        <div class="af-visual-bg"${cfg['hero-image'] ? ` style="background-image:url('${cfg['hero-image']}')"` : ''}></div>
        <a href="/" class="af-logo-link" aria-label="HackHub Home">
          ${cfg['logo-image'] ? `<img src="${cfg['logo-image']}" alt="logo" class="af-logo-img">` : ''}
          <span class="af-logo-text">${cfg['logo-text'] || 'HackHub'}</span>
        </a>
        <div class="af-visual-overlay"></div>
        <div class="af-visual-content">
          <h1 class="af-visual-title">${cfg['visual-title'] || 'Build Your Vision'}</h1>
          <p class="af-visual-sub">${cfg['visual-subtitle'] || 'Discover hackathons, find your team, and ship something great.'}</p>
        </div>
      </div>

      <!-- ── RIGHT FORM PANEL ── -->
      <div class="af-right">
        <div class="af-form-wrap">

          <div class="af-tabs-control">
            <div class="af-tab-slider"></div>
            <button type="button" class="af-tab-btn" id="af-tab-signup">Sign Up</button>
            <button type="button" class="af-tab-btn" id="af-tab-login">Log In</button>
          </div>

          <!-- SIGN UP -->
          <div class="af-panel" id="af-panel-signup">
            <h2 class="af-form-title">${cfg['signup-title'] || 'Create An Account'}</h2>
            <form id="af-signup-form" novalidate>
              <div class="af-row">
                <div class="af-field">
                  <input type="text" id="af-firstname" placeholder="${ph('ph-firstname', 'First Name')}" autocomplete="given-name">
                </div>
                <div class="af-field">
                  <input type="text" id="af-lastname" placeholder="${ph('ph-lastname', 'Last Name')}" autocomplete="family-name">
                </div>
              </div>
              <div class="af-field af-icon-field">
                <span class="af-field-icon">${ICON.email}</span>
                <input type="email" id="af-email" placeholder="${ph('ph-email', 'Enter Your Email')}" autocomplete="email">
              </div>
              <div class="af-row">
                <div class="af-field">
                  <select id="af-role">${buildOptions(cfg['role-options'], ph('ph-role', 'Primary Role'))}</select>
                </div>
                <div class="af-field">
                  <select id="af-experience">${buildOptions(cfg['experience-options'], ph('ph-experience', 'Experience'))}</select>
                </div>
              </div>
              <div class="af-field af-icon-field">
                <span class="af-field-icon">${ICON.github}</span>
                <input type="url" id="af-github" placeholder="${ph('ph-github', 'GitHub URL (Optional)')}">
              </div>
              <div class="af-field af-icon-field">
                <span class="af-field-icon">${ICON.linkedin}</span>
                <input type="url" id="af-linkedin" placeholder="${ph('ph-linkedin', 'LinkedIn URL (Optional)')}">
              </div>
              <div class="af-field">
                <input type="text" id="af-skills" placeholder="${ph('ph-skills', 'Skills & Tools (e.g. React, Node.js, Figma)')}">
              </div>
              <div class="af-field af-icon-field af-pw-field">
                <span class="af-field-icon">${ICON.lock}</span>
                <input type="password" id="af-password" placeholder="${ph('ph-password', 'Password')}" autocomplete="new-password">
                ${pwToggle('af-password')}
              </div>
              <div class="af-pw-strength">
                <div class="af-pw-bars">
                  <div class="af-pw-bar"></div>
                  <div class="af-pw-bar"></div>
                  <div class="af-pw-bar"></div>
                </div>
                <span class="af-pw-text">Password strength</span>
              </div>
              <div class="af-field af-icon-field af-pw-field">
                <span class="af-field-icon">${ICON.shield}</span>
                <input type="password" id="af-confirm" placeholder="${ph('ph-confirm', 'Confirm Password')}" autocomplete="new-password">
                ${pwToggle('af-confirm')}
              </div>
              <button type="submit" class="af-submit-btn">${cfg['signup-btn'] || 'Create an Account'}</button>
            </form>
          </div>

          <!-- LOG IN -->
          <div class="af-panel" id="af-panel-login">
            <h2 class="af-form-title">${cfg['login-title'] || 'Welcome Back'}</h2>
            <form id="af-login-form" novalidate>
              <div class="af-field af-icon-field">
                <span class="af-field-icon">${ICON.email}</span>
                <input type="email" id="af-login-email" placeholder="${ph('ph-email', 'Enter Your Email')}" autocomplete="email">
              </div>
              <div class="af-field af-icon-field af-pw-field">
                <span class="af-field-icon">${ICON.lock}</span>
                <input type="password" id="af-login-password" placeholder="${ph('ph-password', 'Password')}" autocomplete="current-password">
                ${pwToggle('af-login-password')}
              </div>
              <button type="submit" class="af-submit-btn">${cfg['login-btn'] || 'Log In'}</button>
            </form>
          </div>

        </div>
      </div>
    </div>
    <div id="af-toast-container"></div>`;

  const toast = block.querySelector('#af-toast-container');

  // ── Tab switching ────────────────────────────────────────────────────────────
  const slider = block.querySelector('.af-tab-slider');

  function switchTab(mode) {
    const su = mode === 'signup';
    block.querySelector('#af-tab-signup').classList.toggle('active', su);
    block.querySelector('#af-tab-login').classList.toggle('active', !su);
    block.querySelector('#af-panel-signup').classList.toggle('active', su);
    block.querySelector('#af-panel-login').classList.toggle('active', !su);
    if (slider) slider.style.transform = su ? 'translateX(0)' : 'translateX(100%)';
  }

  switchTab(initMode);
  block.querySelector('#af-tab-signup').addEventListener('click', () => switchTab('signup'));
  block.querySelector('#af-tab-login').addEventListener('click', () => switchTab('login'));

  // ── Password toggles ─────────────────────────────────────────────────────────
  block.querySelectorAll('.af-pw-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = block.querySelector(`#${btn.dataset.target}`);
      if (!input) return;
      const isPass = input.type === 'password';
      input.type = isPass ? 'text' : 'password';
      btn.querySelector('.af-eye-off').style.display = isPass ? 'none' : '';
      btn.querySelector('.af-eye').style.display = isPass ? '' : 'none';
    });
  });

  // ── Password strength ────────────────────────────────────────────────────────
  const pwInput = block.querySelector('#af-password');
  const pwBars = block.querySelectorAll('.af-pw-bar');
  const pwText = block.querySelector('.af-pw-text');
  if (pwInput) {
    pwInput.addEventListener('input', () => {
      const { value: val } = pwInput;
      let score = 0;
      if (val.length >= 6) score = 1;
      if (val.length >= 6 && /[0-9!@#$%^&*]/.test(val)) score = 2;
      if (val.length >= 8 && /[A-Z]/.test(val) && /[0-9]/.test(val) && /[!@#$%^&*]/.test(val)) score = 3;
      const colors = ['', '#ef4444', '#f59e0b', '#10b981'];
      pwBars.forEach((bar, i) => { bar.style.backgroundColor = i < score ? colors[score] : 'rgba(255,255,255,0.07)'; });
      if (pwText) {
        const lbls = ['Password strength', 'Weak password', 'Medium password', 'Strong password'];
        const clrs = ['#808080', '#ef4444', '#f59e0b', '#10b981'];
        pwText.textContent = val.length === 0 ? lbls[0] : lbls[score];
        pwText.style.color = val.length === 0 ? clrs[0] : clrs[score];
      }
    });
  }

  // ── Sign up ──────────────────────────────────────────────────────────────────
  block.querySelector('#af-signup-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const firstname = block.querySelector('#af-firstname').value.trim();
    const lastname = block.querySelector('#af-lastname').value.trim();
    const email = block.querySelector('#af-email').value.trim().toLowerCase();
    const password = block.querySelector('#af-password').value;
    const confirm = block.querySelector('#af-confirm').value;
    const role = block.querySelector('#af-role').value;
    const experience = block.querySelector('#af-experience').value;
    const github = block.querySelector('#af-github').value.trim();
    const linkedin = block.querySelector('#af-linkedin').value.trim();
    const skillsRaw = block.querySelector('#af-skills').value.trim();

    if (!firstname || !lastname) { showToast(toast, cfg['err-name'] || 'Please enter both first and last name.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast(toast, cfg['err-email'] || 'Please enter a valid email address.'); return; }
    if (!role || !experience) { showToast(toast, cfg['err-role'] || 'Please select your role and experience.'); return; }
    if (password.length < 6) { showToast(toast, cfg['err-pw-length'] || 'Password must be at least 6 characters.'); return; }
    if (password !== confirm) { showToast(toast, cfg['err-pw-match'] || 'Passwords do not match.'); return; }

    const profiles = getProfiles();
    if (profiles[email]) { showToast(toast, cfg['err-exists'] || 'User already exists. Please log in.'); return; }

    const name = `${firstname} ${lastname}`;
    const skills = skillsRaw.split(',').map((s) => s.trim()).filter(Boolean);
    const avatar = randomAvatar();
    const profile = {
      name, email, role, experience, github, linkedin, skills, avatar, password, membership: 'free',
    };
    profiles[email] = profile;
    localStorage.setItem('hk_profiles', JSON.stringify(profiles));
    localStorage.setItem('hk_profile', JSON.stringify(profile));
    localStorage.setItem('hackhub_user', JSON.stringify({ name, email }));
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('currentUserEmail', email);
    if (!localStorage.getItem('hk_notifications')) localStorage.setItem('hk_notifications', '[]');
    if (!localStorage.getItem('hk_user_teams')) localStorage.setItem('hk_user_teams', '[]');

    showToast(toast, cfg['success-signup'] || 'Account created! Redirecting...', 'success');
    setTimeout(() => { window.location.href = redirect; }, 1200);
  });

  // ── Log in ───────────────────────────────────────────────────────────────────
  block.querySelector('#af-login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = block.querySelector('#af-login-email').value.trim().toLowerCase();
    const password = block.querySelector('#af-login-password').value;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast(toast, cfg['err-email'] || 'Please enter a valid email address.'); return; }
    const profiles = getProfiles();
    const p = profiles[email];
    if (!p) { showToast(toast, cfg['err-not-found'] || 'Account not found. Please sign up.'); return; }
    if (p.password && p.password !== password) { showToast(toast, cfg['err-password'] || 'Invalid password.'); return; }

    localStorage.setItem('hk_profile', JSON.stringify(p));
    localStorage.setItem('hackhub_user', JSON.stringify({ name: p.name, email }));
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('currentUserEmail', email);

    showToast(toast, cfg['success-login'] || 'Logged in! Redirecting...', 'success');
    setTimeout(() => { window.location.href = redirect; }, 1200);
  });
}
