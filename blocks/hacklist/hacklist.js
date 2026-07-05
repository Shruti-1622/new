const WISH_KEY = 'hackhub_wishlist';

function getWishList() {
  try { return JSON.parse(localStorage.getItem(WISH_KEY)) || []; } catch { return []; }
}

function removeFromWishList(id) {
  const list = getWishList().filter((x) => x !== id);
  localStorage.setItem(WISH_KEY, JSON.stringify(list));
}

async function parseDetailPage(id) {
  try {
    const res = await fetch(`${id}.plain.html`);
    if (!res.ok) return null;
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const table = [...doc.querySelectorAll('table')].find(
      (t) => t.querySelector('td')?.textContent.trim().toLowerCase() === 'hackathon-detail',
    );
    if (!table) return null;
    const data = {};
    [...table.querySelectorAll('tr')].forEach((row) => {
      const cells = [...row.querySelectorAll('td')];
      if (cells.length !== 2) return;
      const key = cells[0].textContent.trim().toLowerCase();
      const val = cells[1].textContent.trim();
      if (key && key !== 'hackathon-detail') data[key] = val;
    });
    return data;
  } catch { return null; }
}

function buildCard(h) {
  const card = document.createElement('div');
  card.className = 'hl-card';
  const tags = (h.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
  const tagsHtml = tags.slice(0, 3).map((t) => `<span class="hl-tag">${t}</span>`).join('');
  const isLive = h.status?.toLowerCase() === 'live';

  card.innerHTML = `
    <div class="hl-card-top">
      <div class="hl-badges">
        ${h.status ? `<span class="hl-status${isLive ? ' hl-live' : ''}">${isLive ? '<span class="hl-dot"></span>' : ''}${h.status.toUpperCase()}</span>` : ''}
        ${tagsHtml}
      </div>
      <button class="hl-heart" aria-label="Remove from wishlist">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </button>
    </div>
    <div class="hl-card-body">
      <p class="hl-organiser">${h.organiser || h.organizer || ''}</p>
      <h3 class="hl-title">${h.title || ''}</h3>
      <div class="hl-meta">
        ${h.prize ? `<span class="hl-prize">${h.prize}</span>` : ''}
        ${h.date ? `<span class="hl-date">${h.date}</span>` : ''}
        ${h.format ? `<span class="hl-format">${h.format}</span>` : ''}
      </div>
    </div>`;

  card.addEventListener('click', (e) => {
    if (e.target.closest('.hl-heart')) return;
    window.location.href = h.id;
  });

  card.querySelector('.hl-heart').addEventListener('click', (e) => {
    e.stopPropagation();
    removeFromWishList(h.id);
    card.classList.add('hl-fade-out');
    card.addEventListener('animationend', () => {
      card.remove();
      const grid = document.getElementById('hl-grid');
      if (grid && !grid.querySelector('.hl-card')) renderEmpty(grid);
    }, { once: true });
  });

  return card;
}

function renderEmpty(grid) {
  grid.innerHTML = `
    <div class="hl-empty">
      <div class="hl-empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </div>
      <h3>No saved hackathons yet</h3>
      <p>Explore upcoming hackathons and click the ❤ icon to save them here.</p>
      <a href="/hackathon" class="hl-browse-btn">Explore Hackathons →</a>
    </div>`;
}

export default async function decorate(block) {
  if (!document.getElementById('hl-fonts')) {
    const link = document.createElement('link');
    link.id = 'hl-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&display=swap';
    document.head.appendChild(link);
  }

  document.body.classList.add('hl-page');

  block.innerHTML = `
    <div class="hl-wrap">
      <div class="hl-header">
        <span class="hl-eyebrow">My Favorites</span>
        <h1 class="hl-page-title">Your Saved <span>Hackathons</span></h1>
        <p class="hl-sub">Click any card to view details, or click ❤ to remove.</p>
      </div>
      <div class="hl-grid" id="hl-grid">
        <div class="hl-loading">Loading your wishlist…</div>
      </div>
    </div>`;

  const grid = block.querySelector('#hl-grid');
  const wishList = getWishList();

  if (wishList.length === 0) {
    renderEmpty(grid);
    return;
  }

  const results = await Promise.all(wishList.map(async (id) => {
    const data = await parseDetailPage(id);
    return data ? { id, ...data } : null;
  }));

  const valid = results.filter(Boolean);
  grid.innerHTML = '';

  if (valid.length === 0) {
    renderEmpty(grid);
    return;
  }

  valid.forEach((h) => grid.appendChild(buildCard(h)));
}
