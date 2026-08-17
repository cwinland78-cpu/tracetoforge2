// Catches likely email typos at signup before a confirmation link gets sent
// into the void. Purely advisory: we suggest, we never block, because plenty
// of real users are on domains we have never heard of.

// Domains real users of this app actually sign up with, plus the big providers.
const KNOWN_DOMAINS = [
  'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.co.uk', 'outlook.com',
  'outlook.co.uk', 'live.com', 'msn.com', 'yahoo.com', 'yahoo.co.uk',
  'yahoo.com.br', 'ymail.com', 'icloud.com', 'me.com', 'mac.com',
  'proton.me', 'protonmail.com', 'pm.me', 'aol.com', 'mail.com',
  'gmx.de', 'gmx.net', 'web.de', 'yandex.com', 'zoho.com',
  'yopmail.com', 'mailinator.com', 'guerrillamail.com', 'qq.com', '163.com', 'naver.com', 'daum.net', 'comcast.net', 'verizon.net', 'sbcglobal.net', 'att.net', 'cox.net',
  'bellsouth.net', 'charter.net', 'sfr.fr', 'orange.fr', 'free.fr',
]

// Exact wrong-domain mappings worth special casing. These are not misspellings
// so edit distance will not always catch them, but they are known dead ends.
// proton.com resolves and has MX, but Proton mailboxes are @proton.me, so mail
// sent there does not reach the person who typed it.
const EXPLICIT_FIXES = {
  'proton.com': 'proton.me',
  'protonmail.co': 'protonmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.om': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'hotmail.con': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'outlook.con': 'outlook.com',
  'outlok.com': 'outlook.com',
  'yahoo.con': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'icloud.con': 'icloud.com',
  'iclould.com': 'icloud.com',
}

function editDistance(a, b) {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > 2) return 99
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
    prev = cur
  }
  return prev[b.length]
}

// Returns a corrected address string, or null when nothing looks wrong.
export function suggestEmailFix(raw) {
  const email = (raw || '').trim().toLowerCase()
  const at = email.lastIndexOf('@')
  if (at < 1 || at === email.length - 1) return null

  const local = email.slice(0, at)
  const domain = email.slice(at + 1)
  if (!local || !domain.includes('.')) return null

  if (EXPLICIT_FIXES[domain]) return `${local}@${EXPLICIT_FIXES[domain]}`

  // A domain we already recognise is fine, leave it alone.
  if (KNOWN_DOMAINS.includes(domain)) return null

  // Common mangled TLDs on an otherwise sensible domain.
  const tldFixes = { con: 'com', cmo: 'com', ocm: 'com', comm: 'com', cm: 'com', co: 'com', vom: 'com', xom: 'com' }
  const parts = domain.split('.')
  const tld = parts[parts.length - 1]
  if (tldFixes[tld]) {
    const fixed = [...parts.slice(0, -1), tldFixes[tld]].join('.')
    if (KNOWN_DOMAINS.includes(fixed)) return `${local}@${fixed}`
  }

  // Near miss against a known provider, one or two characters off.
  let best = null
  let bestDist = 3
  for (const known of KNOWN_DOMAINS) {
    const d = editDistance(domain, known)
    if (d < bestDist) {
      bestDist = d
      best = known
    }
  }
  // Only correct short consumer domains. Company domains like mec-precision.com
  // can sit close to a provider name by coincidence and must not be rewritten.
  // Short domains (qq.com, web.de) need an exact one-character miss before we
  // say anything, otherwise unrelated real domains get "corrected" into nonsense.
  const maxDist = domain.length >= 9 ? 2 : 1
  if (best && bestDist <= maxDist && domain.length <= 14) return `${local}@${best}`

  return null
}
