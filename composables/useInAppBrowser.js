// Detects constrained in-app browsers (WebViews) — notably the Hive Keychain
// mobile app's built-in browser, where REST uploads to 3Speak embed fail
// (webview request limits, per tibfox). We use this to nudge users toward
// HiveAuth in a normal browser for anything that uploads.
import { ref, onMounted } from 'vue'

// Hive Keychain's WebView identifies itself in the UA. We also flag generic
// mobile WebViews (FB/Instagram/Line/etc.) since they share the same limits.
const KEYCHAIN_RE = /keychain/i
const GENERIC_WEBVIEW_RE = /(FBAN|FBAV|Instagram|Line|; wv\)|Twitter|Snapchat)/i

export function detectInAppBrowser (ua) {
  if (!ua) { return { inApp: false, keychain: false } }
  const keychain = KEYCHAIN_RE.test(ua)
  return { inApp: keychain || GENERIC_WEBVIEW_RE.test(ua), keychain }
}

export function useInAppBrowser () {
  const isInAppBrowser = ref(false)
  const isKeychainBrowser = ref(false)

  onMounted(() => {
    const { inApp, keychain } = detectInAppBrowser(navigator.userAgent || '')
    isInAppBrowser.value = inApp
    isKeychainBrowser.value = keychain
  })

  return { isInAppBrowser, isKeychainBrowser }
}
