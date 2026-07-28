<template>
  <div>
    <div class="d-flex align-items-center">
      <div class="me-2">
        <b-dropdown variant="link" no-caret dropup>
          <template #button-content>
            <fa-icon icon="ellipsis-h" />
          </template>

          <b-dropdown-item-button v-if="loggedIn && user.username === author" @click.prevent="requestEditPost({author, permlink})">
            Edit
          </b-dropdown-item-button>

          <b-dropdown-item-button v-if="deletable && loggedIn && user.username === author" @click.prevent="requestBroadcastDelete({author, permlink, type: 'post'})">
            Delete
          </b-dropdown-item-button>

          <b-dropdown-item-button v-if="type === 'post'" @click.prevent="requestBroadcastReblog({author, permlink})">
            Reblog
          </b-dropdown-item-button>

          <b-dropdown-item-button v-if="config.PROMOTE_ENABLED && loggedIn && type === 'post'" @click.prevent="showPromoteModal">
            Promote
          </b-dropdown-item-button>
        </b-dropdown>
      </div>
    </div>

    <!-- Replaces the legacy $bvModal.msgBoxConfirm + $createElement VNode message
         (render-function API removed in Vue 3 / bootstrap-vue-next). -->
    <b-modal v-model="promoteModalVisible" title="Promote Post" centered size="md" ok-title="Promote" @ok="promotePost">
      <p>Burn {{ config.TOKEN }} to advertize this post in the promoted contents section.</p>

      <b-form-group class="mt-3" label="Post">
        <b-form-input readonly :model-value="authorperm" />
      </b-form-group>

      <b-form-group class="mt-3" label="Balance">
        <div class="d-inline-block">
          {{ balance }} {{ config.TOKEN }}
        </div>
      </b-form-group>

      <b-form-group class="mt-3" label="Amount">
        <b-input-group :append="config.TOKEN">
          <b-form-input v-model.number="amount" type="number" />
        </b-input-group>
      </b-form-group>
    </b-modal>
  </div>
</template>

<script>
// Ported from legacy/components/ExtraActions.vue (Options API kept).
// Vuex → Pinia (post → usePostStore, auth → useAuthStore); $config → useRuntimeConfig;
// mr-* → me-* (BS5). The unused `voteValue` computed (and its weight/show/pending data,
// user/root store getters and utils/scot import) was dead code in the legacy component
// and is dropped — nothing in the template referenced it.
import { mapState, mapActions } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { usePostStore } from '~/stores/post'

export default {
  name: 'ExtraActions',

  props: {
    post: { type: Object, required: true }
  },

  data () {
    return {
      promoteModalVisible: false,
      amount: '',
      balance: 0
    }
  },

  computed: {
    ...mapState(useAuthStore, ['loggedIn', 'user']),

    config () {
      return useRuntimeConfig().public
    },

    id () {
      return `${this.author}-${this.permlink}`
    },

    type () {
      // Feed posts (SCOT) carry `main_post`; the single-post view fetches via
      // hivemind get_discussion, which doesn't — fall back to depth/parent_author
      // so Reblog and the other post actions show on the post page too.
      if (this.post.main_post !== undefined) {
        return this.post.main_post ? 'post' : 'comment'
      }

      return (this.post.depth > 0 || this.post.parent_author) ? 'comment' : 'post'
    },

    author () {
      return this.post.author
    },

    permlink () {
      return this.post.permlink
    },

    authorperm () {
      return `@${this.author}/${this.permlink}`
    },

    deletable () {
      return this.post.vote_rshares <= 0 && this.post.children === 0
    },

    muted () {
      return this.post.muted
    }
  },

  methods: {
    ...mapActions(usePostStore, ['requestBroadcastReblog', 'requestEditPost', 'requestBroadcastDelete', 'requestPromotePost']),

    async showPromoteModal () {
      try {
        const balance = await this.$sidechain.getBalance(this.user.username, this.config.TOKEN)

        if (balance) {
          this.balance = Number(balance.balance)
        }

        this.promoteModalVisible = true
      } catch {
        //
      }
    },

    promotePost () {
      if (!this.amount || this.amount === '' || Number(this.amount) === 0) {
        return this.$notify({
          title: 'Error',
          type: 'error',
          text: 'Invalid promotion amount.'
        })
      }

      if (this.balance < this.amount) {
        return this.$notify({
          title: 'Error',
          type: 'error',
          text: 'You do not have enough balance.'
        })
      }

      this.requestPromotePost({ memo: this.authorperm, amount: this.amount })

      this.amount = ''
    }
  }
}
</script>
