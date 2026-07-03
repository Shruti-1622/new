export default function decorate(block) {
  const rows = [...block.children];
  if (rows.length < 3) return;

  const section = block.closest('.section');
  if (section) section.style.setProperty('margin', '0', 'important');
  const wrapper = block.parentElement;
  if (wrapper) { wrapper.style.maxWidth = '100%'; wrapper.style.padding = '0'; }

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
    fl.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500;600&display=swap';
    fl.dataset.font = 'bebas-neue';
    document.head.append(pc1, pc2, fl);
  }

  const isTabs = block.classList.contains('tabs');

  const [eyebrowRow, titleRow, subRow, bgRow] = rows;

  const bgImg = bgRow ? bgRow.querySelector('img') : null;
  if (bgImg) {
    bgImg.className = 'sh-bg';
    bgImg.removeAttribute('loading');
  }

  const line = document.createElement('div');
  line.className = 'sh-line';

  const eyebrowText = eyebrowRow.textContent.trim();
  const eyebrow = eyebrowText ? document.createElement('span') : null;
  if (eyebrow) {
    eyebrow.className = 'sh-eyebrow';
    eyebrow.textContent = eyebrowText;
  }

  const titleSrc = titleRow.querySelector('p') || titleRow;
  const title = document.createElement('h2');
  title.className = 'sh-title';
  title.innerHTML = titleSrc.innerHTML.trim();

  const sub = document.createElement('p');
  sub.className = 'sh-sub';
  sub.textContent = subRow.textContent.trim();

  const inner = document.createElement('div');
  inner.className = 'sh-inner';
  inner.append(line);
  if (eyebrow) inner.append(eyebrow);
  inner.append(title, sub);

  if (isTabs && rows[4]) {
    const tabsWrap = document.createElement('div');
    tabsWrap.className = 'sh-tabs';
    [...rows[4].children].forEach((cell, i) => {
      const tabBtn = document.createElement('button');
      tabBtn.className = i === 0 ? 'sh-tab active' : 'sh-tab';
      tabBtn.type = 'button';
      tabBtn.dataset.tab = String(i);
      tabBtn.textContent = cell.textContent.trim();
      tabsWrap.append(tabBtn);
    });
    inner.append(tabsWrap);
    tabsWrap.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('.sh-tab');
      if (!tabBtn) return;
      tabsWrap.querySelectorAll('.sh-tab').forEach((b) => b.classList.remove('active'));
      tabBtn.classList.add('active');
      document.dispatchEvent(new CustomEvent('sh-tab-switch', { detail: { tab: Number(tabBtn.dataset.tab) } }));
    });
  }

  block.innerHTML = '';
  if (bgImg) block.append(bgImg);
  block.append(inner);

  if (isTabs) {
    inner.classList.add('sh-visible');
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('sh-visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  io.observe(inner);
}
