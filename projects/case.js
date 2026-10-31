(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = id => document.getElementById(id);

  // cover: the giant figure rewrites itself to whichever key figure sits mid-screen
  const big = $('big'), rows = $('rows');
  if (big && rows && 'IntersectionObserver' in window) {
    big.closest('.cover').classList.add('js-figs');
    const figs = [...rows.children], ledger = [...($('ledger')?.children || [])];
    let current;
    const write = li => big.innerHTML = li.dataset.n.replace(/^~/, '<span class="approx">~</span>') + (li.dataset.u ? `<small>${li.dataset.u}</small>` : '');
    const show = li => {
      if (li === current) return;
      const first = !current;
      current = li;
      figs.forEach((f, i) => { f.classList.toggle('on', f === li); ledger[i]?.classList.toggle('on', f === li); });
      if (first || reduce || !big.animate) return write(li);
      big.getAnimations().forEach(a => a.cancel());
      big.animate([{ transform: 'none', opacity: 1, filter: 'blur(0)' }, { transform: 'translateY(-12%)', opacity: 0, filter: 'blur(8px)' }], { duration: 150, easing: 'ease-in' })
        .finished.then(() => {
          write(li);
          big.animate([{ transform: 'translateY(12%)', opacity: 0, filter: 'blur(8px)' }, { transform: 'none', opacity: 1, filter: 'blur(0)' }], { duration: 560, easing: 'cubic-bezier(.16, 1, .3, 1)' });
        }, () => {});
    };
    show(figs[0]);
    // the trigger band sits mid-way through whatever the sticky stage leaves visible (all of it on desktop, the lower part on phones)
    const stage = big.closest('.stage');
    let watch;
    const arm = () => {
      watch?.disconnect();
      const covered = matchMedia('(max-width: 880px)').matches ? stage.offsetHeight : 0, free = innerHeight - covered;
      watch = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && show(e.target)), { rootMargin: `-${Math.round(covered + free * .42)}px 0px -${Math.round(free * .42)}px 0px` });
      figs.forEach(f => watch.observe(f));
    };
    arm();
    addEventListener('resize', () => { clearTimeout(arm.t); arm.t = setTimeout(arm, 200); });
  }

  // Marginalia: replay the capture loop (page rests in the finished state)
  const thought = $('thought');
  if (thought) {
    const full = thought.innerHTML, c1 = $('c1'), c2 = $('c2');
    const plain = 'Call mom tomorrow at six about Sunday, and buy a lamp for the hallway before the weekend.';
    let timer;
    const confirm = (card, btn) => { card.classList.add('done'); btn.textContent = 'Added ✓'; };
    $('b1').onclick = e => confirm(c1, e.currentTarget);
    $('b2').onclick = e => confirm(c2, e.currentTarget);
    $('replay').onclick = () => {
      if (reduce) return;
      clearInterval(timer);
      [c1, c2].forEach(c => { c.classList.add('pending'); c.classList.remove('done'); c.querySelector('button').textContent = 'Confirm'; });
      let i = 0;
      timer = setInterval(() => {
        i++;
        thought.innerHTML = plain.slice(0, i) + '<span class="caret"></span>';
        if (i === 24) c1.classList.remove('pending');
        if (i === 70) c2.classList.remove('pending');
        if (i >= plain.length) { clearInterval(timer); thought.innerHTML = full; }
      }, 38);
    };
  }

  // sprintkit: one ticket walks through the stages
  const mover = $('mover');
  if (mover) {
    const cols = [...document.querySelectorAll('.col')];
    const recount = () => cols.forEach(c => c.querySelector('h2 span').textContent = c.querySelectorAll('.tk').length);
    let at = 2, paused = reduce;
    const pilot = $('autopilot');
    const setPaused = p => { paused = p; pilot.setAttribute('aria-pressed', p); pilot.textContent = p ? 'Autopilot paused' : 'Autopilot running'; };
    setPaused(paused);
    pilot.onclick = () => setPaused(!paused);
    setInterval(() => {
      if (paused) return;
      at = at >= 4 ? 1 : at + 1;
      cols[at].insertBefore(mover, cols[at].children[1] || null);
      mover.classList.add('flash'); setTimeout(() => mover.classList.remove('flash'), 900);
      recount();
    }, 2600);
  }

  // charts that argue: each result plays its twist once, the first time it scrolls into view
  const charts = [...document.querySelectorAll('.chart-card, .flow')].filter(c => c.querySelector('.rules, .rp, .funnel, .regimes'));
  if (!reduce && 'IntersectionObserver' in window) {
    const ease = p => p >= 1 ? 1 : 1 - Math.pow(2, -10 * p);
    const counters = c => [...c.querySelectorAll('.rules b, .rp b, .frag .now b')].map(el => {
      const text = el.textContent, m = text.match(/^(\D*)([\d.]+)(.*)$/);
      if (!m) return () => {};
      const to = +m[2], from = +(el.dataset.from || 0), dp = (m[2].split('.')[1] || '').length;
      const set = v => el.textContent = m[1] + v.toFixed(dp) + m[3];
      const delay = el.closest('.frag') ? 600 : (+el.parentNode.style.getPropertyValue('--i') || 0) * 90;
      set(from);
      return () => setTimeout(() => {
        const t0 = performance.now();
        const tick = now => { const p = (now - t0) / 1000; set(from + (to - from) * ease(p)); p < 1 ? requestAnimationFrame(tick) : el.textContent = text; };
        requestAnimationFrame(tick);
      }, delay);
    });
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      e.target.classList.add('play');
      e.target.runCounters.forEach(run => run());
    }), { rootMargin: '0px 0px -22% 0px' });
    charts.forEach(c => {
      c.querySelectorAll('.rules li, .rp, .funnel li').forEach((el, i) => el.style.setProperty('--i', i));
      c.classList.add('armed');
      c.runCounters = counters(c);
      io.observe(c);
    });
  }

  // copy email
  const copy = $('copy');
  if (copy) copy.onclick = () => {
    const addr = $('addr').textContent;
    const done = () => { copy.textContent = 'Copied'; setTimeout(() => copy.textContent = 'Copy email', 1800); };
    (navigator.clipboard ? navigator.clipboard.writeText(addr) : Promise.reject()).then(done, () => {
      const r = document.createRange(); r.selectNodeContents($('addr'));
      const s = getSelection(); s.removeAllRanges(); s.addRange(r); copy.textContent = 'Press ⌘C';
    });
  };
})();
