/**
 * Hero block for Adobe EDS / da.live
 *
 * Supports two authoring styles:
 *
 * A) Labeled rows (first column has a key):
 *    | Background  | [image]                                      |
 *    | Title       | Discover Hackathons                          |
 *    | Cycling     | Find Teammates, Win Hackathons, Grow Network |
 *    | Description | Your all-in-one platform...                  |
 *    | CTA         | Get Started                                  |
 *    | Stats       | 50: Events | 1200: Participants | ₹2Cr+: Prizes |
 *
 * B) Positional rows (first column empty, da.live default):
 *    Row 1: background picture
 *    Row 2: title text
 *    Row 3: cycling words (comma-separated)
 *    Row 4: description text
 *    Row 5: CTA link(s) / strong text
 *    Row 6: stats as <ul> or <br>-separated lines
 *
 * The CTA cell supports more than one link — the first renders as the
 * primary button, any additional links render as secondary (outline)
 * buttons next to it.
 */
export default async function decorate(block) {
  try {
    console.log('HERO DECORATE STARTED');

    let bgImg = null;
    let titleText = '';
    let cyclingWords = [];
    let descText = '';
    let ctaLinks = [];
    let statsItems = [];

    const rows = [...block.children];

    // ── detect authoring style ───────────────────────────────────
    const hasLabels = rows.some((r) => r.children[0]?.textContent.trim() !== '');

    if (hasLabels) {
      // ── A) LABELED rows ─────────────────────────────────────────
      rows.forEach((row) => {
        const cols = row.children;
        if (cols.length < 2) return;
        const key = cols[0].textContent.trim().toLowerCase();
        const val = cols[1];

        if (key.includes('background') || key.includes('image')) {
          bgImg = val.querySelector('picture') || val.querySelector('img');
        } else if (key.includes('title')) {
          titleText = val.textContent.trim();
        } else if (key.includes('cycling')) {
          cyclingWords = val.textContent.split(',').map((w) => w.trim()).filter(Boolean);
        } else if (key.includes('desc')) {
          descText = val.textContent.trim();
        } else if (key.includes('cta') || key.includes('button') || key.includes('link')) {
          ctaLinks = parseCtaCell(val);
          if (!ctaLinks.length) {
            const text = val.textContent.trim();
            if (text) {
              const a = document.createElement('a');
              a.textContent = text;
              a.href = '#';
              ctaLinks = [a];
            }
          }
        } else if (key.includes('stat')) {
          statsItems = parseStats([...cols].slice(1));
        }
      });
    } else {
      // ── B) POSITIONAL rows (empty first column) ──────────────────
      const textRows = [];
      rows.forEach((row) => {
        const val = row.children[1] || row.children[0];
        if (!val) return;

        if (val.querySelector('picture, img:not([data-icon-name])')) {
          bgImg = val.querySelector('picture') || val.querySelector('img');
        } else if (val.querySelector('ul, ol')) {
          statsItems = parseStats([val]);
        } else if (val.querySelector('a, strong')) {
          ctaLinks = parseCtaCell(val);
        } else {
          const text = val.textContent.trim();
          if (text) textRows.push(text);
        }
      });

      // assign text rows positionally: title, cycling, description
      if (textRows[0]) titleText = textRows[0];
      if (textRows[1]) cyclingWords = textRows[1].split(',').map((w) => w.trim()).filter(Boolean);
      if (textRows[2]) descText = textRows[2];
    }

    // ── CLEAR BLOCK ──────────────────────────────────────────────
    block.innerHTML = '';

    // ── BUILD DOM ────────────────────────────────────────────────
    const bgWrap = document.createElement('div');
    bgWrap.className = 'hero-bg';
    if (bgImg) {
      bgWrap.appendChild(bgImg.tagName === 'IMG' ? (() => { const p = document.createElement('picture'); p.appendChild(bgImg); return p; })() : bgImg);
      const heroImg = bgImg.tagName === 'IMG' ? bgImg : bgImg.querySelector('img');
      if (heroImg) {
        heroImg.setAttribute('fetchpriority', 'high');
        heroImg.setAttribute('loading', 'eager');
      }
    }
    bgWrap.appendChild(Object.assign(document.createElement('div'), { className: 'hero-bg-overlay' }));
    block.appendChild(bgWrap);
    block.appendChild(Object.assign(document.createElement('div'), { className: 'hero-noise' }));

    const content = document.createElement('div');
    content.className = 'hero-content';

    if (titleText) {
      const h1 = document.createElement('h1');
      h1.className = 'hero-title';
      const line1 = Object.assign(document.createElement('span'), { className: 'line', textContent: titleText });
      const line2 = Object.assign(document.createElement('span'), { className: 'line accent-line cycle-text', id: 'cycleText', textContent: cyclingWords[0] || '' });
      h1.append(line1, document.createElement('br'), line2);
      content.appendChild(h1);
    }

    if (descText) {
      content.appendChild(Object.assign(document.createElement('p'), { className: 'hero-desc', textContent: descText }));
    }

    if (ctaLinks.length) {
      const actions = document.createElement('div');
      actions.className = 'hero-actions';
      ctaLinks.forEach((a, i) => {
        a.className = i === 0 ? 'btn-primary btn-large' : 'btn-secondary btn-large';
        actions.appendChild(a);
      });
      content.appendChild(actions);
    }

    if (statsItems.length > 0) {
      const statsWrap = document.createElement('div');
      statsWrap.className = 'hero-stats';
      statsItems.forEach((text, i) => {
        let numPart = '';
        let labelPart = '';
        if (text.includes(':')) {
          const parts = text.split(':');
          numPart = parts[0].trim();
          labelPart = parts.slice(1).join(':').trim();
        } else {
          const m = text.match(/^([^\s]+)\s+(.+)$/);
          if (m) { numPart = m[1]; labelPart = m[2]; } else { numPart = text; }
        }

        const stat = document.createElement('div');
        stat.className = 'stat';
        const num = document.createElement('span');
        num.className = 'stat-num';
        // Extract prefix, digits, suffix from numPart so any format animates:
        //   "50"     → prefix="",  count=50,  suffix="+"
        //   "1200"   → prefix="",  count=1200, suffix="+"
        //   "₹2Cr+"  → prefix="₹", count=2,   suffix="Cr+"
        const numMatch = numPart.match(/^([^\d]*)(\d+)(.*)$/);
        if (numMatch) {
          num.dataset.prefix = numMatch[1];
          num.dataset.count = parseInt(numMatch[2], 10);
          num.dataset.suffix = numMatch[3] || '+';
          num.textContent = `${numMatch[1]}0${numMatch[3] || '+'}`;
        } else {
          num.textContent = numPart;
        }
        const lbl = Object.assign(document.createElement('span'), { className: 'stat-label', textContent: labelPart });
        stat.append(num, lbl);
        statsWrap.appendChild(stat);
        if (i < statsItems.length - 1) {
          statsWrap.appendChild(Object.assign(document.createElement('div'), { className: 'stat-divider' }));
        }
      });
      content.appendChild(statsWrap);
    }

    block.appendChild(content);

    // ── CYCLING TEXT ─────────────────────────────────────────────
    if (cyclingWords.length > 1) {
      let idx = 0;
      const el = block.querySelector('#cycleText');
      if (el) {
        setInterval(() => {
          idx = (idx + 1) % cyclingWords.length;
          el.style.opacity = '0';
          setTimeout(() => { el.textContent = cyclingWords[idx]; el.style.opacity = '1'; }, 350);
        }, 2600);
      }
    }

    // ── COUNT-UP ANIMATION ───────────────────────────────────────
    block.querySelectorAll('.stat-num[data-count]').forEach((el) => {
      const target = parseInt(el.dataset.count, 10);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '+';
      const increment = target / (1200 / 15);
      let current = 0;
      const tick = () => {
        current += increment;
        if (current >= target) { el.textContent = `${prefix}${target.toLocaleString()}${suffix}`; }
        else { el.textContent = `${prefix}${Math.floor(current).toLocaleString()}${suffix}`; setTimeout(tick, 15); }
      };
      tick();
    });
  } catch (error) {
    console.error('HERO DECORATE ERROR:', error);
    block.innerHTML = `<div style="color:red;background:white;padding:10px">Hero block error: ${error.message}</div>`;
  }
}

/**
 * Turn the CTA cell into one button per "segment", handling the common
 * authoring slip where only some of the button text ends up hyperlinked
 * (e.g. "Get Started, [Organise Hackathon](/organise)" typed on one line —
 * "Get Started" stays plain/bold text with no <a>). Real <a> tags keep
 * their href; a bare <strong> run becomes a button with no destination
 * (href="#") so it's still visible rather than silently dropped.
 */
function parseCtaCell(val) {
  const nodes = [...val.querySelectorAll('a, strong')].filter((el) => (
    el.tagName === 'A' || !el.closest('a')
  ));
  return nodes.map((el) => {
    if (el.tagName === 'A') return el;
    const a = document.createElement('a');
    a.textContent = el.textContent.trim().replace(/[,;]\s*$/, '');
    a.href = '#';
    return a;
  });
}

/**
 * Parse stats from one or more container elements.
 * Handles: <li> items, multiple <p> elements, <br>-separated lines within a <p>.
 */
function parseStats(cols) {
  const items = [];
  cols.forEach((col) => {
    const lis = [...col.querySelectorAll('li')];
    if (lis.length > 0) {
      lis.forEach((el) => { const t = el.textContent.trim(); if (t) items.push(t); });
      return;
    }
    const paras = [...col.querySelectorAll('p')];
    if (paras.length > 0) {
      paras.forEach((p) => {
        p.innerHTML.split(/<br\s*\/?>/i).forEach((seg) => {
          const t = seg.replace(/<[^>]+>/g, '').trim();
          if (t) items.push(t);
        });
      });
      return;
    }
    col.textContent.split('\n').forEach((s) => { const t = s.trim(); if (t) items.push(t); });
  });
  return items;
}
