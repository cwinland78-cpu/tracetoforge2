// Retired: website ads and the advertising consent prompt are now served by the
// Cloudflare Ad Manager worker (/__am/ads.js). The app no longer shows its own
// Adsterra consent banner or footer "Advertising choices" button, and nothing
// imports this module. These no-op exports remain only so a stray import
// cannot bring the old banner back.
export function getAdvertisingConsent() { return null }
export function onAdvertisingConsentChange() { return () => {} }
export function showAdvertisingChoices() {}
export function initAdvertisingChoices() {}
