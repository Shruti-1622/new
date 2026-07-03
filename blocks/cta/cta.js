export default function decorate(block) {
  const section = block.closest('.section');
  if (section) section.style.setProperty('margin', '0', 'important');
  const wrapper = block.parentElement;
  if (wrapper) { wrapper.style.maxWidth = '100%'; wrapper.style.padding = '0'; }

  if (!document.querySelector('link[data-font="hc-fonts"]')) {
    const pc1 = document.createElement('link'); pc1.rel = 'preconnect'; pc1.href = 'https://fonts.googleapis.com';
    const pc2 = document.createElement('link'); pc2.rel = 'preconnect'; pc2.href = 'https://fonts.gstatic.com'; pc2.crossOrigin = '';
    const fl = document.createElement('link');
    fl.rel = 'stylesheet';
    fl.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap';
    fl.dataset.font = 'hc-fonts';
    document.head.append(pc1, pc2, fl);
  }

  // Row contract (da.live table, CTA block name is the first row — EDS strips it):
  // Row 0 → pre-text  (small mono muted label, e.g. "Limited spots — don't miss out")
  // Row 1 → title     (large Bebas Neue heading; bold/italic word → gold accent)
  // Row 2 → button row IF cell contains a link, otherwise → subtitle text
  // Row 3 → (optional) second button row when row 2 was subtitle
  const rows = [...block.children];
  const inner = document.createElement('div');
  inner.className = 'cta-inner';

  rows.forEach((row, i) => {
    const cells = [...row.children];
    const cell = cells[0];
    if (!cell) return;

    if (i === 0) {
      const pre = document.createElement('p');
      pre.className = 'cta-pre';
      pre.textContent = cell.textContent.trim();
      inner.appendChild(pre);
    } else if (i === 1) {
      // da.live converts "## Heading" to <h2> inside the cell — extract inner HTML
      // to avoid creating <h2 class="cta-title"><h2>…</h2></h2>
      const h2 = document.createElement('h2');
      h2.className = 'cta-title';
      const innerEl = cell.querySelector('h1, h2, h3, h4, h5, h6, p');
      h2.innerHTML = (innerEl || cell).innerHTML.trim();
      inner.appendChild(h2);
    } else {
      // Rows 2+: a cell with a link → button row; plain text → subtitle
      const primaryLink = cell.querySelector('a');
      if (primaryLink) {
        const btns = document.createElement('div');
        btns.className = 'cta-buttons';
        primaryLink.className = 'cta-btn-primary';
        btns.appendChild(primaryLink);
        const secondaryLink = cells[1]?.querySelector('a');
        if (secondaryLink) {
          secondaryLink.className = 'cta-btn-secondary';
          btns.appendChild(secondaryLink);
        }
        if (btns.children.length) inner.appendChild(btns);
      } else {
        const sub = document.createElement('p');
        sub.className = 'cta-sub';
        sub.textContent = cell.textContent.trim();
        inner.appendChild(sub);
      }
    }
  });

  block.innerHTML = '';
  block.appendChild(inner);
}
