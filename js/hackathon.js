// Hackathon Page Interactivity



// new code




  (function () {
    const targets = document.querySelectorAll(
      '.spotlight-header, .spotlight-stage, .upcoming-row-wrap'
    );
    if (!targets.length) return;
 
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('sl-visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
 
    targets.forEach(t => io.observe(t));
  })();


// end ocde

let allHackathons = [];
let currentFilter = 'all';

// Category mapping for filter pills
const categoryMap = {
    'AI & ML': 'ai',
    'Web3': 'web3',
    'Mobile': 'web',
    'Cloud': 'cloud',
    'IoT': 'space',
    'All Events': 'all'
};

// Load and display hackathons from JSON
const eventList = document.querySelector('.event-list');

fetch('/data/hackathon.json')
    .then(response => response.json())
    .then(data => {
        allHackathons = data;
        
        data.forEach(hackathon => {
    eventList.innerHTML += `
    <div class="event-card-wrap">
      <article class="event-row" data-category="${hackathon.category}">

        <div class="event-image">
          <img src="${hackathon.image}" alt="${hackathon.title}"
            onerror="this.src='https://placehold.co/700x400/1f1f23/D9A441?text=POSTER'">
          <span class="event-badge">${hackathon.badge || 'OPEN'}</span>
        </div>

        <div class="event-content">
          <div class="event-date-row">
            <div class="event-date-block">
              <span class="date-month">${hackathon.month}</span>
              <span class="date-day">${hackathon.day}</span>
            </div>
            <div class="event-location">
              <span class="event-status-dot"></span>
              ${hackathon.location}
            </div>
          </div>

          <h3>${hackathon.title}</h3>

          <div class="event-meta">
            <span class="prize"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"></path><path d="M12 2a6 6 0 0 1 6 6v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8a6 6 0 0 1 6-6z"></path></svg>${hackathon.prize}</span>
            <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>${hackathon.duration}</span>
          </div>

          <p>${hackathon.description || hackathon.location + ' • ' + hackathon.duration}</p>

          <a class="event-register-btn" href="${hackathon.link}" target="_blank">
            REGISTER NOW <span class="btn-arrow">→</span>
          </a>
        </div>

      </article>
    </div>`;
});
        
        // Setup filter and search listeners after cards are loaded
        setupFiltersAndSearch();
    })
    .catch(error => {
        console.log(error);
    });

function setupFiltersAndSearch() {
    // Filter pills functionality
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', function() {
            document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            
            const pillText = this.textContent.trim();
            currentFilter = categoryMap[pillText] || 'all';
            
            // Apply filters and search together
            applyFiltersAndSearch();
        });
    });

    // Search functionality with visual feedback
    const searchInput = document.querySelector('.search-input');
    const featuredSection = document.querySelector('.featured-section');
    
    searchInput.addEventListener('focus', function() {
        this.style.boxShadow = '0 0 30px rgba(217, 164, 65, 0.25)';
    });

    searchInput.addEventListener('blur', function() {
        this.style.boxShadow = 'none';
    });

    searchInput.addEventListener('input', function() {
        applyFiltersAndSearch();
    });

    // Register button interaction
    document.querySelectorAll('.register-btn, .register-btn-small').forEach(btn => {
        btn.addEventListener('click', function() {
            alert('Registration feature coming soon!');
        });
    });
}

function applyFiltersAndSearch() {
    const searchText = document.querySelector('.search-input').value.toLowerCase();
    const cards = document.querySelectorAll('.event-row');
    const featuredSection = document.querySelector('.featured-section');
    let visibleCount = 0;
    
    // Hide featured section when user starts typing
    if (searchText) {
        featuredSection.style.display = 'none';
        featuredSection.style.opacity = '0';
    } else {
        featuredSection.style.display = 'block';
        featuredSection.style.opacity = '1';
    }
    
    cards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const location = card.querySelector('p').textContent.toLowerCase();
        const category = card.getAttribute('data-category');
        
        // Check if card matches search
        const matchesSearch = !searchText || title.includes(searchText) || location.includes(searchText);
        
        // Check if card matches filter
        const matchesFilter = currentFilter === 'all' || category === currentFilter;
        
        if (matchesSearch && matchesFilter) {
           card.closest('.event-card-wrap').style.display = 'block';
            card.style.opacity = '1';
            card.style.animation = 'fadeIn 0.3s ease-in';
            visibleCount++;
        } else {
           card.closest('.event-card-wrap').style.display = 'none';
            card.style.opacity = '0';
        }
    });
    
    // Visual feedback for search results
    const searchIcon = document.querySelector('.search-icon');
    if (visibleCount === 0 && searchText) {
        searchIcon.textContent = '✗';
        searchIcon.style.color = '#ef4444';
    } else if (searchText) {
        searchIcon.textContent = '✓';
        searchIcon.style.color = '#10b981';
        setTimeout(() => {
            if (document.querySelector('.search-input').value.toLowerCase() === searchText) {
                searchIcon.textContent = '🔍';
                searchIcon.style.color = 'inherit';
            }
        }, 1500);
    } else {
        searchIcon.textContent = '🔍';
        searchIcon.style.color = 'inherit';
    }
}

const video = document.getElementById("spotlightVideo");

if(video){
    video.addEventListener("timeupdate", () => {

        if(video.currentTime >= 30){
            video.pause();
        }

    });
}


console.log('Hackathon page loaded');
