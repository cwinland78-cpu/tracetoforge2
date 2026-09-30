const COOKIE = 'tf_ads_consent'
const DAYS = 180
let sessionChoice
function read() { if (sessionChoice !== undefined) return sessionChoice; try { const match = document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`)); return match ? decodeURIComponent(match.slice(COOKIE.length + 1)) : null } catch { return null } }
function write(value) { sessionChoice=value; try { const expires = new Date(Date.now() + DAYS * 86400000).toUTCString(); document.cookie = `${COOKIE}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}` } catch { /* storage may be unavailable */ } window.dispatchEvent(new CustomEvent('tf-ads-consent-changed', { detail: { value } })) }
export function getAdvertisingConsent() { return read() }
export function onAdvertisingConsentChange(callback) { const handler = (event) => callback(event.detail?.value); window.addEventListener('tf-ads-consent-changed', handler); return () => window.removeEventListener('tf-ads-consent-changed', handler) }
export function showAdvertisingChoices() {
  if (document.getElementById('tf-ads-consent')) return
  const previousChoice = read()
  if (!previousChoice) write('pending')
  const panel = document.createElement('div'); panel.id = 'tf-ads-consent'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Advertising choice'); panel.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;background:#1A1A25;color:#fff;padding:12px 14px;box-shadow:0 2px 14px rgba(0,0,0,.4);font:14px/1.4 system-ui,sans-serif;display:flex;flex-wrap:wrap;align-items:center;gap:10px;justify-content:center'
  const text = document.createElement('span'); text.style.flex = '1 1 280px'; text.textContent = 'Allow an optional banner? Adsterra and partners may use cookies and receive your IP address, browser details, and ad interactions. This choice is separate from analytics.'
  const decline = document.createElement('button'); decline.type = 'button'; decline.textContent = 'Decline ads'; const allow = document.createElement('button'); allow.type = 'button'; allow.textContent = 'Allow ads'
  ;[decline, allow].forEach((button) => { button.style.cssText = 'border:1px solid #888;border-radius:6px;padding:7px 14px;cursor:pointer;font:inherit' }); allow.style.background = '#F97316'; allow.style.color = '#17121b'
  const close = () => panel.remove(); decline.addEventListener('click', () => { write('declined'); close(); if (previousChoice === 'accepted') window.location.reload() }); allow.addEventListener('click', () => { write('accepted'); close() }); panel.append(text, decline, allow); document.body.appendChild(panel)
}
export function initAdvertisingChoices() { const footer = document.querySelector('footer'); if (footer && !document.getElementById('tf-ads-settings')) { const button = document.createElement('button'); button.id = 'tf-ads-settings'; button.type = 'button'; button.textContent = 'Advertising choices'; button.style.cssText = 'margin-top:12px;background:transparent;color:#9999AA;border:1px solid currentColor;border-radius:5px;padding:5px 9px;cursor:pointer;font:inherit'; button.addEventListener('click', showAdvertisingChoices); footer.appendChild(button) } if (!read()) showAdvertisingChoices() }
