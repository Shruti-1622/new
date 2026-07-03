/* ============================================================
   REGISTRATION.JS — Unified Registration & Detail Flow
   ============================================================ */

window.HackHub = (function () {
  let countdownInterval = null;

  // --- STATE ---
  function getUser() { try { return JSON.parse(localStorage.getItem('hackhub_user')); } catch { return null; } }
  function isLoggedIn() { return !!getUser() || localStorage.getItem('isLoggedIn') === 'true'; }
  function setUser(u) {
    localStorage.setItem('hackhub_user', JSON.stringify(u));
    localStorage.setItem('isLoggedIn', 'true');
    const p = JSON.parse(localStorage.getItem('hk_profile') || '{}'); p.name = u.name;
    localStorage.setItem('hk_profile', JSON.stringify(p));
  }
  function getRegs() { try { return JSON.parse(localStorage.getItem('hackhub_registrations')) || []; } catch { return []; } }
  function isReg(id) { return getRegs().some(r => r.hackathonId === id); }
  function addReg(r) { const list = getRegs(); list.push(r); localStorage.setItem('hackhub_registrations', JSON.stringify(list)); }
  function getWish() { try { return JSON.parse(localStorage.getItem('hackhub_wishlist')) || []; } catch { return []; } }
  function isWish(id) { return getWish().includes(id); }
  function toggleWish(id) {
    let list = getWish();
    if(list.includes(id)) list = list.filter(x => x !== id); else list.push(id);
    localStorage.setItem('hackhub_wishlist', JSON.stringify(list));
    return list.includes(id);
  }

  // --- TOAST ---
  function showToast(msg) {
    let c = document.getElementById('toast-container');
    if(!c) { c = document.createElement('div'); c.id = 'toast-container'; c.className = 'toast-container'; document.body.appendChild(c); }
    const t = document.createElement('div'); t.className = 'toast';
    t.innerHTML = `<span class="toast-icon">★</span> <span>${msg}</span>`;
    c.appendChild(t); setTimeout(() => { t.classList.add('toast-out'); setTimeout(() => t.remove(), 300); }, 3500);
  }

  // --- DATA ---
  function getH(id) { return (window.HACKATHONS||[]).find(x => x.id === parseInt(id)); }

  // --- MODALS ---
  function createModal(idStr, contentHtml) {
    let c = document.getElementById(idStr);
    if(!c) { c = document.createElement('div'); c.id = idStr; c.className = 'modal-overlay'; document.body.appendChild(c); }
    c.innerHTML = `
      <div class="modal-box">
        <button class="modal-close" onclick="this.parentElement.parentElement.classList.remove('open')">✕</button>
        ${contentHtml}
      </div>`;
    c.classList.add('open');
  }

  function showLoginModal() {
    createModal('auth-modal-overlay', `
      <div class="modal-header"><h2>Welcome Back</h2><p>Sign in to HackHub</p></div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Email <span class="required">*</span></label>
          <input type="email" id="l-email" class="form-input" placeholder="name@domain.com">
        </div>
        <button class="form-btn" onclick="HackHub.doLogin()">Continue →</button>
      </div>
    `);
  }

  function doLogin() {
    const email = document.getElementById('l-email').value;
    if(!email) return showToast('Please enter email');
    setUser({ name: email.split('@')[0], email });
    if(window.Auth) window.Auth.updateNav();
    document.getElementById('auth-modal-overlay').classList.remove('open');
    showToast('Welcome back!');
  }

  function showRegModal(id) {
    if(!isLoggedIn()) return showLoginModal();
    if(isReg(id)) return showToast('You are already registered.');
    
    createModal('reg-modal-overlay', `
      <div class="modal-header"><h2>Registration</h2><p>Complete your application</p></div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Role <span class="required">*</span></label>
          <select id="r-role" class="form-select"><option value="dev">Developer</option><option value="design">Designer</option></select>
        </div>
        <button class="form-btn" onclick="HackHub.doReg(${id})">Confirm Registration</button>
      </div>
    `);
  }

  function doReg(id) {
    addReg({ hackathonId: id, status: 'confirmed', role: document.getElementById('r-role').value });
    document.getElementById('reg-modal-overlay').classList.remove('open');
    showToast('Registration successful!');
    showDetailPage(id); // refresh
  }

  // --- DETAIL PAGE ---
  function showDetailPage(id) {
    const h = getH(id); if(!h) return;
    document.getElementById('home-sections').style.display = 'none';
    const dp = document.getElementById('hackathon-detail-page');
    dp.style.display = 'block'; dp.classList.add('active');
    history.pushState(null,'','#hackathon/'+id);
    window.scrollTo(0,0);
    renderDetail(h);
  }

  function hideDetailPage() {
    document.getElementById('home-sections').style.display = '';
    document.getElementById('hackathon-detail-page').style.display = 'none';
    history.pushState(null,'',window.location.pathname);
    if(countdownInterval) clearInterval(countdownInterval);
  }

  function renderDetail(h) {
    const cont = document.getElementById('detail-content');
    const isR = isReg(h.id);
    cont.innerHTML = `
      <button class="detail-back-btn" onclick="HackHub.hideDetailPage()">← Back to Hackathons</button>
      <div class="detail-layout">
        <div class="detail-main">
          <div class="detail-badges">
            <span class="detail-badge ${h.status==='live'?'badge-live':''}">${h.status==='live'?'<div class="badge-dot-live"></div>LIVE':h.status.toUpperCase()}</span>
            ${h.tags.map(t=>`<span class="detail-badge">${t}</span>`).join('')}
          </div>
          <h1 class="detail-title">${h.title}</h1>
          <p class="detail-organiser">Organised by ${h.organiser}</p>
          <div class="detail-description">${h.description}</div>
        </div>
        <div class="detail-sidebar">
          <div class="sidebar-prize"><div class="sidebar-prize-label">Prize Pool</div><div class="sidebar-prize-value">${h.prize}</div></div>
          <div class="sidebar-countdown" id="hk-timer"></div>
          <button class="sidebar-register-btn ${isR?'registered':''}" onclick="HackHub.showRegModal(${h.id})">${isR?'✓ Registered':'Register Now'}</button>
        </div>
      </div>
    `;
    startTimer(h.registrationDeadline);
  }

  function startTimer(deadline) {
    if(countdownInterval) clearInterval(countdownInterval);
    const end = new Date(deadline).getTime();
    const tick = () => {
      const now = new Date().getTime(); const d = end - now;
      const el = document.getElementById('hk-timer');
      if(!el) return;
      if(d < 0) { el.innerHTML = 'Registration Closed'; return; }
      const dd = Math.floor(d/(1000*60*60*24)), hh = Math.floor((d%(1000*60*60*24))/(1000*60*60)), mm = Math.floor((d%(1000*60*60))/(1000*60)), ss = Math.floor((d%(1000*60))/1000);
      el.innerHTML = `
        <div class="countdown-label">Registration ends in</div>
        <div class="countdown-timer">
          <div class="countdown-unit"><div class="countdown-value">${dd}</div><div class="countdown-unit-label">Days</div></div><div class="countdown-sep">:</div>
          <div class="countdown-unit"><div class="countdown-value">${hh<10?'0'+hh:hh}</div><div class="countdown-unit-label">Hrs</div></div><div class="countdown-sep">:</div>
          <div class="countdown-unit"><div class="countdown-value">${mm<10?'0'+mm:mm}</div><div class="countdown-unit-label">Mins</div></div><div class="countdown-sep">:</div>
          <div class="countdown-unit"><div class="countdown-value">${ss<10?'0'+ss:ss}</div><div class="countdown-unit-label">Secs</div></div>
        </div>`;
    };
    tick(); countdownInterval = setInterval(tick, 1000);
  }

  // --- GRID ---
  function buildCard(h) {
    const isW = isWish(h.id);
    const div = document.createElement('div'); div.className = 'hcard';
    div.innerHTML = `
      <div class="hcard-banner">
        <div class="hcard-banner-bg" style="background: ${h.bannerGradient}"><span class="hcard-banner-title">${h.title}</span></div>
      </div>
      <div class="hcard-body">
        <div class="hcard-org"><div class="hcard-org-logo">${h.organiserLogo}</div><div class="hcard-org-name">${h.organiser}</div></div>
        <div class="hcard-title">${h.title}</div>
        <div class="hcard-prize">🏆 ${h.prize}</div>
      </div>
      <div class="hcard-footer">
        <button class="hcard-explore-btn" onclick="HackHub.showDetailPage(${h.id}); event.stopPropagation();">Explore →</button>
      </div>`;
    div.onclick = () => showDetailPage(h.id);
    return div;
  }

  function initGrid() {
    const grid = document.getElementById('all-events-grid');
    const btn = document.getElementById('viewAllBtn');
    if(!grid || !btn) return;
    const n = btn.cloneNode(true); btn.parentNode.replaceChild(n, btn);
    let rendered = false;
    n.addEventListener('click', () => {
      if(!rendered) { grid.innerHTML=''; (window.HACKATHONS||[]).forEach(h => grid.appendChild(buildCard(h))); rendered=true; }
      const o = document.getElementById('all-events-container').classList.toggle('open');
      n.textContent = o ? 'Show Less' : 'View All Events';
    });
  }

  // Init
  document.addEventListener('DOMContentLoaded', () => {
    initGrid();
    if(window.location.hash.startsWith('#hackathon/')) setTimeout(() => showDetailPage(window.location.hash.split('/')[1]), 100);
  });

  return { showDetailPage, hideDetailPage, showRegModal, doReg, showLoginModal, doLogin, showToast };
})();
