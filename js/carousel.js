/* ============================================================
   hackathon-scroll.js
   Infinite-scroll hackathon cards — pause on hover, modal on click
   ============================================================ */

const HACKATHONS = window.HACKATHONS || [];

/* ── LIKED EVENTS HELPERS ── */
function getLikedEvents() {
  return window.HackState && window.HackState.getWish ? window.HackState.getWish() : [];
}

function toggleLikeEvent(id) {
  return window.HackState && window.HackState.toggleWish ? window.HackState.toggleWish(id) : false;
}

function isLikedEvent(id) {
  return window.HackState && window.HackState.isWish ? window.HackState.isWish(id) : false;
}

/* ── BUILD CARDS ── */
function buildCard(h) {
  const card = document.createElement('div');
  card.className = 'hs-card';
  card.dataset.id = h.id;
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');

  const liked = getLikedEvents();
  const isLiked = liked.includes(h.id);

  // Derive display values from new schema
  const tagLabel = (h.tags && h.tags[0]) || h.category || '';
  const orgName = h.organiser || h.organizer || '';
  const statusLabel = h.status === 'live' ? '● LIVE' : 'UPCOMING';
  const imgSrc = h.image || '';
  const isR = window.HackState && window.HackState.isReg ? window.HackState.isReg(h.id) : false;

  card.innerHTML = `
    <img class="hs-card-img" src="${imgSrc}" alt="${h.title}" loading="lazy" />
    <div class="hs-card-scrim"></div>
    <button class="hs-like-btn ${isLiked ? 'liked' : ''}" data-stop aria-label="Like this hackathon">
      <svg class="hs-like-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
      </svg>
    </button>
    <span class="hs-card-cat">${tagLabel}</span>
    <div class="hs-card-body">
      <span class="hs-card-organizer">${orgName}</span>
      <h3 class="hs-card-name">${h.title}</h3>
      <div class="hs-card-meta">
        <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px; opacity: 0.85;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>${h.startDate || (h.month + ' ' + h.day)}</span>
        <span>${h.prize || ''}</span>
      </div>
      <button class="hs-card-btn ${isR?'registered':''}" data-stop data-explore-id="${h.id}">${isR?'✓ Registered':'Explore →'}</button>
    </div>
  `;

  /* Like button click handler */
  const likeBtn = card.querySelector('.hs-like-btn');
  likeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (window.HackState && !window.HackState.isLoggedIn()) {
      if (window.HackToast && window.HackToast.show) {
        window.HackToast.show('Please login to add to wishlist', 'info');
      }
      if (window.HackModals && window.HackModals.openLogin) {
        window.HackModals.openLogin();
      }
      return;
    }
    const active = toggleLikeEvent(h.id);
    // update all clones of this card in the track
    const allButtonsForId = document.querySelectorAll(`.hs-card[data-id="${h.id}"] .hs-like-btn`);
    allButtonsForId.forEach(btn => {
      if (active) {
        btn.classList.add('liked');
      } else {
        btn.classList.remove('liked');
      }
    });
  });

  /* Explore button → open detail page */
  const exploreBtn = card.querySelector('[data-explore-id]');
  if (exploreBtn) {
    exploreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.HackDetail && window.HackDetail.show) {
        window.HackDetail.show(h.id);
      } else {
        window.location.href = 'hackathon.html#hackathon/' + h.id;
      }
    });
  }

  /* open detail page on card click */
  card.addEventListener('click', (e) => {
    if (e.target.closest('[data-stop]')) return;
    if (window.HackDetail && window.HackDetail.show) {
      window.HackDetail.show(h.id);
    } else {
      window.location.href = 'hackathon.html#hackathon/' + h.id;
    }
  });

  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      if (e.target.closest('[data-stop]')) return;
      if (window.HackDetail && window.HackDetail.show) {
        window.HackDetail.show(h.id);
      } else {
        window.location.href = 'hackathon.html#hackathon/' + h.id;
      }
    }
  });

  return card;
}


/* ── POPULATE TRACK with 3× duplication for seamless loop ── */
const track = document.getElementById('hsTrack');
const wrap  = document.getElementById('hsTrackWrap');

// Three copies so the loop never shows a gap
[...HACKATHONS, ...HACKATHONS, ...HACKATHONS].forEach(h => {
  track.appendChild(buildCard(h));
});

/* After DOM paint, set the CSS custom property for scroll distance
   = width of ONE full set of cards (1/3 of total track width) */
requestAnimationFrame(() => {
  const setW = track.scrollWidth / 3;
  track.style.setProperty('--scroll-dist', `-${setW}px`);
});

/* ── PAUSE ON HOVER ── */
wrap.addEventListener('mouseenter', () => wrap.classList.add('hs-paused'));
wrap.addEventListener('mouseleave', () => wrap.classList.remove('hs-paused'));

/* ── PAUSE ON TOUCH / FOCUS INSIDE ── */
wrap.addEventListener('touchstart', () => wrap.classList.add('hs-paused'), { passive: true });
wrap.addEventListener('touchend',   () => setTimeout(() => wrap.classList.remove('hs-paused'), 1200));

/* ── MODAL ── */
const overlay    = document.getElementById('hmOverlay');
const modal      = document.getElementById('hmModal');
const closeBtn   = document.getElementById('hmClose');
const hmImg      = document.getElementById('hmImg');
const hmCategory = document.getElementById('hmCategory');
const hmOrg      = document.getElementById('hmOrganizer');
const hmTitle    = document.getElementById('hmTitle');
const hmStats    = document.getElementById('hmStats');
const hmReg      = document.getElementById('hmRegister');

function openModal(h) {
  hmImg.src        = h.image || '';
  hmImg.alt        = h.title;
  hmCategory.textContent = (h.tags && h.tags[0]) || h.category || '';
  hmOrg.textContent      = h.organiser || h.organizer || '';
  hmTitle.textContent    = h.title;

  // Make Register Now button open detail page
  hmReg.href = '#';
  hmReg.onclick = function (e) {
    e.preventDefault();
    closeModal();
    if (window.HackDetail && window.HackDetail.show) {
      window.HackDetail.show(h.id);
    } else {
      window.location.href = 'hackathon.html#hackathon/' + h.id;
    }
  };

  const dateStr = h.startDate || ((h.month || '') + ' ' + (h.day || ''));
  const formatStr = h.format ? (h.format === 'online' ? 'Online' : 'Hybrid') : (h.location || '');
  const orgName = h.organiser || h.organizer || '';

  hmStats.innerHTML = `
    <div class="hm-stat">
      <span class="hm-stat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"></path><path d="M12 2a6 6 0 0 1 6 6v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8a6 6 0 0 1 6-6z"></path></svg></span>
      <span class="hm-stat-val">${h.prize || ''}</span>
      <span class="hm-stat-lbl">Prize Pool</span>
    </div>
    <div class="hm-stat">
      <span class="hm-stat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></span>
      <span class="hm-stat-val">${h.fee === 0 ? 'Free' : '₹' + h.fee}</span>
      <span class="hm-stat-lbl">Entry Fee</span>
    </div>
    <div class="hm-stat">
      <span class="hm-stat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span>
      <span class="hm-stat-val">${dateStr}</span>
      <span class="hm-stat-lbl">Date</span>
    </div>
    <div class="hm-stat">
      <span class="hm-stat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></span>
      <span class="hm-stat-val">${formatStr}</span>
      <span class="hm-stat-lbl">Format</span>
    </div>
    <div class="hm-stat">
      <span class="hm-stat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg></span>
      <span class="hm-stat-val">${(h.tags && h.tags.join(', ')) || h.category || ''}</span>
      <span class="hm-stat-lbl">Tracks</span>
    </div>
    <div class="hm-stat">
      <span class="hm-stat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="9" y2="16"></line><line x1="15" y1="22" x2="15" y2="16"></line><line x1="9" y1="16" x2="15" y2="16"></line><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M12 6h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"></path></svg></span>
      <span class="hm-stat-val">${orgName}</span>
      <span class="hm-stat-lbl">Organiser</span>
    </div>
  `;

  overlay.classList.add('open');
  wrap.classList.add('hs-paused');
  document.body.style.overflow = 'hidden';
  closeBtn.focus();
}


function closeModal() {
  overlay.classList.remove('open');
  document.body.style.overflow = '';
  // resume scroll only if mouse not over track
  if (!wrap.matches(':hover')) wrap.classList.remove('hs-paused');
}

closeBtn.addEventListener('click', closeModal);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

window.addEventListener('wishlistUpdated', (e) => {
  const id = e.detail;
  const cards = document.querySelectorAll(`.hs-card[data-id="${id}"]`);
  cards.forEach(card => {
    const btn = card.querySelector('.hs-like-btn');
    if (btn) {
      if (isLikedEvent(id)) {
        btn.classList.add('liked');
        btn.querySelector('svg').setAttribute('fill', 'currentColor');
      } else {
        btn.classList.remove('liked');
        btn.querySelector('svg').setAttribute('fill', 'none');
      }
    }
  });
});