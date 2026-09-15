/* Visual branding only: React retains its text, links, events and form state. */
(() => {
  const root = document.getElementById('root');
  if (!root) return;
  function apply() {
    root.querySelectorAll('a[href="/"]').forEach(link => {
      const heading = link.querySelector('h1');
      const target = heading || link;
      const isBrand = target.textContent.trim() === 'TracetoForge';
      const isHeader = heading || link.closest('header, nav');
      if (isBrand && isHeader && !target.querySelector('img')) {
        target.classList.add('forge-brand-wordmark');
        if (heading) target.classList.add('forge-brand-account');
      }
    });
  }
  apply();
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; apply(); });
  }).observe(root, { childList: true, subtree: true });
})();
