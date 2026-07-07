// ── localStorage helpers (shared by both carousel and saved variant) ──────────
// hh-saved stores full card objects so the saved page can render without re-fetching
function getSaved() {
  try { return JSON.parse(localStorage.getItem('hh-saved') || '[]'); } catch { return []; }
}
function isCardSaved(key) {
  return getSaved().some((c) => c.key === key);
}
function saveCard(data) {
  const saved = getSaved();
  if (!saved.find((c) => c.key === data.key)) {
    saved.push(data);
    localStorage.setItem('hh-saved', JSON.stringify(saved));
    window.dispatchEvent(new CustomEvent('hh:saved-change', { detail: { key: data.key, saved: true } }));
  }
}
function unsaveCard(key) {
  const saved = getSaved().filter((c) => c.key !== key);
  localStorage.setItem('hh-saved', JSON.stringify(saved));
  window.dispatchEvent(new CustomEvent('hh:saved-change', { detail: { key, saved: false } }));
}

// ── SAVED VARIANT ─────────────────────────────────────────────────────────────
function decorateSaved(block) {
  const section = block.closest('.section');
  if (section) {
    section.style.setProperty('margin', '0', 'important');
    section.style.setProperty('background', '#0a0a0a', 'important');
  }
  const wrapper = block.parentElement;
  if (wrapper) { wrapper.style.maxWidth = '100%'; wrapper.style.padding = '0'; }

  if (!document.querySelector('link[data-font="hc-fonts"], link[data-font="bebas-neue"]')) {
    const pc1 = document.createElement('link'); pc1.rel = 'preconnect'; pc1.href = 'https://fonts.googleapis.com';
    const pc2 = document.createElement('link'); pc2.rel = 'preconnect'; pc2.href = 'https://fonts.gstatic.com'; pc2.crossOrigin = '';
    const fl = document.createElement('link'); fl.rel = 'stylesheet';
    fl.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap';
    fl.dataset.font = 'hc-fonts';
    document.head.append(pc1, pc2, fl);
  }

  // Optional config row: | cta-href | cta-label |
  const cfgRows = [...block.children];
  let ctaHref = '/hackathons';
  let ctaLabel = 'Explore Hackathons';
  if (cfgRows.length) {
    const cells = [...cfgRows[0].children];
    const link = cfgRows[0].querySelector('a');
    if (link) { ctaHref = link.href; ctaLabel = link.textContent.trim() || ctaLabel; }
    else if (cells[0]?.textContent.trim()) ctaHref = cells[0].textContent.trim();
    if (cells[1]?.textContent.trim()) ctaLabel = cells[1].textContent.trim();
  }

  // Build a single card element (same visual as carousel cards)
  function buildCard(d) {
    const card = document.createElement('div');
    card.className = 'hc-card';
    card.dataset.key = d.key;
    card.dataset.href = d.href || '#';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.innerHTML = `
      ${d.imgSrc ? `<div class="hc-card-img" role="img" aria-label="${d.imgAlt || ''}" style="background-image:url('${d.imgSrc}')"></div>` : ''}
      <div class="hc-card-scrim"></div>
      <button class="hc-like-btn liked" aria-label="Remove from saved" type="button">
        <svg class="hc-like-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
          fill="currentColor" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
      <span class="hc-card-cat">${d.tag || ''}</span>
      <div class="hc-card-body">
        <span class="hc-card-organizer">${d.org || ''}</span>
        <h3 class="hc-card-name">${d.title || ''}</h3>
        <div class="hc-card-meta">
          <span>${d.date || ''}</span>
          ${d.prize ? `<span>${d.prize}</span>` : ''}
        </div>
        <span class="hc-card-btn">Explore →</span>
      </div>`;
    return card;
  }

  function buildEmpty() {
    const el = document.createElement('div');
    el.className = 'hc-saved-empty';
    el.innerHTML = `
      <svg width="60" height="60" viewBox="0 0 24 24" fill="none"
        stroke="rgba(255,255,255,0.28)" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
      <p class="hc-saved-empty-title">No saved hackathons yet</p>
      <p class="hc-saved-empty-sub">Explore the list of upcoming hackathons and click the heart icon to save them here for quick access.</p>
      <a class="hc-saved-empty-btn" href="${ctaHref}">${ctaLabel.toUpperCase()} →</a>`;
    return el;
  }

  // Render or re-render the full grid from localStorage
  function render() {
    block.innerHTML = '';
    const saved = getSaved();

    if (!saved.length) {
      block.append(buildEmpty());
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'hc-saved-grid';
    saved.forEach((d) => grid.append(buildCard(d)));
    block.append(grid);

    // Event delegation — heart unsaves, card navigates
    grid.addEventListener('click', (e) => {
      const likeBtn = e.target.closest('.hc-like-btn');
      if (likeBtn) {
        e.stopPropagation();
        const card = likeBtn.closest('.hc-card');
        if (!card?.dataset.key) return;
        // Animate out then remove
        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.92)';
        setTimeout(() => {
          unsaveCard(card.dataset.key);
        }, 280);
        return;
      }
      const card = e.target.closest('.hc-card');
      if (card?.dataset.href && card.dataset.href !== '#') {
        window.open(card.dataset.href, '_blank', 'noopener');
      }
    });

    grid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.hc-card');
      if (card?.dataset.href && card.dataset.href !== '#') {
        window.open(card.dataset.href, '_blank', 'noopener');
      }
    });
  }

  render();

  // Real-time: same-tab updates (fired by carousel save/unsave)
  window.addEventListener('hh:saved-change', render);

  // Real-time: cross-tab updates via storage event
  window.addEventListener('storage', (e) => {
    if (e.key === 'hh-saved') render();
  });
}

// Computed once per card at render time (not a ticking timer) — a deadline
// that's days away doesn't need per-second updates, and this avoids running
// per-card intervals across the whole (tripled, for the infinite scroll) carousel.
function formatCountdown(deadlineStr) {
  if (!deadlineStr) return null;
  const deadline = new Date(deadlineStr);
  if (Number.isNaN(deadline.getTime())) return null;
  const msLeft = deadline.getTime() - Date.now();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { text: 'Closed', urgent: false, closed: true };
  if (daysLeft === 0) return { text: 'Closes today', urgent: true, closed: false };
  if (daysLeft === 1) return { text: '1 day left', urgent: true, closed: false };
  return { text: `${daysLeft} days left`, urgent: daysLeft <= 3, closed: false };
}

// Reads the logged-in student's saved profile skills once (cheap, synchronous,
// no network). Returns [] if not logged in / no skills saved, in which case
// the match badge is simply not shown (see computeSkillMatch below).
function getUserSkills() {
  try {
    const email = (localStorage.getItem('currentUserEmail') || '').trim().toLowerCase();
    let profile = null;
    if (email) {
      const profiles = JSON.parse(localStorage.getItem('hk_profiles') || '{}');
      profile = profiles[email];
    }
    if (!profile) profile = JSON.parse(localStorage.getItem('hk_profile') || 'null');
    const { skills } = profile || {};
    if (Array.isArray(skills)) return skills.map((s) => s.toLowerCase().trim()).filter(Boolean);
    if (typeof skills === 'string') return skills.split(',').map((s) => s.toLowerCase().trim()).filter(Boolean);
    return [];
  } catch {
    return [];
  }
}

// Simple containment match: how many of the student's own skills appear
// anywhere in the hackathon's (freeform) skills text. No badge if the
// student has no saved skills or the hackathon lists none.
function computeSkillMatch(userSkills, hackathonSkillsText) {
  if (!userSkills.length || !hackathonSkillsText) return null;
  const haystack = hackathonSkillsText.toLowerCase();
  const matched = userSkills.filter((s) => haystack.includes(s));
  if (!matched.length) return null;
  return Math.round((matched.length / userSkills.length) * 100);
}

// ── Parse a fetched hackathon detail page and extract card data ───────────────
function parseDetailPage(html, slug, userSkills) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const data = {};
  doc.querySelectorAll('div').forEach((div) => {
    const kids = [...div.children];
    if (kids.length !== 2) return;
    const key = kids[0]?.textContent.trim().toLowerCase();
    if (['title', 'image', 'organiser', 'organizer', 'date', 'prize', 'tags', 'deadline', 'skills'].includes(key)) {
      data[key] = kids[1];
    }
  });
  const img = data.image?.querySelector('img');
  return {
    key: slug,
    id: slug,
    imgSrc: img?.src || '',
    imgAlt: data.title?.textContent.trim() || '',
    title: data.title?.textContent.trim() || '',
    org: (data.organiser || data.organizer)?.textContent.trim() || '',
    tag: (data.tags?.textContent.trim() || '').split(',')[0].trim(),
    date: data.date?.textContent.trim() || '',
    prize: data.prize?.textContent.trim() || '',
    countdown: formatCountdown(data.deadline?.textContent.trim()),
    matchPct: computeSkillMatch(userSkills, data.skills?.textContent.trim()),
    href: `/hackathons/${slug}`,
  };
}

// ── CAROUSEL (main) ───────────────────────────────────────────────────────────
export default async function decorate(block) {
  if (block.classList.contains('saved')) {
    decorateSaved(block);
    return;
  }

  // Zero EDS section margin + wrapper
  const section = block.closest('.section');
  if (section) section.style.setProperty('margin', '0', 'important');
  const wrapper = block.parentElement;
  if (wrapper) { wrapper.style.maxWidth = '100%'; wrapper.style.padding = '0'; }

  if (!document.querySelector('link[data-font="hc-fonts"]')) {
    const pc1 = document.createElement('link'); pc1.rel = 'preconnect'; pc1.href = 'https://fonts.googleapis.com';
    const pc2 = document.createElement('link'); pc2.rel = 'preconnect'; pc2.href = 'https://fonts.gstatic.com'; pc2.crossOrigin = '';
    const fl = document.createElement('link'); fl.rel = 'stylesheet';
    fl.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap';
    fl.dataset.font = 'hc-fonts';
    document.head.append(pc1, pc2, fl);
  }

  // Each row = one slug pointing to a /hackathons/[slug] da.live page
  // Last row with a link = "View All" CTA
  // One optional labeled row ("Recommended Title" | text) overrides the
  // "Recommended For You" heading -- exact key match, same convention every
  // other block's config rows use, so it can't be confused with a slug row.
  const rows = [...block.children];
  let viewAllHref = '/hackathons';
  let viewAllLabel = 'View All Events';
  let recommendedTitle = 'Recommended For You';
  const slugs = [];

  rows.forEach((row) => {
    const cells = [...row.children];
    const key = cells[0]?.textContent.trim().toLowerCase().replace(/\s+/g, '-');
    if (key === 'recommended-title') {
      recommendedTitle = cells[1]?.textContent.trim() || recommendedTitle;
      return;
    }
    const linkEl = row.querySelector('a');
    if (linkEl) {
      viewAllHref = linkEl.href;
      viewAllLabel = linkEl.textContent.trim() || viewAllLabel;
      return;
    }
    const slug = cells[0]?.textContent.trim();
    if (slug) slugs.push(slug);
  });

  // Read once, reused for every card — avoids re-parsing localStorage per card.
  const userSkills = getUserSkills();

  // Fetch all detail pages in parallel and extract card data from da.live content
  const results = await Promise.all(slugs.map(async (slug) => {
    try {
      const resp = await fetch(`/hackathons/${slug}.plain.html`);
      if (!resp.ok) return null;
      return parseDetailPage(await resp.text(), slug, userSkills);
    } catch { return null; }
  }));
  const cardsData = results.filter(Boolean);

  // Build card HTML string — heart state driven by hh-saved
  function cardHTML(d) {
    const saved = isCardSaved(d.key);
    const heart = saved ? `fill="currentColor" stroke="currentColor"` : `fill="none" stroke="currentColor"`;
    return `
      <div class="hc-card" data-key="${d.key}" data-href="${d.href}" role="button" tabindex="0">
        ${d.imgSrc ? `<div class="hc-card-img" role="img" aria-label="${d.imgAlt}" style="background-image:url('${d.imgSrc}')"></div>` : '<div class="hc-card-img hc-card-img-placeholder"></div>'}
        <div class="hc-card-scrim"></div>
        <button class="hc-like-btn${saved ? ' liked' : ''}" aria-label="Save hackathon" type="button">
          <svg class="hc-like-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${heart} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
        ${d.matchPct !== null ? `<span class="hc-skill-match">${d.matchPct}% Match</span>` : ''}
        <span class="hc-card-cat">${d.tag}</span>
        <div class="hc-card-body">
          <span class="hc-card-organizer">${d.org}</span>
          <h3 class="hc-card-name">${d.title}</h3>
          <div class="hc-card-meta">
            <span>${d.date}</span>
            ${d.prize ? `<span>${d.prize}</span>` : ''}
            ${d.countdown ? `<span class="hc-countdown${d.countdown.urgent ? ' hc-countdown-urgent' : ''}${d.countdown.closed ? ' hc-countdown-closed' : ''}">${d.countdown.text}</span>` : ''}
          </div>
          <span class="hc-card-btn">Explore →</span>
        </div>
      </div>`;
  }

  // Build track: 3 copies for seamless infinite loop
  const track = document.createElement('div');
  track.className = 'hc-track';
  track.innerHTML = [0, 1, 2].map(() => cardsData.map((d) => cardHTML(d)).join('')).join('');

  const wrap = document.createElement('div');
  wrap.className = 'hc-track-wrap';
  wrap.appendChild(track);

  // CTA button — now a <button> that toggles the expanded grid
  const ctaWrap = document.createElement('div');
  ctaWrap.className = 'hc-cta';
  const ctaBtn = document.createElement('button');
  ctaBtn.className = 'hc-view-all-btn';
  ctaBtn.type = 'button';
  ctaBtn.textContent = viewAllLabel;
  ctaWrap.appendChild(ctaBtn);

  // Expandable "all events" section with search + event-card grid
  const allEventsEl = document.createElement('div');
  allEventsEl.className = 'hc-all-events';
  allEventsEl.innerHTML = `
    <div class="hc-all-events-inner">
      <div class="hc-search-wrap">
        <svg class="hc-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input class="hc-search-input" type="text"
          placeholder="Search hackathons by name, category, prize…" autocomplete="off">
        <button class="hc-search-clear" type="button" aria-label="Clear search">✕</button>
      </div>
      <div class="hc-event-grid"></div>
    </div>`;

  block.innerHTML = '';
  block.appendChild(wrap);
  block.appendChild(ctaWrap);
  block.appendChild(allEventsEl);

  requestAnimationFrame(() => {
    const setW = track.scrollWidth / 3;
    track.style.setProperty('--hc-scroll-dist', `-${setW}px`);
  });

  wrap.addEventListener('mouseenter', () => wrap.classList.add('hc-paused'));
  wrap.addEventListener('mouseleave', () => wrap.classList.remove('hc-paused'));
  wrap.addEventListener('touchstart', () => wrap.classList.add('hc-paused'), { passive: true });
  wrap.addEventListener('touchend', () => setTimeout(() => wrap.classList.remove('hc-paused'), 1200));

  // Heart click — save/unsave with full card data, sync all 3 cloned copies
  wrap.addEventListener('click', (e) => {
    const likeBtn = e.target.closest('.hc-like-btn');
    if (likeBtn) {
      e.stopPropagation();
      const card = likeBtn.closest('.hc-card');
      const key = card?.dataset.key;
      if (!key) return;

      const data = cardsData.find((d) => d.key === key);
      const nowSaved = !isCardSaved(key);

      if (nowSaved && data) saveCard(data);
      else unsaveCard(key);

      // Update all 3 cloned copies of this card visually
      track.querySelectorAll(`.hc-card[data-key="${key}"] .hc-like-btn`).forEach((btn) => {
        btn.classList.toggle('liked', nowSaved);
        const svg = btn.querySelector('svg');
        if (svg) {
          svg.setAttribute('fill', nowSaved ? 'currentColor' : 'none');
          svg.setAttribute('stroke', 'currentColor');
        }
      });
      return;
    }

    const card = e.target.closest('.hc-card');
    if (card?.dataset.href && card.dataset.href !== '#') {
      window.location.href = card.dataset.href;
    }
  });

  wrap.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.hc-card');
    if (card?.dataset.href && card.dataset.href !== '#') {
      window.location.href = card.dataset.href;
    }
  });

  // If saved state changes from another tab, re-sync heart states on this carousel
  window.addEventListener('storage', (e) => {
    if (e.key !== 'hh-saved') return;
    cardsData.forEach((d) => {
      const nowSaved = isCardSaved(d.key);
      track.querySelectorAll(`.hc-card[data-key="${d.key}"] .hc-like-btn`).forEach((btn) => {
        btn.classList.toggle('liked', nowSaved);
        const svg = btn.querySelector('svg');
        if (svg) svg.setAttribute('fill', nowSaved ? 'currentColor' : 'none');
      });
    });
  });

  // ── "View All Events" expanded grid ──────────────────────────────────────────
  const searchInput = allEventsEl.querySelector('.hc-search-input');
  const searchClear = allEventsEl.querySelector('.hc-search-clear');
  const eventGrid = allEventsEl.querySelector('.hc-event-grid');

  function parseDate(dateStr) {
    const parts = (dateStr || '').trim().split(/[\s,]+/);
    return {
      month: (parts[0] || 'TBA').substring(0, 3).toUpperCase(),
      day: (parts[1] || '--').replace(',', ''),
    };
  }

  function renderEventCards(data) {
    eventGrid.innerHTML = '';
    if (!data.length) {
      eventGrid.innerHTML = '<p class="hc-no-results">No hackathons found matching your search.</p>';
      return;
    }
    data.forEach((d, idx) => {
      const { month, day } = parseDate(d.date);
      const card = document.createElement('div');
      card.className = 'hc-event-card';
      card.style.animationDelay = `${idx * 0.05}s`;
      card.innerHTML = `
        <div class="hc-ec-image${d.imgSrc ? '' : ' hc-ec-image--placeholder'}">
          ${d.imgSrc ? `<img src="${d.imgSrc}" alt="${d.imgAlt}" loading="lazy">` : ''}
        </div>
        <div class="hc-ec-content">
          <div class="hc-ec-date-box">
            <div class="hc-ec-month">${month}</div>
            <div class="hc-ec-day">${day}</div>
          </div>
          <div class="hc-ec-details">
            <div class="hc-ec-location">${d.tag || 'Open'}</div>
            <div class="hc-ec-title">${d.title}</div>
            <div class="hc-ec-desc">${d.org}${d.prize ? ` · ${d.prize}` : ''}</div>
          </div>
        </div>`;
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => {
        window.location.href = d.href || `/hackathon-detail?id=${d.id}`;
      });
      eventGrid.appendChild(card);
    });
  }

  let allOpen = false;
  ctaBtn.addEventListener('click', () => {
    allOpen = !allOpen;
    allEventsEl.classList.toggle('open', allOpen);
    ctaBtn.textContent = allOpen ? 'Show Less' : viewAllLabel;
    if (allOpen) {
      if (!eventGrid.children.length) renderEventCards(cardsData);
      setTimeout(() => {
        allEventsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        searchInput.focus();
      }, 150);
    } else {
      searchInput.value = '';
      searchClear.classList.remove('hc-search-clear--visible');
      renderEventCards(cardsData);
      wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase().trim();
    searchClear.classList.toggle('hc-search-clear--visible', q.length > 0);
    const filtered = cardsData.filter((d) => (
      d.title.toLowerCase().includes(q)
      || d.org.toLowerCase().includes(q)
      || d.tag.toLowerCase().includes(q)
      || d.prize.toLowerCase().includes(q)
    ));
    renderEventCards(filtered);
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.remove('hc-search-clear--visible');
    renderEventCards(cardsData);
    searchInput.focus();
  });

  // ── "Recommended For You" — same skill-match score already computed for
  // the badge on each card, just filtered to a high-confidence threshold and
  // shown as its own section below everything else this block renders.
  // Only shows up for a logged-in student with matching skills; otherwise
  // there's nothing to recommend and the section is simply not built.
  const RECOMMEND_THRESHOLD = 70;
  const recommended = cardsData.filter((d) => d.matchPct !== null && d.matchPct >= RECOMMEND_THRESHOLD);

  if (recommended.length) {
    const recSection = document.createElement('div');
    recSection.className = 'hc-recommended';
    recSection.innerHTML = `
      <h2 class="hc-recommended-title">${recommendedTitle}</h2>
      <p class="hc-recommended-sub">Hackathons that best match the skills on your profile.</p>
      <div class="hc-event-grid hc-recommended-grid"></div>`;
    const recGrid = recSection.querySelector('.hc-recommended-grid');

    recommended.forEach((d) => {
      const { month, day } = parseDate(d.date);
      const card = document.createElement('div');
      card.className = 'hc-event-card';
      card.innerHTML = `
        <div class="hc-ec-image${d.imgSrc ? '' : ' hc-ec-image--placeholder'}">
          ${d.imgSrc ? `<img src="${d.imgSrc}" alt="${d.imgAlt}" loading="lazy">` : ''}
        </div>
        <div class="hc-ec-content">
          <div class="hc-ec-date-box">
            <div class="hc-ec-month">${month}</div>
            <div class="hc-ec-day">${day}</div>
          </div>
          <div class="hc-ec-details">
            <span class="hc-skill-match-inline">${d.matchPct}% Match</span>
            <div class="hc-ec-location">${d.tag || 'Open'}</div>
            <div class="hc-ec-title">${d.title}</div>
            <div class="hc-ec-desc">${d.org}${d.prize ? ` · ${d.prize}` : ''}</div>
          </div>
        </div>`;
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => { window.location.href = d.href; });
      recGrid.appendChild(card);
    });

    block.appendChild(recSection);
  }
}
