/* ============================================================
   HACKLIST.JS
   Dynamic list rendering, unliking, and detail modal logic
   ============================================================ */

(function () {
  const HACKATHONS = window.HACKATHONS || [];
  const grid = document.getElementById('hacklistGrid');

  /* ── LIKED EVENTS HELPERS ── */
  function getLikedEvents() {
    return window.HackState.getWish();
  }

  function unlikeEvent(id) {
    window.HackState.toggleWish(id);
  }

  /* ── RENDER EMPTY STATE ── */
  function renderEmptyState() {
    grid.innerHTML = `
      <div class="hacklist-empty">
        <div class="hacklist-empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </div>
        <h3>No saved hackathons yet</h3>
        <p>Explore the list of upcoming hackathons and click the heart icon to save them here for quick access.</p>
        <a href="hackathon.html" class="browse-btn">Explore Hackathons →</a>
      </div>
    `;
  }

  /* ── BUILD CARD FOR GRID ── */
  function buildCard(h) {
    const card = document.createElement('div');
    card.className = 'hs-card';
    card.dataset.id = h.id;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${h.title} — click for details`);

    const isR = window.HackState && window.HackState.isReg ? window.HackState.isReg(h.id) : false;

    card.innerHTML = `
      <img class="hs-card-img" src="${h.image}" alt="${h.title}" loading="lazy" decoding="async"/>
      <div class="hs-card-scrim"></div>
      <button class="hs-like-btn liked" data-stop aria-label="Unlike this hackathon">
        <svg class="hs-like-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      </button>
      <span class="hs-card-cat">${h.category}</span>
      <div class="hs-card-body">
        <span class="hs-card-organizer">${h.organizer}</span>
        <h3 class="hs-card-name">${h.title}</h3>
        <div class="hs-card-meta">
          <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px; opacity: 0.85;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>${h.month} ${h.day}</span>
          <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px; opacity: 0.85;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>${h.location}</span>
        </div>
        <button class="hs-card-btn ${isR?'registered':''}" data-stop data-register-btn>${isR?'✓ Registered':'Register'}</button>
      </div>
    `;

    /* Click Register button: go to hackathon.html#hackathon/id */
    const registerBtn = card.querySelector('[data-register-btn]');
    registerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.href = 'hackathon.html#hackathon/' + h.id;
    });

    /* Click heart icon: remove from liked, animate fade, and remove element */
    const likeBtn = card.querySelector('.hs-like-btn');
    likeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      unlikeEvent(h.id);
      
      // Animate card removal
      card.classList.add('fade-out');
      card.addEventListener('animationend', () => {
        card.remove();
        // Check if list is empty
        const likedIDs = getLikedEvents();
        if (likedIDs.length === 0) {
          renderEmptyState();
        }
      });
    });

    /* Click card: go to details page */
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-stop]')) return;
      window.location.href = 'hackathon.html#hackathon/' + h.id;
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (e.target.closest('[data-stop]')) return;
        window.location.href = 'hackathon.html#hackathon/' + h.id;
      }
    });

    return card;
  }

  /* ── INITIAL RENDER ── */
  function renderList() {
    if (!grid) return;
    grid.innerHTML = '';
    
    const likedIDs = getLikedEvents();
    const likedEvents = HACKATHONS.filter(h => likedIDs.includes(h.id));
    const liked = getLikedEvents();

    if (likedEvents.length === 0) {
      renderEmptyState();
    } else {
      likedEvents.forEach(h => {
        grid.appendChild(buildCard(h));
      });
    }
  }

  /* ── MODAL LOGIC ── */
  const overlay    = document.getElementById('hmOverlay');
  const closeBtn   = document.getElementById('hmClose');
  const hmImg      = document.getElementById('hmImg');
  const hmCategory = document.getElementById('hmCategory');
  const hmOrg      = document.getElementById('hmOrganizer');
  const hmTitle    = document.getElementById('hmTitle');
  const hmStats    = document.getElementById('hmStats');
  const hmReg      = document.getElementById('hmRegister');

  function openModal(h) {
    if (!overlay) return;
    hmImg.src        = h.image;
    hmImg.alt        = h.title;
    hmCategory.textContent = h.category;
    hmOrg.textContent      = h.organizer;
    hmTitle.textContent    = h.title;
    hmReg.href = '#';
    hmReg.onclick = function (e) {
      e.preventDefault();
      closeModal();
      window.location.href = 'hackathon.html#hackathon/' + h.id;
    };

    hmStats.innerHTML = `
      <div class="hm-stat">
        <span class="hm-stat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"></path><path d="M12 2a6 6 0 0 1 6 6v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8a6 6 0 0 1 6-6z"></path></svg></span>
        <span class="hm-stat-val">${h.prize}</span>
        <span class="hm-stat-lbl">Prize Pool</span>
      </div>
      <div class="hm-stat">
        <span class="hm-stat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></span>
        <span class="hm-stat-val">${h.duration}</span>
        <span class="hm-stat-lbl">Duration</span>
      </div>
      <div class="hm-stat">
        <span class="hm-stat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span>
        <span class="hm-stat-val">${h.month} ${h.day}</span>
        <span class="hm-stat-lbl">Date</span>
      </div>
      <div class="hm-stat">
        <span class="hm-stat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></span>
        <span class="hm-stat-val">${h.location}</span>
        <span class="hm-stat-lbl">Location</span>
      </div>
      <div class="hm-stat">
        <span class="hm-stat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg></span>
        <span class="hm-stat-val">${h.category}</span>
        <span class="hm-stat-lbl">Category</span>
      </div>
      <div class="hm-stat">
        <span class="hm-stat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="9" y2="16"></line><line x1="15" y1="22" x2="15" y2="16"></line><line x1="9" y1="16" x2="15" y2="16"></line><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M12 6h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"></path></svg></span>
        <span class="hm-stat-val">${h.organizer}</span>
        <span class="hm-stat-lbl">Organiser</span>
      </div>
    `;

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function closeModal() {
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  // Init page
  document.addEventListener('DOMContentLoaded', renderList);

  window.addEventListener('wishlistUpdated', (e) => {
    const id = e.detail;
    const cards = document.querySelectorAll(`.hs-card[data-id="${id}"]`);
    cards.forEach(card => {
       if (!getLikedEvents().includes(parseInt(id))) {
         card.classList.add('fade-out');
         card.addEventListener('animationend', () => {
           card.remove();
           if (getLikedEvents().length === 0) renderEmptyState();
         });
       }
    });
  });

})();
