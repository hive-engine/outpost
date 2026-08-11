<template>
  <div class="bee-invaders">
    <div class="bi-stage" ref="stage">
      <canvas ref="canvas" class="bi-canvas" @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp" @pointerleave="onPointerUp" />

      <!-- HUD -->
      <div class="bi-hud">
        <div class="bi-hud-l">
          <span class="bi-score mono">{{ score.toLocaleString() }}</span>
          <span class="bi-wave">Wave {{ wave }}</span>
        </div>
        <div class="bi-hud-r">
          <span class="bi-lives"><span v-for="n in lives" :key="n">🐝</span></span>
        </div>
      </div>

      <!-- ready overlay -->
      <div v-if="state === 'ready'" class="bi-overlay">
        <div class="bi-title">🐝 Bee Invaders</div>
        <p class="bi-sub">Defend the hive from the swarm of pests!</p>

        <template v-if="entryState === 'paying'">
          <div class="bi-save muted">Confirm the {{ rankedCostLabel }} entry in your wallet…</div>
        </template>
        <template v-else>
          <button class="bi-btn" @click="startFree">▶ Free play</button>
          <p class="bi-hint">Unlimited &amp; always free — just for fun</p>
          <button v-if="loggedIn && cfg" class="bi-btn ghost" @click="startRanked">🏆 Ranked — {{ rankedCostLabel }}</button>
          <p v-if="loggedIn && cfg" class="bi-hint">Compete for the weekly {{ cfg.symbol }} pot · 1 free entry/day{{ cfg.stakerPerkMinStake ? ` (+1 if you stake ${cfg.stakerPerkMinStake}+)` : '' }}</p>
          <p v-if="loggedIn && cfg && freeLeft !== null" class="bi-hint bi-free">🎟️ {{ freeLeft > 0 ? `${freeLeft} free ranked game${freeLeft === 1 ? '' : 's'} left today` : `No free games left — next ranked costs ${rankedCostLabel}` }}</p>
          <p v-else-if="cfg" class="bi-hint">Log in to play Ranked ({{ rankedCostLabel }}) &amp; win the weekly {{ cfg.symbol }} pot.</p>
          <div v-if="entryState === 'error'" class="bi-save err">{{ entryError }}</div>
        </template>

        <p class="bi-hint">Drag / arrow keys to move · auto-fire · <kbd>P</kbd> to pause</p>
        <p v-if="bestLocal" class="bi-best">Your best: <b class="mono">{{ bestLocal.toLocaleString() }}</b></p>
      </div>

      <!-- paused overlay -->
      <div v-else-if="state === 'paused'" class="bi-overlay">
        <div class="bi-title small">Paused</div>
        <button class="bi-btn" @click="resume">▶ Resume</button>
      </div>

      <!-- continue overlay (burn-to-continue) -->
      <div v-else-if="state === 'continue'" class="bi-overlay">
        <div class="bi-title small">🐝 Out of lives!</div>
        <p class="bi-final">Score <b class="mono">{{ score.toLocaleString() }}</b> · Wave {{ wave }}</p>
        <template v-if="continueState === 'paying'">
          <div class="bi-save muted">Confirm {{ cfg.continueFee }} {{ cfg.symbol }} in your wallet…</div>
        </template>
        <template v-else>
          <button class="bi-btn" @click="continueRun">🔥 Continue — burn {{ cfg.continueFee }} {{ cfg.symbol }}</button>
          <button class="bi-btn ghost" @click="endFromContinue">End run</button>
          <div v-if="continueState === 'error'" class="bi-save err">Payment failed — try again or end the run.</div>
        </template>
      </div>

      <!-- game over overlay -->
      <div v-else-if="state === 'over'" class="bi-overlay">
        <div class="bi-title small">{{ breached ? '🍯 Hive breached!' : 'Game over' }}</div>
        <p class="bi-final">Score <b class="mono">{{ score.toLocaleString() }}</b> · Wave {{ wave }}</p>
        <p v-if="score >= bestLocal" class="bi-new">🏅 New personal best!</p>

        <div v-if="submitState === 'saving'" class="bi-save muted">Saving score…</div>
        <div v-else-if="submitState === 'saved'" class="bi-save ok">✓ Saved to the {{ mode === 'ranked' ? 'weekly Ranked' : '' }} leaderboard{{ submittedRank ? ` — rank #${submittedRank}` : '' }}</div>
        <div v-else-if="submitState === 'error'" class="bi-save err">Couldn't save score. <a href="#" @click.prevent="submitScore">Retry</a></div>
        <div v-else-if="!loggedIn" class="bi-save muted">Log in to save your score to the leaderboard.</div>

        <button class="bi-btn" @click="backToMenu">↻ Play again</button>
      </div>
    </div>
  </div>
</template>

<script>
// Bee Invaders — a dependency-free canvas arcade game (Space-Invaders-with-bees).
// You pilot a bee defending the hive; waves of pests descend and you auto-fire
// pollen at them. Pure imperative sim kept off Vue's reactivity (a plain `g`
// object) so per-frame mutation is cheap; only HUD values are reactive refs.
// Emits `gameover` { score, wave } so the host page can persist to the leaderboard.
import { useAuthStore } from '~/stores/auth'
import { useUserStore } from '~/stores/user'
import { track } from '~/utils/track'

const LW = 600 // logical width
const LH = 760 // logical height

// Small seedable PRNG (mulberry32). Driven by the server-issued seed so a run is
// deterministic — the groundwork for server-side replay validation later.
function mulberry32 (a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default {
  name: 'BeeInvaders',

  emits: ['gameover', 'saved'],

  setup () {
    const auth = useAuthStore()
    const userStore = useUserStore()
    return { auth, userStore }
  },

  data () {
    return {
      state: 'ready', // ready | playing | paused | over
      score: 0,
      wave: 1,
      lives: 3,
      breached: false,
      bestLocal: 0,
      submitState: 'idle', // idle | saving | saved | error
      submittedRank: null,
      sessionId: null,
      mode: 'free', // free | ranked (of the current/last run)
      entryState: 'idle', // idle | paying | error
      entryError: '',
      freeLeft: null,
      cfg: null, // arcade tokenomics config (fetched)
      continuesUsed: 0,
      continueState: 'idle' // idle | paying | error
    }
  },

  computed: {
    loggedIn () { return this.auth.loggedIn },
    rankedCostLabel () { return this.cfg ? `${this.cfg.entryFee} ${this.cfg.symbol}` : '' },
    canContinue () {
      return this.loggedIn && this.cfg && this.continuesUsed < (this.cfg.maxContinues || 0)
    }
  },

  watch: {
    loggedIn () { this.fetchEntries() }
  },

  mounted () {
    this.setupCanvas()
    this.bestLocal = Number(localStorage.getItem('bee-invaders-best') || 0)
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('resize', this.setupCanvas)
    this.drawIdle()
    $fetch('/api/v1/games/config').then((c) => { this.cfg = c }).catch(() => {})
    this.fetchEntries()
  },

  beforeUnmount () {
    cancelAnimationFrame(this._raf)
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('resize', this.setupCanvas)
  },

  methods: {
    setupCanvas () {
      const canvas = this.$refs.canvas
      if (!canvas) { return }
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = LW * dpr
      canvas.height = LH * dpr
      this.ctx = canvas.getContext('2d')
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (this.state !== 'playing') { this.drawIdle() }
    },

    newGame () {
      this.score = 0
      this.wave = 1
      this.lives = 3
      this.breached = false
      this.submitState = 'idle'
      this.submittedRank = null
      this.continuesUsed = 0
      this.continueState = 'idle'
      this.g = {
        player: { x: LW / 2, y: LH - 64, w: 44, h: 34, speed: 430, invuln: 0 },
        keys: { left: false, right: false, fire: false },
        pointer: { active: false, x: LW / 2 },
        bullets: [], // player pollen
        stingers: [], // enemy shots
        enemies: [],
        particles: [],
        fireCd: 0,
        enemyDir: 1,
        enemyStepDown: 0,
        last: 0,
        shake: 0,
        rng: null // set when the server seed arrives
      }
      this.spawnWave()
    },

    // gameplay RNG — seeded once the server session is open, else Math.random
    rand () {
      return this.g && this.g.rng ? this.g.rng() : Math.random()
    },

    // Open a server run for `mode`. Sets sessionId + seeds the RNG and returns the
    // server response (which for ranked may carry payment instructions).
    async openSession (mode) {
      this.sessionId = null
      if (!this.loggedIn) { return null }
      const res = await $fetch('/api/v1/games/session', { method: 'POST', body: { game: 'bee-invaders', mode } })
      this.sessionId = res && res.sessionId ? res.sessionId : null
      if (res && typeof res.seed === 'number' && this.g) { this.g.rng = mulberry32(res.seed) }
      return res
    },

    spawnWave () {
      const g = this.g
      const cols = 8
      const rows = Math.min(3 + this.wave, 6)
      const gapX = 58
      const gapY = 50
      const startX = (LW - (cols - 1) * gapX) / 2
      const startY = 96
      // Bright, high-contrast pest colours by row (front row = most dangerous red).
      const palette = ['#ff5964', '#ff9f1c', '#ffd34d', '#8ef0a0', '#6fd6ff', '#c58bff']
      const enemies = []
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          enemies.push({
            x: startX + c * gapX,
            y: startY + r * gapY,
            w: 34,
            h: 30,
            row: r,
            alive: true,
            color: palette[r % palette.length],
            wob: Math.random() * Math.PI * 2
          })
        }
      }
      g.enemies = enemies
      g.enemySpeed = 26 + this.wave * 7
      g.fireRate = Math.min(0.9 + this.wave * 0.35, 4) // enemy shots per second (whole grid)
      g.enemyDir = 1
    },

    backToMenu () {
      this.state = 'ready'
      this.entryState = 'idle'
      this.entryError = ''
      this.drawIdle()
      this.fetchEntries()
    },

    // Remaining free ranked entries for today (read-only; doesn't consume one).
    async fetchEntries () {
      if (!this.loggedIn) { this.freeLeft = null; return }
      try {
        const r = await $fetch('/api/v1/games/entries', { params: { game: 'bee-invaders' } })
        this.freeLeft = (r && typeof r.freeLeft === 'number') ? r.freeLeft : null
      } catch { /* leave prior value */ }
    },

    // Begin actual gameplay (assumes newGame() already ran and a session is opening).
    beginRun () {
      this.entryState = 'idle'
      this.state = 'playing'
      this.g.last = performance.now()
      this._raf = requestAnimationFrame(this.loop)
    },

    // Free / casual play. Anonymous users play with a local-only best (no session).
    startFree () {
      this.mode = 'free'
      this.newGame()
      this.openSession('free').catch(() => { this.sessionId = null })
      track('arcade-play', { game: 'bee-invaders', mode: 'free' })
      this.beginRun()
    },

    // Ranked play. Spends a free daily entry if available, otherwise requires a
    // 0.1 BBHO entry transfer (signed in the user's wallet) before the run starts.
    async startRanked () {
      if (!this.loggedIn) { return }
      this.mode = 'ranked'
      this.entryError = ''
      this.newGame()
      try {
        const res = await this.openSession('ranked')
        if (!res) { throw new Error('Could not open a ranked run.') }

        track('arcade-play', { game: 'bee-invaders', mode: 'ranked', paid: res.requiresPayment ? 1 : 0 })
        if (res.requiresPayment) {
          this.freeLeft = 0
          this.entryState = 'paying'
          await this.broadcastEntry(res.potAccount, res.memo, res.fee)
          // Payment sent; confirm on-chain in the background while the run plays.
          this.pollConfirm()
        } else if (typeof res.freeLeft === 'number') {
          this.freeLeft = res.freeLeft
        }
        this.beginRun()
      } catch (e) {
        this.entryState = 'error'
        this.entryError = e && e.message ? e.message : 'Entry failed.'
        this.state = 'ready'
      }
    },

    // Broadcast the ranked entry transfer and resolve when the wallet confirms it.
    broadcastEntry (potAccount, memo, fee) {
      return new Promise((resolve, reject) => {
        const cleanup = () => {
          this.$eventBus.$off('tokens-transfer-successful', ok)
          this.$eventBus.$off('transaction-broadcast-error', err)
        }
        const ok = () => { cleanup(); resolve() }
        const err = (e) => { cleanup(); reject(new Error((e && e.error) || 'Payment was cancelled.')) }
        this.$eventBus.$on('tokens-transfer-successful', ok)
        this.$eventBus.$on('transaction-broadcast-error', err)
        this.userStore.requestTokenAction({ action: 'transfer', amount: fee, to: potAccount, memo })
      })
    },

    // Poll the server until it sees the entry payment on-chain (best-effort).
    async pollConfirm () {
      for (let i = 0; i < 8; i++) {
        try {
          const r = await $fetch('/api/v1/games/session-confirm', { method: 'POST', body: { sessionId: this.sessionId } })
          if (r && r.paid) { return }
        } catch { /* keep trying */ }
        await new Promise(r => setTimeout(r, 3000))
      }
    },

    resume () {
      if (this.state !== 'paused') { return }
      this.state = 'playing'
      this.g.last = performance.now()
      this._raf = requestAnimationFrame(this.loop)
    },

    pause () {
      if (this.state !== 'playing') { return }
      this.state = 'paused'
      cancelAnimationFrame(this._raf)
      this.draw()
    },

    endGame (breached) {
      cancelAnimationFrame(this._raf)
      this.breached = breached
      this.state = 'over'
      if (this.score > this.bestLocal) {
        this.bestLocal = this.score
        localStorage.setItem('bee-invaders-best', String(this.score))
      }
      this.$emit('gameover', { score: this.score, wave: this.wave })
      if (this.loggedIn && this.score > 0) { this.submitScore() }
    },

    async submitScore () {
      if (!this.loggedIn) { return }
      if (!this.sessionId) { this.submitState = 'error'; return } // no verified run to submit
      this.submitState = 'saving'
      const body = { game: 'bee-invaders', score: this.score, wave: this.wave, sessionId: this.sessionId }

      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const res = await $fetch('/api/v1/games/scores', { method: 'POST', body })
          this.submittedRank = res && res.rank ? res.rank : null
          this.submitState = 'saved'
          if (res && res.scores) { this.$emit('saved', res.scores) }
          return
        } catch (e) {
          const code = (e && (e.statusCode || (e.response && e.response.status))) || 0
          // 402 = ranked entry not yet indexed on-chain → wait and retry a few times
          if (code === 402 && attempt < 4) {
            await new Promise(r => setTimeout(r, 4000))
            continue
          }
          this.submitState = 'error'
          return
        }
      }
    },

    // ---- input ----
    onKeyDown (e) {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) { e.preventDefault() }
      if (this.state === 'ready' || this.state === 'over') {
        if (e.key === ' ' || e.key === 'Enter') { this.startFree() }
        return
      }
      const k = this.g?.keys
      if (!k) { return }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { k.left = true }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { k.right = true }
      if (e.key === ' ') { k.fire = true }
      if (e.key === 'p' || e.key === 'P') { this.state === 'paused' ? this.resume() : this.pause() }
    },

    onKeyUp (e) {
      const k = this.g?.keys
      if (!k) { return }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { k.left = false }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { k.right = false }
      if (e.key === ' ') { k.fire = false }
    },

    pointerX (e) {
      const rect = this.$refs.canvas.getBoundingClientRect()
      return (e.clientX - rect.left) / rect.width * LW
    },

    onPointerDown (e) {
      if (this.state === 'ready' || this.state === 'over') { return }
      if (!this.g) { return }
      this.g.pointer.active = true
      this.g.pointer.x = this.pointerX(e)
    },

    onPointerMove (e) {
      if (!this.g || !this.g.pointer.active) { return }
      this.g.pointer.x = this.pointerX(e)
    },

    onPointerUp () {
      if (this.g) { this.g.pointer.active = false }
    },

    // ---- loop ----
    loop (now) {
      if (this.state !== 'playing') { return }
      const g = this.g
      let dt = (now - g.last) / 1000
      g.last = now
      if (dt > 0.05) { dt = 0.05 } // clamp after tab-switch stalls
      this.update(dt)
      this.draw()
      this._raf = requestAnimationFrame(this.loop)
    },

    update (dt) {
      const g = this.g
      const p = g.player

      // player movement
      if (g.pointer.active) {
        const dx = g.pointer.x - p.x
        p.x += Math.max(-p.speed * dt * 1.6, Math.min(p.speed * dt * 1.6, dx))
      }
      if (g.keys.left) { p.x -= p.speed * dt }
      if (g.keys.right) { p.x += p.speed * dt }
      p.x = Math.max(p.w / 2, Math.min(LW - p.w / 2, p.x))
      if (p.invuln > 0) { p.invuln -= dt }

      // auto-fire
      g.fireCd -= dt
      if (g.fireCd <= 0) {
        g.bullets.push({ x: p.x, y: p.y - p.h / 2, vy: -560, r: 4 })
        g.fireCd = 0.32
      }

      // player bullets
      for (const b of g.bullets) { b.y += b.vy * dt }
      g.bullets = g.bullets.filter(b => b.y > -10)

      // enemy movement (whole formation)
      let minX = Infinity
      let maxX = -Infinity
      let lowest = 0
      let aliveCount = 0
      for (const e of g.enemies) {
        if (!e.alive) { continue }
        aliveCount++
        minX = Math.min(minX, e.x - e.w / 2)
        maxX = Math.max(maxX, e.x + e.w / 2)
        lowest = Math.max(lowest, e.y + e.h / 2)
      }

      if (aliveCount === 0) {
        // wave cleared
        this.score += 100 * this.wave
        this.wave++
        this.spawnWave()
        return
      }

      // speed scales up as the swarm thins (classic invaders tension)
      const speed = g.enemySpeed * (1 + (1 - aliveCount / g.enemies.length) * 1.6)
      const step = g.enemyDir * speed * dt
      let flip = false
      if (maxX + step > LW - 12 || minX + step < 12) { flip = true }

      if (flip) {
        g.enemyDir *= -1
        for (const e of g.enemies) { if (e.alive) { e.y += 22 } }
      } else {
        for (const e of g.enemies) { if (e.alive) { e.x += step; e.wob += dt * 6 } }
      }

      // enemies reached the hive line?
      if (lowest >= p.y - p.h / 2) { return this.endGame(true) }

      // enemy fire (seeded RNG so the run is reproducible for validation)
      if (this.rand() < g.fireRate * dt) {
        const shooters = g.enemies.filter(e => e.alive)
        const e = shooters[(this.rand() * shooters.length) | 0]
        if (e) { g.stingers.push({ x: e.x, y: e.y + e.h / 2, vy: 240 + this.wave * 8, r: 4 }) }
      }
      for (const s of g.stingers) { s.y += s.vy * dt }
      g.stingers = g.stingers.filter(s => s.y < LH + 10)

      // collisions: player bullets vs enemies
      for (const b of g.bullets) {
        for (const e of g.enemies) {
          if (!e.alive) { continue }
          if (Math.abs(b.x - e.x) < e.w / 2 && Math.abs(b.y - e.y) < e.h / 2) {
            e.alive = false
            b.y = -100
            this.score += 10 + (5 - e.row) * 5
            this.spawnBurst(e.x, e.y)
            break
          }
        }
      }
      g.bullets = g.bullets.filter(b => b.y > -10)

      // collisions: stingers vs player
      if (p.invuln <= 0) {
        for (const s of g.stingers) {
          if (Math.abs(s.x - p.x) < p.w / 2 && Math.abs(s.y - p.y) < p.h / 2) {
            s.y = LH + 100
            this.hitPlayer()
            break
          }
        }
        g.stingers = g.stingers.filter(s => s.y < LH + 10)
      }

      // particles
      for (const pt of g.particles) {
        pt.x += pt.vx * dt
        pt.y += pt.vy * dt
        pt.life -= dt
      }
      g.particles = g.particles.filter(pt => pt.life > 0)
      if (g.shake > 0) { g.shake -= dt }
    },

    hitPlayer () {
      const g = this.g
      this.spawnBurst(g.player.x, g.player.y, '#ff5964')
      g.shake = 0.35
      this.lives--
      if (this.lives <= 0) {
        if (this.canContinue) { return this.offerContinue() }
        return this.endGame(false)
      }
      g.player.invuln = 1.4
      g.stingers = []
    },

    // Out of lives but a continue is available: pause and offer a burn-to-revive.
    offerContinue () {
      cancelAnimationFrame(this._raf)
      this.continueState = 'idle'
      this.state = 'continue'
      this.draw()
    },

    // Burn continueFee BBHO (sent to @null) to revive with one life.
    async continueRun () {
      if (!this.canContinue) { return }
      this.continueState = 'paying'
      try {
        await new Promise((resolve, reject) => {
          const cleanup = () => {
            this.$eventBus.$off('tokens-transfer-successful', ok)
            this.$eventBus.$off('transaction-broadcast-error', err)
          }
          const ok = () => { cleanup(); resolve() }
          const err = (e) => { cleanup(); reject(new Error((e && e.error) || 'Payment cancelled.')) }
          this.$eventBus.$on('tokens-transfer-successful', ok)
          this.$eventBus.$on('transaction-broadcast-error', err)
          this.userStore.requestTokenAction({ action: 'transfer', amount: this.cfg.continueFee, to: 'null', memo: '🐝 Bee Invaders continue' })
        })
        this.continuesUsed++
        this.revive()
      } catch {
        this.continueState = 'error'
      }
    },

    revive () {
      const g = this.g
      this.lives = 1
      g.stingers = []
      g.player.invuln = 1.8
      this.continueState = 'idle'
      this.state = 'playing'
      g.last = performance.now()
      this._raf = requestAnimationFrame(this.loop)
    },

    endFromContinue () {
      this.endGame(false)
    },

    spawnBurst (x, y, color) {
      const g = this.g
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * Math.PI * 2
        const sp = 40 + Math.random() * 120
        g.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4 + Math.random() * 0.3, color: color || '#f5b800' })
      }
    },

    // ---- render ----
    drawIdle () {
      if (!this.ctx) { return }
      this.paintBackground()
      const ctx = this.ctx
      ctx.font = '90px serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.globalAlpha = 0.25
      ctx.fillText('🐝', LW / 2, LH / 2 - 40)
      ctx.globalAlpha = 1
    },

    paintBackground () {
      const ctx = this.ctx
      const grd = ctx.createLinearGradient(0, 0, 0, LH)
      grd.addColorStop(0, '#0b0b12')
      grd.addColorStop(1, '#15100a')
      ctx.fillStyle = grd
      ctx.fillRect(0, 0, LW, LH)
      // subtle honeycomb dots
      ctx.fillStyle = 'rgba(245,184,0,0.05)'
      for (let y = 40; y < LH; y += 60) {
        for (let x = (y / 60 % 2 ? 40 : 10); x < LW; x += 60) {
          ctx.beginPath()
          ctx.arc(x, y, 3, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    },

    drawPest (e) {
      const ctx = this.ctx
      const flap = Math.sin(e.wob) * 0.35
      ctx.save()
      ctx.translate(e.x, e.y + Math.sin(e.wob) * 2)

      // wings (flapping)
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.beginPath(); ctx.ellipse(-8, -5, 8, 4.5, -0.6 + flap, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(8, -5, 8, 4.5, 0.6 - flap, 0, Math.PI * 2); ctx.fill()

      // glowing body
      ctx.shadowColor = e.color
      ctx.shadowBlur = 10
      ctx.fillStyle = e.color
      ctx.strokeStyle = 'rgba(0,0,0,0.65)'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.ellipse(0, 0, 13, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.shadowBlur = 0

      // black stripes (clipped to the body)
      ctx.save()
      ctx.beginPath(); ctx.ellipse(0, 0, 13, 10, 0, 0, Math.PI * 2); ctx.clip()
      ctx.fillStyle = 'rgba(0,0,0,0.72)'
      ctx.fillRect(-2, -12, 3.4, 24)
      ctx.fillRect(-9, -12, 3.4, 24)
      ctx.fillRect(5, -12, 3.4, 24)
      ctx.restore()

      // eyes
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(-4.5, -2, 2.4, 0, Math.PI * 2); ctx.arc(4.5, -2, 2.4, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#000'
      ctx.beginPath(); ctx.arc(-4.5, -2, 1.2, 0, Math.PI * 2); ctx.arc(4.5, -2, 1.2, 0, Math.PI * 2); ctx.fill()

      ctx.restore()
    },

    draw () {
      const ctx = this.ctx
      if (!ctx) { return }
      const g = this.g

      ctx.save()
      if (g.shake > 0) { ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8) }

      this.paintBackground()

      // hive floor line
      ctx.strokeStyle = 'rgba(245,184,0,0.25)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, g.player.y + g.player.h / 2 + 6)
      ctx.lineTo(LW, g.player.y + g.player.h / 2 + 6)
      ctx.stroke()

      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // enemies (drawn as bright striped pests — dark emoji were invisible on the
      // dark background, so we render high-contrast shapes with a glow instead)
      for (const e of g.enemies) {
        if (!e.alive) { continue }
        this.drawPest(e)
      }

      // player pollen
      ctx.fillStyle = '#ffd34d'
      for (const b of g.bullets) {
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fill()
      }

      // enemy stingers
      ctx.fillStyle = '#ff5964'
      for (const s of g.stingers) {
        ctx.fillRect(s.x - 2, s.y - 7, 4, 12)
      }

      // particles
      for (const pt of g.particles) {
        ctx.globalAlpha = Math.max(0, pt.life * 2)
        ctx.fillStyle = pt.color
        ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4)
      }
      ctx.globalAlpha = 1

      // player (blink while invulnerable)
      if (!(g.player.invuln > 0 && (Math.floor(performance.now() / 100) % 2))) {
        ctx.font = '34px serif'
        ctx.fillText('🐝', g.player.x, g.player.y)
      }

      ctx.restore()
    }
  }
}
</script>

<style scoped>
.bee-invaders { display: flex; justify-content: center; }
.bi-stage {
  position: relative;
  width: 100%;
  max-width: 480px;
  aspect-ratio: 600 / 760;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--w3-border);
  box-shadow: 0 10px 40px rgba(0, 0, 0, .35);
  background: #0b0b12;
  user-select: none;
  touch-action: none;
}
.bi-canvas { width: 100%; height: 100%; display: block; }

/* On phones the portrait stage would fill the whole screen and push the
   leaderboard out of sight — cap its height so the rankings peek below it. */
@media (max-width: 991px) {
  .bi-stage { max-height: 66vh; }
}

.bi-hud {
  position: absolute;
  top: 0; left: 0; right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: .5rem .8rem;
  pointer-events: none;
}
.bi-hud-l { display: flex; flex-direction: column; }
.bi-score { font-size: 1.3rem; font-weight: 800; color: var(--w3-gold, #f5b800); line-height: 1; text-shadow: 0 1px 4px rgba(0,0,0,.6); }
.bi-wave { font-size: .72rem; color: #d8d8de; text-shadow: 0 1px 3px rgba(0,0,0,.7); }
.bi-lives { font-size: 1rem; letter-spacing: .1rem; }

.bi-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: .6rem;
  text-align: center;
  padding: 1.2rem;
  background: rgba(8, 8, 14, .72);
  backdrop-filter: blur(2px);
  color: #f4f4f5;
}
.bi-title { font-size: 2rem; font-weight: 800; color: var(--w3-gold, #f5b800); }
.bi-title.small { font-size: 1.5rem; }
.bi-sub { margin: 0; color: #cfcfd6; font-size: .95rem; }
.bi-hint { margin: .3rem 0 0; font-size: .74rem; color: #9a9aa4; }
.bi-hint kbd { background: #2a2a34; border-radius: 4px; padding: 0 .3rem; }
.bi-free { color: var(--w3-gold, #f5b800); font-weight: 700; }
.bi-best, .bi-final { margin: 0; color: #d8d8de; font-size: .9rem; }
.bi-new { margin: 0; color: #2ecc71; font-weight: 700; }
.bi-save { font-size: .82rem; margin: 0; }
.bi-save.ok { color: #2ecc71; }
.bi-save.err { color: #ff8a8a; }
.bi-save.muted, .muted { color: #9a9aa4; }

.bi-btn {
  margin-top: .3rem;
  border: none;
  border-radius: 999px;
  font-weight: 800;
  padding: .6rem 1.8rem;
  font-size: 1.05rem;
  cursor: pointer;
  background: linear-gradient(135deg, var(--w3-gold, #f5b800), #ffd34d);
  color: #1a1206;
  box-shadow: 0 4px 18px rgba(245, 184, 0, .35);
  transition: transform .12s ease;
}
.bi-btn:hover { transform: translateY(-1px); }
.bi-btn.ghost {
  background: transparent;
  color: var(--w3-gold, #f5b800);
  border: 1px solid rgba(245, 184, 0, .6);
  box-shadow: none;
}
.bi-btn.ghost:hover { background: rgba(245, 184, 0, .12); }
.mono { font-family: 'JetBrains Mono', monospace; }
</style>
