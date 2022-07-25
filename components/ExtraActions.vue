<template>
  <div>
    <div class="d-flex align-items-center">
      <div class="mr-2">
        <b-dropdown variant="link" no-caret dropup>
          <template #button-content>
            <fa-icon icon="ellipsis-h" />
          </template>

          <b-dropdown-item-button v-if="$auth.loggedIn && $auth.user.username === author" @click.prevent="requestEditPost({author, permlink})">
            Edit
          </b-dropdown-item-button>

          <b-dropdown-item-button v-if="deletable && $auth.loggedIn && $auth.user.username === author" @click.prevent="requestBroadcastDelete({author, permlink, type: 'post'})">
            Delete
          </b-dropdown-item-button>

          <b-dropdown-item-button v-if="type === 'post'" @click.prevent="requestBroadcastReblog({author, permlink})">
            Reblog
          </b-dropdown-item-button>

          <b-dropdown-item-button v-if="type === 'post'" @click="$bvModal.show('promotePost')">
            Promote
          </b-dropdown-item-button>
        </b-dropdown>
      </div>
    </div>

    <promote :author="author" :permlink="permlink" />
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import { getEstimatedVoteValue } from '@/utils/scot'
import Promote from '@/components/modals/Promote.vue'

export default {
  name: 'ExtraActions',

  components: {
    Promote
  },

  props: {
    post: { type: Object, required: true }
  },

  data () {
    return {
      weight: 100,
      show: false,
      pending: false
    }
  },

  computed: {
    ...mapGetters(['tribe_config', 'tribe_info']),
    ...mapGetters('user', ['voting_power', 'scot_data']),

    id () {
      return `${this.author}-${this.permlink}`
    },

    voteValue () {
      return getEstimatedVoteValue({
        currentRshares: this.post.vote_rshares,
        userData: this.scot_data,
        vp: this.voting_power,
        weight: Number(this.weight),
        tribeConfig: this.tribe_config,
        tribeInfo: this.tribe_info
      })
    },

    type () {
      return this.post.main_post ? 'post' : 'comment'
    },

    author () {
      return this.post.author
    },

    permlink () {
      return this.post.permlink
    },

    deletable () {
      return this.post.vote_rshares <= 0 && this.post.children === 0
    },

    muted () {
      return this.post.muted
    }
  },

  methods: {
    ...mapActions('post', ['requestBroadcastReblog', 'requestEditPost', 'requestBroadcastDelete'])
  }
}
</script>

<style>

</style>
