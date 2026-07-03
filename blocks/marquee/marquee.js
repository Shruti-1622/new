export default function decorate(block) {
  let title = '';
  let logos = [];

  const rows = [...block.children];
  rows.forEach((row) => {
    const cols = row.children;
    if (cols.length < 2) return;
    const key = cols[0].textContent.trim().toLowerCase();
    const val = cols[1];

    if (key === 'title') {
      title = val.textContent.trim();
    } else if (key === 'logos') {
      logos = [...val.querySelectorAll('picture, img')];
      // Filter out imgs that are already inside a picture to avoid duplication
      logos = logos.filter(el => el.tagName === 'PICTURE' || (el.tagName === 'IMG' && !el.closest('picture')));
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
    outer.className = 'marquee-outer';
    outer.id = 'marqueeOuter';

    const belt = document.createElement('div');
    belt.className = 'marquee-belt';
    belt.id = 'marqueeBelt';

    // Original logos
    logos.forEach((logo) => {
      belt.appendChild(logo.cloneNode(true));
    });

    // Duplicated logos for infinite scroll
    logos.forEach((logo) => {
      const clone = logo.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      belt.appendChild(clone);
    });

    outer.appendChild(belt);
    block.appendChild(outer);
  }
}
