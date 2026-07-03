window.HackDetail = (function() {
  let countdowns = [];

  function show(id) {
    const h = window.HackState.getH(id);
    if(!h) return;
    document.getElementById('home-sections').style.display = 'none';
    const dp = document.getElementById('hackathon-detail-page');
    dp.style.display = 'block';
    dp.classList.add('active');
    history.pushState(null, '', '#hackathon/' + id);
    window.scrollTo(0, 0);
    render(h);
  }

  function hide() {
    document.getElementById('home-sections').style.display = '';
    document.getElementById('hackathon-detail-page').style.display = 'none';
    history.pushState(null, '', window.location.pathname);
    countdowns.forEach(clearInterval);
    countdowns = [];
  }

  function render(h) {
    const isR = window.HackState.isReg(h.id);
    const cont = document.getElementById('detail-content');

    let teamBanner = '';
    if(h.teamRequired) {
      teamBanner = `<div class="team-info-banner">👥 This hackathon requires teams of ${h.minTeam}–${h.maxTeam}. You can register solo and find your team before the team deadline.</div>`;
    } else {
      teamBanner = `<div class="team-info-banner" style="color:#10b981; border-color:rgba(16,185,129,0.2); background:rgba(16,185,129,0.05);">✓ Solo participation allowed. Teams up to ${h.maxTeam} members.</div>`;
    }

    let tracksHtml = h.tracks.map(t => `
      <div class="track-card">
        <div class="track-card-header">
          <span class="track-card-name">${t.name}</span>
          <span class="track-card-prize">${t.prize}</span>
        </div>
        <div class="track-card-desc">${t.description}</div>
      </div>
    `).join('');

    let timelineHtml = h.timeline.map(t => `
      <div class="timeline-item ${t.past ? 'past' : ''}">
        <div class="timeline-label">${t.label}</div>
        <div class="timeline-date">${t.date}</div>
      </div>
    `).join('');

    let sponsorsHtml = (h.sponsors||[]).map(s => `<div class="sponsor-chip">${s}</div>`).join('');

    let perc = Math.min(100, Math.round((h.registeredCount / h.totalSlots) * 100));
    let spots = h.totalSlots - h.registeredCount;

    cont.innerHTML = `
      <button class="detail-back-btn" onclick="HackDetail.hide()">← Back to all hackathons</button>
      
      <div class="detail-tabs">
        <button class="detail-tab active" onclick="HackDetail.switchTab(this, 'tab-overview')">Overview</button>
        <button class="detail-tab" onclick="HackDetail.switchTab(this, 'tab-tracks')">Tracks & Prizes</button>
        <button class="detail-tab" onclick="HackDetail.switchTab(this, 'tab-timeline')">Timeline</button>
        <button class="detail-tab" onclick="HackDetail.switchTab(this, 'tab-sponsors')">Sponsors</button>
      </div>

      <div class="detail-layout">
        <div class="detail-main">
          
          <div id="tab-overview" class="detail-tab-content active">
            <h1 class="detail-title">${h.title}</h1>
            <p class="detail-organiser">Organised by ${h.organiser}</p>
            <div class="detail-badges">
              <span class="detail-badge ${h.status==='live'?'badge-live':''}">${h.status==='live'?'<div class="badge-dot-live"></div>LIVE':h.status.toUpperCase()}</span>
              <span class="detail-badge">${h.format}</span>
            </div>
            ${teamBanner}
            <div class="detail-description">${h.description}</div>
            <h3 style="color:#fff; margin-bottom:16px;">Tracks</h3>
            <div class="detail-tracks-grid">${tracksHtml}</div>
          </div>

          <div id="tab-tracks" class="detail-tab-content">
            <h3 style="color:#fff; margin-bottom:16px;">Tracks</h3>
            <div class="detail-tracks-grid">${tracksHtml}</div>
          </div>

          <div id="tab-timeline" class="detail-tab-content">
            <div class="timeline-list">${timelineHtml}</div>
          </div>

          <div id="tab-sponsors" class="detail-tab-content">
            <div class="sponsors-flex">${sponsorsHtml}</div>
          </div>

        </div>

        <div class="detail-sidebar">
          <div class="sidebar-prize">
            <div class="sidebar-prize-label">Total Prize Pool</div>
            <div class="sidebar-prize-value">${h.prize}</div>
          </div>

          <div class="sidebar-info-grid">
            <div class="sidebar-info-item"><div class="sidebar-info-label">Format</div><div class="sidebar-info-value">${h.format}</div></div>
            <div class="sidebar-info-item"><div class="sidebar-info-label">Team Size</div><div class="sidebar-info-value">${h.teamRequired?h.minTeam+'-'+h.maxTeam:'1-'+h.maxTeam}</div></div>
            <div class="sidebar-info-item" style="grid-column: 1 / -1;"><div class="sidebar-info-label">Dates</div><div class="sidebar-info-value">${h.startDate.split(' ')[0]} - ${h.endDate.split(' ')[0]}</div></div>
          </div>

          <div class="sidebar-progress">
            <div class="progress-header">
              <span class="progress-label">Registered</span>
              <span class="progress-count">${h.registeredCount} / ${h.totalSlots}</span>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${perc}%"></div></div>
            <div style="text-align:right; font-size:0.75rem; color:var(--muted); margin-top:4px;">${spots} spots left</div>
          </div>

          <div class="sidebar-countdown" id="hk-timer"></div>
          ${h.teamRequired && h.teamFormationDeadline ? `<div class="sidebar-countdown" id="hk-timer-team" style="border-top:none; padding-top:0;"></div>` : ''}

          <button class="sidebar-register-btn ${isR?'registered':''}" onclick="HackModals.openReg(${h.id})">${isR?'✓ Registered — Go to Dashboard':'Register Now'}</button>

          <button class="sidebar-wishlist-btn ${window.HackState.isWish(h.id)?'wishlisted':''}" onclick="HackDetail.toggleWish(this, ${h.id})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            ${window.HackState.isWish(h.id)?'Wishlisted':'Add to Wishlist'}
          </button>
        </div>
      </div>
    `;

    countdowns.forEach(clearInterval);
    countdowns = [];
    startTimer('hk-timer', h.registrationDeadline, 'Registration ends in');
    if(h.teamRequired && h.teamFormationDeadline) {
      startTimer('hk-timer-team', h.teamFormationDeadline, 'Team formation ends in');
    }
  }

  function startTimer(elId, deadline, text) {
    const end = new Date(deadline).getTime();
    const tick = () => {
      const now = new Date().getTime(); const d = end - now;
      const el = document.getElementById(elId);
      if(!el) return;
      if(d < 0) { el.innerHTML = `<div class="countdown-label">${text}</div><div style="color:var(--muted); font-size:0.9rem;">Closed</div>`; return; }
      const dd = Math.floor(d/(1000*60*60*24)), hh = Math.floor((d%(1000*60*60*24))/(1000*60*60)), mm = Math.floor((d%(1000*60*60))/(1000*60)), ss = Math.floor((d%(1000*60))/1000);
      el.innerHTML = `
        <div class="countdown-label">${text}</div>
        <div class="countdown-timer">
          <div class="countdown-unit"><div class="countdown-value">${dd}</div><div class="countdown-unit-label">Days</div></div><div class="countdown-sep">:</div>
          <div class="countdown-unit"><div class="countdown-value">${hh<10?'0'+hh:hh}</div><div class="countdown-unit-label">Hrs</div></div><div class="countdown-sep">:</div>
          <div class="countdown-unit"><div class="countdown-value">${mm<10?'0'+mm:mm}</div><div class="countdown-unit-label">Mins</div></div><div class="countdown-sep">:</div>
          <div class="countdown-unit"><div class="countdown-value">${ss<10?'0'+ss:ss}</div><div class="countdown-unit-label">Secs</div></div>
        </div>`;
    };
    tick(); countdowns.push(setInterval(tick, 1000));
  }

  function switchTab(btn, tabId) {
    document.querySelectorAll('.detail-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.detail-tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(tabId).classList.add('active');
  }

  function toggleWish(btn, id) {
    if(!window.HackState.isLoggedIn()) {
      window.HackToast.show('Log in to save hackathons', 'info');
      HackModals.openLogin();
      return;
    }
    const isW = window.HackState.toggleWish(id);
    if(isW) {
      btn.classList.add('wishlisted');
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> Wishlisted`;
      window.HackToast.show('Added to wishlist', 'info');
    } else {
      btn.classList.remove('wishlisted');
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> Add to Wishlist`;
      window.HackToast.show('Removed from wishlist', 'info');
    }
  }

  return { show, hide, render, switchTab, toggleWish };
})();
