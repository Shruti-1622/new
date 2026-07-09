// form.js — EDS block
// Standard EDS/AEM form block: authors define fields as table rows
// (Label | Type | Placeholder | Required), the block builds a real,
// accessible <form> with native validation. Since this project has no
// backend, an "Action" config row picks which localStorage-backed
// handler processes the submission -- currently only "hackathon-submission"
// is implemented, matching the exact pendingHackathons queue shape the
// admin dashboard (profile-page.js, admin variant) already reads from.

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* */ }
}

const FIELD_TYPES = new Set(['text', 'email', 'tel', 'date', 'textarea', 'number', 'url', 'file']);
const CONFIG_KEYS = new Set(['action', 'submit-label', 'success-title', 'success-message', 'expect-title', 'expect-steps']);

const CHECK_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

// Field labels are matched (case-insensitive) to the keys the
// "hackathon-submission" action needs -- authors must use these exact
// labels for that action's data to map correctly, same convention every
// other block's config rows already use.
const HACKATHON_LABEL_MAP = {
  'company name': 'company',
  'contact person': 'contactPerson',
  'contact email': 'contactEmail',
  'hackathon name': 'hackathonName',
  description: 'description',
  'registration deadline': 'deadline',
  'team size': 'teamSize',
  'prize pool': 'prize',
  'banner image': 'banner',
};

function genId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) { resolve(''); return; }
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target.result);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

async function submitHackathon(block, values) {
  const pending = lsGet('pendingHackathons', []);
  pending.push({
    id: genId('hack'),
    company: values.company || '',
    contactPerson: values.contactPerson || '',
    contactEmail: values.contactEmail || '',
    hackathonName: values.hackathonName || '',
    description: values.description || '',
    deadline: values.deadline || '',
    teamSize: values.teamSize || '',
    prize: values.prize || '',
    banner: values.banner || '',
    status: 'Pending Approval',
    submittedAt: new Date().toISOString(),
  });
  lsSet('pendingHackathons', pending);
  return true;
}

const ACTIONS = {
  'hackathon-submission': submitHackathon,
};

export default function decorate(block) {
  const rows = [...block.children];
  const cfg = {};
  const fields = [];

  rows.forEach((row) => {
    const cells = [...row.children];
    const key = cells[0]?.textContent.trim().toLowerCase().replace(/\s+/g, '-');
    if (cells.length >= 2 && CONFIG_KEYS.has(key)) {
      cfg[key] = cells[1]?.textContent.trim() || '';
      return;
    }
    const label = cells[0]?.textContent.trim();
    if (!label) return;
    const rawType = (cells[1]?.textContent.trim() || 'text').toLowerCase();
    fields.push({
      label,
      type: FIELD_TYPES.has(rawType) ? rawType : 'text',
      placeholder: cells[2]?.textContent.trim() || '',
      required: (cells[3]?.textContent.trim() || '').toLowerCase() === 'yes',
    });
  });

  const submitLabel = cfg['submit-label'] || 'Submit';
  const successTitle = cfg['success-title'] || "Thank You — We've Got This Covered";
  const successMessage = cfg['success-message'] || "Our partnerships team will personally reach out to you within 24 hours to walk through the details and get your hackathon ready to go live. From there, we handle everything — hosting your event page, managing the full registration pipeline, and actively promoting it to our community — so your team can stay focused on running a great event, not chasing logistics.";
  const expectTitle = cfg['expect-title'] || 'What Happens Next';
  const expectSteps = (cfg['expect-steps'] || [
    'A dedicated HackHub partner manager will call or email you within 24 hours to confirm the details and answer any questions.',
    "We'll build and publish your hackathon page, then open registrations to our community — no setup work needed on your end.",
    "We'll actively promote your hackathon across our platform, social channels, and student network to drive quality sign-ups.",
  ].join('|')).split('|').map((s) => s.trim()).filter(Boolean);

  const form = document.createElement('form');
  form.className = 'form-el';
  form.noValidate = true;

  let currentRow = null;
  fields.forEach((f, i) => {
    const id = `form-f-${i}`;
    const wrap = document.createElement('div');
    wrap.className = 'form-field';
    if (f.type === 'file' || f.type === 'textarea') {
      wrap.classList.add('form-field-full');
    }

    let inputHtml;
    if (f.type === 'textarea') {
      inputHtml = `<textarea id="${id}" rows="3" placeholder="${esc(f.placeholder)}" ${f.required ? 'required' : ''}></textarea>`;
    } else if (f.type === 'file') {
      inputHtml = `<input type="file" id="${id}" accept="image/*" ${f.required ? 'required' : ''}>`;
    } else {
      inputHtml = `<input type="${f.type}" id="${id}" placeholder="${esc(f.placeholder)}" ${f.required ? 'required' : ''}>`;
    }
    wrap.innerHTML = `<label for="${id}">${esc(f.label)}</label>${inputHtml}`;
    wrap.dataset.label = f.label;
    wrap.dataset.type = f.type;

    if (wrap.classList.contains('form-field-full')) {
      form.appendChild(wrap);
      currentRow = null;
    } else {
      if (!currentRow) {
        currentRow = document.createElement('div');
        currentRow.className = 'form-field-row';
        form.appendChild(currentRow);
      }
      currentRow.appendChild(wrap);
      if (currentRow.children.length === 2) currentRow = null;
    }
  });

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'form-submit-btn';
  submitBtn.textContent = submitLabel;
  form.appendChild(submitBtn);

  const errorEl = document.createElement('p');
  errorEl.className = 'form-error';
  errorEl.hidden = true;
  form.appendChild(errorEl);

  block.innerHTML = '';
  block.appendChild(form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    const missing = [...form.querySelectorAll('[required]')].find((el) => !el.value.trim());
    if (missing) {
      errorEl.textContent = 'Please fill in all required fields.';
      errorEl.hidden = false;
      missing.focus();
      return;
    }

    const action = cfg.action;
    const handler = ACTIONS[action];
    if (!handler) {
      errorEl.textContent = 'This form is not connected to an action yet.';
      errorEl.hidden = false;
      return;
    }

    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = 'Submitting…';

    const values = {};
    const fieldWraps = [...form.querySelectorAll('.form-field')];
    await Promise.all(fieldWraps.map(async (wrap) => {
      const mappedKey = HACKATHON_LABEL_MAP[wrap.dataset.label.toLowerCase()];
      if (!mappedKey) return;
      if (wrap.dataset.type === 'file') {
        const fileInput = wrap.querySelector('input');
        values[mappedKey] = await readFileAsDataUrl(fileInput.files[0]);
      } else {
        values[mappedKey] = wrap.querySelector('input, textarea').value.trim();
      }
    }));

    await handler(block, values);

    block.innerHTML = `
      <div class="form-success">
        <h2>${esc(successTitle)}</h2>
        <p>${esc(successMessage)}</p>
        ${expectSteps.length ? `
        <div class="form-expect">
          <h3>${esc(expectTitle)}</h3>
          <ul>
            ${expectSteps.map((s) => `<li><span class="form-expect-check">${CHECK_ICON}</span>${esc(s)}</li>`).join('')}
          </ul>
        </div>` : ''}
      </div>`;
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  });
}
