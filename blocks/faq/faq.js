/**
 * FAQ block — replicates the "Got Questions?" accordion section
 *
 * da.live table format:
 * ┌────────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────┐
 * │ FAQ                                                        │                                                                  │
 * ├────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
 * │ What is HackHub?                                           │ HackHub is a platform where you can discover hackathons…         │
 * ├────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
 * │ Can I participate without a team?                          │ Yes. You can register as an individual…                          │
 * ├────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
 * │ Who can use HackHub?                                       │ Students, developers, designers, entrepreneurs…                  │
 * ├────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
 * │ Why use HackHub instead of searching hackathons manually?  │ HackHub brings hackathons, registrations, team discovery…        │
 * └────────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────┘
 *
 * Place the label + heading as default content in the same section:
 *   04 / FAQ
 *   ## Got *Questions?*
 *   | FAQ | |
 *   | Q   | A |
 */
export default function decorate(block) {
  // Mark parent section for scoped CSS
  const section = block.closest('.section');
  if (section) section.classList.add('faq-section');

  const rows = [...block.querySelectorAll(':scope > div')];
  block.innerHTML = '';

  const list = document.createElement('div');
  list.className = 'faq-list';

  rows.forEach((row) => {
    const qEl = row.children[0];
    const aEl = row.children[1];
    if (!qEl || !aEl) return;

    const details = document.createElement('details');
    details.className = 'faq-item';

    const summary = document.createElement('summary');
    summary.textContent = qEl.textContent.trim();

    const answer = document.createElement('p');
    answer.textContent = aEl.textContent.trim();

    details.append(summary, answer);

    // Only one item open at a time
    details.addEventListener('toggle', () => {
      if (details.open) {
        list.querySelectorAll('details[open]').forEach((d) => {
          if (d !== details) d.removeAttribute('open');
        });
      }
    });

    list.append(details);
  });

  block.append(list);
}
