// Small helpers to tailor the install instructions to the phone in hand.

export function isIos() {
  const ua = navigator.userAgent || ''
  // iPadOS 13+ reports as a Mac, so we also check for touch support.
  return /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function isAndroid() {
  return /android/i.test(navigator.userAgent || '')
}

// True when the app is already running as an installed home-screen app
// rather than inside a browser tab.
export function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}
