window.HackState = (function() {
  function getUser() { try { return JSON.parse(localStorage.getItem('hackhub_user')); } catch { return null; } }
  
  function setUser(u) {
    localStorage.setItem('hackhub_user', JSON.stringify(u));
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('currentUserEmail', u.email);
    const p = JSON.parse(localStorage.getItem('hk_profile') || '{}');
    p.name = u.name; p.email = u.email;
    localStorage.setItem('hk_profile', JSON.stringify(p));
  }
  
  function isLoggedIn() { return !!getUser() || localStorage.getItem('isLoggedIn') === 'true'; }
  
  function getCurrentUserEmail() {
    try {
      const u = getUser();
      return (u && u.email) || localStorage.getItem('currentUserEmail') || '';
    } catch {
      return localStorage.getItem('currentUserEmail') || '';
    }
  }

  function getRegsKey() {
    const email = getCurrentUserEmail();
    return email ? `hackhub_registrations_${email}` : 'hackhub_registrations';
  }

  function getWishKey() {
    const email = getCurrentUserEmail();
    return email ? `hackhub_wishlist_${email}` : 'hackhub_wishlist';
  }
  
  function getRegs() {
    if (!isLoggedIn()) return [];
    try {
      return JSON.parse(localStorage.getItem(getRegsKey())) || [];
    } catch {
      return [];
    }
  }
  
  function isReg(id) { return getRegs().some(r => r.hackathonId === parseInt(id)); }
  
  function addReg(r) {
    if (!isLoggedIn()) return;
    const rs = getRegs();
    rs.push({ ...r, paidAt: new Date().toISOString() });
    localStorage.setItem(getRegsKey(), JSON.stringify(rs));
  }
  
  function getWish() {
    if (!isLoggedIn()) return [];
    try {
      return JSON.parse(localStorage.getItem(getWishKey())) || [];
    } catch {
      return [];
    }
  }
  
  function isWish(id) { return getWish().includes(parseInt(id)); }
  
  function toggleWish(id) {
    if (!isLoggedIn()) return false;
    id = parseInt(id);
    let list = getWish();
    if(list.includes(id)) list = list.filter(x => x !== id);
    else list.push(id);
    localStorage.setItem(getWishKey(), JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: id }));
    return list.includes(id);
  }

  function getH(slug) { return (window.HACKATHONS||[]).find(x => x.slug === slug || x.id === parseInt(slug)); }

  return { getUser, setUser, isLoggedIn, getRegs, isReg, addReg, getWish, isWish, toggleWish, getH };
})();

