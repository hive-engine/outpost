<template>
  <b-row>
    <b-col>
      <nuxt-link v-slot="{navigate}" custom :to="{name:'nfts-series', params:{series: history.series}}" class="nft-card large">
        <div @click="navigate">
          <div v-if="history.series_info.type === 'audio'" class="file-type-icon">
            <fa-icon icon="music" />
          </div>

          <div v-if="history.series_info.type === 'video'" class="file-type-icon">
            <fa-icon icon="video" />
          </div>

          <div v-if="showWarning" class="nsfw" @click.prevent="toggle">
            NSFW - Click to reveal
          </div>

          <template v-if="showImage">
            <audio-hover v-if="getFileType(history.series_info.file) === 'audio'" :source="history.series_info.file" :poster="history.series_info.thumbnail" class="nft-thumbnail" />

            <video-hover v-else-if="getFileType(history.series_info.thumbnail) === 'video'" :source="history.series_info.thumbnail" class="nft-thumbnail" />

            <div v-else-if="getFileType(history.series_info.thumbnail) === 'image'" v-lazy:background-image="history.series_info.thumbnail" class="nft-thumbnail" />
          </template>
        </div>
      </nuxt-link>
    </b-col>

    <b-col>
      <b-row>
        <b-col cols="3" sm="2" md="3" lg="2">
          <b-avatar
            variant="light"
            crossorigin
            :src="`${$config.IMAGES_CDN}u/${history.account}/avatar`"
            class="border mt-2"
            size="3rem"
          />
        </b-col>

        <b-col cols="9" sm="10" md="9" lg="10">
          <nuxt-link :to="{name:'user-collection', params:{user:history.account}}">
            @{{ history.account }}
          </nuxt-link> bought edition #{{ history.data.edition }} of <nuxt-link :to="{name: 'nfts-series', params: {series: history.data.series}}">
            {{ history.series_info.name }}
          </nuxt-link> from <nuxt-link :to="{name:'user-gallery', params:{user:history.data.seller}}">
            @{{ history.data.seller }}
          </nuxt-link> for {{ history.data.price }} {{ history.data.symbol }}

          <div class="mt-2 mb-0">
            <timeago class="text-muted" :datetime="new Date(history.timestamp)" :auto-update="60" />
            <a class="small" :href="`${(history.sidechain_block) ? $config.SIDECHAIN_EXPLORER: 'https://hiveblocks.com'}/tx/${history.trx_id}`" target="_blank">[view tx]</a>
          </div>
        </b-col>
      </b-row>
    </b-col>
  </b-row>
  </div>
</template>

<script>
import AudioHover from '@/components/nftmarketplace/AudioHover.vue'
import VideoHover from '@/components/nftmarketplace/VideoHover.vue'

export default {
  name: 'NftTH',

  components: {
    AudioHover,
    VideoHover
  },

  props: {
    history: { type: Object, required: true }
  },

  data () {
    return {
      showWarning: false,
      showImage: true
    }
  },

  created () {
    this.nsfwPref = this.$cookies.get('nsfw_pref') || 'warn'

    if (this.nsfwPref === 'warn' && this.history.series_info.nsfw) {
      this.showWarning = true
      this.showImage = false
    }
  },

  methods: {
    toggle () {
      this.showWarning = !(this.showWarning)
      this.showImage = !(this.showImage)
    },

    getFileType (url) {
      const ext = url.toLowerCase().split('.').pop()

      const exts = {
        png: 'image',
        jpg: 'image',
        jpeg: 'image',
        gif: 'image',
        mp4: 'video',
        webm: 'video',
        mp3: 'audio',
        mpga: 'audio',
        wav: 'audio'
      }

      return exts[ext]
    }
  }
}
</script>

<style>

</style>
