import { createOptimizedPicture } from '../../scripts/aem.js';

// ── HOF VARIANT ───────────────────────────────────────────────────────────────
function decorateHof(block) {
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

  // Parse rows
  // Cell layout per row:
  // [0]=image  [1]=rank("2nd")  [2]=meta("CloudFest 26 · 2026")
  // [3]=track("health")  [4]=title  [5]=team  [6]=desc
  // [7]=tags(comma-sep)  [8]=prize  [9]=link
  const cardsData = [...block.children].map((row) => {
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

  block.innerHTML = '';
  block.append(grid);

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

  // Filter-bar:change integration
  // Two independent filter axes: year (from filters group) and track (from filters-secondary)
  const active = { year: 'all', track: 'all' };

  const yearMap = {
    'all editions': 'all', '2026': '2026', '2025': '2025', '2024': '2024',
  };
  const trackMap = {
    'ai / ml': 'ai', 'web3': 'web3', 'health': 'health', 'climate': 'climate',
  };

  function applyFilters() {
    grid.querySelectorAll('.hof-card').forEach((card) => {
      const yearOk = active.year === 'all' || card.dataset.year === active.year;
      const trackOk = active.track === 'all' || card.dataset.track === active.track;
      card.style.display = yearOk && trackOk ? '' : 'none';
    });
  }

  document.addEventListener('filter-bar:change', (e) => {
    const { type, value } = e.detail;
    const key = value.toLowerCase();
    if (type === 'filters') active.year = yearMap[key] ?? 'all';
    else if (type === 'filters-secondary') active.track = trackMap[key] ?? 'all';
    applyFilters();
  });
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
    if (['title', 'image', 'city', 'tagline', 'date'].includes(key)) {
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
      <p class="event-description">${d.tagline}</p>`;

    body.append(dateBox, details);
    li.append(body);
    ul.append(li);
  });

  block.innerHTML = '';
  block.append(ul);

  const viewAllPara = document.createElement('p');
  const viewAllLink = document.createElement('a');
  viewAllLink.href = viewAllHref;
  viewAllLink.innerHTML = `<strong>${viewAllLabel}</strong>`;
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
