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

const text = ref('')
const iso = computed(() => toDate().toISOString())

const refresh = () => {
  text.value = formatDistanceToNowStrict(toDate(), { addSuffix: true })
}

refresh()

let timer = null

onMounted(() => {
  if (props.autoUpdate) {
    const seconds = props.autoUpdate === true ? 60 : Number(props.autoUpdate)
    timer = setInterval(refresh, seconds * 1000)
  }
})

onUnmounted(() => {
  if (timer) { clearInterval(timer) }
})

watch(() => props.datetime, refresh)
</script>
