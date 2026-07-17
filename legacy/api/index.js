import express from 'express'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import cookieSession from 'cookie-session'
import axios from 'axios'
import csurf from 'csurf'
import cors from 'cors'
import { differenceInMinutes } from 'date-fns'
import { Client, cryptoUtils, utils, Signature } from '@hiveio/dhive'
import * as config from '../config'

const app = express()

const hiveClient = new Client(config.NODES)

const csurfProtection = csurf({ cookie: true })

const fetchPost = async ({ author, permlink }) => {
  const params = {
    token: config.TOKEN
  }

  if (config.IS_HIVE) {
    params.hive = 1
  }
  const { data } = await axios.get(`${config.SCOT_API}/@${author}/${permlink}`, {
    params
  })

  return data[config.TOKEN]
}

app.set('trust proxy', 1)
app.use(bodyParser.json())
app.use(cookieSession({
  name: 'session',
  secret: process.env.SESSION_SECRET || 'mySuperSecretSessionSecret',
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 90 * 24 * 60 * 60 * 1000
}))
app.use(cookieParser())

app.use(cors())

app.get('/', (req, res) => {
  res.json({
    success: true
  })
})

app.post('/login', csurfProtection, async (req, res) => {
  const { username, sig, ts, smartlock } = req.body

  if (process.env.NODE_ENV === 'production') {
    const timeDifference = differenceInMinutes(Date.now(), ts)

    if (timeDifference >= 3) {
      return res.json({
        message:
          'Provided timestamp is invalid or too old. Please check that your system clock has the correct date and time.'
      }).status(401)
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
      req.session.user = username
      req.session.smartlock = smartlock

      return res.json({ username, smartlock })
    }
  } catch (e) {
    res.json({ error: e.message }).status(500)
  }

  return res.status(401)
})

app.post('/me', (req, res) => {
  const { user: username, smartlock } = req.session

  if (username) {
    return res.json({ username, smartlock })
  }

  return res.status(401).send('Unauthorized')
})

app.post('/logout', csurfProtection, (req, res) => {
  req.session = null

  return res.json({ status: 'ok' })
})

app.post('/search', async (req, res) => {
  const { body: { query } } = req

  try {
    const { data } = await axios.post('https://api.hivesearcher.com/search', { q: query, sort: 'newest' }, {
      headers: {
        'Content-type': 'application/json',
        Authorization: process.env.HS_API_KEY
      }
    })

    return res.json(data)
  } catch (e) {
    res.status(500).send({ error: e.message })
  }
})

app.post('/csp-violation', (req, res) => {
  const { body: { 'csp-report': report } } = req

  if (report) {
    try {
      const value = `${report['document-uri']} :: ${report['blocked-uri']}`

      console.log(`CSP Violation: ${value} UA: ${req.headers['user-agent']}`)
    } catch {
      //
    }
  }

  return res.send('')
})

app.get('/curated', async (req, res) => {
  let { from, limit } = req.query
  let posts = []

  from = Number(from) || -1

  if (!limit || limit <= 0) {
    limit = 50
  }

  try {
    posts = await hiveClient.database.getAccountHistory(config.CURATED_FEED_ACCOUNT, from, limit, utils.makeBitMaskFilter([utils.operationOrders.vote]))

    from = posts[0][0]

    posts.reverse()

    posts = posts.filter(p => p[1].op[1].weight > 0)
      .map((r) => {
        const { author, permlink } = r[1].op[1]

        return fetchPost({ author, permlink })
      })

    posts = await Promise.all(posts)

    posts = posts.filter(p => p && p.main_post).map(p => ({ ...p, permlink: p.authorperm.split('/')[1], next_history_index: from - 1 }))
  } catch (error) {
    console.log(error.message)
  }

  return res.json(posts)
})

module.exports = app

if (require.main === module) {
  const port = process.env.PORT || 3001

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`API server listening on port ${port}`)
  })
}
