const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/hackathon', label: 'Hackathons' },
  { href: '/teamfinder', label: 'Find Teams' },
  { href: '/gallery', label: 'Hall of Fame' },
  { href: '/hacklist', label: 'Hacklist' },
];

function isLoggedIn() {
  return localStorage.getItem('isLoggedIn') === 'true';
}

function getProfile() {
  try { return JSON.parse(localStorage.getItem('hk_profile') || 'null'); } catch { return null; }
}

function getAvatarHTML() {
  const p = getProfile();
  if (p?.avatar) return `<img src="${p.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;">`;
  if (p?.name) {
    const initials = p.name.split(' ').map((w) => w[0] || '').join('').toUpperCase().slice(0, 2);
    return `<span style="color:#c9a84c;font-family:'DM Sans',sans-serif;font-size:0.85rem;font-weight:700;">${initials}</span>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`;
}

function buildNav() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';

  const links = NAV_LINKS.map(({ href, label }) => {
    const active = path === href || (href !== '/' && path.startsWith(href));
    return `<li><a href="${href}"${active ? ' class="nav-active"' : ''}>${label}</a></li>`;
  }).join('');

  return `
    <nav class="nav" id="hh-nav">
      <a href="/" class="nav-logo" aria-label="HackHub Home">
        <span class="logo-bracket">{</span>HackHub<span class="logo-bracket">}</span>
      </a>
      <ul class="nav-links">${links}</ul>
      <div class="nav-right">
        <a href="/signup" id="auth-signup-btn" class="btn-primary nav-cta" style="display:none">Get Started</a>
        <div id="auth-controls-container" style="display:flex;align-items:center;gap:16px;">
          <div id="auth-notification-wrap" style="display:none;position:relative;">
            <button id="auth-notif-btn" aria-label="Notifications" style="width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;outline:none;transition:all 0.2s;">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span id="auth-notif-badge" style="display:none;position:absolute;top:-2px;right:-2px;background:#ef4444;color:#fff;font-size:10px;font-weight:bold;width:16px;height:16px;border-radius:50%;align-items:center;justify-content:center;border:2px solid #0f0f1a;">0</span>
            </button>
            <div id="auth-notif-dropdown" style="display:none;position:absolute;top:calc(100% + 12px);right:-50px;width:320px;max-height:400px;background:rgba(14,15,18,0.98);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.1);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,0.5);overflow-y:auto;z-index:9000;">
              <div style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.05);font-family:'DM Sans',sans-serif;font-weight:700;font-size:14px;color:#c9a84c;">Notifications</div>
              <div id="auth-notif-list" style="display:flex;flex-direction:column;"></div>
            </div>
          </div>
          <div id="auth-profile-wrap" style="display:none;position:relative;">
            <button id="auth-avatar-btn" aria-label="Profile menu" style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#1a1a2e 0%,#0f0f1a 100%);border:1.5px solid #c9a84c;box-shadow:0 0 10px rgba(201,168,76,0.25);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;outline:none;transition:box-shadow 0.2s,border-color 0.2s;flex-shrink:0;">
              ${getAvatarHTML()}
            </button>
            <div id="auth-dropdown" style="display:none;position:absolute;top:calc(100% + 12px);right:0;min-width:180px;background:rgba(14,15,18,0.96);backdrop-filter:blur(20px);border:1px solid rgba(217,164,65,0.25);border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,0.5);overflow:hidden;z-index:9000;">
              <style>
                #auth-dropdown a,#auth-dropdown button{display:flex!important;align-items:center!important;gap:.7rem!important;width:100%!important;padding:.8rem 1.2rem!important;background:none!important;border:none!important;border-radius:0!important;color:rgba(217,164,65,0.9)!important;font-family:'DM Sans',sans-serif!important;font-size:.83rem!important;font-weight:600!important;text-decoration:none!important;cursor:pointer!important;transition:background 0.15s,color 0.15s,padding-left 0.15s!important;text-align:left!important;box-sizing:border-box!important}
                #auth-dropdown a:hover,#auth-dropdown button:hover{background:rgba(217,164,65,0.12)!important;color:#fff!important;padding-left:1.5rem!important}
                #auth-dropdown .auth-dd-divider{height:1px;background:linear-gradient(90deg,transparent,rgba(217,164,65,0.25),transparent);margin:0!important}
                #auth-dropdown .auth-dd-logout{color:rgba(248,113,113,0.85)!important}
                #auth-dropdown .auth-dd-logout:hover{background:rgba(248,113,113,0.1)!important;color:#fca5a5!important}
              </style>
              <a href="/profile" id="auth-dd-profile">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                Profile
              </a>
              <div class="auth-dd-divider"></div>
              <button id="auth-dd-logout" class="auth-dd-logout">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Logout
              </button>
            </div>
          </div>
        </div>
        <button class="nav-hamburger" id="hh-hamburger" aria-label="Toggle menu">&#9776;</button>
      </div>
    </nav>`;
}

function updateAuthState(nav) {
  const signupBtn = nav.querySelector('#auth-signup-btn');
  const notifWrap = nav.querySelector('#auth-notification-wrap');
  const profileWrap = nav.querySelector('#auth-profile-wrap');
  const avatarBtn = nav.querySelector('#auth-avatar-btn');

  if (isLoggedIn()) {
    if (signupBtn) signupBtn.style.display = 'none';
    if (notifWrap) notifWrap.style.display = 'flex';
    if (profileWrap) profileWrap.style.display = 'flex';
    if (avatarBtn) avatarBtn.innerHTML = getAvatarHTML();
  } else {
    if (signupBtn) signupBtn.style.display = 'inline-flex';
    if (notifWrap) notifWrap.style.display = 'none';
    if (profileWrap) profileWrap.style.display = 'none';
  }
}

function wireEvents(nav) {
  const avatarBtn = nav.querySelector('#auth-avatar-btn');
  const authDropdown = nav.querySelector('#auth-dropdown');
  const notifBtn = nav.querySelector('#auth-notif-btn');
  const notifDropdown = nav.querySelector('#auth-notif-dropdown');
  const logoutBtn = nav.querySelector('#auth-dd-logout');
  const signupBtn = nav.querySelector('#auth-signup-btn');
  const hamburger = nav.querySelector('#hh-hamburger');
  const navLinks = nav.querySelector('.nav-links');

  avatarBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = authDropdown.style.display === 'block';
    authDropdown.style.display = open ? 'none' : 'block';
    if (notifDropdown) notifDropdown.style.display = 'none';
  });

  notifBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = notifDropdown.style.display === 'block';
    notifDropdown.style.display = open ? 'none' : 'block';
    if (authDropdown) authDropdown.style.display = 'none';
  });

  logoutBtn?.addEventListener('click', () => {
    ['isLoggedIn', 'currentUserEmail', 'hk_profile', 'hk_notifications'].forEach((k) => localStorage.removeItem(k));
    if (window.location.pathname.includes('/profile')) {
      window.location.replace('/');
    } else {
      window.location.reload();
    }
  });

  signupBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = `/signup?mode=signup&redirect=${encodeURIComponent(window.location.href)}`;
  });

  hamburger?.addEventListener('click', () => navLinks?.classList.toggle('open'));

  document.addEventListener('click', () => {
    if (authDropdown) authDropdown.style.display = 'none';
    if (notifDropdown) notifDropdown.style.display = 'none';
  });
}

export default function decorate(block) {
  block.innerHTML = buildNav();
  const nav = block.querySelector('#hh-nav');
  updateAuthState(nav);
  wireEvents(nav);

  // If auth.js ran from a page template, re-sync its nav state now that elements exist
  if (window.Auth?.updateNav) window.Auth.updateNav();
}
