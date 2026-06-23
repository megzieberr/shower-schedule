// "Who am I on this device?" — stored in localStorage so the phone remembers
// the person without any login. localStorage is a small built-in store in the
// browser that survives closing the app.

const KEY = 'shower_person'

export function loadPerson() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function savePerson(person) {
  localStorage.setItem(KEY, JSON.stringify(person))
}

export function clearPerson() {
  localStorage.removeItem(KEY)
}
