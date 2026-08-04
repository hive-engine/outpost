// POST /api/v1/search — HiveSearcher proxy, ported from legacy app.post('/search').
import axios from 'axios'
import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const { query } = await readBody(event)

  // Full-text post search needs a HiveSearcher key. Without one, return empty
  // immediately (the UI still does free account + tag search) instead of hanging.
  if (!config.hsApiKey) { return { results: [] } }

  try {
    const { data } = await axios.post('https://api.hivesearcher.com/search', { q: query, sort: 'newest' }, {
      headers: {
        'Content-type': 'application/json',
        Authorization: config.hsApiKey
      },
      timeout: 8000
    })

    return data
  } catch (e) {
    // Don't fail the whole search — account/tag results still stand.
    return { results: [], error: e.message }
  }
})
