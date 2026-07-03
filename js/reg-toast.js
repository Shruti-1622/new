window.HackToast = (function() {
  function show(msg, type = 'info') {
    let c = document.getElementById('toast-container');
    if(!c) {
      c = document.createElement('div');
      c.id = 'toast-container';
      c.className = 'toast-container';
      document.body.appendChild(c);
    }

    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if(type === 'success') icon = '✅';
    if(type === 'error') icon = '⚠️';

    t.innerHTML = `<span class="toast-icon">${icon}</span> <span>${msg}</span>`;
    c.appendChild(t);

    setTimeout(() => {
      t.classList.add('toast-out');
      setTimeout(() => t.remove(), 300);
    }, 3500);
  }

  return { show };
})();
