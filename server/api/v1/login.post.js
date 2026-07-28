// POST /api/v1/login — ported from legacy/api/index.js app.post('/login').
// Verifies a Hive Keychain/posting-key signature over sha256(username + ts) and
// stores { user, smartlock } in the sealed session cookie.
//
// Response shapes intentionally mirror the legacy Express handler (the client
// auth store branches on them): stale ts -> 200 {message}; exception -> 200
// {error}; invalid signature -> 401; success -> 200 {username, smartlock}.
import { differenceInMinutes } from 'date-fns'
import { Client, cryptoUtils, Signature } from '@hiveio/dhive'
import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { getAppSession } from '../../utils/session'

let hiveClient

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  if (!hiveClient) {
    hiveClient = new Client([...config.public.NODES])
  }

  const { username, sig, ts, smartlock, method } = await readBody(event)

  // Signer used ('keychain' | 'smartlock' | 'hiveauth') — stored so the client
  // routes broadcasts to the right signer after a reload. Validated to a known set.
  const loginMethod = ['keychain', 'smartlock', 'hiveauth'].includes(method) ? method : (smartlock ? 'smartlock' : 'keychain')

  if (process.env.NODE_ENV === 'production') {
    const timeDifference = differenceInMinutes(Date.now(), ts)

    if (timeDifference >= 3) {
      return {
        message:
          'Provided timestamp is invalid or too old. Please check that your system clock has the correct date and time.'
      }
    }
  }

  try {
    const [account] = await hiveClient.database.getAccounts([username])

    let validSignature = false

    const publicKey = Signature.fromString(sig)
      .recover(cryptoUtils.sha256(`${username}${ts}`))
      .toString()

    const thresholdPosting = account.posting.weight_threshold
    const authorizedAccountsPosting = new Map(account.posting.account_auths)

    // Trying to validate using posting key
    if (!validSignature) {
      for (let i = 0; i < account.posting.key_auths.length; i += 1) {
        const auth = account.posting.key_auths[i]

        if (auth[0] === publicKey && auth[1] >= thresholdPosting) {
          validSignature = true
          break
        }
      }
    }

    // Trying to validate using posting authority
    if (!validSignature && authorizedAccountsPosting.size > 0) {
      let accountsData = await hiveClient.database.getAccounts(
        Array.from(authorizedAccountsPosting.keys())
      )

      accountsData = accountsData.map(a => a.posting.key_auths[0])

      for (let i = 0; i < accountsData.length; i += 1) {
        const auth = accountsData[i]

        if (auth[0] === publicKey && auth[1] >= thresholdPosting) {
          validSignature = true
          break
        }
      }
    }

    if (validSignature) {
      const session = await getAppSession(event)

      await session.update({ user: username, smartlock, method: loginMethod })

      return { username, smartlock, method: loginMethod }
    }
  } catch (e) {
    return { error: e.message }
  }

  setResponseStatus(event, 401)
  return ''
})
