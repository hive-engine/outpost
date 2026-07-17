// POST /api/v1/search — HiveSearcher proxy, ported from legacy app.post('/search').
import axios from 'axios'
import { defineEventHandler, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const { query } = await readBody(event)

  try {
    const { data } = await axios.post('https://api.hivesearcher.com/search', { q: query, sort: 'newest' }, {
      headers: {
        'Content-type': 'application/json',
        Authorization: config.hsApiKey
      }
    })

    return data
  } catch (e) {
    throw createError({ statusCode: 500, data: { error: e.message } })
  }
})
