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
  if (rows.length < 2) return;

  const [headerRow, featuredRow, ...sideRows] = rows;
  const [eyebrowCell, titleCell, subtitleCell] = [...headerRow.children];

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

  // ── Header ──
  const header = document.createElement('div');
  header.className = 'spotlight-header';

  const eyebrow = document.createElement('span');
  eyebrow.className = 'spotlight-eyebrow';
  eyebrow.textContent = eyebrowCell.textContent.trim();

  const title = document.createElement('h2');
  title.className = 'spotlight-title';
  title.innerHTML = titleCell.innerHTML.trim();

  const sub = document.createElement('p');
  sub.className = 'spotlight-sub';
  sub.textContent = subtitleCell.textContent.trim();

  header.append(eyebrow, title, sub);

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
  block.append(header, stage);

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
  [header, stage].forEach((el) => io.observe(el));
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
