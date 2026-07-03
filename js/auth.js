/* ==============================================
   AUTH.JS — Simple localStorage auth system
   Drop this <script> on every page (before </body>)
   ============================================== */

(function () {

  /* ── HELPERS ── */
  function isLoggedIn() {
    return localStorage.getItem('isLoggedIn') === 'true';
  }

  /* ── INJECT MODALS + PROFILE AVATAR ── */
  function injectUI() {
    if (document.getElementById('auth-profile-wrap')) return;
    const html = `
      <!-- NOTIFICATION BELL (injected before profile) -->
      <div id="auth-notification-wrap" style="display:none;position:relative;margin-right:12px;">
        <button id="auth-notif-btn" aria-label="Notifications" style="
          width:38px; height:38px;
          border-radius:50%;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          transition: all 0.2s;
          padding:0;
          outline:none;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span id="auth-notif-badge" style="display:none;position:absolute;top:-2px;right:-2px;background:#ef4444;color:#fff;font-size:10px;font-weight:bold;width:16px;height:16px;border-radius:50%;align-items:center;justify-content:center;border:2px solid #0f0f1a;">0</span>
        </button>

        <!-- Notification Dropdown -->
        <div id="auth-notif-dropdown" style="
          display:none;
          position:absolute;
          top:calc(100% + 12px);
          right:-50px;
          width:320px;
          max-height:400px;
          background: rgba(14, 15, 18, 0.98);
          backdrop-filter:blur(20px);
          border:1px solid rgba(255,255,255,0.1);
          border-radius:12px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.5);
          overflow-y:auto;
          z-index:8999;
          animation: auth-drop-in 0.18s cubic-bezier(0.22,1,0.36,1);
        ">
          <div style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); font-family: var(--font-body); font-weight: 700; font-size: 14px; color: #c9a84c;">Notifications</div>
          <div id="auth-notif-list" style="display:flex; flex-direction:column;">
            <!-- list items -->
          </div>
        </div>
      </div>

      <!-- PROFILE AVATAR + DROPDOWN (injected next to sign-up btn) -->
      <div id="auth-profile-wrap" style="display:none;position:relative;">

        <!-- Circular avatar button -->
        <button id="auth-avatar-btn" aria-label="Profile menu" style="
          width:38px; height:38px;
          border-radius:50%;
          background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%);
          border: 1.5px solid #c9a84c;
          box-shadow: 0 0 10px rgba(201,168,76,0.25), 0 0 0 1px rgba(201,168,76,0.08);
          cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          transition: box-shadow 0.2s, border-color 0.2s;
          flex-shrink:0;
          padding:0;
          outline:none;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
        </button>

        <!-- Dropdown -->
        <div id="auth-dropdown" style="
          display:none;
          position:absolute;
          top:calc(100% + 12px);
          right:0;
          min-width:180px;
          background: rgba(14, 15, 18, 0.96);
          backdrop-filter:blur(20px);
          -webkit-backdrop-filter:blur(20px);
          border:1px solid rgba(217,164,65,0.25);
          border-radius:16px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(217,164,65,0.08), inset 0 1px 0 rgba(217,164,65,0.15);
          overflow:hidden;
          z-index:8999;
          animation: auth-drop-in 0.18s cubic-bezier(0.22,1,0.36,1);
        ">
          <style>
            @keyframes auth-drop-in {
              from { opacity:0; transform:translateY(-8px) scale(0.97); }
              to   { opacity:1; transform:translateY(0) scale(1); }
            }
            #auth-avatar-btn:hover {
              box-shadow: 0 0 18px rgba(217,164,65,0.45), 0 0 0 1px rgba(217,164,65,0.2) !important;
              border-color: #e8b84b !important;
            }
            #auth-dropdown a,
            #auth-dropdown button {
              display:flex !important;
              align-items:center !important;
              gap:.7rem !important;
              width:100% !important;
              padding:.8rem 1.2rem !important;
              background:none !important;
              border:none !important;
              border-radius:0 !important;
              color:rgba(217,164,65,0.9) !important;
              font-family:var(--font-body) !important;
              font-size:.83rem !important;
              font-weight:600 !important;
              letter-spacing:.02em !important;
              text-decoration:none !important;
              cursor:pointer !important;
              transition: background 0.15s, color 0.15s, padding-left 0.15s !important;
              text-align:left !important;
              box-sizing:border-box !important;
            }
            #auth-dropdown a:hover,
            #auth-dropdown button:hover {
              background: rgba(217,164,65,0.12) !important;
              color:#fff !important;
              padding-left:1.5rem !important;
            }
            #auth-dropdown .auth-dd-divider {
              height:1px;
              background: linear-gradient(90deg, transparent, rgba(217,164,65,0.25), transparent);
              margin:0 !important;
            }
            #auth-dropdown .auth-dd-logout {
              color:rgba(248,113,113,0.85) !important;
            }
            #auth-dropdown .auth-dd-logout:hover {
              background:rgba(248,113,113,0.1) !important;
              color:#fca5a5 !important;
            }
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
      </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
  }

  function mountProfileInNav() {
    if (document.getElementById('auth-controls-container')) return;
    const signupBtn = document.getElementById('auth-signup-btn');
    const wrap = document.getElementById('auth-profile-wrap');
    const notifWrap = document.getElementById('auth-notification-wrap');

    if (signupBtn && wrap) {
      // Create a wrapper so they stay together in flex layouts
      const container = document.createElement('div');
      container.id = 'auth-controls-container';
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.gap = '16px';
      
      signupBtn.parentNode.insertBefore(container, signupBtn.nextSibling);
      
      if (notifWrap) {
        notifWrap.style.marginRight = '0'; // remove old margin
        container.appendChild(notifWrap);
      }
      container.appendChild(wrap);
    }
  }

  /* ── SHOW / HIDE MODALS ── */
  function showSignUp() {
    window.location.href = '/signup?mode=signup&redirect=' + encodeURIComponent(window.location.href);
  }

  /* ── SHOW LOGIN REQUIRED ── */
  function showLoginRequired() {
    window.location.href = '/signup?mode=login&redirect=' + encodeURIComponent(window.location.href);
  }

  /* ── DROPDOWN TOGGLE ── */
  var _dropOpen = false;
  var _notifOpen = false;

  function openDrop() {
    document.getElementById('auth-dropdown').style.display = 'block';
    if (_notifOpen) closeNotifDrop();
    _dropOpen = true;
  }

  function closeDrop() {
    document.getElementById('auth-dropdown').style.display = 'none';
    _dropOpen = false;
  }

  function openNotifDrop() {
    document.getElementById('auth-notif-dropdown').style.display = 'block';
    if (_dropOpen) closeDrop();
    _notifOpen = true;
    markNotificationsRead();
  }

  function closeNotifDrop() {
    document.getElementById('auth-notif-dropdown').style.display = 'none';
    _notifOpen = false;
  }

  /* ── UPDATE NAV ── */
  function updateNav() {
    var signupBtn = document.getElementById('auth-signup-btn');
    var profileWrap = document.getElementById('auth-profile-wrap');

    // Always keep the old extra buttons hidden (they live in HTML but are not used)
    ['auth-dashboard-btn', 'auth-profile-btn', 'auth-logout-btn'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    if (!signupBtn) return;

    if (isLoggedIn()) {
      signupBtn.style.display = 'none';
      if (profileWrap) profileWrap.style.display = 'flex';
      var notifWrap = document.getElementById('auth-notification-wrap');
      if (notifWrap) notifWrap.style.display = 'flex';

      // Load profile info and set avatar button image/initials
      var avatarBtn = document.getElementById('auth-avatar-btn');
      if (avatarBtn) {
        var savedProfile = null;
        try {
          var saved = localStorage.getItem('hk_profile');
          if (saved) savedProfile = JSON.parse(saved);
        } catch (e) { }

        var avatarUrl = '';
        var initials = '';
        if (savedProfile) {
          if (savedProfile.avatar) avatarUrl = savedProfile.avatar;
          if (savedProfile.name) {
            initials = savedProfile.name.split(' ').map(function (w) { return w[0] || ''; }).join('').toUpperCase().slice(0, 2);
          }
        }

        if (avatarUrl) {
          avatarBtn.innerHTML = '<img src="' + avatarUrl + '" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;">';
        } else if (initials) {
          avatarBtn.innerHTML = '<span style="color:#c9a84c;font-family:var(--font-body);font-size:0.85rem;font-weight:700;">' + initials + '</span>';
        } else {
          avatarBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';
        }
      }
      
      renderNotifications();
    } else {
      signupBtn.style.display = 'inline-flex';
      if (profileWrap) profileWrap.style.display = 'none';
      var notifWrap = document.getElementById('auth-notification-wrap');
      if (notifWrap) notifWrap.style.display = 'none';
      closeDrop();
      closeNotifDrop();
    }
    document.body.classList.add('auth-ready');
  }
  document.body.style.visibility = 'visible';

  /* ── LOGOUT ── */
  function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUserEmail');
    localStorage.removeItem('hackhub_user');
    localStorage.removeItem('hk_profile');
    closeDrop();
    closeNotifDrop();
    updateNav();
    if (window.location.pathname.includes('/profile')) {
      window.location.replace('/');
    } else {
      window.location.reload();
    }
  }

  /* ── NOTIFICATIONS LOGIC ── */
  function notify(userEmail, type, title, message) {
    if (!userEmail) return;
    let notifs = [];
    try {
      notifs = JSON.parse(localStorage.getItem('hk_notifications')) || [];
    } catch (e) {}
    notifs.push({
      id: Math.random().toString(36).substring(2, 10),
      userEmail: userEmail,
      type: type,
      title: title,
      message: message,
      read: false,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('hk_notifications', JSON.stringify(notifs));
    renderNotifications(); // update if current user is logged in
  }

  function renderNotifications() {
    if (!isLoggedIn()) return;
    const currentUser = localStorage.getItem('currentUserEmail');
    if (!currentUser) return;

    let notifs = [];
    try {
      notifs = JSON.parse(localStorage.getItem('hk_notifications')) || [];
    } catch(e) {}

    const myNotifs = notifs.filter(n => n.userEmail === currentUser).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    const unreadCount = myNotifs.filter(n => !n.read).length;

    const badge = document.getElementById('auth-notif-badge');
    if (badge) {
      if (unreadCount > 0) {
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }

    const list = document.getElementById('auth-notif-list');
    if (list) {
      if (myNotifs.length === 0) {
        list.innerHTML = `<div style="padding: 16px; text-align: center; color: #a1a1aa; font-family: var(--font-body); font-size: 13px;">No notifications yet.</div>`;
      } else {
        list.innerHTML = myNotifs.map(n => `
          <div style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); background: ${n.read ? 'transparent' : 'rgba(239, 68, 68, 0.05)'};">
            <div style="font-family: var(--font-body); font-size: 13px; font-weight: 600; color: ${n.read ? '#e4e4e7' : '#fff'}; margin-bottom: 4px;">${n.title}</div>
            <div style="font-family: var(--font-body); font-size: 12px; color: #a1a1aa; line-height: 1.4;">${n.message}</div>
            <div style="font-size: 10px; color: #71717a; margin-top: 6px; font-family: var(--font-mono);">${new Date(n.timestamp).toLocaleDateString()}</div>
          </div>
        `).join('');
      }
    }
  }

  function markNotificationsRead() {
    const currentUser = localStorage.getItem('currentUserEmail');
    if (!currentUser) return;
    let notifs = [];
    try {
      notifs = JSON.parse(localStorage.getItem('hk_notifications')) || [];
    } catch(e) {}
    
    let changed = false;
    notifs.forEach(n => {
      if (n.userEmail === currentUser && !n.read) {
        n.read = true;
        changed = true;
      }
    });
    
    if (changed) {
      localStorage.setItem('hk_notifications', JSON.stringify(notifs));
      renderNotifications();
    }
  }

  /* ── BIND EVENTS ── */
  function bindEvents() {
    // Global click interceptor for registration gating (Disabled: let people register directly)
    /*
    document.addEventListener('click', function (e) {
      var target = e.target.closest('.event-card, .feat-register-btn, .event-register-btn, .register-btn, .hm-register');
      if (target) {
        if (!isLoggedIn()) {
          e.preventDefault();
          e.stopImmediatePropagation();
          showLoginRequired();
        }
      }
    }, true);
    */

    // Escape closes dropdown
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeDrop();
      }
    });

    // Sign Up nav button
    document.getElementById('auth-signup-btn')
      ?.addEventListener('click', function (e) {
        e.preventDefault();
        showSignUp();
      });

    // Avatar button — toggle dropdown
    document.getElementById('auth-avatar-btn')
      ?.addEventListener('click', function (e) {
        e.stopPropagation();
        _dropOpen ? closeDrop() : openDrop();
      });

    // Dropdown — Profile link
    document.getElementById('auth-dd-profile')
      ?.addEventListener('click', function (e) {
        closeDrop();
      });

    // Notification toggle
    document.getElementById('auth-notif-btn')
      ?.addEventListener('click', function(e) {
        e.stopPropagation();
        _notifOpen ? closeNotifDrop() : openNotifDrop();
      });

    // Dropdown — Logout
    document.getElementById('auth-dd-logout')
      ?.addEventListener('click', function () {
        logout();
      });

    // Click outside closes dropdown
    document.addEventListener('click', function (e) {
      var wrap = document.getElementById('auth-profile-wrap');
      if (wrap && !wrap.contains(e.target)) {
        closeDrop();
      }
      var notifWrap = document.getElementById('auth-notification-wrap');
      if (notifWrap && !notifWrap.contains(e.target)) {
        closeNotifDrop();
      }
    });
  }

  /* ── PUBLIC GATE FUNCTION ── */
  function requireLogin() {
    if (isLoggedIn()) return true;
    showLoginRequired();
    return false;
  }

  /* ── INIT ── */
  function init() {
    injectUI();
    mountProfileInNav();
    bindEvents();
    updateNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ── PUBLIC API ── */
  window.Auth = { requireLogin, showSignUp, showLoginRequired, isLoggedIn, updateNav, notify };

})();