/**
 * Spotlight block — replicates the hackathon page spotlight section
 *
 * da.live table (8 rows):
 * | Spotlight              |                          |                       |
 * | Curated picks          |                          |                       |  ← eyebrow
 * | Hackathon *Spotlight*  |                          |                       |  ← h2 title
 * | Discover the most...   |                          |                       |  ← subtitle
 * | [video link]           | [poster image]           |                       |  ← video + poster
 * | Upcoming Event         |                          |                       |  ← badge
 * | Adobe India Hack 2026  | July 8 · Online · AI+Dev | [Explore Event →]    |  ← event info
 * | [amazon img]           | Amazon HackOn 2026       | [Register →]         |  ← side card 1
 * | [microsoft img]        | Imagine Cup 2026         | [Register →]         |  ← side card 2
 */
export default function decorate(block) {
  const rows = [...block.children];
  block.innerHTML = '';

  // ── Parse rows ────────────────────────────────────────────
  const eyebrow = rows[0]?.children[0]?.textContent.trim() || '';

  const titleCell = rows[1]?.children[0];
  const subtitle = rows[2]?.children[0]?.textContent.trim() || '';

  const videoLink = rows[3]?.children[0]?.querySelector('a');
  const videoSrc = videoLink?.href || '';
  const posterImg = rows[3]?.children[1]?.querySelector('img');
  const posterSrc = posterImg?.src || '';

  const badgeText = rows[4]?.children[0]?.textContent.trim() || 'Upcoming Event';

  const eventTitle = rows[5]?.children[0]?.textContent.trim() || '';
  const metaRaw = rows[5]?.children[1]?.textContent.trim() || '';
  const ctaLink = rows[5]?.children[2]?.querySelector('a');

  const sideCards = rows.slice(6).map((row) => ({
    pic: row.children[0]?.querySelector('picture') || row.children[0]?.querySelector('img'),
    title: row.children[1]?.textContent.trim() || '',
    link: row.children[2]?.querySelector('a') || null,
  }));

  // ── Header ────────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'spotlight-header';

  const eyebrowEl = document.createElement('span');
  eyebrowEl.className = 'spotlight-eyebrow';
  eyebrowEl.textContent = eyebrow;

  const h2 = document.createElement('h2');
  h2.className = 'spotlight-title';
  if (titleCell) {
    // *word* in da.live → <em> → convert to <span class="spotlight-accent">
    titleCell.querySelectorAll('em').forEach((em) => {
      const span = document.createElement('span');
      span.className = 'spotlight-accent';
      span.textContent = em.textContent;
      em.replaceWith(span);
    });
    h2.innerHTML = titleCell.innerHTML;
  }

  const subEl = document.createElement('p');
  subEl.className = 'spotlight-sub';
  subEl.textContent = subtitle;

  header.append(eyebrowEl, h2, subEl);

  // ── Stage (2-col) ─────────────────────────────────────────
  const stage = document.createElement('div');
  stage.className = 'spotlight-stage';

  // Left: video card
  const videoCard = document.createElement('div');
  videoCard.className = 'spotlight-video-card';

  const video = document.createElement('video');
  video.id = 'spotlightVideo';
  video.className = 'spotlight-video';
  video.autoplay = true;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  if (posterSrc) video.poster = posterSrc;

  const source = document.createElement('source');
  source.dataset.src = videoSrc; // lazy-loaded like original
  source.type = 'video/mp4';
  video.appendChild(source);

  const scrim = document.createElement('div');
  scrim.className = 'spotlight-scrim';

  const overlay = document.createElement('div');
  overlay.className = 'spotlight-overlay';

  // Badge (top of overlay)
  const badge = document.createElement('div');
  badge.className = 'spotlight-badge';
  const dot = document.createElement('span');
  dot.className = 'badge-dot';
  badge.append(dot, ` ${badgeText}`);

  // Event info (bottom of overlay)
  const overlayBody = document.createElement('div');
  overlayBody.className = 'spotlight-overlay-body';

  const eventTitleEl = document.createElement('h3');
  eventTitleEl.className = 'spotlight-event-title';
  eventTitleEl.textContent = eventTitle;

  const metaEl = document.createElement('div');
  metaEl.className = 'spotlight-meta';
  metaRaw.split('·').map((s) => s.trim()).filter(Boolean).forEach((m, idx, arr) => {
    const span = document.createElement('span');
    span.textContent = m;
    metaEl.appendChild(span);
    if (idx < arr.length - 1) {
      const sep = document.createElement('span');
      sep.className = 'meta-sep';
      sep.textContent = '·';
      metaEl.appendChild(sep);
    }
  });

  overlayBody.append(eventTitleEl, metaEl);

  if (ctaLink) {
    ctaLink.className = 'spotlight-explore-btn';
    overlayBody.appendChild(ctaLink);
  }

  overlay.append(badge, overlayBody);
  videoCard.append(video, scrim, overlay);

  // Right: side panel
  const panel = document.createElement('div');
  panel.className = 'spotlight-panel';

  sideCards.forEach(({ pic, title, link }) => {
    const card = document.createElement('div');
    card.className = 'feat-side-card';

    if (pic) card.appendChild(pic);

    const cardOverlay = document.createElement('div');
    cardOverlay.className = 'feat-card-overlay';

    const cardTitle = document.createElement('h3');
    cardTitle.textContent = title;
    cardOverlay.appendChild(cardTitle);

    if (link) {
      link.className = 'feat-register-btn';
      cardOverlay.appendChild(link);
    }

    card.appendChild(cardOverlay);
    panel.appendChild(card);
  });

  stage.append(videoCard, panel);
  block.append(header, stage);

  // ── Scroll reveal (matches original .sl-visible logic) ───
  const revealObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('sl-visible');
          revealObs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.1 },
  );
  revealObs.observe(header);
  revealObs.observe(stage);

  // ── Lazy-load video (same as original DOMContentLoaded logic)
  const videoObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const s = video.querySelector('source');
          if (s?.dataset.src) {
            s.src = s.dataset.src;
            video.load();
            video.play().catch(() => {});
          }
          videoObs.unobserve(e.target);
        }
      });
    },
    { threshold: 0 },
  );
  videoObs.observe(videoCard);
}
