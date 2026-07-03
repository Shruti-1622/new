export default function decorate(block) {
  const rows = [...block.children];
  if (rows.length < 3) return;

  const [eyebrowRow, titleRow, subRow] = rows;

  // Zero out EDS section margin and wrapper constraints with !important via JS
  const section = block.closest('.section');
  if (section) section.style.setProperty('margin', '0', 'important');

  const wrapper = block.parentElement;
  if (wrapper) {
    wrapper.style.maxWidth = '100%';
    wrapper.style.padding = '0';
  }

  // Bebas Neue — load once
  if (!document.querySelector('link[data-font="bebas-neue"]')) {
    const preconnect1 = document.createElement('link');
    preconnect1.rel = 'preconnect';
    preconnect1.href = 'https://fonts.googleapis.com';
    const preconnect2 = document.createElement('link');
    preconnect2.rel = 'preconnect';
    preconnect2.href = 'https://fonts.gstatic.com';
    preconnect2.crossOrigin = '';
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap';
    fontLink.dataset.font = 'bebas-neue';
    document.head.append(preconnect1, preconnect2, fontLink);
  }

  // Gold rule
  const line = document.createElement('div');
  line.className = 'sh-line';

  // Eyebrow
  const eyebrow = document.createElement('span');
  eyebrow.className = 'sh-eyebrow';
  eyebrow.textContent = eyebrowRow.textContent.trim();

  // Title — keep <strong> intact so bold word → gold via CSS
  const titleSource = titleRow.querySelector('p') || titleRow;
  const title = document.createElement('h2');
  title.className = 'sh-title';
  title.innerHTML = titleSource.innerHTML.trim();

  // Subtitle
  const sub = document.createElement('p');
  sub.className = 'sh-sub';
  sub.textContent = subRow.textContent.trim();

  // sh-inner carries the padding (= original .spotlight padding: 100px 4vw 56px)
  // and the scroll-reveal animation — gold line lives inside so spacing is self-contained
  const inner = document.createElement('div');
  inner.className = 'sh-inner';
  inner.append(line, eyebrow, title, sub);

  block.innerHTML = '';
  block.append(inner);

  // Scroll reveal
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
  io.observe(inner);
}
