<template>
  <div>
    <div class="d-flex align-items-center">
      <div class="d-flex align-items-center mr-4">
        <button v-if="!isUpvoted" :id="`${id}-vote`" class="btn-vote" :disabled="!$auth.loggedIn">
          <fa-icon v-if="!pending" icon="heart" />
          <fa-icon v-else icon="circle-notch" class="fa-spin" />
        </button>

        <button v-else class="btn-vote" @click.prevent="requestBroadcastVote({author, permlink, weight: 0})">
          <fa-icon icon="heart" class="text-info" />
        </button>

        <div :id="`${id}-upvotes`" class="cursor-pointer">
          {{ upVotes.length }}
        </div>
      </div>

      <div class="d-flex align-items-center mr-4">
        <button v-if="!isDownvoted" :id="`${id}-downvote`" class="btn-vote" :disabled="!$auth.loggedIn">
          <fa-icon v-if="!dvPending" icon="heart-broken" />
          <fa-icon v-else icon="circle-notch" class="fa-spin" />
        </button>

        <button v-else class="btn-vote" @click.prevent="requestBroadcastVote({author, permlink, weight: 0})">
          <fa-icon icon="heart-broken" class="text-danger" />
        </button>

        <div :id="`${id}-downvotes`" class="cursor-pointer">
          {{ downVotes.length }}
        </div>
      </div>
    </div>

    <b-popover
      v-if="!isUpvoted"
      :show.sync="show"
      triggers="click blur"
      placement="right"
      :target="`${id}-vote`"
      custom-class="vote-weight-popover"
      @show="onPopoverShow"
    >
      <div class="d-flex align-items-center justify-content-between">
        <div class="mr-2 w-75">
          <b-form-input
            v-model="weight"
            debounce="100"
            number
            type="range"
            min="0"
            max="100"
            step="1"
          />
        </div>
        <div>{{ weight }}%</div>

        <a class="cursor-pointer" @click.prevent="show = !show"><fa-icon icon="times" /></a>
      </div>

      <div class="text-center">
        <b-button variant="primary" size="sm" @click.prevent="pending = true; requestBroadcastVote({author, permlink, weight})">
          Vote
        </b-button>

        <div class="mt-2">
          Estimated vote value: {{ voteValue }} {{ $config.TOKEN }}
        </div>
      </div>
    </b-popover>

    <b-popover
      v-if="!isDownvoted"
      :show.sync="dvShow"
      triggers="click blur"
      placement="right"
      :target="`${id}-downvote`"
      custom-class="vote-weight-popover"
      @show="onPopoverShow"
    >
      <div class="d-flex align-items-center justify-content-between">
        <div class="mr-2 w-75">
          <b-form-input
            v-model="dvWeight"
            debounce="100"
            number
            type="range"
            min="0"
            max="100"
            step="1"
          />
        </div>
        <div>-{{ dvWeight }}%</div>

        <a class="cursor-pointer" @click.prevent="dvShow = !dvShow"><fa-icon icon="times" /></a>
      </div>

      <div class="text-center">
        <b-button variant="danger" size="sm" @click.prevent="dvPending = true; requestBroadcastVote({author, permlink, weight: -dvWeight})">
          Downvote
        </b-button>

        <div class="mt-2">
          Estimated vote value: {{ downvoteValue }} {{ $config.TOKEN }}
        </div>
      </div>
    </b-popover>

    <b-popover v-if="upVotes.length > 0" triggers="hover focus" placement="bottom" :target="`${id}-upvotes`" custom-class="votes-preview-popover">
      <template #title>
        Vote values
      </template>

      <ul>
        <li v-for="(vote,i) of upVotes.slice(0, 15)" :key="i">
          <nuxt-link :to="{name:'user', params: {user: vote.voter}}">
            {{ vote.voter }}
          </nuxt-link>: {{ vote.estimated_value }}
        </li>
      </ul>

      <template v-if="upVotes.length > 15">
        and {{ upVotes.length - 15 }} more
      </template>
    </b-popover>

    <b-popover v-if="downVotes.length > 0" triggers="hover focus" placement="bottom" :target="`${id}-downvotes`" custom-class="votes-preview-popover">
      <template #title>
        Vote values
      </template>

      <ul>
        <li v-for="(vote,i) of downVotes.slice(0, 15)" :key="i">
          <nuxt-link :to="{name:'user', params: {user: vote.voter}}">
            {{ vote.voter }}
          </nuxt-link>: {{ vote.estimated_value }}
        </li>
      </ul>
      <template v-if="downVotes.length > 15">
        and {{ downVotes.length - 15 }} more
      </template>
    </b-popover>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import { getEstimatedVoteValue } from '@/utils/scot'

export default {
  name: 'Votes',

  props: {
    author: { type: String, required: true },
    permlink: { type: String, required: true },
    activeVotes: { type: Array, required: true },
    rshares: { type: Number, required: true },
    payout: { type: Number, required: true },
    isComment: { type: Boolean, default: false }
  },

  data () {
    return {
      weight: 100,
      show: false,
      pending: false,
      dvWeight: 100,
      dvShow: false,
      dvPending: false
    }
  },

  computed: {
    ...mapGetters(['tribe_config', 'tribe_info']),
    ...mapGetters('user', ['voting_power', 'downvoting_power', 'scot_data']),

    votes () {
      const votes = this.activeVotes
      const rsharesTotal = this.rshares
      const payout = this.payout || this.applyRewardsCurve(rsharesTotal)

      let currRshares = 0

      const pot = payout
      const denom = Math.abs(this.applyRewardsCurve(rsharesTotal))

      for (let i = 0; i < votes.length; i++) {
        const vote = votes[i]
        vote.estimated_value = (
          pot * (this.applyRewardsCurve(currRshares + Math.abs(vote.rshares)) - this.applyRewardsCurve(currRshares)) / denom
        ).toFixed(this.tribe_info.precision)

        currRshares += Math.abs(vote.rshares)
      }

      return votes.sort((a, b) => b.estimated_value - a.estimated_value)
    },

    isUpvoted () {
      const self = this
      let voted = false

      if (this.$auth.loggedIn) {
        voted = this.votes.find(v => v.voter === self.$auth.user.username && v.percent > 0)
      }

      return voted
    },

    isDownvoted () {
      const self = this
      let voted = false

      if (this.$auth.loggedIn) {
        voted = this.votes.find(v => v.voter === self.$auth.user.username && v.percent < 0)
      }

      return voted
    },

    id () {
      return `${this.author}-${this.permlink}`
    },

    upVotes () {
      return this.votes.filter(v => v.percent > 0)
    },

    downVotes () {
      return this.votes.filter(v => v.percent < 0).sort((a, b) => a.rshares - b.rshares)
    },

    voteValue () {
      return getEstimatedVoteValue({
        currentRshares: this.rshares,
        userData: this.scot_data,
        vp: this.voting_power,
        weight: Number(this.weight),
        tribeConfig: this.tribe_config,
        tribeInfo: this.tribe_info
      })
    },

    downvoteValue () {
      return getEstimatedVoteValue({
        currentRshares: this.rshares,
        userData: this.scot_data,
        vp: this.downvoting_power,
        weight: Number(this.dvWeight),
        tribeConfig: this.tribe_config,
        tribeInfo: this.tribe_info
      })
    },

    voteWeightKey () {
      if (this.$auth.loggedIn) {
        return this.isComment ? `voteweight-${this.$auth.user.username}-comment` : `voteweight-${this.$auth.user.username}-post`
      }

      return ''
    },

    downvoteWeightKey () {
      if (this.$auth.loggedIn) {
        return this.isComment ? `downvoteweight-${this.$auth.user.username}-comment` : `downvoteweight-${this.$auth.user.username}-post`
      }

      return ''
    }
  },

  watch: {
    weight (value, oldValue) {
      if (value !== oldValue) {
        this.$auth.$storage.setUniversal(this.voteWeightKey, value)
      }
    },

    dvWeight (value, oldValue) {
      if (value !== oldValue) {
        this.$auth.$storage.setUniversal(this.downvoteWeightKey, value)
      }
    }
  },

  mounted () {
    const self = this

    this.$eventBus.$on(['vote-acknowledgement', 'transaction-broadcast-error'], ({ author, permlink, data }) => {
      if (self.author === author && self.permlink === permlink) {
        self.pending = false
      } else if (data && self.author === data.author && self.permlink === data.permlink) {
        self.pending = false
      }
    })
  },

  beforeDestroy () {
    this.$eventBus.$off(['vote-acknowledgement', 'transaction-broadcast-error'])
  },

  methods: {
    ...mapActions('post', ['requestBroadcastVote']),

    applyRewardsCurve (rShares) {
      return ((Math.max(0, rShares) ** this.tribe_config.author_curve_exponent) * this.tribe_info.reward_pool) / this.tribe_info.pending_rshares
    },

    onPopoverShow () {
      this.weight = this.$auth.$storage.getUniversal(this.voteWeightKey) || 100
      this.dvWeight = this.$auth.$storage.getUniversal(this.downvoteWeightKey) || 100
    }
  }
}
</script>

<style>

</style>
