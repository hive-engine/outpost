// Shared app session — replaces Express cookie-session.
// h3's useSession stores data in an encrypted, sealed cookie (same model:
// no server-side store). Config mirrors legacy: name 'session', 90-day maxAge,
// secure in production, SameSite lax.
import { useSession } from 'h3'

export function getAppSession (event) {
  const config = useRuntimeConfig(event)

  return useSession(event, {
    name: 'session',
    password: config.sessionSecret,
    maxAge: 90 * 24 * 60 * 60, // seconds (legacy passed ms to cookie-session)
    cookie: {
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true
    }
  })
}
