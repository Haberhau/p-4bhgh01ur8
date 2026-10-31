// journey/line.js · the page side of the journey (see journey/walk.js for the 3D side and STORY-APPROACHES/08-walk-the-line.md).
// Draws the orange line section by section as the reader scrolls, switches the captions, publishes the line's tip as window.TIP
// for the walking figure, and runs the step rail, the live region and Play.
(() => {
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]still\b/.test(location.search);   // ?still previews reduced motion
const clamp = v => Math.min(1, Math.max(0, v)), seg = (p, a, b) => clamp((p - a) / (b - a));
const NS = 'http://www.w3.org/2000/svg';

// The engine's coil: six loops (one per month), then the line breaks out straight.
const pts = [];
for (let t = 0; t <= 12 * Math.PI + 1e-6; t += .08) pts.push(`${(300 + 90 * Math.sin(t)).toFixed(1)},${(80 + 9.55 * t - 34 * Math.sin(t + Math.PI / 2) + 34).toFixed(1)}`);
const coil = document.querySelector('.coil');
coil.setAttribute('d', `M300,0 V80 L${pts.join(' L')} L300,470 L470,620 L420,700 C400,760 300,820 300,1000`);
coil.dataset.hold = `M300,0 V80 L${pts.join(' L')}`;

// The spark's pile of numbers: 40 dots, jittered, never in rows.
const PILE = '186,164 222,172 254,158 290,170 324,162 358,174 392,160 418,168 190,226 218,214 258,230 286,218 322,232 356,220 388,228 416,216 184,286 224,278 252,294 292,282 320,296 360,280 390,292 420,284 192,346 220,352 256,338 288,350 326,340 354,356 386,344 414,352 188,404 226,396 250,412 294,400 318,408 362,398 394,410 412,402'
  .split(' ').map(s => s.split(',').map(Number));
const pile = document.querySelector('.pile');
PILE.forEach(([x, y]) => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 4.5); pile.append(c); });

// Each drawing: its main path (with its length), the dot, and the extras that switch on with progress.
const draws = [...document.querySelectorAll('svg.draw')].map(svg => {
  const sec = svg.closest('section'), main = svg.querySelector('.main') || svg.querySelector('.ink'), L = main.getTotalLength();
  const w = sec.dataset.w || svg.dataset.w || 2;
  svg.querySelectorAll('.ink').forEach(p => { p.style.strokeWidth = w; const l = p.getTotalLength(); p.style.strokeDasharray = `${l} ${l}`; p.style.strokeDashoffset = l; p._L = l; });
  svg.querySelectorAll('.grey, .ghost').forEach(p => { const l = p.getTotalLength(); p.style.strokeDasharray = p.classList.contains('ghost') ? '' : `${l} ${l}`; p._L = l; });
  // A "hold": the part of the path drawn before the pause (the knee's bottom, the coil's end).
  let hold = null;
  if (main.dataset.hold) { const tmp = document.createElementNS(NS, 'path'); tmp.setAttribute('d', main.dataset.hold); svg.append(tmp); hold = tmp.getTotalLength() / L; tmp.remove(); }
  // For the pile: the share of the line at which each dot is first passed.
  let readAt = null;
  if (sec.id === 'spark') { const samples = []; for (let l = 0; l <= L; l += 4) { const q = main.getPointAtLength(l); samples.push([q.x, q.y, l / L]); }
    readAt = PILE.map(([x, y]) => { const s = samples.find(([sx, sy]) => Math.hypot(sx - x, sy - y) < 26); return s ? s[2] : 2; }); }
  return { svg, sec, main, L, hold, readAt, dot: svg.querySelector('.dot'), caps: [...sec.querySelectorAll('.caps > *')] };
});

// How much of a drawing is done: the part above 60% of the viewport is drawn.
function frac(d, p) {
  if (d.sec.id === 'knee') return p < .55 ? seg(p, 0, .55) * d.hold : p < .68 ? d.hold : d.hold + seg(p, .68, 1) * (1 - d.hold);
  if (d.sec.id === 'engine') return p < .62 ? seg(p, 0, .62) * d.hold : d.hold + seg(p, .62, .78) * (1 - d.hold) * .6 + seg(p, .78, 1) * (1 - d.hold) * .4;
  return p;
}
function render() {
  if (document.documentElement.classList.contains('text')) return;   // the text version draws nothing
  const vh = innerHeight;
  let tip = null;
  draws.forEach(d => {
    const r = d.svg.getBoundingClientRect(), scale = r.width / 600;
    const p = d.sec.id === 'hi' ? 1 : reduce ? 1 : clamp((vh * .6 - r.top) / r.height);
    const f = frac(d, p);
    d.svg.querySelectorAll('.ink').forEach(path => {
      const win = path.dataset.win?.split(',').map(Number), g = path === d.main ? f : win ? seg(p, win[0], win[1]) : f;
      path.style.strokeDashoffset = path._L * (1 - g);
    });
    d.svg.querySelectorAll('.grey').forEach(path => { const [a, b] = path.dataset.win.split(',').map(Number); path.style.strokeDashoffset = path._L * (1 - seg(p, a, b)); });
    d.svg.querySelectorAll('.ghost').forEach(path => { const [a, b] = path.dataset.win.split(',').map(Number); path.style.opacity = seg(p, a, b); });
    d.svg.querySelectorAll('[data-on]').forEach(el => el.classList.toggle('on', p >= +el.dataset.on));
    if (d.readAt) [...pile.children].forEach((c, i) => c.classList.toggle('read', f >= d.readAt[i]));
    // The caption follows how far through its step the reader is, not how much of the line is drawn (with reduced motion every line is fully drawn).
    if (d.caps.length) { const sr = d.sec.getBoundingClientRect(), sp = clamp((vh * .6 - sr.top) / sr.height), on = d.caps.filter(c => sp >= +c.dataset.p).pop() || d.caps[0]; d.caps.forEach(c => c.classList.toggle('on', c === on)); }
    // The dot rides the tip of the drawing that is being drawn now.
    const q = d.main.getPointAtLength(f * d.L);
    d.dot.setAttribute('cx', q.x); d.dot.setAttribute('cy', q.y); d.dot.setAttribute('r', (d.sec.id === 'end' && p >= 1 ? 12 : 7) / scale);
    if (d.sec.id === 'end' && p >= .99) { d.dot.setAttribute('cx', 300); d.dot.setAttribute('cy', 300); }
    d.dot.style.display = 'none';
    d.f = f; d.p = p;
    if (p > 0) tip = d;
  });
  // The walker stands at the tip of the line being drawn (walk.js reads window.TIP).
  if (tip) { const q = tip.main.getPointAtLength(tip.f * tip.L), q0 = tip.main.getPointAtLength(Math.max(0, tip.f * tip.L - 6)), m = tip.svg.getScreenCTM();
    const a = new DOMPoint(q.x, q.y).matrixTransform(m), b = new DOMPoint(q0.x, q0.y).matrixTransform(m);
    window.TIP = { on: true, x: a.x, y: a.y, dx: a.x - b.x, dy: a.y - b.y, p: tip.p, sec: tip.sec.id, end: tip.sec.id === 'end' && tip.p >= .99 };
    if (tip.sec.id === 'end' && tip.p >= .99) { const e = new DOMPoint(300, 300).matrixTransform(m); window.TIP.x = e.x; window.TIP.y = e.y; } }
  else window.TIP = { on: false };
  // One caption on screen: the one of the drawing being drawn.
  document.querySelectorAll('.cap').forEach(c => { const r = c.closest('section').getBoundingClientRect(); c.classList.toggle('live', r.top <= vh * .5 && r.bottom > vh * .5); });
  a11y(vh);
}
let raf = 0;
// Step rail, live region, current step. The rail follows the section in the middle of the screen and steps aside for the projects.
const rail = document.querySelector('.rail'), live = document.getElementById('live');
let curSec = '', lastCap = '', liveT = 0;
function a11y(vh) {
  let cur = 'hi'; document.querySelectorAll('#journey > section').forEach(sec => { if (sec.getBoundingClientRect().top <= vh * .5) cur = sec.id; });
  if (cur !== curSec) { curSec = cur; rail.querySelectorAll('a').forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + cur ? 'step' : 'false')); }
  const away = document.getElementById('projects').getBoundingClientRect().top < vh * .6;
  rail.classList.toggle('off', away || (innerWidth <= 860 && cur === 'end')); play.classList.toggle('off', away && !playing);
  const on = document.querySelector('.cap.live .caps > .on'), t = on ? on.textContent : '';
  if (t && t !== lastCap) { lastCap = t; clearTimeout(liveT); liveT = setTimeout(() => { live.textContent = t; }, 800); }   // announce once the reader has settled on a line
}

// Play: scrolls the journey from where the reader is to the question, in about two minutes in all, at an even pace.
// Anything the reader does (wheel, touch, keys, a click, dragging the scrollbar) stops it; played from the end it starts again at the top.
const play = document.querySelector('.play');
let playing = false, py = 0, plast = 0;
const PLAY_SECONDS = 140, PLAY_PACE = { knee: .7, engine: .8, next: .85, end: .7 };   // slower where he acts: the fall, the laps, the evening desk, the invitation
function playEnd() { return Math.max(0, document.querySelector('.ask').getBoundingClientRect().top + scrollY - innerHeight * .3); }
function setPlay(on) {
  playing = on; play.setAttribute('aria-pressed', on); play.textContent = on ? '❚❚ Pause' : '▶ Play';
  if (on) { if (scrollY >= playEnd() - 40) scrollTo(0, 0); py = scrollY; plast = 0; requestAnimationFrame(playTick); }
}
function playTick(ts) {
  if (!playing) return;
  if (Math.abs(scrollY - py) > 4) return setPlay(false);   // the reader moved the page themselves
  const dt = Math.min(.05, (ts - (plast || ts)) / 1000), end = playEnd(); plast = ts;
  py = Math.min(end, py + end / PLAY_SECONDS * dt * (PLAY_PACE[curSec] ?? 1)); scrollTo(0, py);
  if (py >= end) return setPlay(false);
  requestAnimationFrame(playTick);
}
if (reduce) play.hidden = true;   // with reduced motion the page does not scroll itself
play.addEventListener('click', () => setPlay(!playing));
['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(ev => addEventListener(ev, e => { if (playing && !(e.target instanceof Node && play.contains(e.target))) setPlay(false); }, { passive: true }));
rail.addEventListener('keydown', e => {
  const links = [...rail.querySelectorAll('a')], i = links.indexOf(document.activeElement); if (i < 0) return;
  const to = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: links.length - 1 }[e.key];
  if (to === undefined) return; e.preventDefault(); links[Math.max(0, Math.min(links.length - 1, to))].focus();
});
addEventListener('scroll', () => { raf ||= requestAnimationFrame(() => { raf = 0; render(); }); }, { passive: true });
addEventListener('resize', render);
window.LINESTART = () => { const svg = document.querySelector('#court svg.draw'), a = new DOMPoint(300, 0).matrixTransform(svg.getScreenCTM()); return [a.x, a.y]; };
render();
setInterval(render, 250);   // keeps the tip fresh while the page settles
// Test hooks: the same functions the page uses, for checking a frame at a time (?manual in the address, see walk.js).
Object.assign(window, { render, setPlay, playTick, playEnd });
})();
