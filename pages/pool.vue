<template>
  <div class="dieselpool">
    <div class="page-header pb-0">
      <b-container>
        <h2>Diesel Pool</h2>
      </b-container>

      <b-nav align="center" pills class="bg-light mt-3">
        <b-nav-item :active="$route.name === 'pool'" :to="{name:'pool'}">
          Swap
        </b-nav-item>

        <b-nav-item :active="$route.name === 'pool-pools'" :to="{name:'pool-pools'}">
          Pools
        </b-nav-item>

        <b-nav-item :active="$route.name === 'pool-create'" :to="{name:'pool-create'}">
          Create
        </b-nav-item>

        <b-nav-item :active="$route.name === 'pool-add'" :to="{name:'pool-add'}">
          Add Liquidity
        </b-nav-item>

        <b-nav-item v-if="$auth.loggedIn" :active="$route.name === 'pool-remove'" :to="{name:'pool-remove'}">
          Remove Liquidity
        </b-nav-item>
      </b-nav>
    </div>

    <b-container fluid="lg">
      <nuxt-child />
    </b-container>
  </div>
</template>

<script>
export default {
  name: 'DieselPool',

  head () {
    return {
      title: 'Diesel Pool'
    }
  }
}
</script>

<style>

</style>
