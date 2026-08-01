// POST /api/v1/drafts — persist the logged-in user's drafts + auto-draft to the
// account-scoped server store. Body: { drafts: [...], auto: {...}|null }.
import { defineEventHandler, readBody, createError } from 'h3'
import { getAppSession } from '../../utils/session'

// Guard rails so a client can't bloat the store: cap the saved-drafts list and
// the size of any single draft body.
const MAX_DRAFTS = 30
const MAX_BODY = 200_000 // chars — a very long post is ~tens of KB

const clampDraft = (d) => {
  if (!d || typeof d !== 'object') { return null }
  return {
    id: d.id,
    title: typeof d.title === 'string' ? d.title.slice(0, 500) : '',
    body: typeof d.body === 'string' ? d.body.slice(0, MAX_BODY) : '',
    summary: typeof d.summary === 'string' ? d.summary.slice(0, 500) : '',
    tags: Array.isArray(d.tags) ? d.tags.slice(0, 10) : [],
    savedAt: Number(d.savedAt) || Date.now()
  }
}

export default defineEventHandler(async (event) => {
  const session = await getAppSession(event)
  const user = session.data && session.data.user

  if (!user) { throw createError({ statusCode: 401, statusMessage: 'Unauthorized' }) }

  const body = await readBody(event).catch(() => ({}))

  const drafts = Array.isArray(body.drafts)
    ? body.drafts.slice(0, MAX_DRAFTS).map(clampDraft).filter(Boolean)
    : []
  const auto = body.auto ? clampDraft(body.auto) : null

  await useStorage('drafts').setItem(user, { drafts, auto, updatedAt: Date.now() })

  return { ok: true, count: drafts.length }
})
