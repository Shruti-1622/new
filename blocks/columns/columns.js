export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-img-col');
        }
      }
    });
  });

  // Handle About variant custom SVGs
  if (block.classList.contains('about')) {
    const svgs = [
      '<div class="card-icon" style="color:#ffd700;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg></div>',
      '<div class="card-icon" style="color:#ff4444;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg></div>',
      '<div class="card-icon" style="color:#00c8ff;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.5-2.5 3.5-2.5 5.5C4 22 6 21 7.5 19.5M12 12l9-9M12 12c-1.5 1.5-3.5 2.5-5.5 2.5C6 14 4 13 2.5 11.5M12 12c1.5-1.5 2.5-3.5 2.5-5.5C14 6 13 4 11.5 2.5M12 12l-9 9"></path></svg></div>'
    ];
    
    // The columns are the children of the first row
    const firstRow = block.firstElementChild;
    if (firstRow) {
      [...firstRow.children].forEach((col, i) => {
        if (svgs[i]) {
          col.insertAdjacentHTML('afterbegin', svgs[i]);
        }
        
        // Find the title (usually the second element after the SVG we just injected)
        // If da.live mashed the title and text together with a <br>, split them out!
        let elements = [...col.children];
        // Skip the SVG we just added
        let contentEl = elements.find(el => el.tagName !== 'DIV');
        
        if (contentEl && contentEl.innerHTML.includes('<br>')) {
          const parts = contentEl.innerHTML.split(/<br\s*\/?>/i);
          if (parts.length >= 2) {
            const titlePart = parts.shift().replace(/^#+\s*/, '');
            const descPart = parts.join('<br>');
            
            // Replace the mashed element with a clean title and p
            contentEl.outerHTML = `<div class="about-title">${titlePart}</div><p>${descPart}</p>`;
          }
        } else {
          // Fallback if they are actually separate elements
          const titleEl = elements.find(el => el.tagName.match(/^H[1-6]$/) || (el.tagName === 'P' && el.textContent.trim().startsWith('###')));
          if (titleEl) {
            titleEl.classList.add('about-title');
            // Clean up markdown hashes
            titleEl.innerHTML = titleEl.innerHTML.replace(/^#+\s*/, '');
          }
        }
      });
    }
  }

  // Handle Organiser variant custom structure (Multi-row authoring)
  if (block.classList.contains('organiser')) {
    const rows = [...block.children];
    
    // We will restructure the block into the 2-column grid format our CSS expects
    const container = document.createElement('div');
    const leftCol = document.createElement('div');
    const rightCol = document.createElement('div');
    const featureList = document.createElement('ul');
    rightCol.append(featureList);
    container.append(leftCol, rightCol);

    const icons = [
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>',
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>',
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>'
    ];

    let featureIndex = 0;
    let currentFeatureLi = null;

    if (rows.length === 1) {
      // AGGRESSIVE RECOVERY: The user pasted the squashed table and da.live stripped all formatting.
      const leftCell = rows[0].children[0];
      const rightCell = rows[0].children[1];

      // Recover Left Column
      if (leftCell) {
        let lText = leftCell.textContent;
        // Preserve case by using capturing groups!
        lText = lText.replace(/(ORGANIZATIONS)(##)/i, '$1<br>$2');
        lText = lText.replace(/(HACKATHONS)(PARTNER)/i, '$1<br>$2');
        lText = lText.replace(/(INNOVATION\.)\s*(START)/i, '$1<br>$2');
        
        const lParts = lText.split('<br>');
        
        if (lParts[0]) {
          const p = document.createElement('p');
          p.className = 'organiser-badge';
          p.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg> ${lParts[0].replace(/[^a-zA-Z\s]/g, '').trim()}`;
          leftCol.append(p);
        }
        
        if (lParts[1]) {
          const h2 = document.createElement('h2');
          h2.className = 'organiser-title';
          let content = lParts[1].replace(/^#+\s*/, '').trim();
          content = content.replace(/(HACKATHONS)/i, '<em>$1</em>');
          h2.innerHTML = content;
          leftCol.append(h2);
        }
        
        if (lParts[2]) {
          const p = document.createElement('p');
          p.className = 'organiser-desc';
          p.innerHTML = lParts[2].trim();
          leftCol.append(p);
        }
        
        if (lParts[3] || lText.toLowerCase().includes('start organising')) {
          const btnDiv = document.createElement('div');
          btnDiv.className = 'button-container';
          const a = document.createElement('a');
          a.href = '#';
          a.className = 'button';
          const btnText = lParts[3] ? lParts[3].replace(/[^a-zA-Z\s]/g, '').trim() : 'Start Organising';
          a.innerHTML = `<span>${btnText}</span> <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>`;
          btnDiv.append(a);
          leftCol.append(btnDiv);
        }
      }

      // Recover Right Column
      if (rightCell) {
        let rText = rightCell.textContent;
        rText = rText.replace(/(Pipeline)(Source)/i, '$1<br>$2');
        rText = rText.replace(/(Platform)(Team)/i, '$1<br>$2');
        rText = rText.replace(/(Visibility)(Amplify)/i, '$1<br>$2');
        
        const rCards = rText.split('###').map(s => s.trim()).filter(Boolean);
        
        rCards.forEach((cardText, index) => {
          const parts = cardText.split('<br>');
          const title = parts[0] ? parts[0].trim() : '';
          const desc = parts[1] ? parts[1].trim() : '';
          const iconSvg = icons[index % icons.length];
          
          const li = document.createElement('li');
          // NO feature-content wrapper so that title and text stack vertically as flex columns side-by-side with the icon!
          li.innerHTML = `
            <div class="feature-icon">${iconSvg}</div>
            <h3>${title}</h3>
            <p>${desc}</p>
          `;
          featureList.append(li);
        });
      }

    } else {
      // PROPER MULTI-ROW TABLE
      rows.forEach((row, rowIndex) => {
        const cols = [...row.children];
        const leftCell = cols[0];
        const rightCell = cols[1];

        // Process Left Column data
        if (leftCell && leftCell.textContent.trim()) {
          if (rowIndex === 0) {
            // Badge
            const p = document.createElement('p');
            p.className = 'organiser-badge';
            p.innerHTML = leftCell.textContent.trim();
            leftCol.append(p);
          } else if (rowIndex === 1) {
            // Title
            const h2 = document.createElement('h2');
            h2.className = 'organiser-title';
            let content = leftCell.textContent.replace(/^#+\s*/, '');
            content = content.replace(/\*([^*]+)\*/g, '<em>$1</em>');
            if (!content.includes('<em>') && content.toUpperCase().includes('HACKATHONS')) {
               content = content.replace(/(HACKATHONS)/i, '<em>$1</em>');
            }
            h2.innerHTML = content;
            leftCol.append(h2);
          } else if (leftCell.querySelector('a') || leftCell.textContent.toLowerCase().includes('start organising')) {
            // CTA Button
            const btnDiv = document.createElement('div');
            btnDiv.className = 'button-container';
            let a = leftCell.querySelector('a');
            if (!a) {
               a = document.createElement('a');
               a.href = '#';
               a.textContent = leftCell.textContent.trim();
            }
            a.className = 'button';
            a.innerHTML = `<span>${a.textContent.replace(/\*+/g, '').trim()}</span> <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>`;
            btnDiv.append(a);
            leftCol.append(btnDiv);
          } else {
            // Description
            const p = document.createElement('p');
            p.className = 'organiser-desc';
            p.innerHTML = leftCell.innerHTML;
            leftCol.append(p);
          }
        }

        // Process Right Column data (Feature cards)
        if (rightCell && rightCell.textContent.trim()) {
          const isTitleRow = (rowIndex % 2 === 0);
          
          if (isTitleRow) {
            currentFeatureLi = document.createElement('li');
            const iconSvg = icons[featureIndex % icons.length];
            const titleText = rightCell.textContent.replace(/^#+\s*/, '').trim();
            
            currentFeatureLi.innerHTML = `
              <div class="feature-icon">${iconSvg}</div>
              <h3>${titleText}</h3>
            `;
            featureList.append(currentFeatureLi);
            featureIndex++;
          } else if (currentFeatureLi) {
            const p = document.createElement('p');
            p.innerHTML = rightCell.innerHTML;
            currentFeatureLi.append(p);
          }
        }
      });
    }

    block.replaceChildren(container);
  }

  // Attempt to find and fix the section title if it was pasted as literal text
  // Only do this for sections that are meant to have the title decoration (e.g. About)
  if (block.classList.contains('about')) {
    const section = block.closest('.section');
    if (section) {
      const defaultContent = section.querySelector('.default-content-wrapper');
      if (defaultContent) {
        // If the title is a paragraph starting with ##
        const pTags = defaultContent.querySelectorAll('p');
        pTags.forEach(p => {
          if (p.textContent.trim().startsWith('##')) {
            p.classList.add('section-main-title');
            let content = p.innerHTML.replace(/^#+\s*/, '');
            // Convert literal *text* to <em>text</em> for gold highlighting
            content = content.replace(/\*([^*]+)\*/g, '<em>$1</em>');
            p.innerHTML = content;
          }
        });
        
        // If it actually is an H2
        const h2Tags = defaultContent.querySelectorAll('h2');
        h2Tags.forEach(h2 => {
          h2.classList.add('section-main-title');
          h2.innerHTML = h2.innerHTML.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        });
      }
    }
  }
}
