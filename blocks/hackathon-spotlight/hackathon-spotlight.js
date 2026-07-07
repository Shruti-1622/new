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

export default function decorate(block) {
  const rows = [...block.children];
  if (rows.length < 2) return;

  const [headerRow, featuredRow, ...sideRows] = rows;
  const [eyebrowCell, titleCell, subtitleCell] = [...headerRow.children];

  // Zero EDS section margin + wrapper padding
  const section = block.closest('.section');
  if (section) section.style.setProperty('margin', '0', 'important');
  const wrapper = block.parentElement;
  if (wrapper) { wrapper.style.maxWidth = '100%'; wrapper.style.padding = '0'; }

  // ── Bebas Neue font ──
  if (!document.querySelector('link[data-font="bebas-neue"]')) {
    const pc1 = document.createElement('link');
    pc1.rel = 'preconnect';
    pc1.href = 'https://fonts.googleapis.com';
    const pc2 = document.createElement('link');
    pc2.rel = 'preconnect';
    pc2.href = 'https://fonts.gstatic.com';
    pc2.crossOrigin = '';
    const fl = document.createElement('link');
    fl.rel = 'stylesheet';
    fl.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap';
    fl.dataset.font = 'bebas-neue';
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
