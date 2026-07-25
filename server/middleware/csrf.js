// CSRF protection — replaces csurf (double-submit cookie pattern).
// - Issues a non-httpOnly 'csrf-token' cookie so the client can echo it back in
//   the X-CSRF-Token header (the P1 $api plugin already does this).
// - Legacy csurf protected exactly /api/v1/login and /api/v1/logout; mirror that.
import { randomBytes } from 'node:crypto'
import { defineEventHandler, getCookie, setCookie, getHeader, createError } from 'h3'

const PROTECTED = new Set(['/api/v1/login', '/api/v1/logout'])

export default defineEventHandler((event) => {
  let token = getCookie(event, 'csrf-token')

  if (!token) {
    token = randomBytes(24).toString('hex')

    setCookie(event, 'csrf-token', token, {
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false, // client must read it to echo the header
      maxAge: 90 * 24 * 60 * 60
    })
  }

  const path = event.path?.split('?')[0]

  if (event.method === 'POST' && PROTECTED.has(path)) {
    const header = getHeader(event, 'x-csrf-token')

    if (!header || header !== token) {
      // Same shape the legacy stack produced (csurf EBADCSRFTOKEN -> 403)
      throw createError({ statusCode: 403, statusMessage: 'CSRF Token Mismatch', data: { code: 'EBADCSRFTOKEN', message: 'CSRF Token Mismatch' } })
    }
  }
})
