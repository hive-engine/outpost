// GET /api/v1/curated — curated feed from the curation account's vote history,
// ported from legacy app.get('/curated').
import axios from 'axios'
import { Client, utils } from '@hiveio/dhive'
import { defineEventHandler, getQuery } from 'h3'

let hiveClient

const fetchPost = async (config, { author, permlink }) => {
  const params = { token: config.public.TOKEN }

  if (config.public.IS_HIVE) {
    params.hive = 1
  }

  const { data } = await axios.get(`${config.public.SCOT_API}/@${author}/${permlink}`, { params })

  return data[config.public.TOKEN]
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  if (!hiveClient) {
    hiveClient = new Client([...config.public.NODES])
  }

  let { from, limit } = getQuery(event)
  let posts = []

  from = Number(from) || -1

  if (!limit || limit <= 0) {
    limit = 50
  }

  try {
    posts = await hiveClient.database.getAccountHistory(
      config.public.CURATED_FEED_ACCOUNT,
      from,
      limit,
      utils.makeBitMaskFilter([utils.operationOrders.vote])
    )

    from = posts[0][0]

    posts.reverse()

    posts = posts.filter(p => p[1].op[1].weight > 0)
      .map((r) => {
        const { author, permlink } = r[1].op[1]

        return fetchPost(config, { author, permlink })
      })

    posts = await Promise.all(posts)

    posts = posts.filter(p => p && p.main_post).map(p => ({ ...p, permlink: p.authorperm.split('/')[1], next_history_index: from - 1 }))
  } catch (error) {
    console.log(error.message)
  }

  return posts
})
