const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/hackathon', label: 'Hackathons' },
  { href: '/find-teams', label: 'Find Teams' },
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

// ── Notification helpers ──────────────────────────────────────────────────────
function getEmail() {
  return (localStorage.getItem('currentUserEmail') || '').trim().toLowerCase();
}

function readNotifs() {
  try { return JSON.parse(localStorage.getItem('hk_notifications') || '[]'); } catch { return []; }
}

function saveNotifs(notifs) {
  try { localStorage.setItem('hk_notifications', JSON.stringify(notifs)); } catch { /* */ }
}

function relativeTime(ts) {
  const diff = Date.now() - (ts || 0);
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

const NOTIF_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';

function renderNotifications() {
  const email = getEmail();
  const badge = document.getElementById('auth-notif-badge');
  const list = document.getElementById('auth-notif-list');
  if (!badge && !list) return;

  const all = readNotifs();
  // Support both recipientEmail (delayed.js) and userEmail (auth.js legacy)
  const mine = all
    .filter((n) => (n.recipientEmail || n.userEmail || '') === email)
    .sort((a, b) => (b.ts || new Date(b.timestamp).getTime() || 0) - (a.ts || new Date(a.timestamp).getTime() || 0));

  const unread = mine.filter((n) => !n.read).length;

  // Update badge
  if (badge) {
    if (unread > 0) {
      badge.textContent = unread > 9 ? '9+' : String(unread);
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  // Update list
  if (!list) return;
  if (mine.length === 0) {
    list.innerHTML = `<div style="padding:24px 16px;text-align:center;">
      <div style="margin-bottom:8px;opacity:0.4;">${NOTIF_ICON}</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#71717a;">No notifications yet.</div>
    </div>`;
    return;
  }

  list.innerHTML = mine.map((n) => {
    const ts = n.ts || (n.timestamp ? new Date(n.timestamp).getTime() : 0);
    const unreadStyle = n.read
      ? 'background:transparent;'
      : 'background:rgba(201,168,76,0.07);border-left:3px solid #c9a84c;';
    return `<div style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.05);${unreadStyle}cursor:default;transition:background 0.15s;" data-notif-id="${n.id || ''}">
      <div style="display:flex;align-items:flex-start;gap:10px;">
        <span style="flex-shrink:0;margin-top:2px;opacity:0.7;">${NOTIF_ICON}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-family:'DM Sans',sans-serif;font-size:13px;font-weight:${n.read ? '500' : '700'};color:${n.read ? '#a1a1aa' : '#fff'};margin-bottom:3px;">${n.title || ''}</div>
          <div style="font-family:'DM Sans',sans-serif;font-size:12px;color:#71717a;line-height:1.45;">${n.message || ''}</div>
          <div style="font-size:10px;color:#52525b;margin-top:5px;font-family:'DM Mono',monospace;">${relativeTime(ts)}</div>
        </div>
        ${!n.read ? '<div style="width:7px;height:7px;border-radius:50%;background:#c9a84c;flex-shrink:0;margin-top:4px;"></div>' : ''}
      </div>
    </div>`;
  }).join('');
}

function markNotifsRead() {
  const email = getEmail();
  if (!email) return;
  const all = readNotifs();
  let changed = false;
  all.forEach((n) => {
    if ((n.recipientEmail || n.userEmail || '') === email && !n.read) {
      n.read = true;
      changed = true;
    }
  });
  if (changed) { saveNotifs(all); renderNotifications(); }
}

// ── Auth state ────────────────────────────────────────────────────────────────
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
    const isOpen = notifDropdown.style.display === 'block';
    if (isOpen) {
      notifDropdown.style.display = 'none';
    } else {
      // Render fresh content then open
      renderNotifications();
      notifDropdown.style.display = 'block';
      // Mark as read after a short delay so unread highlight is visible briefly
      setTimeout(markNotifsRead, 800);
    }
    if (authDropdown) authDropdown.style.display = 'none';
  });

  logoutBtn?.addEventListener('click', () => {
    ['isLoggedIn', 'currentUserEmail', 'hk_profile', 'hk_notifications', 'hackhub_user'].forEach((k) => localStorage.removeItem(k));
    if (window.location.pathname.includes('/profile')) {
      window.location.replace('/');
    } else {
      window.location.reload();
    }
  });

  signupBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.Auth?.showSignUp) { window.Auth.showSignUp(); return; }
    window.location.href = '/auth-form';
  });

  hamburger?.addEventListener('click', () => navLinks?.classList.toggle('open'));

  document.addEventListener('click', (e) => {
    const notifWrap = nav.querySelector('#auth-notification-wrap');
    if (notifWrap && !notifWrap.contains(e.target)) {
      if (notifDropdown) notifDropdown.style.display = 'none';
    }
    const profileWrap = nav.querySelector('#auth-profile-wrap');
    if (profileWrap && !profileWrap.contains(e.target)) {
      if (authDropdown) authDropdown.style.display = 'none';
    }
  });

  // Keep badge in sync with localStorage changes from other tabs/blocks
  window.addEventListener('storage', (e) => {
    if (e.key === 'hk_notifications') renderNotifications();
  });
}

export default function decorate(block) {
  block.innerHTML = buildNav();
  const nav = block.querySelector('#hh-nav');
  updateAuthState(nav);
  wireEvents(nav);

  // Initial render of notification badge
  if (isLoggedIn()) renderNotifications();

  // Expose renderNotifications globally so delayed.js window.Auth.notify()
  // and any other block (apply-modal, profile-page, etc.) can trigger a live update.
  const _existingAuth = window.Auth || {};
  window.Auth = {
    ..._existingAuth,
    renderNotifications,
    updateNav() {
      updateAuthState(nav);
      if (isLoggedIn()) renderNotifications();
    },
  };

  // If auth.js (page-template) already ran, keep its API but patch renderNotifications in
  if (_existingAuth.updateNav) _existingAuth.updateNav();
}
