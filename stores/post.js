// Ported from legacy/store/post.js (Vuex module) → Pinia 'post' store.
import DiffMatchPatch from 'diff-match-patch'
import { defineStore } from 'pinia'
import { APP, IS_HIVE, APP_DOMAIN, ADD_COMMEMT_FOOTER, COMMENT_FOOTER } from '~/config'
import { toFixedWithoutRounding } from '~/utils'
import { useAuthStore } from '~/stores/auth'
import { useTribeStore } from '~/stores/tribe'

const DMP = new DiffMatchPatch()

const createPatch = (oldText, newText) => {
  if (!oldText && oldText === '') { return undefined }

  const patchMake = DMP.patch_make(oldText, newText)

  const patch = DMP.patch_toText(patchMake)
  return patch
}

export const usePostStore = defineStore('post', {
  state: () => {
    return {
      posts: [],
      post: null
    }
  },

  // Legacy mirror getters (posts, post) dropped — in Pinia a getter can't share a name
  // with a state property; state is accessed directly instead.

  actions: {
    SET_POSTS (data) {
      this.posts = data
    },

    SET_POST (data) {
      this.post = data
    },

    requestBroadcastPost (payload) {
      const author = useAuthStore().user.username

      const {
        title,
        permlink,
        metadata,
        payout_type: payoutType,
        post_type: postType,
        edit
      } = payload

      const parentPermlink = postType === 'post' ? metadata.tags[0] : payload.parent_permlink
      const parentAuthor = postType === 'post' ? '' : payload.parent_author

      let body = payload.body

      if (edit && postType === 'post') {
        const patch = createPatch(this.post.body, body)

        if (patch && patch.length < new Blob([this.post.body]).size) {
          body = patch
        }
      }

      const extensions = []
      let beneficiaries = payload.beneficiaries || []

      if (payoutType === 'burn') {
        beneficiaries = [{ account: 'null', weight: 10000 }]
      }

      if (beneficiaries.length > 0) {
        beneficiaries = beneficiaries.slice().sort((a, b) => a.account.localeCompare(b))

        extensions.push([0, { beneficiaries: JSON.parse(JSON.stringify(beneficiaries)) }])
      }

      metadata.canonical_url = `${APP_DOMAIN}/@${author}/${permlink}`
      metadata.app = APP

      if (!edit && ADD_COMMEMT_FOOTER) {
        body += `\n\n${COMMENT_FOOTER.replace('%post_url%', metadata.canonical_url)}`
      }

      const comment = {
        parent_author: parentAuthor,
        parent_permlink: parentPermlink,
        author,
        permlink,
        title,
        body,
        json_metadata: JSON.stringify(metadata)
      }

      const commentOptions = {
        author,
        permlink,
        allow_votes: true,
        allow_curation_rewards: true,
        max_accepted_payout: `${payoutType === 'decline' ? '0' : '1000000.000'} ${IS_HIVE ? 'HBD' : 'SBD'}`,
        percent_hbd: payoutType === 'powerup' ? 0 : 10000,
        extensions
      }

      const operations = [['comment', comment]]

      if (!edit && (beneficiaries.length > 0 || ['decline', 'powerup'].includes(payoutType))) {
        operations.push(['comment_options', commentOptions])
      }

      const emitEvent = (postType === 'post') ? `post-${edit ? 'edit' : 'publish'}-successful` : `comment-${edit ? 'edit' : 'publish'}-successful`

      const emitData = { author, permlink, body, parent_author: parentAuthor, parent_permlink: parentPermlink, post_type: postType, json_metadata: metadata, edit }

      useTribeStore().requestBroadcastOps({ operations, emitEvent, emitData })
    },

    requestBroadcastVote ({ author, permlink, weight, type = 'post' }) {
      const operations = [['vote', {
        voter: useAuthStore().user.username,
        author,
        permlink,
        weight: Math.min(weight * 100, 10000)
      }]]

      const emitEvent = weight > 0 ? 'upvote-successful' : weight < 0 ? 'downvote-successful' : 'unvote-successful'
      const emitData = { author, permlink, weight, type }

      useTribeStore().requestBroadcastOps({ operations, emitEvent, emitData })
    },

    async requestBroadcastReblog ({ author, permlink }) {
      const authStore = useAuthStore()
      const tribeStore = useTribeStore()

      try {
        await tribeStore.showConfirmation({
          title: `Reblog this post by @${author}?`,
          message: 'The post will appear on your blog and personal feed. This action cannot be undone.',
          okText: 'Yes',
          cancelText: 'Cancel'
        })

        const operations = [['custom_json', {
          required_auths: [],
          required_posting_auths: [authStore.user.username],
          id: 'reblog',
          json: JSON.stringify(['reblog', { account: authStore.user.username, author, permlink }])
        }]]

        const emitData = { author, permlink }

        tribeStore.requestBroadcastOps({ operations, emitEvent: 'post-reblog-successful', emitData })
      } catch {
      //
      }
    },

    requestBroadcastDelete ({ author, permlink, type = 'comment' }) {
      const operations = [['delete_comment', {
        author,
        permlink
      }]]

      const emitEvent = type === 'post' ? 'post-delete-successful' : 'comment-delete-successful'
      const emitData = { author, permlink, type }

      useTribeStore().requestBroadcastOps({ operations, emitEvent, emitData })
    },

    requestPromotePost ({ amount, memo }) {
      const config = useRuntimeConfig().public
      const tribeStore = useTribeStore()

      const operations = [['custom_json', {
        required_auths: [useAuthStore().user.username],
        required_posting_auths: [],
        id: config.SIDECHAIN_ID,
        json: JSON.stringify({
          contractName: 'tokens',
          contractAction: 'transfer',
          contractPayload: {
            symbol: config.TOKEN,
            to: 'null',
            quantity: toFixedWithoutRounding(amount, tribeStore.tribe_info.precision).toString(),
            memo
          }
        })
      }]]

      const emitData = { memo, amount }

      tribeStore.requestBroadcastOps({ operations, emitEvent: 'post-promotion-successful', emitData, keyType: 'Active' })
    },

    async requestEditPost ({ author, permlink }) {
      const { $chain } = useNuxtApp()

      try {
        const content = await $chain.client.hivemind.call('get_post', { author, permlink })

        this.SET_POST(content)

        navigateTo({ name: 'publish', query: { edit: true } })
      } catch (e) {
        console.log(e.message)
      }
    }
  }
})
