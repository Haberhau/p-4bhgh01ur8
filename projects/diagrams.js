// projects/diagrams.js · the drawn diagrams on the work case pages (reporting, click & collect glazing, rebuy).
// Each <div data-diagram="name"> gets an SVG from the matching function below, redrawn when the box crosses the phone
// width. Diagrams show how the work was done, never results. Moving dots stand still with reduced motion.
(() => {
const NS = 'http://www.w3.org/2000/svg', still = matchMedia('(prefers-reduced-motion: reduce)');
const el = (tag, attrs = {}, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); parent?.append(n); return n; };
const text = (parent, x, y, str, size, cls = '', anchor = 'middle') => { const t = el('text', { x, y, 'font-size': size, class: cls, 'text-anchor': anchor }, parent); t.textContent = str; return t; };
const dot = (svg, d, dur, begin, r = 4, cls = 'dg-dot') => el('animateMotion', { dur: dur + 's', begin: begin + 's', repeatCount: 'indefinite', path: d }, el('circle', { r, class: cls }, svg));
const card = (svg, x, y, w, h, cls = 'dg-card') => { const g = el('g', { class: cls }, svg); el('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 10 }, g); return g; };
// a pair of glasses, centred on x, y
const glasses = (parent, x, y, s = 1, cls = 'dg-glasses') => {
  const g = el('g', { class: cls, transform: `translate(${x},${y}) scale(${s})` }, parent);
  el('circle', { cx: -15, cy: 0, r: 11 }, g); el('circle', { cx: 15, cy: 0, r: 11 }, g);
  el('path', { d: 'M-4,-2 Q0,-6 4,-2 M-26,-2 L-34,-6 M26,-2 L34,-6' }, g); return g;
};

// Reporting: many emails in, one automation, the dashboards out
function mailflow(tall) {
  const L = 1000, W = tall ? 560 : 380, at = (u, v) => tall ? [v, u] : [u, v], p = (u, v) => at(u, v).join(',');
  const svg = el('svg', { viewBox: tall ? `0 0 ${W} ${L}` : `0 0 ${L} ${W}` });
  const mid = W / 2, k = tall ? 1.35 : 1, B = 22 * k, S = 16 * k;
  const erp = 90, fan = 400, hub = 610, dash = tall ? 900 : 920;
  const size = { erp: [140 * k, 68 * k], hub: [180 * k, 104 * k], dash: [160 * k, 124 * k] };
  const half = n => (tall ? size[n][1] : size[n][0]) / 2;
  for (let n = 0; n < 13; n++) {
    const v = 35 + (W - 70) * n / 12;
    const d = `M${p(erp + half('erp'), mid)} C${p(erp + 140, mid)} ${p(fan - 120, v)} ${p(fan, v)} C${p(fan + 120, v)} ${p(hub - half('hub') - 60, mid)} ${p(hub - half('hub'), mid)}`;
    el('path', { d, class: 'dg-line' }, svg);
    const [ex, ey] = at(fan, v), env = el('g', { class: 'dg-mail', transform: `translate(${ex - 13},${ey - 9})` }, svg);
    el('rect', { width: 26, height: 18, rx: 2 }, env); el('path', { d: 'M1,1 L13,10 L25,1' }, env);
    dot(svg, d, 2.6 + (n * 7 % 5) * .25, -(n * .37) % 2.6);
  }
  let [x, y] = at(erp, mid), g = card(svg, x, y, ...size.erp);
  text(g, x, y - 2 * k, 'ERP', B, 'dg-b'); text(g, x, y + 20 * k, 'sends the reports', S, 'dg-s');
  if (!tall) { [x, y] = at(fan, 14); text(svg, x, y, 'one spreadsheet per email', 15, 'dg-cap'); }
  [x, y] = at(hub, mid); g = card(svg, x, y, ...size.hub, 'dg-hub');
  text(g, x, y - 10 * k, 'Automation', B, 'dg-b on'); text(g, x, y + 14 * k, 'Power Automate', S, 'dg-s on'); text(g, x, y + 34 * k, '+ Python', S, 'dg-s on');
  const out = `M${p(hub + half('hub') + 14, mid)} L${p(dash - half('dash') - 14, mid)}`;
  el('path', { d: out, class: 'dg-thick' }, svg);
  for (let n = 0; n < 3; n++) dot(svg, out, 1.4, -n * .47, 6);
  [x, y] = at(dash, mid); g = card(svg, x, y, ...size.dash);
  [[-48, 22], [-26, 34], [-4, 16], [18, 42]].forEach(([bx, h]) => el('rect', { x: x + bx * k, y: y + (2 - h) * k, width: 16 * k, height: h * k, rx: 2, class: 'dg-bar' }, g));
  text(g, x, y + 28 * k, 'Dashboards', B, 'dg-b'); text(g, x, y + 48 * k, 'updated every day', S, 'dg-s');
  return svg;
}

// Glazing: three systems feed one row per ordered frame, which feeds the dashboard
function sources(tall) {
  const L = tall ? 780 : 1000, W = tall ? 560 : 400, at = (u, v) => tall ? [v, u] : [u, v], p = (u, v) => at(u, v).join(',');
  const svg = el('svg', { viewBox: tall ? `0 0 ${W} ${L}` : `0 0 ${L} ${W}` });
  const mid = W / 2, B = tall ? 24 : 21, S = tall ? 16 : 15;
  const src = [['CRM', 'appointments, orders', 'split into frames'], ['Lab system', 'lens orders', 'optician + frame + date window'], ['Sales report', 'net sales', 'kept or returned']];
  const sv = tall ? [92, 280, 468] : [70, 200, 330], su = tall ? 70 : 110, ss = tall ? [176, 92] : [200, 76];
  const hub = tall ? 400 : 560, hs = tall ? [330, 150] : [230, 150], dash = tall ? 680 : 880, ds = tall ? [330, 100] : [190, 100];
  const half = s => (tall ? s[1] : s[0]) / 2;
  src.forEach(([sys, what, key], n) => {
    const d = `M${p(su + half(ss), sv[n])} C${p(su + half(ss) + 140, sv[n])} ${p(hub - half(hs) - 150, mid + (sv[n] - mid) * .3)} ${p(hub - half(hs), mid + (sv[n] - mid) * .25)}`;
    el('path', { d, class: 'dg-line strong' }, svg);
    for (let m = 0; m < 3; m++) dot(svg, d, 2.4, -(m * .8 + n * .3));
    if (!tall) { const lu = (su + half(ss) + hub - half(hs)) / 2, lv = mid + (sv[n] - mid) * .62 - 10; const [lx, ly] = at(lu, lv); text(svg, lx, ly, key, 14, 'dg-key'); }
  });
  src.forEach(([sys, what], n) => { const [x, y] = at(su, sv[n]), g = card(svg, x, y, ...ss); text(g, x, y - 4, sys, B, 'dg-b'); text(g, x, y + S + 2, what, S, 'dg-s'); });
  let [x, y] = at(hub, mid), g = card(svg, x, y, ...hs, 'dg-hub');
  glasses(g, x, y - 32, tall ? 1.4 : 1.2, 'dg-glasses on');
  text(g, x, y + 22, 'One row per', B, 'dg-b on'); text(g, x, y + 22 + B * 1.15, 'ordered frame', B, 'dg-b on');
  const out = `M${p(hub + half(hs) + 14, mid)} L${p(dash - half(ds) - 14, mid)}`;
  el('path', { d: out, class: 'dg-thick' }, svg);
  for (let n = 0; n < 3; n++) dot(svg, out, 1.4, -n * .47, 6);
  [x, y] = at(dash, mid); g = card(svg, x, y, ...ds);
  text(g, x, y - 4, 'Dashboard', B, 'dg-b'); text(g, x, y + S + 4, 'one filter per market', S, 'dg-s');
  return svg;
}

// Glazing: which lens orders could come from a click & collect appointment
function window_(tall) {
  const first = tall ? -3 : -4, last = tall ? 7 : 8, VW = tall ? 600 : 1000, VH = tall ? 380 : 310, left = tall ? 40 : 90, right = VW - (tall ? 40 : 80);
  const step = (right - left) / (last - first), X = d => left + (d - first) * step;
  const B = tall ? 24 : 19, S = tall ? 20 : 15, axis = tall ? 250 : 210;
  const svg = el('svg', { viewBox: `0 0 ${VW} ${VH}` });
  // the window: two days before to five days after the appointment date
  el('rect', { x: X(-2) - step / 2, y: axis - 110, width: step * 8, height: 110, class: 'dg-window' }, svg);
  text(svg, X(0) + 12, axis - 88, tall ? '−2 to +5 days' : 'from 2 days before to 5 days after', S, 'dg-key', 'start');
  el('line', { x1: left - step / 2, x2: right + step / 2, y1: axis, y2: axis, class: 'dg-axis' }, svg);
  for (let d = first; d <= last; d++) {
    el('line', { x1: X(d), x2: X(d), y1: axis - 5, y2: axis + 5, class: 'dg-axis' }, svg);
    if (!tall || d % 2 === 0 || d === -2 || d === 5) text(svg, X(d), axis + 26, d === 0 ? '0' : (d > 0 ? '+' : '−') + Math.abs(d), S, 'dg-tick');
  }
  // the appointment
  el('line', { x1: X(0), x2: X(0), y1: tall ? 70 : 52, y2: axis, class: 'dg-day0' }, svg);
  glasses(svg, X(0), tall ? 50 : 34, tall ? 1.3 : 1);
  text(svg, X(0) + (tall ? 0 : 50), tall ? 20 : 39, 'Appointment day', B, 'dg-b', tall ? 'middle' : 'start');
  if (!tall) text(svg, X(0) + 50, 60, 'the date the customer says they will visit the optician', S, 'dg-s', 'start');
  // lens orders from the lab system: in the window they could belong to the click & collect, outside they can't
  [[-3, 'too early'], [-1, ''], [3, ''], [7, 'too late']].forEach(([d, why], n) => {
    const inside = !why, g = el('g', { transform: `translate(${X(d)},${axis - 32})` }, svg), drop = el('g', { class: 'dg-drop', style: `animation-delay:${.2 + n * .25}s` }, g);
    el('circle', { r: tall ? 17 : 14, class: inside ? 'dg-lens in' : 'dg-lens' }, drop);
    el('path', { d: tall ? 'M-8,-6 Q-2,-11 5,-9' : 'M-7,-5 Q-2,-9 4,-8', class: 'dg-shine' }, drop);
    text(svg, X(d), axis + (tall ? 62 : 56), tall ? (inside ? 'could be' : why.replace('too ', '')) : (inside ? 'could be C&C' : why), S, inside ? 'dg-key in' : 'dg-s');
  });
  (tall ? ['Lens orders count only for the same', 'optician and the same frame.'] : ['Lens orders count only for the same optician and the same frame.'])
    .forEach((line, i, all) => text(svg, tall ? VW / 2 : left - step / 2, VH - 8 - (all.length - 1 - i) * S * 1.25, line, S, 'dg-s', tall ? 'middle' : 'start'));
  return svg;
}

// Rebuy: rows flow through the cleaning rules; what's removed drops into a tray, what's left is a real rebuy
function sieve(tall) {
  const L = tall ? 900 : 1000, W = tall ? 380 : 330, at = (u, v) => tall ? [v, u] : [u, v], p = (u, v) => at(u, v).join(',');
  const svg = el('svg', { viewBox: tall ? `0 0 ${W} ${L}` : `0 0 ${L} ${W}` });
  const B = tall ? 19 : 17, S = tall ? 15 : 14, lane = tall ? 95 : 110, tray = tall ? 28 : 262, reach = tall ? 50 : 58;   // phones: lane left, trays further left, labels right
  const g1 = tall ? 230 : 290, g2 = tall ? 420 : 480, g3 = tall ? 590 : 660, g4 = tall ? 760 : 850, end = L - 20;
  // two Salesforce sources join on the account
  [['Customers', tall ? 95 : lane - 70], ['Sales', tall ? 285 : lane + 70]].forEach(([name, v], n) => {
    const d = `M${p(70, v)} C${p(130, v)} ${p(120, lane)} ${p(170, lane)}`;
    el('path', { d, class: 'dg-line strong' }, svg);
    const [x, y] = at(50, v), g = card(svg, x, y, tall ? 170 : 110, tall ? 64 : 54);
    text(g, x, y - 4, 'Salesforce', S, 'dg-s'); text(g, x, y + B - 2, name, B, 'dg-b');
  });
  // the main lane, then four lanes once split by brand and channel
  const lanes = [-36, -12, 12, 36].map(o => lane + o);
  el('path', { d: `M${p(170, lane)} L${p(g3, lane)}`, class: 'dg-pipe' }, svg);
  lanes.forEach(v => el('path', { d: `M${p(g3, lane)} C${p(g3 + 40, lane)} ${p(g3 + 30, v)} ${p(g3 + 70, v)} L${p(end, v)}`, class: 'dg-pipe thin' }, svg));
  // the rules, each a gate across the lane
  const gates = [[g1, 'Lines → orders', 'revenue dropped:|amounts unreliable'], [g2, 'Opticians out', 'accounts with more|than x orders'], [g3, 'Split', 'by brand and|sales channel'], [g4, 'First 30 days out', 'corrections and|colour swaps']];   // | = line break on phones
  const ruleText = (x, y, rule) => (tall ? rule.split('|') : [rule.replace('|', ' ')]).forEach((line, i) => text(svg, x, y + i * S * 1.2, line, S, 'dg-s', tall ? 'start' : 'middle'));
  gates.forEach(([u, title, rule], n) => {
    el('line', { x1: at(u, lane - reach)[0], y1: at(u, lane - reach)[1], x2: at(u, lane + reach)[0], y2: at(u, lane + reach)[1], class: 'dg-gate' }, svg);
    const [tx, ty] = tall ? [lane + 66, u + 6] : [u, lane - 92];
    text(svg, tx, ty, `${n + 1}  ${title}`, B, 'dg-b', tall ? 'start' : 'middle');
    if (n === 1 || n === 3) {   // removed rows land in a tray
      const [cx, cy] = at(u + (tall ? 0 : 40), tray), th = 56;
      card(svg, cx, cy, tall ? 40 : 170, tall ? 90 : th, 'dg-tray');
      [[-1, 1], [0, 0], [1, 1]].forEach(([i, j]) => el('circle', { cx: cx + (tall ? j * 9 : i * 14), cy: cy + (tall ? i * 14 : 10 + j * 0), r: 5, class: 'dg-dot grey' }, svg));   // what's been caught so far
      ruleText(...(tall ? [lane + 66, u + 6 + B] : [cx, cy + th / 2 + 20]), rule);
      const fall = `M${p(u - 60, n === 3 ? lanes[1] : lane)} Q${p(u - 4, n === 3 ? lanes[1] : lane)} ${p(u + (tall ? 0 : 40), tray - 6)}`;
      for (let m = 0; m < 2; m++) dot(svg, fall, 1.8, -(m * .9 + n * .2), 5, 'dg-dot grey');
    } else {
      ruleText(...(tall ? [lane + 66, u + 6 + B] : [u, lane - 92 + B]), rule);
    }
  });
  // rows on the move: small product lines before gate 1, orders after it, real rebuys at the end
  for (let m = 0; m < 6; m++) dot(svg, `M${p(170, lane)} L${p(g1, lane)}`, 1.6, -m * .27, 3);
  for (let m = 0; m < 3; m++) dot(svg, `M${p(g1, lane)} L${p(g3, lane)}`, 2.2, -m * .73, 6);
  lanes.forEach((v, n) => { const d = `M${p(g3, lane)} C${p(g3 + 40, lane)} ${p(g3 + 30, v)} ${p(g3 + 70, v)} L${p(end, v)}`; dot(svg, d, 2.4, -n * .6, 5, 'dg-dot ink'); });
  lanes.forEach((v, n) => dot(svg, `M${p(g4, v)} L${p(end, v)}`, 1.2, -n * .3, 6));
  const [rx, ry] = tall ? [lane, end + 4] : [end, lane + 86];
  text(svg, rx, ry, 'Real rebuys', B, 'dg-b mark', tall ? 'middle' : 'end');
  return svg;
}

// Rebuy: the rules on one customer's timeline, and the recency groups
function customer(tall) {
  const VW = tall ? 600 : 1000, VH = tall ? 380 : 300, left = tall ? 40 : 70, right = VW - (tall ? 30 : 50), months = 24;   // the timeline's own scale
  const X = m => left + (right - left) * m / months, B = tall ? 22 : 17, S = tall ? 19 : 14, axis = tall ? 150 : 120;
  const svg = el('svg', { viewBox: `0 0 ${VW} ${VH}` });
  // first 30 days
  el('rect', { x: X(0), y: axis - 22, width: X(1.6) - X(0), height: 44, class: 'dg-hatch' }, svg);
  el('line', { x1: left, x2: right, y1: axis, y2: axis, class: 'dg-axis' }, svg);
  glasses(svg, X(0) + 4, axis - 52, tall ? 1.2 : 1);
  text(svg, X(0) - 6, axis - (tall ? 86 : 78), 'First purchase', B, 'dg-b', 'start');
  // an order inside the first 30 days: not a rebuy
  const x1 = X(.8); el('path', { d: `M${x1 - 7},${axis - 7} L${x1 + 7},${axis + 7} M${x1 + 7},${axis - 7} L${x1 - 7},${axis + 7}`, class: 'dg-x' }, svg);
  text(svg, X(0) - 6, axis + 46, 'first 30 days: a correction, not a rebuy', S, 'dg-s', 'start');
  // a later order: a rebuy
  const xr = X(tall ? 9 : 7); el('circle', { cx: xr, cy: axis, r: 9, class: 'dg-lens in' }, svg);
  text(svg, xr, axis - 24, 'any later order: a rebuy', S, 'dg-key in', tall ? 'start' : 'middle');
  // then twelve months without an order: lapsed
  const xl = X((tall ? 9 : 7) + 12);
  el('line', { x1: xr + 12, x2: xl - 10, y1: axis - 46, y2: axis - 46, class: 'dg-span' }, svg);
  text(svg, (xr + xl) / 2, axis - 56, '12 months without an order', S, 'dg-s');
  el('circle', { cx: xl, cy: axis, r: 9, class: 'dg-lapse' }, svg);
  text(svg, xl, axis + 34, 'lapsed', B, 'dg-b');
  // recency groups: time since the last order
  const top = tall ? 260 : 210, h = tall ? 54 : 44;
  text(svg, left, top - 12, 'Customers grouped by time since their last order', S, 'dg-s', 'start');
  const Q = n => left + (right - left) * n / 4;   // the groups as four equal blocks: a legend, not a scale
  [['under 12 months', '< 12', 'dg-seg a'], ['12–24 months', '12–24', 'dg-seg b'], ['24–36 months', '24–36', 'dg-seg c'], ['over 36 months', '36+', 'dg-seg d']].forEach(([label, short, cls], n) => {
    el('rect', { x: Q(n) + 2, y: top, width: Q(1) - left - 4, height: h, class: cls }, svg);
    text(svg, (Q(n) + Q(n + 1)) / 2, top + h / 2 + S * .35, tall ? short : label, S, 'dg-seglbl');
  });
  return svg;
}

const diagrams = { mailflow, sources, window: window_, sieve, customer };
document.querySelectorAll('[data-diagram]').forEach(box => {
  let tall;
  const draw = () => { tall = box.clientWidth < 640; const svg = diagrams[box.dataset.diagram](tall); svg.setAttribute('width', '100%'); box.replaceChildren(svg); if (still.matches) svg.pauseAnimations?.(); };
  draw();
  addEventListener('resize', () => { if ((box.clientWidth < 640) !== tall) draw(); });
});
})();
