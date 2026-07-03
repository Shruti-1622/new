export default function decorate(block) {
  // EDS section/wrapper overrides — full-width flush layout
  const section = block.closest('.section');
  if (section) section.style.setProperty('margin', '0', 'important');
  const wrapper = block.parentElement;
  if (wrapper) { wrapper.style.maxWidth = '100%'; wrapper.style.padding = '0'; }

  // Load DM Mono once per page — skip if section-heading already loaded it
  if (!document.querySelector('link[data-font="bebas-neue"], link[data-font="fb-fonts"]')) {
    const pc1 = document.createElement('link'); pc1.rel = 'preconnect'; pc1.href = 'https://fonts.googleapis.com';
    const pc2 = document.createElement('link'); pc2.rel = 'preconnect'; pc2.href = 'https://fonts.gstatic.com'; pc2.crossOrigin = '';
    const fl = document.createElement('link'); fl.rel = 'stylesheet';
    fl.href = 'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;600&display=swap';
    fl.dataset.font = 'fb-fonts';
    document.head.append(pc1, pc2, fl);
  }

  // Parse row label → value pairs (case-insensitive, hyphen-normalised)
  const config = {};
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const key = cells[0]?.textContent.trim().toLowerCase().replace(/\s+/g, '-');
    const val = cells[1]?.textContent.trim();
    if (key && val) config[key] = val;
  });

  const inner = document.createElement('div');
  inner.className = 'fb-inner';

  // ── Search + Dropdown row ──────────────────────────────────────────────────
  if (config.search || config.dropdown) {
    const searchRow = document.createElement('div');
    searchRow.className = 'fb-search-row';

    if (config.search) {
      const searchWrap = document.createElement('div');
      searchWrap.className = 'fb-search-wrap';

      const input = document.createElement('input');
      input.type = 'search';
      input.className = 'fb-input';
      input.placeholder = config.search;
      input.setAttribute('aria-label', config.search);
      input.autocomplete = 'off';

      const icon = document.createElement('span');
      icon.className = 'fb-search-icon';
      icon.setAttribute('aria-hidden', 'true');

      searchWrap.append(input, icon);
      searchRow.append(searchWrap);

      input.addEventListener('input', () => {
        block.dispatchEvent(new CustomEvent('filter-bar:change', {
          bubbles: true,
          detail: { type: 'search', value: input.value.trim() },
        }));
      });
    }

    if (config.dropdown) {
      const selectWrap = document.createElement('div');
      selectWrap.className = 'fb-dropdown-wrap';

      const select = document.createElement('select');
      select.className = 'fb-dropdown';
      // Derive aria-label from first option (e.g. "All Roles" → "Filter by role")
      const firstOpt = config.dropdown.split(',')[0].trim();
      select.setAttribute('aria-label', firstOpt);

      config.dropdown.split(',').forEach((opt) => {
        const label = opt.trim();
        const option = document.createElement('option');
        option.textContent = label;
        option.value = label.toLowerCase().replace(/\s+/g, '-');
        select.append(option);
      });

      selectWrap.append(select);
      searchRow.append(selectWrap);

      select.addEventListener('change', () => {
        block.dispatchEvent(new CustomEvent('filter-bar:change', {
          bubbles: true,
          detail: { type: 'dropdown', value: select.value },
        }));
      });
    }

    inner.append(searchRow);
  }

  // ── Pills ──────────────────────────────────────────────────────────────────
  const hasPrimary = Boolean(config.filters);
  const hasSecondary = Boolean(config['filters-secondary']);

  if (hasPrimary || hasSecondary) {
    const pillsRow = document.createElement('div');
    pillsRow.className = 'fb-pills-row';

    function buildPillGroup(csvStr, groupType) {
      const group = document.createElement('div');
      group.className = 'fb-pills';
      group.dataset.group = groupType;
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', groupType === 'filters' ? 'Category filters' : 'Secondary filters');

      csvStr.split(',').forEach((label, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = i === 0 ? 'fb-pill active' : 'fb-pill';
        btn.textContent = label.trim();
        btn.setAttribute('aria-pressed', String(i === 0));
        group.append(btn);
      });

      group.addEventListener('click', (e) => {
        const pill = e.target.closest('.fb-pill');
        if (!pill) return;
        group.querySelectorAll('.fb-pill').forEach((p) => {
          p.classList.remove('active');
          p.setAttribute('aria-pressed', 'false');
        });
        pill.classList.add('active');
        pill.setAttribute('aria-pressed', 'true');
        block.dispatchEvent(new CustomEvent('filter-bar:change', {
          bubbles: true,
          detail: { type: groupType, value: pill.textContent.trim() },
        }));
      });

      return group;
    }

    if (hasPrimary) pillsRow.append(buildPillGroup(config.filters, 'filters'));
    if (hasSecondary) pillsRow.append(buildPillGroup(config['filters-secondary'], 'filters-secondary'));

    inner.append(pillsRow);
  }

  block.innerHTML = '';
  block.append(inner);
}
