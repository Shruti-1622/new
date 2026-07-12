const SOCIAL_ICONS = {
  github: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>',
  twitter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>',
};

const HEART_SVG = '<svg width="10" height="10" viewBox="0 0 24 24" fill="#ff4444" stroke="#ff4444" stroke-width="2" style="vertical-align:middle;margin:0 2px"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';

function render(block, {
  logo, logoImage, taglineHTML, socials, navCols, copyright, builtHTML,
}) {
  const socialsHTML = socials.map(({ platform, href }) => {
    const icon = SOCIAL_ICONS[platform];
    if (!icon) return '';
    const label = platform.charAt(0).toUpperCase() + platform.slice(1);
    return `<a href="${href}" target="_blank" rel="noopener" class="footer-social-link" aria-label="${label}">${icon}</a>`;
  }).join('');

  const navColsHTML = navCols.map(({ heading, links }) => {
    const items = links.map((l) => `<li><a href="${l.href}">${l.text}</a></li>`).join('');
    return `<div class="footer-nav-col"><h3>${heading}</h3><ul>${items}</ul></div>`;
  }).join('');

  block.innerHTML = `
    <div class="footer-main">
      <div class="footer-brand">
        <div class="nav-logo">
          <img src="${logoImage || '/assets/avatar/yes.webp'}" alt="" class="nav-logo-img">
          ${logo}
        </div>
        <p class="footer-tagline">${taglineHTML}</p>
        <div class="footer-socials">${socialsHTML}</div>
      </div>
      <nav class="footer-nav">${navColsHTML}</nav>
    </div>
    <div class="footer-bottom">
      <p class="footer-copy">${copyright}</p>
      <p class="footer-built">${builtHTML}</p>
    </div>
  `;
}

function parseTable(table) {
  let logo = '';
  let logoImage = '';
  let taglineHTML = '';
  const socials = [];
  const navCols = [];
  let copyright = '';
  let builtHTML = '';

  [...table.querySelectorAll('tr')].forEach((row) => {
    const cells = [...row.querySelectorAll('td')];
    if (cells.length < 2) return;
    const key = cells[0].textContent.trim().toLowerCase();
    const val = cells[1];
    if (key === 'footer') return;
    if (key === 'logo') { logo = val.textContent.trim(); return; }
    if (key === 'logo image') {
      const img = val.querySelector('img');
      logoImage = img ? img.getAttribute('src') : val.textContent.trim();
      return;
    }
    if (key === 'tagline') { taglineHTML = val.innerHTML; return; }
    if (key === 'github' || key === 'twitter' || key === 'linkedin') {
      const a = val.querySelector('a');
      socials.push({ platform: key, href: a ? a.getAttribute('href') : val.textContent.trim() });
      return;
    }
    if (key === 'copyright') { copyright = val.textContent.trim(); return; }
    if (key === 'built') { builtHTML = val.innerHTML.replace(/[❤♥]/g, HEART_SVG); return; }
    const links = [...val.querySelectorAll('a')].map((a) => ({
      text: a.textContent.trim(),
      href: a.getAttribute('href') || '/',
    }));
    if (links.length) navCols.push({ heading: cells[0].textContent.trim(), links });
  });

  return {
    logo, logoImage, taglineHTML, socials, navCols, copyright, builtHTML,
  };
}

function cellHTML(el) {
  const p = el.querySelector(':scope > p');
  return (p && el.children.length === 1) ? p.innerHTML : el.innerHTML;
}

function parseDiv(container) {
  let logo = '';
  let logoImage = '';
  let taglineHTML = '';
  const socials = [];
  const navCols = [];
  let copyright = '';
  let builtHTML = '';

  [...container.querySelectorAll(':scope > div')].forEach((row) => {
    const cols = [...row.querySelectorAll(':scope > div')];
    if (cols.length < 2) return;
    const key = cols[0].textContent.trim().toLowerCase();
    const val = cols[1];
    if (!key || key === 'footer') return;
    if (key === 'logo') { logo = val.textContent.trim(); return; }
    if (key === 'logo image') {
      const img = val.querySelector('img');
      logoImage = img ? img.getAttribute('src') : val.textContent.trim();
      return;
    }
    if (key === 'tagline') { taglineHTML = cellHTML(val); return; }
    if (key === 'github' || key === 'twitter' || key === 'linkedin') {
      const a = val.querySelector('a');
      socials.push({ platform: key, href: a ? a.getAttribute('href') : val.textContent.trim() });
      return;
    }
    if (key === 'copyright') { copyright = val.textContent.trim(); return; }
    if (key === 'built') { builtHTML = cellHTML(val).replace(/[❤♥]/g, HEART_SVG); return; }
    const links = [...val.querySelectorAll('a')].map((a) => ({
      text: a.textContent.trim(),
      href: a.getAttribute('href') || '/',
    }));
    if (links.length) navCols.push({ heading: cols[0].textContent.trim(), links });
  });

  return {
    logo, logoImage, taglineHTML, socials, navCols, copyright, builtHTML,
  };
}

async function fetchFooterHTML() {
  const { hostname } = window.location;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  // On localhost the AEM CLI may not proxy client-side fetch to the preview server,
  // so hit the preview origin directly (CORS is open on aem.page).
  const base = isLocal ? 'https://main--new--shruti-1622.aem.page' : '';
  const resp = await fetch(`${base}/footer.plain.html`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching ${base}/footer.plain.html`);
  return resp.text();
}

export default async function decorate(block) {
  try {
    const html = await fetchFooterHTML();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // da.live may return raw <table> OR EDS block-div format <div class="footer">
    const table = doc.querySelector('table');
    if (table) {
      render(block, parseTable(table));
      return;
    }

    const divBlock = doc.querySelector('.footer') || doc.querySelector('body > div');
    if (divBlock) {
      render(block, parseDiv(divBlock));
      return;
    }

    throw new Error('no parseable content in /footer.plain.html — check da.live page structure');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Footer: failed to load —', e.message);
  }
}
