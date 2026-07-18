<template>
  <time :datetime="iso" :title="title">{{ text }}</time>
</template>

<script setup>
// Drop-in replacement for vue-timeago (Vue 2 only). Same usage:
// <timeago :datetime="date" :title="..." :auto-update="60" />
import { formatDistanceToNowStrict } from 'date-fns'

const props = defineProps({
  datetime: { type: [Date, String, Number], required: true },
  autoUpdate: { type: [Number, Boolean], default: false },
  title: { type: String, default: undefined }
})

const toDate = () => (props.datetime instanceof Date ? props.datetime : new Date(props.datetime))

// Reference "now" is captured once on the server and reused on the client (useState),
// so the SSR and first client render produce identical relative strings — otherwise
// server-now vs client-now differ and Vue reports a hydration mismatch.
const now = useState('ssr-now', () => Date.now())

const text = ref('')
const iso = computed(() => toDate().toISOString())

const refresh = (ref = now.value) => {
  text.value = formatDistanceToNowStrict(toDate(), { addSuffix: true, roundingMethod: 'floor', now: ref })
}

refresh()

let timer = null

onMounted(() => {
  // switch to the real current time after hydration, then keep it fresh
  refresh(Date.now())

  if (props.autoUpdate) {
    const seconds = props.autoUpdate === true ? 60 : Number(props.autoUpdate)
    timer = setInterval(() => refresh(Date.now()), seconds * 1000)
  }
})

onUnmounted(() => {
  if (timer) { clearInterval(timer) }
})

watch(() => props.datetime, refresh)
</script>
