const TEMPLATE_ROOT = '/blocks/hackhub-page/templates';

function rootPath(value) {
  if (!value || /^(?:[a-z]+:|\/\/|#|\/)/i.test(value)) return value;
  return `/${value.replace(/^\.\//, '')}`;
}

async function addStyles(source) {
  const waits = [];
  source.querySelectorAll('link[rel="stylesheet"], link[rel="preload"][as="style"]').forEach((link) => {
    const href = rootPath(link.getAttribute('href'));
    if (!href || document.head.querySelector(`link[href="${CSS.escape(href)}"]`)) return;
    const clone = document.createElement('link');
    [...link.attributes].forEach(({ name, value }) => clone.setAttribute(name, value));
    clone.setAttribute('href', href);
    // Wait for real stylesheets to load before we swap the DOM — prevents FOUC
    if (link.rel === 'stylesheet') {
      waits.push(new Promise((resolve) => {
        clone.addEventListener('load', resolve, { once: true });
        clone.addEventListener('error', resolve, { once: true });
      }));
    }
    document.head.append(clone);
  });
  return Promise.all(waits);
}

function addMetadata(source) {
  const title = source.querySelector('title');
  if (title) document.title = title.textContent;

  source.querySelectorAll('meta[name="description"]').forEach((meta) => {
    document.head.querySelector('meta[name="description"]')?.remove();
    document.head.append(meta.cloneNode(true));
  });
}

function normalizeInternalLinks(root) {
  const draftPrefix = window.location.pathname.startsWith('/drafts/') ? '/drafts' : '';

  root.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || /^(?:https?:|mailto:|tel:|#)/i.test(href)) return;
    link.setAttribute('href', href.replace(/^(.+)\.html(?=([?#]|$))/, `${draftPrefix}/$1`));
  });

  root.querySelectorAll('[src], [poster]').forEach((element) => {
    ['src', 'poster'].forEach((attribute) => {
      if (element.hasAttribute(attribute)) {
        element.setAttribute(attribute, rootPath(element.getAttribute(attribute)));
      }
    });
  });
}

async function runScripts(scripts) {
  for (const source of scripts) {
    const script = document.createElement('script');
    [...source.attributes].forEach(({ name, value }) => {
      if (name !== 'defer' && name !== 'async') script.setAttribute(name, value);
    });
    script.setAttribute('nonce', 'aem');

    const src = source.getAttribute('src');
    if (src) {
      await new Promise((resolve) => {
        script.addEventListener('load', resolve, { once: true });
        script.addEventListener('error', resolve, { once: true });
        script.src = rootPath(src);
        document.body.append(script);
      });
    } else {
      script.textContent = source.textContent;
      document.body.append(script);
    }
  }
}


export default async function decorate(block) {
  const routeName = window.location.pathname.split('/').filter(Boolean).pop() || 'index';

  // Row 0: template name. Rows 1+: slug | author-pasted image
  const rows = [...block.children];
  const pageName = rows[0]?.querySelector(':scope > div')?.textContent.trim() || routeName;

  const imageMap = {};
  rows.slice(1).forEach((row) => {
    const cells = [...row.querySelectorAll(':scope > div')];
    const slug = cells[0]?.textContent.trim();
    const img = cells[1]?.querySelector('img');
    if (slug && img) imageMap[slug] = img.src;
  });
  window.HACKATHON_IMAGES = imageMap;

  const response = await fetch(`${TEMPLATE_ROOT}/${pageName}.html`);

  if (!response.ok) {
    block.innerHTML = `<p>Unable to load the ${pageName} page.</p>`;
    return;
  }

  const source = new DOMParser().parseFromString(await response.text(), 'text/html');
  const scripts = [...source.querySelectorAll('script')];
  scripts.forEach((script) => script.remove());

  addMetadata(source);
  // Await CSS load before touching the DOM — prevents FOUC where page is visible
  // before /css/style.css has applied (hero-stats, marquee, etc. all unstyled otherwise)
  await addStyles(source);
  // Merge template body classes but preserve EDS's `appear` — without it EDS's
  // `body { display:none }` kicks in and blanks the page.
  const hadAppear = document.body.classList.contains('appear');
  document.body.className = source.body.className;
  if (hadAppear) document.body.classList.add('appear');

  // Build fragment from template body, skipping <footer> and <nav> —
  // the EDS footer block (footer.js) and EDS header block (header.js) render those.
  const fragment = document.createDocumentFragment();
  [...source.body.childNodes].forEach((node) => {
    if (node.nodeName === 'FOOTER' || node.nodeName === 'NAV') return;
    fragment.append(node);
  });
  normalizeInternalLinks(fragment);

  // Inject marquee CSS as an inline <style> — zero network dependency, applied
  // before the DOM swap so sponsors is full-width from the first paint.
  // Uses 100vw + margin offset to break out of any parent container constraints.
  if (!document.getElementById('hh-marquee-style')) {
    const st = document.createElement('style');
    st.id = 'hh-marquee-style';
    st.textContent = `
      .sponsors{padding:10px 0 52px;background:#fff;border-top:3px solid rgba(217,164,65,.3);border-bottom:3px solid rgba(217,164,65,.3);text-align:center;overflow:hidden;position:relative;min-height:120px;display:flex;flex-direction:column;justify-content:center;width:100vw;margin-left:calc(50% - 50vw)}
      .sponsors h2{font-family:'DM Mono',monospace;font-size:.9rem;font-weight:900;letter-spacing:.2em;color:#555;text-transform:uppercase;margin-bottom:28px;margin-top:20px}
      .marquee-outer{overflow:hidden;width:100%;display:block;position:relative;mask-image:linear-gradient(to right,transparent,#fff 12%,#fff 88%,transparent);-webkit-mask-image:linear-gradient(to right,transparent,#fff 12%,#fff 88%,transparent)}
      .marquee-belt{display:flex;align-items:center;gap:5rem;animation:marquee-scroll 30s linear infinite;width:max-content;padding:8px 0;will-change:transform}
      .marquee-belt img{height:52px!important;width:auto!important;max-width:140px;opacity:.85;filter:grayscale(20%);transition:opacity .3s,transform .3s,filter .3s;flex-shrink:0;object-fit:contain;display:block}
      .marquee-belt img:hover{opacity:1;filter:none;transform:scale(1.1)}
      @keyframes marquee-scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
    `;
    document.head.appendChild(st);
  }

  const currentMain = block.closest('main');
  currentMain.replaceWith(fragment);

  // Wire featured card navigation immediately after DOM swap — most reliable
  // approach: no dependency on template script timing or browser cache.
  document.querySelectorAll('.event-card[data-detail-id]').forEach((card) => {
    card.addEventListener('click', () => {
      const detailId = card.dataset.detailId;
      const h = window.HACKATHONS && window.HACKATHONS.find((x) => x.id === parseInt(detailId, 10) || x.slug === detailId);
      window.location.hash = `hackathon/${h ? h.slug : detailId}`;
    });
  });

  await runScripts(scripts);
}
