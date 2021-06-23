<template>
  <div class="loading-screen loading-animation text-center d-flex justify-content-center align-items-center flex-column">
    <b-spinner class="align-middle" type="border" />

    <p class="mt-3 mb-0">
      Loading...
    </p>
  </div>
</template>

<script>
export default {
  name: 'Loading'
}
</script>

<style lang="scss">
.loading-screen {
  height: calc(100vh - 350px);
}
</style>
