/* Consent-gated Adsterra 300x250 homepage unit for TraceToForge. */
(function () {
  'use strict';
  if (!['tracetoforge.com', 'www.tracetoforge.com'].includes(location.hostname)) return;
  var KEY = 'ff5b07361e6277a87ae2951b256bd803';
  var COOKIE = 'tf_ads_consent';
  var DAYS = 180;
  var mount = document.querySelector('.tf-home-adsterra-mount');
  var observer = null;

  function read() {
    try {
      var match = document.cookie.split(';').map(function (part) { return part.trim(); }).find(function (part) { return part.indexOf(COOKIE + '=') === 0; });
      return match ? decodeURIComponent(match.slice(COOKIE.length + 1)) : null;
    } catch (error) { return null; }
  }

  function write(value) {
    try {
      var expires = new Date(Date.now() + DAYS * 86400000).toUTCString();
      document.cookie = COOKIE + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/; SameSite=Lax; Secure';
    } catch (error) { /* storage may be unavailable */ }
  }

  function request() {
    if (!mount || read() !== 'accepted' || mount.dataset.requested) return;
    mount.dataset.requested = 'true';
    window.atOptions = { key: KEY, format: 'iframe', height: 250, width: 300, params: {} };
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://www.highrevenueformat.com/' + KEY + '/invoke.js';
    script.async = false;
    mount.appendChild(script);
  }

  function observe() {
    if (!mount || read() !== 'accepted') return;
    if (!('IntersectionObserver' in window)) { request(); return; }
    observer = new IntersectionObserver(function (entries) {
      if (entries.some(function (entry) { return entry.isIntersecting; })) { request(); observer.disconnect(); observer = null; }
    }, { rootMargin: '250px' });
    observer.observe(mount);
  }

  function showChoices() {
    if (document.getElementById('tf-ads-consent')) return;
    var previousChoice = read();
    var panel = document.createElement('div'); panel.id = 'tf-ads-consent'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Advertising choice'); panel.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;background:#1A1A25;color:#fff;padding:12px 14px;box-shadow:0 2px 14px rgba(0,0,0,.4);font:14px/1.4 system-ui,sans-serif;display:flex;flex-wrap:wrap;align-items:center;gap:10px;justify-content:center';
    var text = document.createElement('span'); text.style.flex = '1 1 280px'; text.textContent = 'Allow an optional banner? Adsterra and partners may use cookies and receive your IP address, browser details, and ad interactions. This choice is separate from analytics.';
    var decline = document.createElement('button'); decline.type = 'button'; decline.textContent = 'Decline ads';
    var allow = document.createElement('button'); allow.type = 'button'; allow.textContent = 'Allow ads';
    [decline, allow].forEach(function (button) { button.style.cssText = 'border:1px solid #888;border-radius:6px;padding:7px 14px;cursor:pointer;font:inherit'; }); allow.style.background = '#F97316'; allow.style.color = '#17121b';
    function close() { panel.remove(); }
    decline.addEventListener('click', function () { write('declined'); close(); if (previousChoice === 'accepted') location.reload(); });
    allow.addEventListener('click', function () { write('accepted'); close(); observe(); });
    panel.append(text, decline, allow); document.body.appendChild(panel);
  }

  function init() {
    var footer = document.querySelector('footer');
    if (footer && !document.getElementById('tf-ads-settings')) {
      var button = document.createElement('button'); button.id = 'tf-ads-settings'; button.type = 'button'; button.textContent = 'Advertising choices'; button.style.cssText = 'margin-top:12px;background:transparent;color:#9999AA;border:1px solid currentColor;border-radius:5px;padding:5px 9px;cursor:pointer;font:inherit'; button.addEventListener('click', showChoices); footer.appendChild(button);
    }
    if (!read()) showChoices(); else observe();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
}());
