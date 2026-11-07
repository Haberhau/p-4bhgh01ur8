// js/site.js · shared by every page: the phone menu and the scroll reveals.
(() => {
  const root = document.documentElement, menuBtn = document.querySelector('.menu-btn');
  if (menuBtn) {
    // Full-height panel; Escape or a link closes it.
    const setMenu = open => { root.classList.toggle('menu-open', open); menuBtn.setAttribute('aria-expanded', open); };
    menuBtn.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
    document.querySelectorAll('.panel a').forEach(a => a.addEventListener('click', () => setMenu(false)));
    addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  }
  // Sections rise 32px and fade in once, as they enter the viewport.
  const reveal = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); reveal.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll('[data-reveal]').forEach(el => reveal.observe(el));
})();
