/* ============================================================
   gallery.js — Hall of Fame
   Fetches data/winners.json, renders all dynamic content
   ============================================================ */

(function () {
  'use strict';

  // ── STAR FIELD ──────────────────────────────────────────────
  function initStarField() {
    const sf = document.getElementById('starField');
    if (!sf) return;
    for (let i = 0; i < 80; i++) {
      const s = document.createElement('div');
      s.className = 'hof-star';
      s.style.cssText = [
        `left:${Math.random() * 100}%`,
        `top:${Math.random() * 100}%`,
        `width:${Math.random() * 2 + 1}px`,
        `height:${Math.random() * 2 + 1}px`,
        `animation-delay:${Math.random() * 4}s`,
        `opacity:${Math.random() * 0.5 + 0.1}`
      ].join(';');
      sf.appendChild(s);
    }
  }

  // ── SCROLL REVEAL (hero) ─────────────────────────────────────
  function initHeroReveal() {
    const targets = document.querySelectorAll('.hof-hero-content, .hof-stats-bar');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('sl-visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });
    targets.forEach(el => obs.observe(el));
  }

  // ── SCROLL REVEAL (cards) ────────────────────────────────────
  function observeReveal(root) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('revealed');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    root.querySelectorAll('.reveal').forEach(el => obs.observe(el));
  }

  // ── STATS BAR ───────────────────────────────────────────────
  function renderStats(stats) {
    const items = [
      { num: stats.editions, label: 'Editions' },
      { num: stats.totalWinners, label: 'Total Winners' },
      { num: stats.prizeDistributed, label: 'Prize Distributed' },
      { num: stats.startupsBorn, label: 'Startups Born' }
    ];

    const bar = document.getElementById('hofStatsBar');
    if (!bar) return;

    bar.innerHTML = items.map((item, i) => `
      <div class="hof-stat">
        <span class="hof-stat-num">${item.num}</span>
        <span class="hof-stat-label">${item.label}</span>
      </div>
      ${i < items.length - 1 ? '<div class="hof-stat-div"></div>' : ''}
    `).join('');
  }

  function getPrizeSvg(prize) {
    if (prize === '🥇') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffd700" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><circle cx="12" cy="12" r="10"></circle><path d="M8 12h8M12 8v8"></path></svg>`;
    }
    if (prize === '🥈') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c0c0c0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><circle cx="12" cy="12" r="10"></circle><path d="M8 12h8M12 8v8"></path></svg>`;
    }
    if (prize === '🥉') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#cd7f32" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><circle cx="12" cy="12" r="10"></circle><path d="M8 12h8M12 8v8"></path></svg>`;
    }
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><circle cx="12" cy="12" r="10"></circle><path d="M8 12h8M12 8v8"></path></svg>`;
  }

  // ── SPOTLIGHT ────────────────────────────────────────────────
  function renderSpotlight(s) {
    const wrap = document.getElementById('hofSpotlightCard');
    if (!wrap) return;

    wrap.innerHTML = `
      <div class="hof-spotlight-img-wrap">
        <img src="${s.img}" alt="${s.project}">
        <div class="hof-spotlight-rank">#${s.rank}</div>
        <div class="hof-spotlight-glow"></div>
      </div>
      <div class="hof-spotlight-info">
        <div class="hof-winner-badge">${getPrizeSvg(s.prize)} ${s.label}</div>
        <h2 class="hof-spotlight-title">${s.project}</h2>
        <p class="hof-spotlight-team">by <strong>${s.team}</strong> — ${s.members}</p>
        <p class="hof-spotlight-desc">${s.desc}</p>
        <div class="hof-spotlight-tags">
          ${s.tags.map(t => `<span class="hof-tag">${t}</span>`).join('')}
        </div>
        <div class="hof-spotlight-meta">
          <span class="mono hof-prize">${s.amount}</span>
          <span class="hof-dot-sep">·</span>
          <span class="mono">${s.hackathon} · ${s.city}</span>
        </div>
        <div class="hof-spotlight-actions">
          <a href="${s.projectUrl}" class="hof-btn-primary">View Project →</a>
        </div>
      </div>
    `;
  }

  // ── WINNERS GRID ─────────────────────────────────────────────
  let allWinners = [];

  function ribbonLabel(rank) {
    if (rank === 1) return 'WINNER';
    if (rank === 2) return '2nd PLACE';
    if (rank === 3) return '3rd PLACE';
    return 'FINALIST';
  }

  function renderGrid(filter) {
    const grid = document.getElementById('hofGrid');
    if (!grid) return;

    const filtered = filter === 'all'
      ? allWinners
      : allWinners.filter(w => w.year === filter || w.track === filter);

    grid.innerHTML = filtered.map(w => `
      <div class="hof-card reveal" data-year="${w.year}" data-track="${w.track}">
        <div class="hof-card-img-wrap">
          <img src="${w.img}" alt="${w.project}" loading="lazy">
          <div class="hof-card-rank">${getPrizeSvg(w.prize)}</div>
          <div class="hof-card-ribbon">${ribbonLabel(w.rank)}</div>
        </div>
        <div class="hof-card-body">
          <div class="hof-card-meta mono">${w.hackathon} · ${w.year}</div>
          <h3 class="hof-card-title">${w.project}</h3>
          <p class="hof-card-team">${w.team}</p>
          <p class="hof-card-desc">${w.desc}</p>
          <div class="hof-card-tags">
            ${w.tags.map(t => `<span class="hof-tag-sm">${t}</span>`).join('')}
          </div>
          <div class="hof-card-footer">
            <span class="hof-card-prize mono">${w.amount}</span>
            <a href="#" class="hof-card-link">View →</a>
          </div>
        </div>
      </div>
    `).join('');

    observeReveal(grid);
  }

  // ── FILTER BUTTONS ───────────────────────────────────────────
  function initFilters() {
    document.querySelectorAll('.hof-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.hof-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderGrid(btn.dataset.filter);
      });
    });
  }

  // ── MOMENTS GALLERY ──────────────────────────────────────────
  function renderMoments(moments) {
    const masonry = document.getElementById('hofMasonry');
    if (!masonry) return;

    masonry.innerHTML = moments.map(m => `
      <div class="hof-moment-item ${m.classes}">
        <img src="${m.img}" alt="${m.caption}" loading="lazy">
        <div class="hof-moment-overlay"><span>${m.caption}</span></div>
      </div>
    `).join('');
  }

  // ── HAMBURGER NAV ────────────────────────────────────────────
  function initNav() {
    const btn = document.getElementById('hamburger');
    if (btn) {
      btn.addEventListener('click', () => {
        document.querySelector('.nav-links').classList.toggle('open');
      });
    }
  }

  // ── MAIN: FETCH + RENDER ─────────────────────────────────────
  async function init() {
    initStarField();
    initHeroReveal();
    initNav();
    initFilters();

    try {
      const res = await fetch('/data/projects.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      renderStats(data.stats);
      renderSpotlight(data.spotlight);

      allWinners = data.winners;
      renderGrid('all');

      renderMoments(data.moments);
    } catch (err) {
      console.error('Failed to load winners data:', err);
      const grid = document.getElementById('hofGrid');
      if (grid) {
        grid.innerHTML = `<p style="color:#808080;grid-column:1/-1;text-align:center;padding:2rem;">
          Could not load data. Make sure winners.json is being served correctly.
        </p>`;
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
