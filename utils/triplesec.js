// triplesec is CommonJS — named ESM imports fail at runtime in the Nitro server
// build ("Named export not found"). Import the default and destructure instead.
import triplesec from 'triplesec'

const { encrypt: TripesecEncrypt, decrypt: TripesecDecrypt, Buffer } = triplesec

export const encrypt = (message, pass) => {
  return new Promise((resolve, reject) => {
    TripesecEncrypt({
      data: Buffer.from(message),
      key: Buffer.from(pass)
    }, (err, buff) => {
      if (!err) {
        resolve(buff.toString('hex'))
      }

      reject(err)
    })
  })
}

export const decrypt = (encryptedMessage, pass) => {
  return new Promise((resolve, reject) => {
    TripesecDecrypt({
      data: Buffer.from(encryptedMessage, 'hex'),
      key: Buffer.from(pass)
    }, (err, buff) => {
      if (!err) {
        resolve(buff.toString('utf-8'))
      }

      reject(err)
    })
  })
}
