<template>
  <div class="homepage">
    <b-container fluid>
      <template v-if="loading">
        <loading />
      </template>

      <template v-else>
        <div class="post-highlights">
          <post-summary v-for="(post,i) of curated" :key="i" :post="post" type="feed" />
        </div>

        <div v-if="!trendingIsCurated" class="mt-4 text-uppercase text-right font-weight-bold">
          <nuxt-link :to="{name:'sort', params:{sort:'curated'}}">
            See more curated content <fa-icon icon="angle-right" />
          </nuxt-link>
        </div>

        <b-row>
          <b-col lg="6" class="mt-5">
            <h3>Popular</h3>

            <post-summary v-for="(post,i) of trending" :key="i" :post="post" type="feed" />

            <div class="mt-4 text-uppercase font-weight-bold">
              <nuxt-link :to="{name:'sort', params:{sort:'trending'}}">
                See more popular content <fa-icon icon="angle-right" />
              </nuxt-link>
            </div>
          </b-col>

          <b-col lg="6" class="mt-5">
            <h3>Latest</h3>

            <post-summary v-for="(post,i) of created" :key="i" :post="post" type="feed" />

            <div class="mt-4 text-uppercase font-weight-bold">
              <nuxt-link :to="{name:'sort', params:{sort:'created'}}">
                See more new content <fa-icon icon="angle-right" />
              </nuxt-link>
            </div>
          </b-col>
        </b-row>
      </template>
    </b-container>
  </div>
</template>

<script>
import postIndex from '@/mixins/postIndex'

export default {
  name: 'Home',

  mixins: [postIndex],

  data () {
    return {
      curated: [],
      trending: [],
      created: [],

      trendingIsCurated: false
    }
  },

  async fetch () {
    this.loading = true

    const params = this.$config.CURATED_FEED ? {} : { limit: 15 }

    const requests = [
      this.fetchPosts({ endpoint: 'get_discussions_by_trending', params }),
      this.fetchPosts({ endpoint: 'get_discussions_by_created' })
    ]

    if (this.$config.CURATED_FEED) {
      requests.push(this.fetchPosts({ endpoint: 'curated' }))
    }

    // eslint-disable-next-line prefer-const
    let [trending, created, curated] = await Promise.all(requests)

    if (!curated || curated.length <= 0) {
      this.trendingIsCurated = true

      curated = trending.splice(0, 5)
    } else {
      curated = curated.splice(0, 5)
    }

    this.curated = curated
    this.trending = trending
    this.created = created

    this.loading = false
  }
}
</script>

<style>

</style>
