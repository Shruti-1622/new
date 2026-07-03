export default function decorate(block) {
  const section = block.closest('.section');
  if (section) section.style.setProperty('margin', '0', 'important');
  const wrapper = block.parentElement;
  if (wrapper) { wrapper.style.maxWidth = '100%'; wrapper.style.padding = '0'; }

  if (!document.querySelector('link[data-font="bebas-neue"], link[data-font="fb-fonts"]')) {
    const pc1 = document.createElement('link'); pc1.rel = 'preconnect'; pc1.href = 'https://fonts.googleapis.com';
    const pc2 = document.createElement('link'); pc2.rel = 'preconnect'; pc2.href = 'https://fonts.gstatic.com'; pc2.crossOrigin = '';
    const fl = document.createElement('link'); fl.rel = 'stylesheet';
    fl.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500;600&display=swap';
    fl.dataset.font = 'bebas-neue';
    document.head.append(pc1, pc2, fl);
  }

  const rows = [...block.children];
  // Row 0: image | rank (#1)
  // Row 1: badge label (Grand Champion)
  // Row 2: project title
  // Row 3: team line  (bold word → gold via CSS)
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

  // ── Image pane ────────────────────────────────────────────────────────
  const imgWrap = document.createElement('div');
  imgWrap.className = 'hs-img-wrap';

  const picture = imgCell?.querySelector('picture');
  const imgEl = imgCell?.querySelector('img');
  const media = picture || imgEl;
  if (media) {
    if (imgEl) imgEl.removeAttribute('loading');
    imgWrap.append(media);
  }

  if (rankText) {
    const rank = document.createElement('div');
    rank.className = 'hs-rank';
    rank.textContent = rankText;
    imgWrap.append(rank);
  }

  const glow = document.createElement('div');
  glow.className = 'hs-glow';
  imgWrap.append(glow);

  // ── Info pane ─────────────────────────────────────────────────────────
  const info = document.createElement('div');
  info.className = 'hs-info';

  if (badgeText) {
    const badge = document.createElement('div');
    badge.className = 'hs-badge';
    badge.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d9a441" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/><path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z"/></svg>${badgeText}`;
    info.append(badge);
  }

  if (titleText) {
    const title = document.createElement('h2');
    title.className = 'hs-title';
    title.textContent = titleText;
    info.append(title);
  }

  if (teamCell) {
    const team = document.createElement('p');
    team.className = 'hs-team';
    const teamP = teamCell.querySelector('p');
    team.innerHTML = teamP ? teamP.innerHTML : teamCell.innerHTML;
    info.append(team);
  }

  if (descText) {
    const desc = document.createElement('p');
    desc.className = 'hs-desc';
    desc.textContent = descText;
    info.append(desc);
  }

  if (tagsText) {
    const tagsWrap = document.createElement('div');
    tagsWrap.className = 'hs-tags';
    tagsText.split(',').forEach((tag) => {
      const span = document.createElement('span');
      span.className = 'hs-tag';
      span.textContent = tag.trim();
      tagsWrap.append(span);
    });
    info.append(tagsWrap);
  }

  if (prizeText || venueText) {
    const meta = document.createElement('div');
    meta.className = 'hs-meta';
    if (prizeText) {
      const prize = document.createElement('span');
      prize.className = 'hs-prize';
      prize.textContent = prizeText;
      meta.append(prize);
    }
    if (prizeText && venueText) {
      const sep = document.createElement('span');
      sep.className = 'hs-sep';
      sep.setAttribute('aria-hidden', 'true');
      sep.textContent = '·';
      meta.append(sep);
    }
    if (venueText) {
      const venue = document.createElement('span');
      venue.className = 'hs-venue';
      venue.textContent = venueText;
      meta.append(venue);
    }
    info.append(meta);
  }

  const actions = document.createElement('div');
  actions.className = 'hs-actions';
  const btn = document.createElement('a');
  btn.className = 'hs-btn';
  btn.href = ctaHref;
  btn.textContent = ctaLabel;
  actions.append(btn);
  info.append(actions);

  // ── Card ──────────────────────────────────────────────────────────────
  const card = document.createElement('div');
  card.className = 'hs-card';
  card.append(imgWrap, info);

  block.innerHTML = '';
  block.append(card);
}
