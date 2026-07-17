import DiffMatchPatch from 'diff-match-patch'
import { APP, IS_HIVE, APP_DOMAIN, ADD_COMMEMT_FOOTER, COMMENT_FOOTER } from '@/config'
import { toFixedWithoutRounding } from '@/utils'

const DMP = new DiffMatchPatch()

const createPatch = (oldText, newText) => {
  if (!oldText && oldText === '') { return undefined }

  const patchMake = DMP.patch_make(oldText, newText)

  const patch = DMP.patch_toText(patchMake)
  return patch
}

export const state = () => {
  return {
    posts: [],
    post: null
  }
}

export const getters = {
  posts: state => state.posts,
  post: state => state.post
}

export const mutations = {
  SET_POSTS (state, data) {
    state.posts = data
  },

  SET_POST (state, data) {
    state.post = data
  }
}

export const actions = {
  requestBroadcastPost ({ state, dispatch }, payload) {
    const author = this.$auth.user.username

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
      const patch = createPatch(state.post.body, body)

      if (patch && patch.length < new Blob([state.post.body]).size) {
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

    dispatch('requestBroadcastOps', { operations, emitEvent, emitData }, { root: true })
  },

  requestBroadcastVote ({ dispatch }, { author, permlink, weight, type = 'post' }) {
    const operations = [['vote', {
      voter: this.$auth.user.username,
      author,
      permlink,
      weight: Math.min(weight * 100, 10000)
    }]]

    const emitEvent = weight > 0 ? 'upvote-successful' : weight < 0 ? 'downvote-successful' : 'unvote-successful'
    const emitData = { author, permlink, weight, type }

    dispatch('requestBroadcastOps', { operations, emitEvent, emitData }, { root: true })
  },

  async requestBroadcastReblog ({ dispatch }, { author, permlink }) {
    try {
      await dispatch('showConfirmation', {
        title: `Reblog this post by @${author}?`,
        message: 'The post will appear on your blog and personal feed. This action cannot be undone.',
        okText: 'Yes',
        cancelText: 'Cancel'
      }, { root: true })

      const operations = [['custom_json', {
        required_auths: [],
        required_posting_auths: [this.$auth.user.username],
        id: 'reblog',
        json: JSON.stringify(['reblog', { account: this.$auth.user.username, author, permlink }])
      }]]

      const emitData = { author, permlink }

      dispatch('requestBroadcastOps', { operations, emitEvent: 'post-reblog-successful', emitData }, { root: true })
    } catch {
    //
    }
  },

  requestBroadcastDelete ({ dispatch }, { author, permlink, type = 'comment' }) {
    const operations = [['delete_comment', {
      author,
      permlink
    }]]

    const emitEvent = type === 'post' ? 'post-delete-successful' : 'comment-delete-successful'
    const emitData = { author, permlink, type }

    dispatch('requestBroadcastOps', { operations, emitEvent, emitData }, { root: true })
  },

  requestPromotePost ({ dispatch, rootState }, { amount, memo }) {
    const operations = [['custom_json', {
      required_auths: [this.$auth.user.username],
      required_posting_auths: [],
      id: this.$config.SIDECHAIN_ID,
      json: JSON.stringify({
        contractName: 'tokens',
        contractAction: 'transfer',
        contractPayload: {
          symbol: this.$config.TOKEN,
          to: 'null',
          quantity: toFixedWithoutRounding(amount, rootState.tribe_info.precision).toString(),
          memo
        }
      })
    }]]

    const emitData = { memo, amount }

    dispatch('requestBroadcastOps', { operations, emitEvent: 'post-promotion-successful', emitData, keyType: 'Active' }, { root: true })
  },

  async requestEditPost ({ commit }, { author, permlink }) {
    try {
      const content = await this.$chain.client.hivemind.call('get_post', { author, permlink })

      commit('SET_POST', content)

      this.$router.push({ name: 'publish', query: { edit: true } })
    } catch (e) {
      console.log(e.message)
    }
  }
}
