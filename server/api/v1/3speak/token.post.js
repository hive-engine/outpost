// POST /api/v1/3speak/token — mint a single-use 3Speak upload token.
//
// The 3Speak embed API key is server-only and never reaches the browser. We mint
// a short-lived, single-use upload token scoped to the LOGGED-IN user (the `owner`
// is taken from the session, never from the client — a user can only upload as
// themselves). The browser then uploads bytes directly to 3Speak with this token.
import { defineEventHandler, createError, readBody } from 'h3'
import { getAppSession } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiKey = config.threespeakApiKey

  if (!apiKey) {
    throw createError({ statusCode: 503, statusMessage: '3Speak uploads are not configured on this server.' })
  }

  const session = await getAppSession(event)
  const owner = session.data && session.data.user

  if (!owner) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event).catch(() => ({}))
  const isShort = !!body.short

  const host = config.public.THREESPEAK_EMBED_HOST || 'https://embed2.3speak.tv'
  const appDomain = config.public.APP_DOMAIN

  try {
    const res = await $fetch(`${host}/uploads/token`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
      body: {
        owner,
        frontend_app: config.public.THREESPEAK_APP || 'thebbhproject',
        short: isShort,
        allowed_origins: appDomain ? [appDomain] : undefined,
        max_file_size: Math.min(Number(body.max_file_size) || (1024 * 1024 * 1024), 5 * 1024 * 1024 * 1024),
        ttl: 1800
      },
      timeout: 15000
    })

    // Pass back only what the client needs; the API key never leaves the server.
    return {
      token: res.token,
      permlink: res.permlink,
      embed_url: res.embed_url,
      upload_url: res.upload_url,
      owner,
      short: isShort,
      expires_at: res.expires_at
    }
  } catch (e) {
    throw createError({
      statusCode: e?.response?.status || 502,
      statusMessage: `3Speak token request failed: ${e?.data?.message || e?.message || 'unknown error'}`
    })
  }
})
