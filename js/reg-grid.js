window.HackGrid = (function() {
  // Empty module for backward compatibility
  return {};
})();

(function () {
  function handleHash() {
    if (window.location.hash.startsWith('#hackathon/')) {
      setTimeout(() => {
        const id = window.location.hash.split('/')[1];
        if (window.HackDetail) window.HackDetail.show(id);
      }, 100);
    } else if (window.location.hash === '' || window.location.hash === '#') {
      if (window.HackDetail) window.HackDetail.hide();
    }
  }

  function setup() {
    handleHash();
    window.addEventListener('hashchange', handleHash);
  }

  // DOMContentLoaded may have already fired when this script is loaded
  // dynamically (e.g. via EDS runScripts), so check readyState first.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
}());
