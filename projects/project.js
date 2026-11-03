const confirms = [...document.querySelectorAll('.confirm')];
confirms.forEach(button => {
  button.dataset.label = button.textContent;
  button.addEventListener('click', () => {
    button.textContent = 'Added ✓'; button.disabled = true;
    document.querySelector('#demo-status').textContent = `${confirms.filter(b => b.disabled).length} of 2 suggestions added in this example.`;
  });
});
document.querySelector('#reset-demo')?.addEventListener('click', () => {
  confirms.forEach(button => { button.disabled = false; button.textContent = button.dataset.label; });
  document.querySelector('#demo-status').textContent = 'You confirm each suggestion.';
});
const advance = document.querySelector('#advance-ticket');
if (advance) {
  let stage = 0;
  const items = [...document.querySelectorAll('.stage-list li')];
  const descriptions = ['The ticket is ready to be refined.', 'Clarify the requirement and acceptance criteria.', 'Implement the change and pass the build gate.', 'Check the implementation at the review gate.', 'Validate the behavior at the QA gate.', 'The ticket has passed its checks.', 'The change is ready to ship.'];
  advance.addEventListener('click', () => {
    stage = (stage + 1) % items.length;
    items.forEach((item, i) => i === stage ? item.setAttribute('aria-current', 'step') : item.removeAttribute('aria-current'));
    document.querySelector('#ticket-status').textContent = `${items[stage].textContent} · ${descriptions[stage]}`;
    advance.textContent = stage === items.length - 1 ? 'Restart example ↻' : 'Advance ticket →';
  });
}
document.querySelector('#copy-install')?.addEventListener('click', async () => {
  const code = document.querySelector('#install-commands');
  const status = document.querySelector('#copy-status');
  try { await navigator.clipboard.writeText(code.textContent); status.textContent = 'Commands copied.'; }
  catch { const range = document.createRange(); range.selectNodeContents(code); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); status.textContent = 'Commands selected. Press ⌘C or Ctrl+C to copy.'; }
});
