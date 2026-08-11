// POST /api/v1/games/session/confirm — verify a ranked entry's BBHO payment.
// Body: { sessionId }. The client calls this after broadcasting the entry
// transfer; we scan the pot account's Hive-Engine history for a matching incoming
// transfer and flip the session to paid. Free/casual sessions need no payment.
import { defineEventHandler, readBody, createError } from 'h3'
import { getAppSession } from '../../../utils/session'
import { ARCADE, verifyEntryPayment } from '../../../utils/arcade'

export default defineEventHandler(async (event) => {
  const appSession = await getAppSession(event)
  const user = appSession.data && appSession.data.user

  if (!user) { throw createError({ statusCode: 401, statusMessage: 'Unauthorized' }) }

  const body = await readBody(event).catch(() => ({}))
  const sessionId = String(body.sessionId || '')

  const store = useStorage('gamesessions')
  const sess = await store.getItem(sessionId)

  if (!sess || sess.user !== user) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid session' })
  }
  if (sess.mode !== 'ranked') { return { ok: true, paid: true } }
  if (sess.paid) { return { ok: true, paid: true } }

  const ok = await verifyEntryPayment({
    user,
    memo: sess.memo,
    amount: ARCADE.entryFee,
    sinceSec: Math.floor(sess.startedAt / 1000)
  })

  if (ok) {
    await store.setItem(sessionId, { ...sess, paid: true, confirmedAt: Date.now() })
    return { ok: true, paid: true }
  }

  return { ok: false, paid: false }
})
