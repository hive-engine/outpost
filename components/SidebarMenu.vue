<template>
  <b-offcanvas
    id="sidebar-menu"
    v-model="ui.modals.sidebarMenu"
    placement="end"
    class="sidebar-menu"
    backdrop
    no-header
  >
    <div class="sm-inner">
      <div class="sm-head">
        <span class="sm-title">Menu</span>
        <button class="sm-close" @click="ui.hideModal('sidebarMenu')">✕</button>
      </div>

      <!-- you card -->
      <div v-if="auth.loggedIn" class="sm-you">
        <img class="sm-you-avatar" :src="`https://images.hive.blog/u/${auth.user.username}/avatar`" alt="">
        <div class="sm-you-name">@{{ auth.user.username }}</div>
        <div class="sm-you-stats">
          <div><b class="mono">{{ balance }}</b><span>BBHO</span></div>
          <div><b class="mono">{{ vp }}%</b><span>Voting</span></div>
        </div>
        <div class="sm-vp"><div class="sm-vp-bar" :style="{ width: vp + '%' }" /></div>
      </div>

      <!-- nav -->
      <nav class="sm-nav">
        <NuxtLink class="sm-link" to="/" @click="close">🏠 <span>Home</span></NuxtLink>
        <NuxtLink class="sm-link" :to="{ name: 'sort', params: { sort: 'trending' } }" @click="close">🔥 <span>Trending</span></NuxtLink>
        <NuxtLink v-if="config.CHATS_ENABLED" class="sm-link" :to="{ name: 'chats' }" @click="close">💬 <span>Chats</span></NuxtLink>
        <NuxtLink class="sm-link" :to="{ name: 'shorts' }" @click="close">🎬 <span>Shorts</span></NuxtLink>
        <NuxtLink v-if="auth.loggedIn" class="sm-link" :to="{ name: 'notifications' }" @click="close">🔔 <span>Notifications</span><span v-if="notif.unreadCount" class="sm-badge">{{ notif.unreadCount > 99 ? '99+' : notif.unreadCount }}</span></NuxtLink>
        <NuxtLink v-if="auth.loggedIn" class="sm-link" :to="{ name: 'bookmarks' }" @click="close">🔖 <span>Bookmarks</span></NuxtLink>
        <NuxtLink v-if="auth.loggedIn" class="sm-link" :to="{ name: 'user-feed', params: { user: auth.user.username } }" @click="close">📰 <span>My feed</span></NuxtLink>
        <NuxtLink v-if="auth.loggedIn" class="sm-link" :to="{ name: 'user-wallet', params: { user: auth.user.username } }" @click="close">💰 <span>Wallet</span></NuxtLink>
        <NuxtLink v-if="auth.loggedIn && auth.user.username === tribe.issuer" class="sm-link" :to="{ name: 'dashboard' }" @click="close">📊 <span>Dashboard</span></NuxtLink>
      </nav>

      <!-- trending tags -->
      <div v-if="tags.length" class="sm-section">
        <div class="sm-section-title">Trending tags</div>
        <div class="sm-tags">
          <NuxtLink v-for="tag in tags" :key="tag" class="sm-tag" :to="{ name: 'sort-tag', params: { sort: 'trending', tag } }" @click="close">#{{ tag }}</NuxtLink>
        </div>
      </div>

      <div class="sm-section">
        <a class="sm-link" target="_blank" :href="`https://tribaldex.com/trade/${config.TOKEN}`">💱 <span>Trade {{ config.TOKEN }}</span></a>
      </div>
    </div>
  </b-offcanvas>
</template>

<script setup>
// Optional Web3-styled sidebar drawer (opened via the header ☰, closed by default).
// Community-Hub left-rail content: you-card, nav, trending tags.
import { useAuthStore } from '~/stores/auth'
import { useUserStore } from '~/stores/user'
import { useTribeStore } from '~/stores/tribe'
import { useScotStore } from '~/stores/scot'
import { useUiStore } from '~/stores/ui'
import { useNotificationsStore } from '~/stores/notifications'

const config = useRuntimeConfig().public
const auth = useAuthStore()
const notif = useNotificationsStore()
const userStore = useUserStore()
const tribe = useTribeStore()
const scot = useScotStore()
const ui = useUiStore()

const balance = computed(() => {
  const v = Number(userStore.scot_data?.staked_tokens || 0)
  return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0)
})
const vp = computed(() => Math.round((userStore.voting_power || 0) / 100))
const tags = computed(() => (scot.trending_tags || []).slice(0, 10))

const close = () => ui.hideModal('sidebarMenu')
</script>

<style scoped>
.sm-inner { display: flex; flex-direction: column; height: 100%; padding: 1.1rem; }
.sm-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.2rem; }
.sm-title { font-weight: 700; font-size: 1.1rem; }
.sm-close { background: none; border: 0; color: var(--w3-muted); font-size: 1.1rem; cursor: pointer; }
.sm-close:hover { color: var(--w3-text); }

.sm-you { text-align: center; padding: 1.1rem; background: var(--w3-panel); border: 1px solid var(--w3-border); border-radius: 16px; margin-bottom: 1.1rem; }
.sm-you-avatar { width: 60px; height: 60px; border-radius: 50%; border: 2px solid var(--w3-gold); }
.sm-you-name { font-weight: 700; margin-top: .5rem; }
.sm-you-stats { display: flex; justify-content: center; gap: 1.6rem; margin: .7rem 0 .6rem; }
.sm-you-stats b { display: block; font-size: 1.1rem; color: var(--w3-gold); }
.sm-you-stats span { font-size: .7rem; color: var(--w3-muted); }
.sm-vp { height: 6px; background: rgba(255,255,255,.08); border-radius: 999px; overflow: hidden; }
.sm-vp-bar { height: 100%; background: linear-gradient(90deg, var(--w3-gold), var(--w3-red)); }

.sm-nav { display: flex; flex-direction: column; gap: .2rem; margin-bottom: 1.1rem; }
.sm-link { display: flex; align-items: center; gap: .7rem; padding: .65rem .8rem; border-radius: 10px; text-decoration: none; color: var(--w3-text) !important; font-weight: 600; font-size: .95rem; }
.sm-badge { margin-left: auto; background: var(--w3-red, #ff5964); color: #fff; font-size: .68rem; font-weight: 800; line-height: 1; padding: .18rem .4rem; border-radius: 999px; }
.sm-link:hover { background: var(--w3-panel-2); color: var(--w3-gold) !important; }

.sm-section { margin-bottom: 1.1rem; }
.sm-section-title { font-size: .78rem; letter-spacing: .1em; text-transform: uppercase; color: var(--w3-muted); margin-bottom: .6rem; }
.sm-tags { display: flex; flex-wrap: wrap; gap: .4rem; }
.sm-tag { padding: .3rem .7rem; background: var(--w3-panel); border: 1px solid var(--w3-border); border-radius: 999px; font-size: .8rem; font-weight: 600; color: var(--w3-gold) !important; text-decoration: none; }
.sm-tag:hover { border-color: rgba(245,184,0,.5); }

.sm-foot { margin-top: auto; }
.sm-toggle { width: 100%; border: 1px solid var(--w3-border); background: var(--w3-panel); color: var(--w3-text); border-radius: 10px; padding: .6rem; font-weight: 600; cursor: pointer; }
.sm-toggle:hover { background: var(--w3-panel-2); }
</style>
