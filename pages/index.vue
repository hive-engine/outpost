<template>
  <div class="homepage">
    <b-container fluid>
      <template v-if="loading">
        <loading />
      </template>

      <template v-else>
        <b-row>
          <b-col lg="6" class="mt-5">
            <b-card class="card">
              <h3>What is Cine TV?</h3>
              <p>A supportive Hive-based platform for people to explore their passion for cinema, tv and theater through the creative process of blogging and earn crypto while doing so.</p>
            </b-card>
            <!-- <b-card class="card-footer">
            </b-card> -->
          </b-col>
          <b-col lg="6" class="mt-5">
            <b-card class="card">
              <h3>Current CINE Price: {{ getUSDPrice(1) }}</h3>
              <p>Social:</p>
              <div class="d-flex justify-content-between align-items-center">
                <a href="https://discord.gg/U4K8EYAayB">Join the Cine TV Discord</a>
                <a href="https://twitter.com/CineTv_io">Follow Cine TV on Twitter</a>
              </div>
            </b-card>
            <!-- <b-card class="card-footer">
              <div ">
              </div>
            </b-card> -->
          </b-col>
        </b-row>

        <div class="post-highlights">
          <post-summary v-for="(post,i) of curated" :key="i" :post="post" type="feed" />
        </div>

        <div v-if="!trendingIsCurated" class="mt-4 text-uppercase text-right font-weight-bold">
          <nuxt-link :to="{name:'sort', params:{sort:'curated'}}">
            See more curated contents <fa-icon icon="angle-right" />
          </nuxt-link>
        </div>

        <b-row>
          <b-col lg="6" class="mt-5">
            <h3>Popular</h3>

            <post-summary v-for="(post,i) of trending" :key="i" :post="post" type="feed" />

            <div class="mt-4 text-uppercase font-weight-bold">
              <nuxt-link :to="{name:'sort', params:{sort:'trending'}}">
                See more popular contents <fa-icon icon="angle-right" />
              </nuxt-link>
            </div>
          </b-col>

          <b-col lg="6" class="mt-5">
            <h3>Latest</h3>

            <post-summary v-for="(post,i) of created" :key="i" :post="post" type="feed" />

            <div class="mt-4 text-uppercase font-weight-bold">
              <nuxt-link :to="{name:'sort', params:{sort:'created'}}">
                See more new contents <fa-icon icon="angle-right" />
              </nuxt-link>
            </div>
          </b-col>
        </b-row>
      </template>
    </b-container>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import postIndex from '@/mixins/postIndex'
import NFTMMixin from '@/mixins/nftmarketplace'

export default {
  name: 'Home',

  mixins: [postIndex, NFTMMixin],

  async asyncData ({ error, store }) {
    try {
      await store.dispatch('nftmarketplace/fetchSettings', { root: true })

      if (!store.state.nftmarketplace.settings || !store.state.nftmarketplace.settings.site) {
        return error({ statusCode: 404, message: 'NFT Marketplace settings has not been found!' })
      }
    } catch (error) {
      return error({ statusCode: 404, message: 'NFT Marketplace settings has not been found!' })
    }
  },

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

    await Promise.all([
      this.fetchHivePrice(),
      this.fetchTokenPrice()
    ])

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
  },

  computed: {
    ...mapGetters('nftmarketplace', ['settings', 'token_price'])
  },

  methods: {
    ...mapActions('nftmarketplace', ['fetchHivePrice', 'fetchTokenPrice']),

    getUSDPrice (hivePrice) {
      return `$${Number(Number(hivePrice) * this.token_price).toFixed(3)}`
    },

    timers: {
      fetchHivePrice: { time: 5 * 60 * 1000, autostart: true, immediate: true, repeat: true },
      fetchTokenPrice: { time: 15 * 60 * 1000, autostart: true, immediate: true, repeat: true }
    }
  }
}
</script>

<style>

</style>
