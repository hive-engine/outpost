// POST /api/v1/3speak/bridge — bind a 3Speak asset to its published Hive post.
//
// This is the mandatory step (§8 of the integration guide): nothing appears in
// any 3Speak feed until POST /video/{permlink}/hive lands. Runs server-side with
// the API key; only allows binding to the logged-in user's own author.
import { defineEventHandler, createError, readBody } from 'h3'
import { getAppSession } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiKey = config.threespeakApiKey

  if (!apiKey) {
    throw createError({ statusCode: 503, statusMessage: '3Speak uploads are not configured on this server.' })
  }

  const session = await getAppSession(event)
  const user = session.data && session.data.user
  if (!user) { throw createError({ statusCode: 401, statusMessage: 'Unauthorized' }) }

  const body = await readBody(event).catch(() => ({}))
  const { permlink, hive_author: hiveAuthor, hive_permlink: hivePermlink } = body

  if (!permlink || !hiveAuthor || !hivePermlink) {
    throw createError({ statusCode: 400, statusMessage: 'permlink, hive_author and hive_permlink are required.' })
  }
  if (hiveAuthor !== user) {
    throw createError({ statusCode: 403, statusMessage: 'You can only bind your own posts.' })
  }

  const host = config.public.THREESPEAK_EMBED_HOST || 'https://embed2.3speak.tv'
  const headers = { 'X-API-Key': apiKey, 'Content-Type': 'application/json' }

  try {
    await $fetch(`${host}/video/${encodeURIComponent(permlink)}/hive`, {
      method: 'POST',
      headers,
      body: {
        hive_author: hiveAuthor,
        hive_permlink: hivePermlink,
        hive_title: body.hive_title || '',
        hive_body: body.hive_body || '',
        hive_tags: Array.isArray(body.hive_tags) ? body.hive_tags : []
      },
      timeout: 15000
    })

    // Attach the thumbnail (best-effort — the encoder generates one otherwise).
    if (body.thumbnail_url) {
      await $fetch(`${host}/video/${encodeURIComponent(permlink)}/thumbnail`, {
        method: 'POST',
        headers,
        body: { thumbnail_url: body.thumbnail_url },
        timeout: 15000
      }).catch(() => { /* non-fatal */ })
    }

    return { success: true }
  } catch (e) {
    throw createError({
      statusCode: e?.response?.status || 502,
      statusMessage: `3Speak bridge failed: ${e?.data?.message || e?.message || 'unknown error'}`
    })
  }
})
