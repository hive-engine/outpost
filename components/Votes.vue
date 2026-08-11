<template>
  <div>
    <div class="d-flex align-items-center">
      <div class="d-flex align-items-center me-4">
        <button v-if="!isUpvoted" :id="`${id}-vote`" class="btn-vote btn-upvote" title="Upvote" :disabled="!auth.loggedIn">
          <fa-icon v-if="!pending" :icon="['far', 'heart']" />
          <fa-icon v-else icon="circle-notch" class="fa-spin" />
        </button>

        <button v-else class="btn-vote btn-upvote voted" title="Remove your upvote" @click.prevent="pending = true; requestBroadcastVote({author, permlink, weight: 0})">
          <fa-icon v-if="!pending" :icon="['fas', 'heart']" />
          <fa-icon v-else icon="circle-notch" class="fa-spin" />
        </button>

        <div :id="`${id}-upvotes`" class="cursor-pointer vote-count up">
          {{ upVotes.length }}
        </div>
      </div>

      <div class="d-flex align-items-center me-4">
        <button v-if="!isDownvoted" :id="`${id}-downvote`" class="btn-vote btn-downvote" title="Downvote" :disabled="!auth.loggedIn">
          <fa-icon v-if="!dvPending" :icon="['far', 'thumbs-down']" />
          <fa-icon v-else icon="circle-notch" class="fa-spin" />
        </button>

        <button v-else class="btn-vote btn-downvote voted" title="Remove your downvote" @click.prevent="dvPending = true; requestBroadcastVote({author, permlink, weight: 0})">
          <fa-icon v-if="!dvPending" :icon="['fas', 'thumbs-down']" />
          <fa-icon v-else icon="circle-notch" class="fa-spin" />
        </button>

        <div :id="`${id}-downvotes`" class="cursor-pointer vote-count down">
          {{ downVotes.length }}
        </div>
      </div>
    </div>

    <b-popover
      v-if="!isUpvoted"
      v-model="show"
      click
      placement="right"
      teleport-to="body"
      :target="`${id}-vote`"
      class="vote-weight-popover"
      @show="onPopoverShow"
    >
      <div class="d-flex align-items-center justify-content-between">
        <div class="me-2 w-75">
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
          Estimated vote value: {{ voteValue }} {{ config.TOKEN }}
        </div>
      </div>
    </b-popover>

    <b-popover
      v-if="!isDownvoted"
      v-model="dvShow"
      click
      placement="right"
      teleport-to="body"
      :target="`${id}-downvote`"
      class="vote-weight-popover"
      @show="onPopoverShow"
    >
      <div class="d-flex align-items-center justify-content-between">
        <div class="me-2 w-75">
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
          Estimated vote value: {{ downvoteValue }} {{ config.TOKEN }}
        </div>
      </div>
    </b-popover>

    <b-popover v-if="upVotes.length > 0" hover focus placement="bottom" teleport-to="body" :target="`${id}-upvotes`" class="votes-preview-popover">
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

    <b-popover v-if="downVotes.length > 0" hover focus placement="bottom" teleport-to="body" :target="`${id}-downvotes`" class="votes-preview-popover">
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
// Ported from legacy/components/Votes.vue (Options API kept).
// - b-popover: `:show.sync` → `v-model` (bootstrap-vue-next models visibility via
//   modelValue; there is no `show` prop), `triggers="click blur"` → `click` prop
//   (blur/outside-click auto-close is built in), `triggers="hover focus"` →
//   `hover focus` props, `custom-class` → `class`.
// - $auth.$storage.get/setUniversal (nuxt/auth universal storage) → localStorage
//   (only touched in client-only code paths: watchers + popover show).
// - $eventBus.$off now passes the stored handler so unmounting one Votes instance
//   no longer detaches every other instance's listener (legacy detached all).
// - Vuex: root getters → useTribeStore, user → useUserStore, post actions → usePostStore.
import { mapState, mapActions } from 'pinia'
import { getEstimatedVoteValue } from '@/utils/scot'
import { useAuthStore } from '~/stores/auth'
import { useTribeStore } from '~/stores/tribe'
import { useUserStore } from '~/stores/user'
import { usePostStore } from '~/stores/post'

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

  setup () {
    const config = useRuntimeConfig().public
    const auth = useAuthStore()

    return { config, auth }
  },

  data () {
    return {
      weight: 100,
      show: false,
      pending: false,
      dvWeight: 100,
      dvShow: false,
      dvPending: false,
      voteAckHandler: null
    }
  },

  computed: {
    ...mapState(useTribeStore, ['tribe_config', 'tribe_info']),
    ...mapState(useUserStore, ['voting_power', 'downvoting_power', 'scot_data']),

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

      if (this.auth.loggedIn) {
        voted = this.votes.find(v => v.voter === self.auth.user.username && v.percent > 0)
      }

      return voted
    },

    isDownvoted () {
      const self = this
      let voted = false

      if (this.auth.loggedIn) {
        voted = this.votes.find(v => v.voter === self.auth.user.username && v.percent < 0)
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
      if (this.auth.loggedIn) {
        return this.isComment ? `voteweight-${this.auth.user.username}-comment` : `voteweight-${this.auth.user.username}-post`
      }

      return ''
    },

    downvoteWeightKey () {
      if (this.auth.loggedIn) {
        return this.isComment ? `downvoteweight-${this.auth.user.username}-comment` : `downvoteweight-${this.auth.user.username}-post`
      }

      return ''
    }
  },

  watch: {
    weight (value, oldValue) {
      if (value !== oldValue && import.meta.client) {
        localStorage.setItem(this.voteWeightKey, value)
      }
    },

    dvWeight (value, oldValue) {
      if (value !== oldValue && import.meta.client) {
        localStorage.setItem(this.downvoteWeightKey, value)
      }
    }
  },

  mounted () {
    const self = this

    this.voteAckHandler = ({ author, permlink, data }) => {
      if (self.author === author && self.permlink === permlink) {
        self.pending = false
      } else if (data && self.author === data.author && self.permlink === data.permlink) {
        self.pending = false
      }
    }

    this.$eventBus.$on(['vote-acknowledgement', 'transaction-broadcast-error'], this.voteAckHandler)
  },

  beforeUnmount () {
    this.$eventBus.$off(['vote-acknowledgement', 'transaction-broadcast-error'], this.voteAckHandler)
  },

  methods: {
    ...mapActions(usePostStore, ['requestBroadcastVote']),

    applyRewardsCurve (rShares) {
      return ((Math.max(0, rShares) ** this.tribe_config.author_curve_exponent) * this.tribe_info.reward_pool) / this.tribe_info.pending_rshares
    },

    onPopoverShow () {
      this.weight = Number(localStorage.getItem(this.voteWeightKey)) || 100
      this.dvWeight = Number(localStorage.getItem(this.downvoteWeightKey)) || 100
    }
  }
}
</script>
