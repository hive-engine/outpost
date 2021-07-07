export const encode = (message) => {
  const enc = new TextEncoder()

  return enc.encode(message)
}

export const decode = (bytestream) => {
  const decoder = new TextDecoder()

  return decoder.decode(bytestream)
}

// https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
export const pack = (buffer) => {
  return window.btoa(
    String.fromCharCode.apply(null, new Uint8Array(buffer))
  )
}

export const unpack = (packed) => {
  const string = window.atob(packed)
  const buffer = new ArrayBuffer(string.length)
  const bufferView = new Uint8Array(buffer)

  for (let i = 0; i < string.length; i++) {
    bufferView[i] = string.charCodeAt(i)
  }

  return buffer
}

export const getKeyMaterial = (password) => {
  const enc = new TextEncoder()

  return window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  )
}

export const getKey = (keyMaterial, salt) => {
  return window.crypto.subtle.deriveKey({
    name: 'PBKDF2',
    salt,
    iterations: 100000,
    hash: 'SHA-256'
  },
  keyMaterial,
  { name: 'AES-GCM', length: 256 },
  true,
  ['encrypt', 'decrypt']
  )
}

export const generateIv = () => {
  return window.crypto.getRandomValues(new Uint8Array(12))
}

export const encrypt = async (data, password) => {
  const encoded = encode(data)
  const iv = generateIv()
  const keyMaterial = await getKeyMaterial(password)
  const key = await getKey(keyMaterial, iv)

  const cipher = await window.crypto.subtle.encrypt({
    name: 'AES-GCM',
    iv
  }, key, encoded)

  return `${pack(cipher)}:${pack(iv)}`
}

export const decrypt = async (encrypted, password) => {
  let [cipher, iv] = encrypted.split(':')

  cipher = unpack(cipher)
  iv = unpack(iv)

  const keyMaterial = await getKeyMaterial(password)
  const key = await getKey(keyMaterial, iv)

  const encoded = await window.crypto.subtle.decrypt({
    name: 'AES-GCM',
    iv
  }, key, cipher)

  return decode(encoded)
}
