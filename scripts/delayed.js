// Provide window.Auth on all pages — routes to /auth-form for login/signup
const encoded = () => encodeURIComponent(window.location.href);

window.Auth = {
  isLoggedIn: () => localStorage.getItem('isLoggedIn') === 'true',
  requireLogin(cb) {
    if (localStorage.getItem('isLoggedIn') === 'true') { cb?.(); return; }
    window.location.href = `/auth-form?mode=login&redirect=${encoded()}`;
  },
  showSignUp: () => { window.location.href = `/auth-form?mode=signup`; },
  showLoginRequired: (msg) => {
    const hint = msg ? `&hint=${encodeURIComponent(msg)}` : '';
    window.location.href = `/auth-form?mode=login${hint}&redirect=${encoded()}`;
  },
  updateNav() {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const signupBtn = document.getElementById('auth-signup-btn');
    const notifWrap = document.getElementById('auth-notification-wrap');
    const profileWrap = document.getElementById('auth-profile-wrap');
    if (signupBtn) signupBtn.style.display = loggedIn ? 'none' : 'inline-flex';
    if (notifWrap) notifWrap.style.display = loggedIn ? 'flex' : 'none';
    if (profileWrap) profileWrap.style.display = loggedIn ? 'flex' : 'none';
  },
  notify(recipientEmail, type, title, message) {
    try {
      const notifs = JSON.parse(localStorage.getItem('hk_notifications') || '[]');
      notifs.unshift({
        id: Math.random().toString(36).slice(2, 10),
        recipientEmail, type, title, message, read: false, ts: Date.now(),
      });
      localStorage.setItem('hk_notifications', JSON.stringify(notifs));
      // Trigger live badge update if header block has already initialised
      window.Auth?.renderNotifications?.();
    } catch { /* */ }
  },
};
