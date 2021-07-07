<template>
  <nuxt-link v-slot="{navigate}" custom :to="{name: route, params}">
    <div class="nft-card" @click="navigate">
      <div v-if="nft.type === 'audio'" class="file-type-icon">
        <fa-icon icon="music" />
      </div>

      <div v-if="nft.type === 'video'" class="file-type-icon">
        <fa-icon icon="video" />
      </div>

      <div v-if="showWarning" class="nsfw" @click.prevent="toggle">
        NSFW - Click to reveal
      </div>

      <template v-if="showImage">
        <audio-hover v-if="getFileType(nft.file) === 'audio'" :source="nft.file" :poster="nft.thumbnail" class="nft-thumbnail" />

        <video-hover v-else-if="getFileType(nft.thumbnail) === 'video'" :source="nft.thumbnail" class="nft-thumbnail" />

        <div v-else-if="getFileType(nft.thumbnail) === 'image'" v-lazy:background-image="nft.thumbnail" class="nft-thumbnail" />
      </template>

      <div v-if="!small" class="nft-card-footer">
        <div class="nft-name">
          <nuxt-link class="text-truncut" :to="{name: route, params}">
            {{ nft.name }}
          </nuxt-link>
        </div>

        <div v-if="type === 'history'" class="d-flex justify-content-between">
          <div>
            <div class="small">
              Buyer
            </div>

            <nuxt-link :to="{name:'user-collection', params:{user: nft.account}}">
              {{ nft.account }}
            </nuxt-link>
          </div>

          <div class="text-right">
            <div class="small">
              Seller
            </div>

            <nuxt-link :to="{name:'user-gallery', params:{user: nft.data.seller}}">
              {{ nft.data.seller }}
            </nuxt-link>
          </div>
        </div>
      </div>
    </div>
  </nuxt-link>
</template>

<script>
import AudioHover from '@/components/nftmarketplace/AudioHover.vue'
import VideoHover from '@/components/nftmarketplace/VideoHover.vue'

export default {
  name: 'NftCard',

  components: {
    AudioHover,
    VideoHover
  },

  props: {
    nft: { type: Object, required: true },
    type: { type: String, default: '' },
    route: { type: String, default: 'nfts-series' },
    params: { type: Object, default () { return { series: this.nft.series } } },
    small: { type: Boolean, default: false }
  },

  data () {
    return {
      showWarning: false,
      showImage: true
    }
  },

  created () {
    this.nsfwPref = this.$cookies.get('nsfw_pref') || 'warn'

    if (this.nsfwPref === 'warn' && this.nft.nsfw) {
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
