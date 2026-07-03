export default function decorate(block) {
  block.innerHTML = `
    <div class="footer-main">
      <div class="footer-brand">
        <div class="nav-logo">
          <span class="logo-bracket">{</span>HackHub<span class="logo-bracket">}</span>
        </div>
        <p class="footer-tagline">We love <strong>software</strong> and people who <strong>ship it</strong>.</p>
        <div class="footer-socials">
          <a href="https://github.com/Shruti-1622" target="_blank" rel="noopener" class="footer-social-link" aria-label="GitHub">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
            </svg>
          </a>
          <a href="https://x.com/shruti_gupta_" target="_blank" rel="noopener" class="footer-social-link" aria-label="Twitter">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>
            </svg>
          </a>
          <a href="https://www.linkedin.com/in/shruti-gupta-6a057a20a/" target="_blank" rel="noopener" class="footer-social-link" aria-label="LinkedIn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
              <rect x="2" y="9" width="4" height="12"/>
              <circle cx="4" cy="4" r="2"/>
            </svg>
          </a>
        </div>
      </div>
      <nav class="footer-nav">
        <div class="footer-nav-col">
          <h3>Platform</h3>
          <ul>
            <li><a href="/hackathon">Hackathons</a></li>
            <li><a href="/teamfinder">Find Teams</a></li>
            <li><a href="/gallery">Gallery</a></li>
          </ul>
        </div>
        <div class="footer-nav-col">
          <h3>Account</h3>
          <ul>
            <li><a href="/profile">Profile</a></li>
            <li><a href="/signup">Sign Up</a></li>
          </ul>
        </div>
      </nav>
    </div>
    <div class="footer-bottom">
      <p class="footer-copy">© 2026 HackHub. All rights reserved.</p>
      <p class="footer-built">Built with
        <svg width="10" height="10" viewBox="0 0 24 24" fill="#ff4444" stroke="#ff4444" stroke-width="2" style="vertical-align:middle;margin:0 2px">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        for hackers
      </p>
    </div>
  `;
}
