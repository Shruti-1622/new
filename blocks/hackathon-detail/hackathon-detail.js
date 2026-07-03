export default function decorate(block) {
  const data = {};
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const key = cells[0]?.textContent.trim().toLowerCase();
    if (key) data[key] = cells[1];
  });

  const section = block.closest('.section');
  if (section) section.style.setProperty('margin', '0', 'important');
  const wrapper = block.parentElement;
  if (wrapper) { wrapper.style.maxWidth = '100%'; wrapper.style.padding = '0'; }

  const img = data.image?.querySelector('img');
  const registerEl = data.register?.querySelector('a');
  const tags = (data.tags?.textContent || '').split(',').map((t) => t.trim()).filter(Boolean);

  block.innerHTML = `
    <div class="hd-hero">
      ${img ? `<img class="hd-bg-img" src="${img.src}" alt="">` : ''}
      <div class="hd-scrim"></div>
      <div class="hd-content">
        ${tags.length ? `<div class="hd-tags">${tags.map((t) => `<span class="hd-tag">${t}</span>`).join('')}</div>` : ''}
        <h1 class="hd-title">${data.title?.textContent.trim() || ''}</h1>
        <p class="hd-organiser">${data.organiser?.textContent.trim() || ''}</p>
        <div class="hd-meta">
          ${data.date ? `<span>${data.date.textContent.trim()}</span>` : ''}
          ${data.location ? `<span>${data.location.textContent.trim()}</span>` : ''}
          ${data.prize ? `<span>${data.prize.textContent.trim()}</span>` : ''}
          ${data.mode ? `<span>${data.mode.textContent.trim()}</span>` : ''}
        </div>
        ${data.description ? `<p class="hd-desc">${data.description.textContent.trim()}</p>` : ''}
        ${registerEl ? `<a class="hd-register" href="${registerEl.href}" target="_blank" rel="noopener">Register Now →</a>` : ''}
      </div>
    </div>
  `;
}
