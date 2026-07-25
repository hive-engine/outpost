<template>
  <div class="cursor-pointer">
    <div :id="`${post.author}-${post.permlink}-estimated-payout-value`" class="text-nowrap text-truncate">
      {{ post.estimated_payout_value.toFixed(3) }} {{ post.token }}
    </div>

    <b-tooltip :target="`${post.author}-${post.permlink}-estimated-payout-value`" placement="bottom">
      <template v-if="Date.now() <= cashoutTime.getTime()">
        Pending Payout {{ post.estimated_payout_value }} {{ post.token }}<br> <timeago :datetime="cashoutTime" />
      </template>

      <template v-else>
        Past Payouts {{ post.estimated_payout_value }} {{ post.token }}<br>

        Author: {{ toFixedWithoutRounding(post.estimated_payout_value - post.curator_payout_value, tribe_info.precision) }} {{ post.token }}<br>
        Curator: {{ post.curator_payout_value }} {{ post.token }}
      </template>
    </b-tooltip>
  </div>
</template>

<script>
// Ported from legacy/components/Payout.vue.
// Vuex root mapGetters(['tribe_info']) → Pinia mapState(useTribeStore).
// <timeago> global component (vue-timeago) → local Timeago drop-in.
import { mapState } from 'pinia'
import { toFixedWithoutRounding } from '@/utils'
import { useTribeStore } from '~/stores/tribe'
import Timeago from '~/components/app/Timeago.vue'

export default {
  name: 'Payout',

  components: {
    Timeago
  },

  props: {
    post: { type: Object, required: true }
  },

  computed: {
    ...mapState(useTribeStore, ['tribe_info']),

    cashoutTime () {
      return this.post.cashout_time ? new Date(`${this.post.cashout_time}Z`) : new Date()
    }
  },

  methods: {
    toFixedWithoutRounding
  }
}
</script>
