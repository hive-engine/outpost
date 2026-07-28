// HiveAuth signer — a login/signing backend alongside Hive Keychain.
//
// HiveAuth (HAS) lets a user approve logins and transactions from their PKSA app
// (Hive Keychain mobile, the HiveAuth app…) in a *normal* browser — no extension
// and no in-app webview needed. tibfox flagged that Keychain's in-app browser
// can't upload to 3Speak embed (webview REST limits), so HiveAuth is our
// recommended path there. It also keeps Keychain users fully supported when the
// token later moves to Magi (Magi supports all the login methods we know).
//
// Thin wrapper around hive-auth-wrapper: it opens a WebSocket to the HAS server,
// AES-encrypts all app<->PKSA traffic with an ephemeral key, and resolves once
// the user approves in their app. Client-side only (uses window.WebSocket).
import HAS from 'hive-auth-wrapper'
import { APP_TITLE, APP_DOMAIN } from '~/config'

// Public HAS infrastructure (arcange). Could be self-hosted later if desired.
const HAS_HOST = 'wss://hive-auth.arcange.eu/'

// Shown to the user inside their PKSA app when approving.
const APP_META = {
  name: 'thebbhproject',
  description: APP_TITLE,
  icon: `${APP_DOMAIN.replace(/\/$/, '')}/icon.png`
}

// Persisted HiveAuth credentials { username, token, expire, key }. The `key` is
// the ephemeral AES secret shared with the PKSA; `token`/`expire` let us sign
// again without re-approval until the PKSA-granted session expires.
const STORE_KEY = 'bbh-hiveauth'

HAS.setOptions({ host: HAS_HOST })

function persist (auth) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      username: auth.username, token: auth.token, expire: auth.expire, key: auth.key
    }))
  } catch { /* storage disabled — session just won't survive reload */ }
}

// Load a non-expired HiveAuth session, or null.
export function loadSession () {
  try {
    const a = JSON.parse(localStorage.getItem(STORE_KEY) || 'null')
    if (a && a.token && a.key && a.expire && a.expire > Date.now()) { return a }
  } catch { /* ignore */ }
  return null
}

export function clearSession () {
  try { localStorage.removeItem(STORE_KEY) } catch { /* ignore */ }
}

export function hasSession () { return !!loadSession() }

// The QR / deeplink the PKSA scans (or the phone opens) to pair a pending
// request. Built locally from the ephemeral key — it must NEVER be sent to a
// third-party (e.g. an external QR image API) as it carries the AES secret.
function buildDeeplink (username, uuid, key) {
  const payload = { account: username, uuid, key, host: HAS_HOST }
  const json = JSON.stringify(payload)
  const b64 = typeof btoa !== 'undefined'
    ? btoa(unescape(encodeURIComponent(json)))
    : Buffer.from(json).toString('base64')
  return `has://auth_req/${b64}`
}

// Authenticate (and, if `challenge` is given, sign it in the same round-trip so
// login needs a single approval). `onWait({ uuid, expire, deeplink })` fires as
// soon as the request is pending so the UI can show the QR/deeplink.
// Returns { auth, signature, pubkey } — signature/pubkey set when a challenge
// was requested.
export async function authenticate ({ username, challenge, keyType = 'posting', onWait } = {}) {
  const auth = { username, key: undefined }
  const challengeData = challenge ? { key_type: keyType, challenge } : undefined

  const res = await HAS.authenticate(auth, APP_META, challengeData, (req) => {
    if (onWait) { onWait({ uuid: req.uuid, expire: req.expire, deeplink: buildDeeplink(username, req.uuid, req.key) }) }
  })

  persist(auth)

  const signedChallenge = res && res.data && res.data.challenge
  return {
    auth,
    signature: signedChallenge ? signedChallenge.challenge : null,
    pubkey: signedChallenge ? signedChallenge.pubkey : null
  }
}

// Broadcast operations through the paired PKSA. `keyType` is 'posting'|'active'.
// `onWait({ uuid, expire })` fires while awaiting approval (show "check your app").
// Resolves on approval, rejects on cancel/error/expiry.
export async function broadcast (operations, keyType = 'posting', onWait) {
  const auth = loadSession()
  if (!auth) { throw new Error('Your HiveAuth session has expired — please log in again.') }

  return HAS.broadcast(auth, String(keyType).toLowerCase(), operations, (req) => {
    if (onWait) { onWait({ uuid: req.uuid, expire: req.expire }) }
  })
}

// Sign an arbitrary challenge string (used for image-upload auth). Returns the
// signature string.
export async function challenge (message, keyType = 'posting') {
  const auth = loadSession()
  if (!auth) { throw new Error('Your HiveAuth session has expired — please log in again.') }

  const res = await HAS.challenge(auth, { key_type: String(keyType).toLowerCase(), challenge: message })
  return res && res.data && res.data.challenge
}
