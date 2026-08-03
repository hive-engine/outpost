// POST /api/v1/bookmarks — persist the logged-in user's bookmarks (whole list).
// Body: { bookmarks: [{ author, permlink, title, savedAt }] }.
import { defineEventHandler, readBody, createError } from 'h3'
import { getAppSession } from '../../utils/session'

const MAX_BOOKMARKS = 500

const clamp = (b) => {
  if (!b || typeof b !== 'object' || !b.author || !b.permlink) { return null }
  return {
    author: String(b.author).slice(0, 20),
    permlink: String(b.permlink).slice(0, 300),
    title: typeof b.title === 'string' ? b.title.slice(0, 300) : '',
    savedAt: Number(b.savedAt) || Date.now()
  }
}

export default defineEventHandler(async (event) => {
  const session = await getAppSession(event)
  const user = session.data && session.data.user

  if (!user) { throw createError({ statusCode: 401, statusMessage: 'Unauthorized' }) }

  const body = await readBody(event).catch(() => ({}))

  const bookmarks = Array.isArray(body.bookmarks)
    ? body.bookmarks.slice(0, MAX_BOOKMARKS).map(clamp).filter(Boolean)
    : []

  await useStorage('bookmarks').setItem(user, { bookmarks, updatedAt: Date.now() })

  return { ok: true, count: bookmarks.length }
})
