<template>
  <b-container fluid="lg">
    <template v-if="loading">
      <loading />
    </template>

    <template v-else>
      <template v-if="!isLoggedIn">
        <b-card class="mt-5">
          <div class="h5">
            Minting NFTs require you to login to NFT Marketplace.
          </div>

          <b-button variant="primary" class="mt-3" @click.prevent="requestLoginToMarketplace">
            Login
          </b-button>
        </b-card>
      </template>

      <template v-else-if="!isWhitelisted">
        <b-card class="mt-5">
          <div class="h5">
            You are not whitelisted. Please update your profile and apply for whitelist.
          </div>

          <b-button variant="primary" class="mt-3" :to="{name: 'nfts-profile'}">
            Update Profile
          </b-button>
        </b-card>
      </template>

      <template v-else>
        <b-card title="Mint NFTs" class="mt-5">
          <b-alert variant="info" show>
            <div>Your current balance is <strong>{{ currencyBalance }} {{ settings.currency }}</strong>, <span v-html=" maxPossibleEditions > 0 ? `which is enough to mint up to <strong>${maxPossibleEditions}</strong> editions` : 'which is not enough to mint any editions'" />.</div>

            <div class="mt-2">
              The first edition costs <strong>{{ settings.token_issuance_base_fee + settings.token_issuance_fee }} {{ settings.currency }}</strong> and each additional edition costs <strong>{{ settings.token_issuance_fee }} {{ settings.currency }}</strong>. Please check your balance now and gather some {{ settings.currency }} on your <nuxt-link :to="{ name: 'user-wallet', params: { user: $auth.user.username } }">
                wallet
              </nuxt-link> <span v-html="maxPossibleEditions > 0 ? `if you plan to issue more than <strong>${maxPossibleEditions}</strong> tokens` : '<strong>before</strong> you attempt to issue tokens'" />.
            </div>
          </b-alert>

          <b-alert variant="warning" dismissible show>
            At this stage of the project the information provided can not be edited. Please ensure everything in the form is correct.
          </b-alert>

          <b-form-group label="What are you tokenizing?" description="If you change this in the middle of filling out the form, your progress will be lost.">
            <b-form-radio-group v-model="tokenizing" :options="tokenizingOptions" buttons name="tokenizing-options" button-variant="outline-secondary" />
          </b-form-group>

          <b-form-row>
            <b-col>
              <b-form-group label="Thumbnail *" :state="$v.thumbnailURL.$dirty ? !$v.thumbnailURL.$error : null">
                <file-input v-model="thumbnail" class="d-block" :max-size="tokenizing === 'video' ? 5 : 1" :disabled="uploading" :accepts="supportedThumbnailTypes">
                  <template #activator>
                    <b-avatar
                      :src="thumbnailSrc"
                      square
                      style="height:250px; width:100%"
                      :disabled="uploading"
                    >
                      <template v-if="!thumbnailSrc">
                        <div class="flex-column">
                          <p v-if="tokenizing === 'video'">
                            MP4. Max 5mb.
                          </p>

                          <p v-else>
                            PNG, JPG, or GIF. Max 1mb.
                          </p>

                          <b-button variant="primary">
                            Choose Thumbnail
                          </b-button>
                        </div>
                      </template>

                      <video
                        v-if="tokenizing === 'video' && thumbnailSrc"
                        :key="thumbnailSrc"
                        preload="auto"
                        style="background-color: #000"
                      >
                        <source :src="`${thumbnailSrc}`" type="video/mp4">
                      </video>
                    </b-avatar>
                  </template>
                </file-input>

                <template #invalid-feedback>
                  Thumbnail is required.
                </template>

                <div v-if="thumbnailError.length > 0" class="d-block invalid-feedback">
                  {{ thumbnailError }}
                </div>
              </b-form-group>

              <b-progress v-if="thumbnail" class="mb-3" max="100">
                <b-progress-bar :value="progress['thumbnail']" />
              </b-progress>
            </b-col>

            <b-col>
              <b-form-group label="File *" :state="$v.fileURL.$dirty ? !$v.fileURL.$error : null">
                <file-input v-model="file" class="d-block" :max-size="tokenizing === 'video'? 100 : 30" :disabled="uploading" :accepts="supportedFileTypes">
                  <template #activator>
                    <b-avatar
                      :src="fileSrc"
                      square
                      style="height:250px; width:100%"
                      :disabled="uploading"
                    >
                      <template v-if="!fileSrc">
                        <div class="flex-column">
                          <p v-if="tokenizing === 'video'">
                            MP4. Max 100mb.
                          </p>

                          <p v-else-if="tokenizing === 'audio'">
                            MP3 or WAV. Max 30 MB
                          </p>

                          <p v-else>
                            PNG, JPG, or GIF. Max 30mb.
                          </p>

                          <b-button variant="primary">
                            Choose File
                          </b-button>
                        </div>
                      </template>

                      <video
                        v-if="tokenizing === 'video' && fileSrc"
                        :key="fileSrc"
                        preload="auto"
                        style="background-color: #000"
                      >
                        <source :src="`${fileSrc}`" :type="file.uploadedFile.type">
                      </video>

                      <audio
                        v-if="tokenizing === 'audio' && fileSrc"
                        :key="fileSrc"
                        controls
                        muted="true"
                        preload="auto"
                        style="background-color: #000"
                      >
                        <source :src="`${fileSrc}`" :type="file.uploadedFile.type">
                      </audio>
                    </b-avatar>
                  </template>
                </file-input>

                <template #invalid-feedback>
                  File is required.
                </template>

                <div v-if="fileError.length > 0" class="d-block invalid-feedback">
                  {{ fileError }}
                </div>
              </b-form-group>

              <b-progress v-if="file" class="mb-3" max="100">
                <b-progress-bar :value="progress['file']" />
              </b-progress>
            </b-col>
          </b-form-row>

          <b-form-group label="Name *">
            <b-form-input v-model="name" trim :state="$v.name.$dirty ? !$v.name.$error : null" />
          </b-form-group>

          <label>Collection name</label>
          <b-row>
            <b-col md="4">
              <b-form-group label-sr-only label="Select Collection">
                <b-form-select v-model="selectedCollection" :options="existingCollections" />
              </b-form-group>
            </b-col>
            <b-col md="8">
              <b-form-group label-sr-only label="Collection name *" description="Maximum 100 characters are allowed.">
                <b-form-input
                  v-model="$v.collection.$model"
                  placeholder="Collection name *"
                  autocomplete="off"
                  trim
                  :state="$v.collection.$dirty ? !$v.collection.$error : null"
                />
              </b-form-group>
            </b-col>
          </b-row>

          <b-form-group label="Description *">
            <b-form-textarea v-model="description" trim :state="$v.description.$dirty ? !$v.description.$error : null" />
          </b-form-group>

          <b-form-row>
            <b-col sm="8">
              <b-form-group label="Rights *" description="By selecting 'Private' the owner has no rights to reproduce or use the work commercially. By selecting 'Limited Reproduction Rights' the artist grants the owner full commercial rights for the work to be used or recreated in commerce, but does not give away the creator's license.">
                <b-form-select v-model="rights" :options="rightsOptions" :state="$v.rights.$dirty ? !$v.rights.$error : null" />
              </b-form-group>
            </b-col>

            <b-col sm="4">
              <b-form-group label="Number of editions *">
                <b-form-input
                  v-model="editions"
                  number
                  type="number"
                  autocomplete="off"
                  min="1"
                  max="1000"
                  :state="$v.editions.$dirty ? !$v.editions.$error : null"
                />
              </b-form-group>
            </b-col>
          </b-form-row>

          <b-form-group label="Is this work Not Safe For Work (NSFW)?">
            <b-form-checkbox v-model="nsfw" size="lg" switch>
              {{ nsfw ? 'Yes' :'No' }}
            </b-form-checkbox>
          </b-form-group>
          </b-col>

          <b-form-group label="Tags *" label-for="tags">
            <b-form-tags
              v-model="tags"
              input-id="tags"
              tag-variant="primary"
              tag-pills
              separator=" ,;"
              placeholder="Enter new tags separated by space"
              autocomplete="off"
              :tag-validator="tagValidator"
              :state="$v.tags.$dirty ? !$v.tags.$error : null"
            />
          </b-form-group>

          <b-checkbox id="model_release" v-model="model_release" value="accepted" class="mt-3" unchecked-value="not_accepted">
            I have obtained consent and model release of all recognizable models (if any) in this content and can provide the release upon request.
          </b-checkbox>

          <b-checkbox id="accept_tos" v-model="accept_tos" value="accepted" class="mt-3" unchecked-value="not_accepted">
            I agree to only tokenize work I created that does not infringe on any copyright. If I am referencing someone else's art or work for more than 5% of the content I have received their consent.
          </b-checkbox>

          <b-checkbox id="accept_no_copy" v-model="accept_no_copy" value="accepted" class="mt-3" unchecked-value="not_accepted">
            I will not tokenize the same piece again.
          </b-checkbox>

          <b-checkbox id="accept_nsfw" v-model="accept_nsfw" value="accepted" class="mt-3" unchecked-value="not_accepted">
            Graphic violence of flesh and blood of humans has been marked "NSFW".
          </b-checkbox>

          <b-checkbox id="accept_no_child" v-model="accept_no_child" value="accepted" class="mt-3" unchecked-value="not_accepted">
            No sexual content of children in any format is tolerated on the site.  Minimum age is 18, our decision is final.
          </b-checkbox>

          <b-checkbox id="accept_content" v-model="accept_content" value="accepted" class="mt-3" unchecked-value="not_accepted">
            Borderline pieces will be removed from display and our file system and not refunded.
          </b-checkbox>

          <b-checkbox id="accept_no_violance" v-model="accept_no_violance" value="accepted" class="mt-3" unchecked-value="not_accepted">
            Work that calls for violence we be removed and creator(s) banned.
          </b-checkbox>

          <b-checkbox id="accept_blist" v-model="accept_blist" value="accepted" class="mt-3" unchecked-value="not_accepted">
            I understand that if I violate the Terms of Service I may be blacklisted from the site.
          </b-checkbox>

          <b-alert v-if="settings && settings.official_nft_enabled && settings.admins.includes($auth.user.username)" show variant="warning" class="mt-5">
            <b-checkbox id="official_nft" v-model="official_nft" value="accepted" :unchecked-value="false">
              This is an official NFT and I'd like to set a price for it.
            </b-checkbox>

            <div v-if="official_nft" class="mt-3">
              <b-form-group label="Price Per Edition *">
                <b-input-group :append="settings.official_nft_price_symbol">
                  <b-form-input
                    v-model="official_nft_price"
                    number
                    type="number"
                    autocomplete="off"
                    min="0"
                    :state="$v.official_nft_price.$dirty ? !$v.official_nft_price.$error : null"
                  />
                </b-input-group>
              </b-form-group>

              <div class="mt-3">
                There will be <strong>{{ editions }}</strong> editions of this official NFT priced <strong>{{ official_nft_price }} {{ settings.official_nft_price_symbol }}/edition</strong> totaling <strong>{{ toFixedWithoutRounding(editions * official_nft_price, settings.official_nft_price_symbol_precision) }} {{ settings.official_nft_price_symbol }}</strong>. <span class="text-danger">Please note that you won't be able to change any of this in future.</span>
              </div>
            </div>
          </b-alert>

          <div class="mt-4 h6">
            Total Issuance fee for {{ editions }} edition(s): {{ issuanceFee }} {{ settings.currency }}
          </div>

          <b-button class="mt-4" variant="primary" :disabled="accept_tos !== 'accepted' || accept_blist !== 'accepted' || model_release !== 'accepted' || accept_nsfw !== 'accepted' || accept_no_child !== 'accepted' || accept_content !== 'accepted' || accept_no_violance !== 'accepted' || accept_no_copy !== 'accepted' || currencyBalance < issuanceFee" @click.prevent="issueTokens">
            Mint Tokens
          </b-button>
        </b-card>
      </template>
    </template>
  </b-container>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import { required, numeric, maxLength, between, url } from 'vuelidate/lib/validators'
import getSlug from 'speakingurl'
import { toFixedWithoutRounding } from '@/utils'
import FileInput from '@/components/nftmarketplace/FileInput.vue'
import requiredIf from 'vuelidate/lib/validators/requiredIf'

export default {
  name: 'MintNFT',

  components: {
    FileInput
  },

  middleware: 'authenticated',

  data () {
    return {
      thumbnail: null,
      thumbnailSrc: '',
      thumbnailURL: '',
      thumbnailError: '',

      file: null,
      fileSrc: '',
      fileURL: '',
      fileError: '',

      name: '',
      collection: '',
      description: '',
      editions: 1,

      rights: null,
      rightsOptions: [
        { value: null, text: 'Select an option' },
        { value: 1, text: 'Private' },
        { value: 2, text: 'Limited Reproduction Rights' }
      ],

      nsfw: false,
      tags: [],

      tokenizing: 'audio',
      tokenizingOptions: [
        { text: 'Audio', value: 'audio' },
        { text: 'Image', value: 'image' },
        { text: 'Video', value: 'video' }
      ],

      selectedCollection: null,
      existingCollections: [],

      accept_tos: null,
      accept_blist: null,
      model_release: null,
      accept_nsfw: null,
      accept_no_copy: null,
      accept_no_child: null,
      accept_content: null,
      accept_no_violance: null,

      official_nft: false,
      official_nft_price: 1,

      currencyBalance: 0,

      uploading: false,
      progress: {
        thumbnail: 0,
        file: 0
      }
    }
  },

  async fetch () {
    this.loading = true

    await this.fetchUserInfo()

    if (this.isLoggedIn) {
      const [balance, collectibles] = await Promise.all([
        this.$sidechain.getBalance(this.$auth.user.username, this.settings.currency),
        this.$nftm.$get('collectibles/list', { params: { username: this.$auth.user.username } })
      ])

      this.currencyBalance = balance ? Number(balance.balance) : 0

      this.existingCollections = [{ value: null, text: 'Create new' }]

      if (collectibles.length > 0) {
        this.existingCollections.push(...Array.from(new Set(collectibles.map(a => a.collection_name))))
        this.existingSeries = Array.from(new Set(collectibles.map(a => a.series)))
      }
    }
    this.loading = false
  },

  computed: {
    ...mapGetters('nftmarketplace', ['settings', 'isLoggedIn', 'isWhitelisted', 'isAdmin']),

    username () {
      return this.$auth.user.username
    },

    nftName () {
      return `${this.username}_${getSlug(this.collection)}_${getSlug(this.name)}`.toLowerCase()
    },

    maxPossibleEditions () {
      return Math.floor((this.currencyBalance - this.settings.token_issuance_base_fee) / (this.settings.token_issuance_fee * 1))
    },

    issuanceFee () {
      if (this.official_nft) {
        return 0.01
      }

      return toFixedWithoutRounding(this.settings.token_issuance_base_fee + (this.settings.token_issuance_fee * this.editions), 3)
    },

    supportedFileTypes () {
      const supportedFileTypes = {
        audio: ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/x-pn-wav'],
        image: ['image/gif', 'image/png', 'image/jpeg'],
        video: ['video/mp4']
      }

      return supportedFileTypes[this.tokenizing].toString()
    },

    supportedThumbnailTypes () {
      const supportedFileTypes = {
        audio: ['image/gif', 'image/png', 'image/jpeg'],
        image: ['image/gif', 'image/png', 'image/jpeg'],
        video: ['video/mp4']
      }

      return supportedFileTypes[this.tokenizing].toString()
    }
  },

  watch: {
    async isLoggedIn (loggedIn) {
      if (loggedIn) {
        await this.$fetch()
      }
    },

    async thumbnail (value) {
      if (value) {
        this.thumbnailSrc = value.url
        await this.uploadFile(value.uploadedFile, 'thumbnail')
      }
    },

    async file (value) {
      if (value) {
        this.fileSrc = value.url
        await this.uploadFile(value.uploadedFile, 'file')
      }
    },

    tokenizing () {
      this.thumbnailURL = ''
      this.fileURL = ''

      this.thumbnail = null
      this.file = null

      this.thumbnailSrc = ''
      this.fileSrc = ''
    },

    selectedCollection (v) {
      this.collection = v
    },

    official_nft (v) {
      this.collection = v ? 'Official NFT' : ''
    }
  },

  mounted () {
    const self = this

    this.$eventBus.$on('nftmarketplace-mint-tokens-successful', async (data) => {
      self.thumbnail = null
      self.thumbnailSrc = ''
      self.thumbnailURL = ''
      self.thumbnailError = ''

      self.file = null
      self.fileSrc = ''
      self.fileURL = ''
      self.fileError = ''

      self.name = ''
      self.collection = ''
      self.description = ''
      self.category = null
      self.editions = 1
      self.rights = null
      self.nsfw = false
      self.tags = []

      self.selectedCollection = null

      self.accept_tos = null
      self.accept_blist = null
      self.model_release = null
      self.accept_nsfw = null
      self.accept_no_copy = null
      self.accept_no_child = null
      self.accept_content = null
      self.accept_no_violance = null

      self.official_nft = null
      self.official_nft_price = ''

      self.$v.$reset()

      self.loading = true

      await self.validateTokenIssuance(data.id)

      await self.$nuxt.refresh()
    })

    this.$eventBus.$once('nftmarketplace-mint-tokens-validated', ({ account, series }) => {
      try {
        self.$root.$bvModal.msgBoxOk('Congratulations, your content has been tokenized! Please visit your collection to list your NFT(s) for sale.', {
          title: 'Congratulations!',
          size: 'md',
          buttonSize: 'sm',
          okVariant: 'success',
          centered: true
        })
          .then((value) => {
            if (value) {
              self.$router.push({ name: 'user-collection-series', params: { user: account, series } })
            }
          })
      } catch (e) {
        console.log(e.message)
      }
    })

    this.$eventBus.$once('nftmarketplace-mint-tokens-not-validated', () => {
      try {
        self.$root.$bvModal.msgBoxOk('We weren\'t able to verify token issuance automatically. This doesn\'t mean token minting has failed. Please verify manually.', {
          title: 'Automatic verification failed!',
          size: 'md',
          buttonSize: 'sm',
          okVariant: 'warning',
          centered: true
        })
          .then((value) => {
            if (value) {
              self.$router.push({ name: 'user-collection', params: { user: self.$auth.user.username } })
            }
          })
      } catch (e) {
        console.log(e.message)
      }
    })
  },

  beforeDestroy () {
    this.$eventBus.$off(['nftmarketplace-mint-tokens-successful', 'nftmarketplace-mint-tokens-validated', 'nftmarketplace-mint-tokens-not-validated'])
  },

  methods: {
    ...mapActions('nftmarketplace', ['fetchUserInfo', 'requestLoginToMarketplace', 'requestMintTokens', 'validateTokenIssuance']),

    toFixedWithoutRounding,

    uploadFile (file, type) {
      const self = this
      this.uploading = true
      this[type === 'thumbnail' ? 'thumbnailError' : 'fileError'] = ''
      this.progress[type] = 0

      const reader = new FileReader()
      reader.readAsBinaryString(file)

      reader.onload = async () => {
        try {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('type', type)

          const config = {
            onUploadProgress (progressEvent) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)

              self.progress[type] = percentCompleted
            }
          }

          const { url } = await self.$nftm.$post('upload', formData, config)

          this[type === 'thumbnail' ? 'thumbnailURL' : 'fileURL'] = url
        } catch (e) {
          self[type] = null
          self.progress[type] = 0
          this[type === 'thumbnail' ? 'thumbnailError' : 'fileError'] = 'Upload has failed. Please try again.'

          console.log(e.message)
        }

        self.uploading = false
      }
    },

    issueTokens () {
      this.$v.$touch()

      if (!this.$v.$invalid) {
        const payload = {
          action: 'mint',
          name: this.name,
          collection: this.collection,
          rights: this.rights,
          editions: this.editions,
          nsfw: this.nsfw,
          type: this.tokenizing,
          thumbnail: this.thumbnailURL,
          file: this.fileURL,
          notes: this.notes,
          tags: this.tags,
          description: this.description
        }

        if (this.official_nft) {
          payload.official = true
          payload.price = this.official_nft_price
        }

        this.requestMintTokens({ fee: this.issuanceFee, payload })
      }
    },

    tagValidator (tag) {
      return tag === tag.toLowerCase() && tag.length > 1 && tag.length < 16 && /^[a-z0-9_-]*$/.test(tag)
    }
  },

  validations: {
    name: {
      required
    },

    collection: {
      required,
      maxLength: maxLength(100)
    },

    description: {
      required
    },

    rights: {
      required
    },

    editions: {
      required,
      numeric,
      between: between(1, 1000)
    },

    tags: {
      required
    },

    thumbnailURL: {
      required,
      url
    },

    fileURL: {
      required,
      url
    },

    official_nft_price: {
      greaterThanZero: (v) => {
        if (v === '') { return true }
        return v > 0
      },
      required: requiredIf(function () { return this.official_nft })
    }
  }
}
</script>

<style>

</style>
