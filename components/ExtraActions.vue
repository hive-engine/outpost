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

          <b-dropdown-item-button v-if="$auth.loggedIn && type === 'post'" @click.prevent="showPromoteModal">
            Promote
          </b-dropdown-item-button>
        </b-dropdown>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import { getEstimatedVoteValue } from '@/utils/scot'

export default {
  name: 'ExtraActions',

  props: {
    post: { type: Object, required: true }
  },

  data () {
    return {
      weight: 100,
      show: false,
      pending: false,

      amount: '',
      balance: 0
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
    ...mapActions('post', ['requestBroadcastReblog', 'requestEditPost', 'requestBroadcastDelete', 'requestPromotePost']),

    async showPromoteModal () {
      try {
        const balance = await this.$sidechain.getBalance(this.$auth.user.username, this.$config.TOKEN)

        if (balance) {
          this.balance = Number(balance.balance)
        }

        const h = this.$createElement

        const titleVNode = h('div', { domProps: { innerHTML: 'Promote Post' } })

        const self = this

        const messageVNode = h('div', { class: [''] }, [
          h('p', { class: [] }, [`Burn ${this.$config.TOKEN} to advertize this post in the promoted contents section.`]),
          h('b-form-group', { class: ['mt-3'], props: { label: 'Post' } }, [
            h('b-form-input', { props: { readonly: true, value: this.authorperm } })
          ]),
          h('b-form-group', { class: ['mt-3'], props: { label: 'Balance' } }, [
            h('div',
              {
                class: ['d-inline-block ']
              },
              [`${this.balance} ${this.$config.TOKEN}`]
            )
          ]),
          h('b-form-group', { class: ['mt-3'], props: { label: 'Amount' } }, [
            h('b-input-group', { props: { append: this.$config.TOKEN } }, [
              h('b-form-input',
                {
                  props: { number: true, type: 'number', value: self.amount },
                  on: { input (value) { self.amount = value } }
                }
              )
            ])
          ])
        ])

        this.$bvModal.msgBoxConfirm([messageVNode], {
          title: [titleVNode],
          centered: true,
          size: 'md',
          hideHeaderClose: false,
          okTitle: 'Promote'
        }).then((value) => {
          if (value) {
            if (!this.amount || this.amount === '' || Number(this.amount) === 0) {
              return self.$notify({
                title: 'Error',
                type: 'error',
                text: 'Invalid promotion amount.'
              })
            }

            if (this.balance < this.amount) {
              return self.$notify({
                title: 'Error',
                type: 'error',
                text: 'You do not have enough balance.'
              })
            }

            this.requestPromotePost({ memo: this.authorperm, amount: this.amount })

            this.amount = ''
          }
        })
          .catch(error => console.log(error))
      } catch {
        //
      }
    }
  }
}
</script>

<style>

</style>
