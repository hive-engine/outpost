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
import { mapGetters } from 'vuex'
import { toFixedWithoutRounding } from '@/utils'

export default {
  name: 'Payout',

  props: {
    post: { type: Object, required: true }
  },

  computed: {
    ...mapGetters(['tribe_info']),

    cashoutTime () {
      return this.post.cashout_time ? new Date(`${this.post.cashout_time}Z`) : new Date()
    }
  },

  methods: {
    toFixedWithoutRounding
  }
}
</script>

<style>

</style>
