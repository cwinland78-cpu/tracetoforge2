/* Consent-gated responsive homepage banners for TraceToForge. */
(function () {
  'use strict';
  if (!['tracetoforge.com', 'www.tracetoforge.com'].includes(location.hostname)) return;
  var COOKIE = 'tf_ads_consent';
  var queue = [];
  var busy = false;
  var observers = [];

  function read() {
    try {
      var match = document.cookie.split(';').map(function (part) { return part.trim(); }).find(function (part) { return part.indexOf(COOKIE + '=') === 0; });
      return match ? decodeURIComponent(match.slice(COOKIE.length + 1)) : null;
    } catch (_) { return null; }
  }

  function write(value) {
    try {
      var expires = new Date(Date.now() + 180 * 86400000).toUTCString();
      document.cookie = COOKIE + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/; SameSite=Lax; Secure';
    } catch (_) { /* storage may be unavailable */ }
  }

  function mounts() { return Array.prototype.slice.call(document.querySelectorAll('.tf-home-adsterra-mount[data-adsterra-key]')); }
  function enqueue(mount) {
    if (!mount || read() !== 'accepted' || mount.dataset.requested || mount.dataset.queued) return;
    var aside = mount.closest('aside');
    if (aside) aside.style.display = '';
    mount.dataset.queued = 'true';
    queue.push(mount);
    pump();
  }
  function pump() {
    if (busy || read() !== 'accepted') return;
    while (queue.length) {
      var mount = queue.shift();
      if (!mount || !mount.isConnected) continue;
      delete mount.dataset.queued;
      if (mount.dataset.requested) continue;
      var key = mount.dataset.adsterraKey;
      var width = Number(mount.dataset.adWidth);
      var height = Number(mount.dataset.adHeight);
      if (!key || !width || !height) continue;
      busy = true;
      mount.dataset.requested = 'true';
      window.atOptions = { key: key, format: 'iframe', height: height, width: width, params: {} };
      var script = document.createElement('script');
      script.async = false;
      script.src = 'https://www.highrevenueformat.com/' + encodeURIComponent(key) + '/invoke.js';
      script.onload = script.onerror = function () { busy = false; pump(); };
      mount.appendChild(script);
      return;
    }
  }
  function observe() {
    mounts().forEach(function (mount) {
      var aside = mount.closest('aside');
      if (read() !== 'accepted') { if (aside) aside.style.display = 'none'; return; }
      if (mount.dataset.adWidth === '160' && window.innerWidth < 1680) return;
      if (mount.classList.contains('tf-home-desktop-unit') && window.innerWidth < 820) return;
      if (mount.classList.contains('tf-home-mobile-unit') && window.innerWidth >= 820) return;
      if (!('IntersectionObserver' in window)) { enqueue(mount); return; }
      var observer = new IntersectionObserver(function (entries) {
        if (entries.some(function (entry) { return entry.isIntersecting; })) {
          observer.disconnect();
          observers = observers.filter(function (item) { return item !== observer; });
          enqueue(mount);
        }
      }, { rootMargin: '250px' });
      observers.push(observer);
      observer.observe(mount);
    });
  }
  function stop() {
    observers.forEach(function (observer) { observer.disconnect(); });
    observers = [];
    queue = [];
    busy = false;
    mounts().forEach(function (mount) {
      var aside = mount.closest('aside');
      if (aside) aside.style.display = 'none';
      mount.replaceChildren();
      delete mount.dataset.requested;
      delete mount.dataset.queued;
    });
  }
  function styles() {
    if (document.getElementById('tf-home-ad-layout')) return;
    var style = document.createElement('style');
    style.id = 'tf-home-ad-layout';
    style.textContent = '.tf-home-banner{max-width:728px;margin:10px auto 22px;padding:8px 0;text-align:center;overflow:hidden}.tf-home-banner p,.tf-home-rail p{margin:0 0 7px;color:#9999AA;font:600 10px/1.2 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase}.tf-home-adsterra-mount[data-ad-width="728"]{width:728px;height:90px;max-width:calc(100vw - 24px);margin:auto;overflow:hidden}.tf-home-adsterra-mount[data-ad-width="320"]{width:320px;height:50px;max-width:calc(100vw - 24px);margin:auto;overflow:hidden}.tf-home-mobile{display:none!important}.tf-home-rail{position:fixed;top:150px;z-index:5;width:176px;padding:8px;background:#131318;border:1px solid #2A2A35;text-align:center}.tf-home-rail-left{left:max(12px,calc(50% - 820px))}.tf-home-rail-right{right:max(12px,calc(50% - 820px))}@media(max-width:819px){.tf-home-desktop{display:none!important}.tf-home-mobile{display:block!important}}@media(max-width:1679px){.tf-home-rail{display:none!important}}';
    document.head.appendChild(style);
  }
  function showChoices() {
    if (document.getElementById('tf-ads-consent')) return;
    var previousChoice = read();
    var panel = document.createElement('div');
    panel.id = 'tf-ads-consent';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Advertising choice');
    panel.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;background:#1A1A25;color:#fff;padding:12px 14px;box-shadow:0 2px 14px rgba(0,0,0,.4);font:14px/1.4 system-ui,sans-serif;display:flex;flex-wrap:wrap;align-items:center;gap:10px;justify-content:center';
    var text = document.createElement('span');
    text.style.flex = '1 1 280px';
    text.textContent = 'Allow the responsive homepage banner and two side banners on wide desktop screens? Adsterra may use cookies and receive your IP address, browser details, and ad interactions. This choice is separate from analytics.';
    var decline = document.createElement('button'); decline.type = 'button'; decline.textContent = 'Decline ads';
    var allow = document.createElement('button'); allow.type = 'button'; allow.textContent = 'Allow ads';
    [decline, allow].forEach(function (button) { button.style.cssText = 'border:1px solid #888;border-radius:6px;padding:7px 14px;cursor:pointer;font:inherit'; });
    allow.style.background = '#F97316'; allow.style.color = '#17121b';
    decline.addEventListener('click', function () { write('declined'); panel.remove(); if (previousChoice === 'accepted') location.reload(); });
    allow.addEventListener('click', function () { write('accepted'); panel.remove(); observe(); });
    panel.append(text, decline, allow);
    document.body.appendChild(panel);
  }
  function init() {
    styles();
    var footer = document.querySelector('footer');
    if (footer && !document.getElementById('tf-ads-settings')) {
      var button = document.createElement('button'); button.id = 'tf-ads-settings'; button.type = 'button'; button.textContent = 'Advertising choices';
      button.style.cssText = 'margin-top:12px;background:transparent;color:#9999AA;border:0;padding:0;cursor:pointer;font:inherit;font-size:.875rem;text-decoration:underline;text-underline-offset:3px';
      button.addEventListener('click', showChoices);
      footer.appendChild(button);
    }
    if (!read()) showChoices(); else observe();
  }
  window.addEventListener('tf-ads-consent-changed', function (event) { if (event.detail && event.detail.value === 'accepted') observe(); else stop(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
}());
