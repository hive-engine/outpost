<template>
  <div class="nuxt-error-page">
    <div class="container">
      <template v-if="error.statusCode === 404">
        <h1>Not Found</h1>

        <h4 class="text-muted mt-3 mb-5">
          <template v-if="error.message && error.message !== ''">
            {{ error.message }}
          </template>

          <template v-else>
            The page you are looking for might have been removed had its name changed or is temporarily unavailable.
          </template>
        </h4>
      </template>

      <template v-else>
        <h1>An error occurred</h1>

        <h4 class="text-muted mt-3 mb-5">
          {{ error.message }}
        </h4>
      </template>

      <nuxt-link to="/">
        Homepage
      </nuxt-link>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ErrorPage',

  props: { error: { type: Object, required: true } },

  head () {
    return {
      title: this.error.statusCode === 404 ? 'Not Found' : 'Error'
    }
  }
}
</script>

<style lang="scss">
.nuxt-error-page {
  display: flex;
  align-items: center;
  height: calc(100vh - 340px);
  text-align: center;

  h1 {
    text-transform: uppercase;
  }
}
</style>
