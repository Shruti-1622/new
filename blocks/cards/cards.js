import { createOptimizedPicture } from '../../scripts/aem.js';

// ── HOF VARIANT ───────────────────────────────────────────────────────────────
function decorateHof(block) {
  // Guard against double-decoration re-appending the filter pills a second
  // time -- aem.js's loadBlock() already guards against this in the normal
  // path, but this makes the symptom impossible regardless of what triggers
  // a second call.
  if (block.dataset.hofDecorated) return;
  block.dataset.hofDecorated = 'true';

  // EDS overrides + section background (#111111 must be set inline — lazy-styles may load late)
  const section = block.closest('.section');
  if (section) {
    section.style.setProperty('margin', '0', 'important');
    section.style.setProperty('background', '#111111', 'important');
    section.style.setProperty('padding-bottom', '100px', 'important');
  }
  const wrapper = block.parentElement;
  if (wrapper) { wrapper.style.maxWidth = '100%'; wrapper.style.padding = '0'; }

  // Font guard — load Bebas Neue + DM Mono if not already on page
  if (!document.querySelector('link[data-font="bebas-neue"], link[data-font="hc-fonts"], link[data-font="fb-fonts"], link[data-font="hof-fonts"]')) {
    const pc1 = document.createElement('link'); pc1.rel = 'preconnect'; pc1.href = 'https://fonts.googleapis.com';
    const pc2 = document.createElement('link'); pc2.rel = 'preconnect'; pc2.href = 'https://fonts.gstatic.com'; pc2.crossOrigin = '';
    const fl = document.createElement('link'); fl.rel = 'stylesheet';
    fl.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500;600&display=swap';
    fl.dataset.font = 'hof-fonts';
    document.head.append(pc1, pc2, fl);
  }

  // Medal SVG — color matches original gold/silver/bronze/gray
  function medalSvg(rank) {
    const stroke = { '1st': '#ffd700', '2nd': '#c0c0c0', '3rd': '#cd7f32' }[rank] || '#888';
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>`;
  }

  // Ribbon text
  function ribbonText(rank) {
    if (rank === '1st') return 'WINNER';
    if (rank === '2nd') return '2ND PLACE';
    if (rank === '3rd') return '3RD PLACE';
    return 'FINALIST';
  }

  // Parse rows. Two optional labeled rows (exact key match, same convention
  // as every other block's config rows) configure the year/track filter pills
  // built inline below -- everything else is positional card data.
  // Cell layout per card row:
  // [0]=image  [1]=rank("2nd")  [2]=meta("CloudFest 26 · 2026")
  // [3]=track("health")  [4]=title  [5]=team  [6]=desc
  // [7]=tags(comma-sep)  [8]=prize  [9]=link
  let yearOptions = ['All Editions', '2026', '2025', '2024'];
  let trackOptions = ['All Tracks', 'AI / ML', 'Web3', 'Health', 'Climate'];
  const cardRows = [];

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const key = cells[0]?.textContent.trim().toLowerCase().replace(/\s+/g, '-');
    if (key === 'year-filters') {
      yearOptions = (cells[1]?.textContent || '').split(',').map((s) => s.trim()).filter(Boolean);
      return;
    }
    if (key === 'track-filters') {
      trackOptions = (cells[1]?.textContent || '').split(',').map((s) => s.trim()).filter(Boolean);
      return;
    }
    cardRows.push(row);
  });

  const cardsData = cardRows.map((row) => {
    const c = [...row.children];
    const picture = c[0]?.querySelector('picture');
    const img = c[0]?.querySelector('img');
    const rank = c[1]?.textContent.trim().toLowerCase();
    const meta = c[2]?.textContent.trim();
    const year = meta?.split('·').pop()?.trim() || '';
    const track = c[3]?.textContent.trim().toLowerCase();
    const title = c[4]?.textContent.trim();
    const team = c[5]?.textContent.trim();
    const desc = c[6]?.textContent.trim();
    const tags = (c[7]?.textContent.trim() || '').split(',').map((t) => t.trim()).filter(Boolean);
    const prize = c[8]?.textContent.trim();
    const href = c[9]?.querySelector('a')?.href || '#';
    return { picture, img, rank, meta, year, track, title, team, desc, tags, prize, href };
  });

  // Build one card element
  function buildCard(d) {
    const card = document.createElement('div');
    card.className = 'hof-card';
    card.dataset.year = d.year;
    card.dataset.track = d.track;

    // ── Image wrap ────────────────────────────────────────────
    const imgWrap = document.createElement('div');
    imgWrap.className = 'hof-card-img-wrap';

    const media = d.picture || d.img;
    if (media) {
      const imgEl = media.tagName === 'PICTURE' ? media.querySelector('img') : media;
      if (imgEl) imgEl.removeAttribute('loading');
      imgWrap.append(media);
    }

    // Medal badge — top-left
    const rankBadge = document.createElement('div');
    rankBadge.className = 'hof-card-rank';
    rankBadge.innerHTML = medalSvg(d.rank);
    imgWrap.append(rankBadge);

    // Diagonal ribbon — top-right
    const ribbon = document.createElement('div');
    ribbon.className = 'hof-card-ribbon';
    ribbon.textContent = ribbonText(d.rank);
    imgWrap.append(ribbon);

    card.append(imgWrap);

    // ── Card body ─────────────────────────────────────────────
    const body = document.createElement('div');
    body.className = 'hof-card-body';

    const metaEl = document.createElement('div');
    metaEl.className = 'hof-card-meta';
    metaEl.textContent = d.meta;
    body.append(metaEl);

    const titleEl = document.createElement('h3');
    titleEl.className = 'hof-card-title';
    titleEl.textContent = d.title;
    body.append(titleEl);

    const teamEl = document.createElement('p');
    teamEl.className = 'hof-card-team';
    teamEl.textContent = d.team;
    body.append(teamEl);

    const descEl = document.createElement('p');
    descEl.className = 'hof-card-desc';
    descEl.textContent = d.desc;
    body.append(descEl);

    if (d.tags.length) {
      const tagsWrap = document.createElement('div');
      tagsWrap.className = 'hof-card-tags';
      d.tags.forEach((t) => {
        const span = document.createElement('span');
        span.className = 'hof-tag-sm';
        span.textContent = t;
        tagsWrap.append(span);
      });
      body.append(tagsWrap);
    }

    const footer = document.createElement('div');
    footer.className = 'hof-card-footer';

    const prizeEl = document.createElement('span');
    prizeEl.className = 'hof-card-prize';
    prizeEl.textContent = d.prize;
    footer.append(prizeEl);

    const linkEl = document.createElement('a');
    linkEl.className = 'hof-card-link';
    linkEl.href = d.href;
    linkEl.textContent = 'View →';
    footer.append(linkEl);

    body.append(footer);
    card.append(body);
    return card;
  }

  // Build grid
  const grid = document.createElement('div');
  grid.className = 'hof-grid';
  cardsData.forEach((d) => grid.append(buildCard(d)));

  // Build filter pills inline (year + track), replacing the separate
  // filter-bar block that used to sit above this one on the page.
  function normalize(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

  function buildPillGroup(options, axis) {
    const group = document.createElement('div');
    group.className = 'hof-pills';
    group.dataset.axis = axis;
    group.setAttribute('role', 'group');
    options.forEach((label, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = i === 0 ? 'hof-pill active' : 'hof-pill';
      btn.textContent = label;
      btn.setAttribute('aria-pressed', String(i === 0));
      group.append(btn);
    });
    return group;
  }

  const filterBar = document.createElement('div');
  filterBar.className = 'hof-filter-bar';
  filterBar.append(buildPillGroup(yearOptions, 'year'), buildPillGroup(trackOptions, 'track'));

  block.innerHTML = '';
  block.append(filterBar, grid);

  // Scroll reveal (matches original .reveal → .revealed logic)
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('revealed');
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  grid.querySelectorAll('.hof-card').forEach((card) => revealObs.observe(card));

  // Two independent filter axes: year and track. The first pill in each
  // group always means "show all" regardless of its label; every other pill
  // matches a card's data-year/data-track by normalized substring, so an
  // author can reword pill labels without a hardcoded label→code map.
  const active = { year: 'all', track: 'all' };

  function applyFilters() {
    grid.querySelectorAll('.hof-card').forEach((card) => {
      const yearOk = active.year === 'all' || normalize(card.dataset.year) === normalize(active.year);
      const trackOk = active.track === 'all' || normalize(card.dataset.track).includes(normalize(active.track))
        || normalize(active.track).includes(normalize(card.dataset.track));
      card.style.display = yearOk && trackOk ? '' : 'none';
    });
  }

  filterBar.addEventListener('click', (e) => {
    const pill = e.target.closest('.hof-pill');
    if (!pill) return;
    const group = pill.closest('.hof-pills');
    const isFirst = pill === group.firstElementChild;
    group.querySelectorAll('.hof-pill').forEach((p) => { p.classList.remove('active'); p.setAttribute('aria-pressed', 'false'); });
    pill.classList.add('active');
    pill.setAttribute('aria-pressed', 'true');
    const value = isFirst ? 'all' : pill.textContent.trim();
    if (group.dataset.axis === 'year') active.year = value;
    else active.track = value;
    applyFilters();
  });
}

// ── CHAMPION VARIANT (single featured winner spotlight) ────────────────────────
function decorateChampion(block) {
  if (block.dataset.championDecorated) return;
  block.dataset.championDecorated = 'true';

  const section = block.closest('.section');
  if (section) section.style.setProperty('margin', '0', 'important');
  const wrapper = block.parentElement;
  if (wrapper) { wrapper.style.maxWidth = '100%'; wrapper.style.padding = '0'; }

  if (!document.querySelector('link[data-font="bebas-neue"], link[data-font="hc-fonts"], link[data-font="fb-fonts"], link[data-font="hof-fonts"]')) {
    const pc1 = document.createElement('link'); pc1.rel = 'preconnect'; pc1.href = 'https://fonts.googleapis.com';
    const pc2 = document.createElement('link'); pc2.rel = 'preconnect'; pc2.href = 'https://fonts.gstatic.com'; pc2.crossOrigin = '';
    const fl = document.createElement('link'); fl.rel = 'stylesheet';
    fl.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500;600&display=swap';
    fl.dataset.font = 'hof-fonts';
    document.head.append(pc1, pc2, fl);
  }

  const rows = [...block.children];
  // Row 0: image | rank (#1)
  // Row 1: badge label (Grand Champion)
  // Row 2: project title
  // Row 3: team line (bold word in da.live → gold via CSS)
  // Row 4: description
  // Row 5: tags (comma-separated)
  // Row 6: prize | venue
  // Row 7: CTA label | CTA link
  const imgCell = rows[0]?.children[0];
  const rankText = rows[0]?.children[1]?.textContent.trim();
  const badgeText = rows[1]?.children[0]?.textContent.trim();
  const titleText = rows[2]?.children[0]?.textContent.trim();
  const teamCell = rows[3]?.children[0];
  const descText = rows[4]?.children[0]?.textContent.trim();
  const tagsText = rows[5]?.children[0]?.textContent.trim();
  const prizeText = rows[6]?.children[0]?.textContent.trim();
  const venueText = rows[6]?.children[1]?.textContent.trim();
  const ctaLabel = rows[7]?.children[0]?.textContent.trim() || 'View Project →';
  const ctaHref = rows[7]?.children[1]?.querySelector('a')?.href || '#';

  // ── Image pane ──────────────────────────────────────────────────────────
  const imgWrap = document.createElement('div');
  imgWrap.className = 'champion-img-wrap';

  const picture = imgCell?.querySelector('picture');
  const imgEl = imgCell?.querySelector('img');
  const media = picture || imgEl;
  if (media) {
    if (imgEl) imgEl.removeAttribute('loading');
    imgWrap.append(media);
  }

  if (rankText) {
    const rank = document.createElement('div');
    rank.className = 'champion-rank';
    rank.textContent = rankText;
    imgWrap.append(rank);
  }

  const glow = document.createElement('div');
  glow.className = 'champion-glow';
  imgWrap.append(glow);

  // ── Info pane ───────────────────────────────────────────────────────────
  const info = document.createElement('div');
  info.className = 'champion-info';

  if (badgeText) {
    const badge = document.createElement('div');
    badge.className = 'champion-badge';
    badge.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d9a441" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/><path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z"/></svg>${badgeText}`;
    info.append(badge);
  }

  if (titleText) {
    const title = document.createElement('h2');
    title.className = 'champion-title';
    title.textContent = titleText;
    info.append(title);
  }

  if (teamCell) {
    const team = document.createElement('p');
    team.className = 'champion-team';
    const teamP = teamCell.querySelector('p');
    team.innerHTML = teamP ? teamP.innerHTML : teamCell.innerHTML;
    info.append(team);
  }

  if (descText) {
    const desc = document.createElement('p');
    desc.className = 'champion-desc';
    desc.textContent = descText;
    info.append(desc);
  }

  if (tagsText) {
    const tagsWrap = document.createElement('div');
    tagsWrap.className = 'champion-tags';
    tagsText.split(',').forEach((tag) => {
      const span = document.createElement('span');
      span.className = 'champion-tag';
      span.textContent = tag.trim();
      tagsWrap.append(span);
    });
    info.append(tagsWrap);
  }

  if (prizeText || venueText) {
    const meta = document.createElement('div');
    meta.className = 'champion-meta';
    if (prizeText) {
      const prize = document.createElement('span');
      prize.className = 'champion-prize';
      prize.textContent = prizeText;
      meta.append(prize);
    }
    if (prizeText && venueText) {
      const sep = document.createElement('span');
      sep.className = 'champion-sep';
      sep.setAttribute('aria-hidden', 'true');
      sep.textContent = '·';
      meta.append(sep);
    }
    if (venueText) {
      const venue = document.createElement('span');
      venue.className = 'champion-venue';
      venue.textContent = venueText;
      meta.append(venue);
    }
    info.append(meta);
  }

  const actions = document.createElement('div');
  actions.className = 'champion-actions';
  const btn = document.createElement('a');
  btn.className = 'champion-btn';
  btn.href = ctaHref;
  btn.textContent = ctaLabel;
  actions.append(btn);
  info.append(actions);

  // ── Card ────────────────────────────────────────────────────────────────
  const card = document.createElement('div');
  card.className = 'champion-card';
  card.append(imgWrap, info);

  block.innerHTML = '';
  block.append(card);
}

// ── SPOTLIGHT VARIANT (featured hackathon hero + side event list) ──────────────
// AEM's asset service can re-encode any image on the fly via the `format` query
// param. Raw <img> fallbacks keep whatever format the source file was uploaded as
// (often PNG/JPG), which can be many times larger than the WebP variant already
// available as a sibling <source> in the <picture> — requesting it directly here
// avoids having to keep the <picture> wrapper around just for format negotiation.
function toWebp(src) {
  if (!src) return src;
  try {
    const url = new URL(src, window.location.href);
    if (url.searchParams.has('format')) url.searchParams.set('format', 'webply');
    return url.toString();
  } catch {
    return src;
  }
}

function decorateSpotlight(block) {
  if (block.dataset.spotlightDecorated) return;
  block.dataset.spotlightDecorated = 'true';

  const rows = [...block.children];
  if (rows.length < 1) return;

  // No header row here on purpose -- the heading (eyebrow/title/subtitle)
  // is authored as its own Section Heading (spotlight) block placed right
  // before this one, reusing that block's existing exact-match styling
  // instead of duplicating it a third time.
  const [featuredRow, ...sideRows] = rows;

  const section = block.closest('.section');
  if (section) section.style.setProperty('margin', '0', 'important');
  const wrapper = block.parentElement;
  if (wrapper) { wrapper.style.maxWidth = '100%'; wrapper.style.padding = '0'; }

  if (!document.querySelector('link[data-font="bebas-neue"], link[data-font="hc-fonts"], link[data-font="fb-fonts"], link[data-font="hof-fonts"]')) {
    const pc1 = document.createElement('link'); pc1.rel = 'preconnect'; pc1.href = 'https://fonts.googleapis.com';
    const pc2 = document.createElement('link'); pc2.rel = 'preconnect'; pc2.href = 'https://fonts.gstatic.com'; pc2.crossOrigin = '';
    const fl = document.createElement('link'); fl.rel = 'stylesheet'; fl.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap';
    fl.dataset.font = 'hof-fonts';
    document.head.append(pc1, pc2, fl);
  }

  // ── Featured card ──
  const [posterCell, badgeCell, eventTitleCell, metaCell] = [...featuredRow.children];

  const ctaLink = metaCell.querySelector('a');
  const rawMeta = ctaLink
    ? metaCell.textContent.replace(ctaLink.textContent, '').trim()
    : metaCell.textContent.trim();
  const metaSpans = rawMeta
    .split('·')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s, i) => (i > 0 ? `<span class="meta-sep">·</span>${s}` : s))
    .join('');

  const featuredCard = document.createElement('div');
  featuredCard.className = 'spotlight-video-card';
  featuredCard.innerHTML = `
    <div class="spotlight-scrim"></div>
    <div class="spotlight-overlay">
      <div class="spotlight-badge"><span class="badge-dot"></span>${badgeCell.textContent.trim()}</div>
      <div class="spotlight-overlay-body">
        <h3 class="spotlight-event-title">${eventTitleCell.textContent.trim()}</h3>
        <div class="spotlight-meta">${metaSpans}</div>
        ${ctaLink ? `<a href="${ctaLink.href}" class="spotlight-explore-btn">${ctaLink.textContent.trim()}</a>` : ''}
      </div>
    </div>`;

  // Whole card navigates to the same detail page as the "Explore Event" link,
  // without hijacking clicks on the link itself (or its native modifier-key behavior).
  if (ctaLink) {
    featuredCard.style.cursor = 'pointer';
    featuredCard.setAttribute('role', 'link');
    featuredCard.setAttribute('tabindex', '0');
    featuredCard.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      window.location.href = ctaLink.href;
    });
    featuredCard.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('a')) {
        e.preventDefault();
        window.location.href = ctaLink.href;
      }
    });
  }

  // Background: image OR video link in cell 1
  const posterImg = posterCell.querySelector('img');
  if (posterImg) posterImg.src = toWebp(posterImg.src);
  const videoAnchor = [...posterCell.querySelectorAll('a')].find(
    (a) => a.href && a.href.includes('.mp4'),
  );

  if (videoAnchor) {
    const video = document.createElement('video');
    video.className = 'spotlight-bg';
    video.muted = true;
    video.loop = true;
    video.autoplay = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('preload', 'metadata');
    if (posterImg) video.poster = posterImg.src;
    const source = document.createElement('source');
    source.src = videoAnchor.href;
    source.type = 'video/mp4';
    video.appendChild(source);
    featuredCard.prepend(video);
    video.play().catch(() => {});
  } else if (posterImg) {
    posterImg.className = 'spotlight-bg';
    featuredCard.prepend(posterImg);
  }

  // ── Side panel ──
  const panel = document.createElement('div');
  panel.className = 'spotlight-panel';

  sideRows.forEach((row) => {
    const [imgCell, cardTitleCell, linkCell] = [...row.children];
    const img = imgCell ? imgCell.querySelector('img') : null;
    if (img) img.src = toWebp(img.src);
    const cardLink = linkCell ? linkCell.querySelector('a') : null;

    const card = document.createElement('div');
    card.className = 'feat-side-card';
    if (img) card.appendChild(img);

    const overlay = document.createElement('div');
    overlay.className = 'feat-card-overlay';
    overlay.innerHTML = `
      <h3>${cardTitleCell ? cardTitleCell.textContent.trim() : ''}</h3>
      ${cardLink ? `<a href="${cardLink.href}" class="feat-register-btn">${cardLink.textContent.trim()}</a>` : ''}`;
    card.appendChild(overlay);

    // Whole card navigates to the same detail page as its link, same pattern as
    // the main featured card above.
    if (cardLink) {
      card.style.cursor = 'pointer';
      card.setAttribute('role', 'link');
      card.setAttribute('tabindex', '0');
      card.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        window.location.href = cardLink.href;
      });
      card.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('a')) {
          e.preventDefault();
          window.location.href = cardLink.href;
        }
      });
    }

    panel.appendChild(card);
  });

  // ── Stage ──
  const stage = document.createElement('div');
  stage.className = 'spotlight-stage';
  stage.append(featuredCard, panel);

  block.innerHTML = '';
  block.append(stage);

  // ── Scroll reveal ──
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('sl-visible');
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.1 },
  );
  io.observe(stage);
}

// ── LOGOS VARIANT (infinite-scroll logo belt, mirrors the marquee block) ───────
function decorateLogos(block) {
  if (block.dataset.logosDecorated) return;
  block.dataset.logosDecorated = 'true';

  let title = '';
  let logos = [];

  [...block.children].forEach((row) => {
    const cols = row.children;
    if (cols.length < 2) return;
    const key = cols[0].textContent.trim().toLowerCase();
    const val = cols[1];

    if (key === 'title') {
      title = val.textContent.trim();
    } else if (key === 'logos') {
      logos = [...val.querySelectorAll('picture, img')]
        .filter((el) => el.tagName === 'PICTURE' || (el.tagName === 'IMG' && !el.closest('picture')));
    }
  });

  block.innerHTML = '';

  if (title) {
    const h2 = document.createElement('h2');
    h2.textContent = title;
    block.appendChild(h2);
  }

  if (logos.length > 0) {
    const outer = document.createElement('div');
    outer.className = 'logos-outer';

    const belt = document.createElement('div');
    belt.className = 'logos-belt';

    // Original logos, then a duplicated (aria-hidden) copy right after --
    // the CSS animation translates exactly -50%, so the duplicate lines up
    // perfectly with the original for a seamless infinite loop.
    logos.forEach((logo) => belt.appendChild(logo.cloneNode(true)));
    logos.forEach((logo) => {
      const clone = logo.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      belt.appendChild(clone);
    });

    outer.appendChild(belt);
    block.appendChild(outer);
  }
}

// ── MOMENTS VARIANT ───────────────────────────────────────────────────────────
function decorateMoments(block) {
  const section = block.closest('.section');
  if (section) {
    section.style.setProperty('margin', '0', 'important');
    section.style.setProperty('background', '#0a0a0a', 'important');
  }
  const wrapper = block.parentElement;
  if (wrapper) { wrapper.style.maxWidth = '100%'; wrapper.style.padding = '0'; }

  if (!document.querySelector('link[data-font="bebas-neue"], link[data-font="hc-fonts"], link[data-font="fb-fonts"], link[data-font="hof-fonts"]')) {
    const pc1 = document.createElement('link'); pc1.rel = 'preconnect'; pc1.href = 'https://fonts.googleapis.com';
    const pc2 = document.createElement('link'); pc2.rel = 'preconnect'; pc2.href = 'https://fonts.gstatic.com'; pc2.crossOrigin = '';
    const fl = document.createElement('link'); fl.rel = 'stylesheet';
    fl.href = 'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap';
    fl.dataset.font = 'moments-fonts';
    document.head.append(pc1, pc2, fl);
  }

  // Row layout: [image] | [caption text] | [span: "tall" / "wide" / empty]
  const grid = document.createElement('div');
  grid.className = 'moments-grid';

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const picture = cells[0]?.querySelector('picture');
    const imgEl = cells[0]?.querySelector('img');
    const caption = cells[1]?.textContent.trim();
    const spanType = cells[2]?.textContent.trim().toLowerCase();

    const item = document.createElement('div');
    item.className = 'moments-item';
    if (spanType === 'tall') item.classList.add('moments-tall');
    if (spanType === 'wide') item.classList.add('moments-wide');

    const media = picture || imgEl;
    if (media) {
      const img = media.tagName === 'PICTURE' ? media.querySelector('img') : media;
      if (img) img.removeAttribute('loading');
      item.append(media);
    }

    if (caption) {
      const overlay = document.createElement('div');
      overlay.className = 'moments-overlay';
      const label = document.createElement('span');
      label.textContent = caption;
      overlay.append(label);
      item.append(overlay);
    }

    grid.append(item);
  });

  block.innerHTML = '';
  block.append(grid);
}

// ── FEATURED HACKATHONS VARIANT ────────────────────────────────────────────────
// Each row = one slug pointing to a /hackathons/[slug] da.live page — same data
// source as the hackathon-cards carousel, so cards always match the real event
// and clicking one opens the actual detail page. Last row with a link = "View
// All" CTA (same convention as hackathon-cards).
function parseFeaturedCard(html, slug) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const data = {};
  doc.querySelectorAll('div').forEach((div) => {
    const kids = [...div.children];
    if (kids.length !== 2) return;
    const key = kids[0]?.textContent.trim().toLowerCase();
    if (['title', 'image', 'city', 'tagline', 'date', 'prize'].includes(key)) {
      data[key] = kids[1];
    }
  });

  const picture = data.image?.querySelector('picture');
  const img = picture?.querySelector('img');
  if (img) img.removeAttribute('loading');

  const dateMatch = (data.date?.textContent.trim() || '').match(/([A-Za-z]+)\s+(\d{1,2})/);

  return {
    picture,
    month: dateMatch ? dateMatch[1].slice(0, 3).toUpperCase() : '',
    day: dateMatch ? dateMatch[2].padStart(2, '0') : '',
    city: data.city?.textContent.trim() || '',
    title: data.title?.textContent.trim() || '',
    tagline: data.tagline?.textContent.trim() || '',
    prize: data.prize?.textContent.trim() || '',
    href: `/hackathons/${slug}`,
  };
}

async function decorateFeaturedHackathons(block) {
  if (!document.querySelector('link[data-font="bebas-neue"], link[data-font="hc-fonts"], link[data-font="fb-fonts"], link[data-font="hof-fonts"]')) {
    const pc1 = document.createElement('link'); pc1.rel = 'preconnect'; pc1.href = 'https://fonts.googleapis.com';
    const pc2 = document.createElement('link'); pc2.rel = 'preconnect'; pc2.href = 'https://fonts.gstatic.com'; pc2.crossOrigin = '';
    const fl = document.createElement('link'); fl.rel = 'stylesheet';
    fl.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500;600&display=swap';
    fl.dataset.font = 'fb-fonts';
    document.head.append(pc1, pc2, fl);
  }

  let viewAllHref = '/hackathon';
  let viewAllLabel = 'View All Events';
  const slugs = [];

  [...block.children].forEach((row) => {
    const linkEl = row.querySelector('a');
    if (linkEl) {
      viewAllHref = linkEl.href;
      viewAllLabel = linkEl.textContent.trim() || viewAllLabel;
      return;
    }
    const slug = row.textContent.trim();
    if (slug) slugs.push(slug);
  });

  const results = await Promise.all(slugs.map(async (slug) => {
    try {
      const resp = await fetch(`/hackathons/${slug}.plain.html`);
      if (!resp.ok) return null;
      return parseFeaturedCard(await resp.text(), slug);
    } catch { return null; }
  }));

  const ul = document.createElement('ul');
  results.filter(Boolean).forEach((d) => {
    const li = document.createElement('li');
    li.style.cursor = 'pointer';
    li.addEventListener('click', () => { window.location.href = d.href; });

    if (d.picture) {
      const imgWrap = document.createElement('div');
      imgWrap.className = 'cards-card-image';
      imgWrap.append(d.picture);
      li.append(imgWrap);
    }

    const body = document.createElement('div');
    body.className = 'cards-card-body';

    const dateBox = document.createElement('div');
    dateBox.className = 'event-date-box';
    dateBox.innerHTML = `<p class="event-month">${d.month}</p><p class="event-date">${d.day}</p>`;

    const details = document.createElement('div');
    details.className = 'event-details';
    details.innerHTML = `
      <p class="event-location">${d.city}</p>
      <p class="event-title">${d.title}</p>
      <p class="event-description">${d.tagline}</p>
      ${d.prize ? `<p class="event-prize">${d.prize}</p>` : ''}`;

    body.append(dateBox, details);
    li.append(body);
    ul.append(li);
  });

  block.innerHTML = '';
  block.append(ul);

  // Built after scripts.js's one-time decorateButtons() pass already ran, so it
  // won't auto-convert this link into a button — apply the same classes by hand.
  const viewAllPara = document.createElement('p');
  viewAllPara.className = 'button-wrapper';
  const viewAllLink = document.createElement('a');
  viewAllLink.href = viewAllHref;
  viewAllLink.className = 'button primary';
  viewAllLink.textContent = viewAllLabel;
  viewAllPara.append(viewAllLink);
  block.append(viewAllPara);
}

// ── HACKATHONS VARIANT — infinite carousel + "View All" search grid + skill
// match, ported from the standalone hackathon-cards block (main carousel
// only, not its separate "saved" wishlist variant). Kept in place until
// confirmed as a 100% match; hc-* prefixed helpers avoid clashing with the
// rest of cards.js.
function hcGetSaved() {
  try { return JSON.parse(localStorage.getItem('hh-saved') || '[]'); } catch { return []; }
}
function hcIsCardSaved(key) {
  return hcGetSaved().some((c) => c.key === key);
}
function hcSaveCard(data) {
  const saved = hcGetSaved();
  if (!saved.find((c) => c.key === data.key)) {
    saved.push(data);
    localStorage.setItem('hh-saved', JSON.stringify(saved));
    window.dispatchEvent(new CustomEvent('hh:saved-change', { detail: { key: data.key, saved: true } }));
  }
}
function hcUnsaveCard(key) {
  const saved = hcGetSaved().filter((c) => c.key !== key);
  localStorage.setItem('hh-saved', JSON.stringify(saved));
  window.dispatchEvent(new CustomEvent('hh:saved-change', { detail: { key, saved: false } }));
}

function hcFormatCountdown(deadlineStr) {
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

function hcGetUserSkills() {
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

function hcComputeSkillMatch(userSkills, hackathonSkillsText) {
  if (!userSkills.length || !hackathonSkillsText) return null;
  const haystack = hackathonSkillsText.toLowerCase();
  const matched = userSkills.filter((s) => haystack.includes(s));
  if (!matched.length) return null;
  return Math.round((matched.length / userSkills.length) * 100);
}

function hcParseDetailPage(html, slug, userSkills) {
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
    countdown: hcFormatCountdown(data.deadline?.textContent.trim()),
    matchPct: hcComputeSkillMatch(userSkills, data.skills?.textContent.trim()),
    href: `/hackathons/${slug}`,
  };
}

async function decorateHackathons(block) {
  if (block.dataset.hackathonsDecorated) return;
  block.dataset.hackathonsDecorated = 'true';

  // Zero EDS section margin + wrapper (edge-to-edge carousel)
  const section = block.closest('.section');
  if (section) section.style.setProperty('margin', '0', 'important');
  const wrapper = block.parentElement;
  if (wrapper) { wrapper.style.maxWidth = '100%'; wrapper.style.padding = '0'; }

  if (!document.querySelector('link[data-font="hc-fonts"], link[data-font="bebas-neue"], link[data-font="fb-fonts"], link[data-font="hof-fonts"]')) {
    const pc1 = document.createElement('link'); pc1.rel = 'preconnect'; pc1.href = 'https://fonts.googleapis.com';
    const pc2 = document.createElement('link'); pc2.rel = 'preconnect'; pc2.href = 'https://fonts.gstatic.com'; pc2.crossOrigin = '';
    const fl = document.createElement('link'); fl.rel = 'stylesheet';
    fl.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap';
    fl.dataset.font = 'hc-fonts';
    document.head.append(pc1, pc2, fl);
  }

  // Each row = one slug pointing to a /hackathons/[slug] da.live page.
  // A row containing a link = "View All" CTA. One optional labeled row
  // ("Recommended Title" | text) overrides the "Recommended For You" heading.
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

  const userSkills = hcGetUserSkills();

  const results = await Promise.all(slugs.map(async (slug) => {
    try {
      const resp = await fetch(`/hackathons/${slug}.plain.html`);
      if (!resp.ok) return null;
      return hcParseDetailPage(await resp.text(), slug, userSkills);
    } catch { return null; }
  }));
  const cardsData = results.filter(Boolean);

  function cardHTML(d) {
    const saved = hcIsCardSaved(d.key);
    const heart = saved ? 'fill="currentColor" stroke="currentColor"' : 'fill="none" stroke="currentColor"';
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

  const track = document.createElement('div');
  track.className = 'hc-track';
  track.innerHTML = [0, 1, 2].map(() => cardsData.map((d) => cardHTML(d)).join('')).join('');

  const wrap = document.createElement('div');
  wrap.className = 'hc-track-wrap';
  wrap.appendChild(track);

  const ctaWrap = document.createElement('div');
  ctaWrap.className = 'hc-cta';
  const ctaBtn = document.createElement('button');
  ctaBtn.className = 'hc-view-all-btn';
  ctaBtn.type = 'button';
  ctaBtn.textContent = viewAllLabel;
  ctaWrap.appendChild(ctaBtn);

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

  wrap.addEventListener('click', (e) => {
    const likeBtn = e.target.closest('.hc-like-btn');
    if (likeBtn) {
      e.stopPropagation();
      const card = likeBtn.closest('.hc-card');
      const key = card?.dataset.key;
      if (!key) return;

      const data = cardsData.find((d) => d.key === key);
      const nowSaved = !hcIsCardSaved(key);

      if (nowSaved && data) hcSaveCard(data);
      else hcUnsaveCard(key);

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

  window.addEventListener('storage', (e) => {
    if (e.key !== 'hh-saved') return;
    cardsData.forEach((d) => {
      const nowSaved = hcIsCardSaved(d.key);
      track.querySelectorAll(`.hc-card[data-key="${d.key}"] .hc-like-btn`).forEach((btn) => {
        btn.classList.toggle('liked', nowSaved);
        const svg = btn.querySelector('svg');
        if (svg) svg.setAttribute('fill', nowSaved ? 'currentColor' : 'none');
      });
    });
  });

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

  const RECOMMEND_THRESHOLD = 60;
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

// ── MAIN DECORATE ─────────────────────────────────────────────────────────────
export default async function decorate(block) {
  // HOF variant — fully separate rendering path
  if (block.classList.contains('hof')) {
    decorateHof(block);
    return;
  }

  // Champion variant — single featured winner spotlight (replaces the old
  // standalone hof-spotlight block)
  if (block.classList.contains('champion')) {
    decorateChampion(block);
    return;
  }

  // Spotlight variant — featured hackathon hero + side event list (mirrors
  // the standalone hackathon-spotlight block, kept in place until confirmed
  // as a 100% match)
  if (block.classList.contains('spotlight')) {
    decorateSpotlight(block);
    return;
  }

  // Logos variant — infinite-scroll logo belt (mirrors the standalone
  // marquee block, kept in place until confirmed as a 100% match)
  if (block.classList.contains('logos')) {
    decorateLogos(block);
    return;
  }

  // Moments masonry variant
  if (block.classList.contains('moments')) {
    decorateMoments(block);
    return;
  }

  // Featured hackathons — fetches real data from /hackathons/[slug] pages.
  // Deliberately not awaited: aem.js loads sections strictly sequentially, so
  // blocking here would delay every section after this one on the page.
  if (block.classList.contains('featured-hackathons')) {
    decorateFeaturedHackathons(block);
    return;
  }

  // Hackathons carousel — mirrors the standalone hackathon-cards block's main
  // (non-saved) variant, kept in place until confirmed as a 100% match
  if (block.classList.contains('hackathons')) {
    decorateHackathons(block);
    return;
  }

  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) {
        div.className = 'cards-card-image';
      } else {
        div.className = 'cards-card-body';
      }
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));
  block.replaceChildren(ul);

  // Handle Gallery Carousel variant
  if (block.classList.contains('gallery')) {
    const slides = ul.querySelectorAll('li');
    let currentSlide = 0;

    if (slides.length > 0) {
      slides[currentSlide].classList.add('active');

      const controls = document.createElement('div');
      controls.className = 'carousel-controls';

      const prevBtn = document.createElement('button');
      prevBtn.className = 'carousel-btn carousel-prev';
      prevBtn.innerHTML = '&#10094;';

      const dotsContainer = document.createElement('div');
      dotsContainer.className = 'carousel-dots';

      const nextBtn = document.createElement('button');
      nextBtn.className = 'carousel-btn carousel-next';
      nextBtn.innerHTML = '&#10095;';

      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'carousel-dot';
        dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => showSlide(i));
        dotsContainer.append(dot);
      });

      controls.append(prevBtn, dotsContainer, nextBtn);
      block.append(controls);

      const updateActive = () => {
        slides.forEach(s => s.classList.remove('active'));
        dotsContainer.querySelectorAll('.carousel-dot').forEach(d => d.classList.remove('active'));
        slides[currentSlide].classList.add('active');
        dotsContainer.children[currentSlide].classList.add('active');
      };

      const showSlide = (index) => {
        currentSlide = index;
        updateActive();
      };

      prevBtn.addEventListener('click', () => {
        currentSlide = (currentSlide - 1 + slides.length) % slides.length;
        updateActive();
      });

      nextBtn.addEventListener('click', () => {
        currentSlide = (currentSlide + 1) % slides.length;
        updateActive();
      });

      // Auto cycle
      setInterval(() => {
        currentSlide = (currentSlide + 1) % slides.length;
        updateActive();
      }, 5000);
    }
  }

  // Attempt to find and fix the section title if it was pasted as literal text
  const section = block.closest('.section');
  if (section) {
    const defaultContent = section.querySelector('.default-content-wrapper');
    if (defaultContent) {
      // If the title is a paragraph starting with ##
      const pTags = defaultContent.querySelectorAll('p');
      pTags.forEach(p => {
        if (p.textContent.trim().startsWith('##')) {
          p.classList.add('section-main-title');
          let content = p.innerHTML.replace(/^#+\s*/, '');
          content = content.replace(/\*([^*]+)\*/g, '<em>$1</em>');
          p.innerHTML = content;
        }
      });

      // If it actually is an H2
      const h2Tags = defaultContent.querySelectorAll('h2');
      h2Tags.forEach(h2 => {
        h2.classList.add('section-main-title');
        h2.innerHTML = h2.innerHTML.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      });
    }
  }
}
