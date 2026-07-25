<template>
  <div class="users">
    <h3 class="h4">
      Users
    </h3><hr>

    <b-row>
      <b-col cols="6" sm="5" md="4" lg="3" align-self="center">
        <span class="font-weight-bold">Total: {{ totalRows }}</span>
      </b-col>

      <b-col
        offset-sm="2"
        offset-md="4"
        offset-lg="6"
        cols="6"
        sm="5"
        md="4"
        lg="3"
      >
        <b-form-group label="Filters">
          <b-form-select v-model="filter" :options="filterOptions" />
        </b-form-group>
      </b-col>
    </b-row>

    <b-table
      striped
      responsive
      show-empty
      :items="itemsProvider"
      :fields="fields"
      :per-page="perPage"
      :current-page="currentPage"
      sort-by="created_at"
      :sort-desc="true"
      :filter="filter"
    >
      <template #cell(avatar)="{item}">
        <b-avatar variant="dark" :src="`${$config.IMAGES_CDN}u/${item.username}/avatar`" size="50px" class="border" />
      </template>

      <template #cell(username)="{item}">
        <div v-if="item.full_name && item.full_name.length >0">
          {{ item.full_name }}
        </div>

        <nuxt-link :to="{name: 'user-gallery', params: {user: item.username}}" target="_blank">
          @{{ item.username }}
        </nuxt-link>
      </template>

      <template #cell(social_profiles)="{item}">
        <ul class="list-unstyled m-0">
          <li v-if="item.website">
            <a target="_blank" :href="`${item.website}`">{{ item.website }}</a>
          </li>
          <li v-if="item.portfolio">
            <a target="_blank" :href="`${item.portfolio}`">{{ item.portfolio }}</a>
          </li>
          <li v-if="item.instagram">
            <a target="_blank" :href="`${item.instagram}`">{{ item.instagram }}</a>
          </li>
          <li v-if="item.twitter">
            <a target="_blank" :href="`${item.twitter}`">{{ item.twitter }}</a>
          </li>
          <li v-if="item.spotify">
            <a target="_blank" :href="`${item.spotify}`">{{ item.spotify }}</a>
          </li>
          <li v-if="item.soundcloud">
            <a target="_blank" :href="`${item.soundcloud}`">{{ item.soundcloud }}</a>
          </li>
        </ul>
      </template>

      <template #cell(whitelisted)="{item}">
        {{ item.whitelisted ? 'Yes': 'No' }}
      </template>

      <template #cell(banned)="{item}">
        {{ item.banned ? 'Yes': 'No' }}
      </template>

      <template #cell(created_at)="{item}">
        {{ new Date(item.created_at).toLocaleString() }}
      </template>
    </b-table>

    <b-pagination v-model="currentPage" class="mt-3" align="center" :total-rows="totalRows" :per-page="perPage" />
  </div>
</template>

<script>
export default {
  name: 'Users',

  data () {
    return {
      currentPage: 1,
      perPage: 30,
      totalRows: 30,
      filter: null,
      fields: [
        { key: 'avatar', label: '' },
        { key: 'username', label: 'Name' },
        { key: 'social_profiles', label: 'Socials' },
        { key: 'whitelisted', label: 'Verified' },
        { key: 'banned', label: 'Banned' },
        { key: 'created_at', label: 'Joined At', sortable: true }
      ],
      filterOptions: [
        { value: null, text: '--' },
        { value: { whitelisted: true }, text: 'Whitelisted' },
        { value: { whitelisted: false }, text: 'Not Whitelisted' },
        { value: { banned: true }, text: 'Banned' }
      ]
    }
  },

  methods: {
    async itemsProvider (ctx) {
      try {
        const { total, results } = await this.$nftm.$get('admin/users', {
          params: {
            page: ctx.currentPage,
            limit: ctx.perPage,
            sort_by: ctx.sortBy,
            descending: ctx.sortDesc,
            ...ctx.filter
          }
        })

        this.totalRows = total

        return results
      } catch (e) {
        console.log(e.message)
      }

      return []
    }
  }
}
</script>

<style>
</style>
