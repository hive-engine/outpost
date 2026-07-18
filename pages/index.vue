<template>
  <div class="homepage">
    <b-container fluid>
      <div v-if="pending">
        <loading />
      </div>

      <template v-else>
        <div class="post-highlights">
          <post-summary v-for="(post, i) of curated" :key="i" :post="post" type="feed" />
        </div>

        <div v-if="!trendingIsCurated" class="mt-4 text-uppercase text-end fw-bold">
          <nuxt-link :to="{ name: 'sort', params: { sort: 'curated' } }">
            See more curated content <fa-icon icon="angle-right" />
          </nuxt-link>
        </div>

        <b-row>
          <b-col lg="6" class="mt-5">
            <h3>Popular</h3>

            <post-summary v-for="(post, i) of trending" :key="i" :post="post" type="feed" />

            <div class="mt-4 text-uppercase fw-bold">
              <nuxt-link :to="{ name: 'sort', params: { sort: 'trending' } }">
                See more popular content <fa-icon icon="angle-right" />
              </nuxt-link>
            </div>
          </b-col>

          <b-col lg="6" class="mt-5">
            <h3>Latest</h3>

            <post-summary v-for="(post, i) of created" :key="i" :post="post" type="feed" />

            <div class="mt-4 text-uppercase fw-bold">
              <nuxt-link :to="{ name: 'sort', params: { sort: 'created' } }">
                See more new content <fa-icon icon="angle-right" />
              </nuxt-link>
            </div>
          </b-col>
        </b-row>
      </template>

      <div style="display: flex; justify-content: center; align-items: center;">
        <img src="https://files.peakd.com/file/peakd-hive/borniet/23vsLDtNtHpKXrTCTt8dSwyLSUzSkHYNSRAWQGtn3YAxukHku7kbU8NMh2S7seG2P3hFA.png" alt="Centered Image">
      </div>
    </b-container>
  </div>
</template>

<script setup>
// Ported from legacy/pages/index.vue. Idiomatic Nuxt 3: useAsyncData RETURNS the
// data (the earlier external-ref-mutation pattern left the arrays empty on render).
// <loading>/<post-summary> resolve via Nuxt auto-import.
import { useScotStore } from '~/stores/scot'

const config = useRuntimeConfig().public
const scot = useScotStore()

const { data, pending } = await useAsyncData('home-posts', async () => {
  const params = config.CURATED_FEED ? {} : { limit: 15 }

  const requests = [
    scot.fetchPosts({ endpoint: 'get_discussions_by_trending', params }),
    scot.fetchPosts({ endpoint: 'get_discussions_by_created' })
  ]

  if (config.CURATED_FEED) {
    requests.push(scot.fetchPosts({ endpoint: 'curated' }))
  }

  let [trending, created, curated] = await Promise.all(requests)

  trending = trending || []
  created = created || []

  let trendingIsCurated = false

  if (!curated || curated.length <= 0) {
    trendingIsCurated = true
    curated = trending.slice(0, 5)
  } else {
    curated = curated.slice(0, 5)
  }

  return { trending, created, curated, trendingIsCurated }
})

const trending = computed(() => data.value?.trending ?? [])
const created = computed(() => data.value?.created ?? [])
const curated = computed(() => data.value?.curated ?? [])
const trendingIsCurated = computed(() => data.value?.trendingIsCurated ?? false)
</script>
