<template>
  <div class="login">
    <template>
      <div class="card mt-4">
        <div v-if="Object.keys(cronBlogs).length > 0" class="card-header">
          Schedules Booked
        </div>
        <div v-if="Object.keys(cronBlogs).length > 0" class="card-body">
          <div class="table-responsive text-center">
            <table class="table table-striped">
              <thead>
                <tr>
                  <th id="date_th">
                    Date
                  </th>
                  <th id="time_th">
                    Time
                  </th>
                  <th id="th_post">
                    Post
                  </th>
                  <th id="th_title">
                    Title
                  </th>
                  <th id="th_permlink">
                    Permalink
                  </th>
                  <th>Delete</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in cronBlogs" :key="item._id">
                  <td id="date_td">
                    {{ item.date }}
                  </td>
                  <td>{{ item.time }}</td>
                  <td>{{ item.body }}</td>
                  <td>{{ item.title }}</td>
                  <td>{{ item.permlink }}</td>
                  <td>
                    <button class="btn btn-danger" @click.prevent="deleteBlog(item._id)">
                      Delete
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import axios from 'axios'
import moment from 'moment'
import postIndex from '@/mixins/postIndex'

export default {
  mixins: [postIndex],

  data () {
    return {
      cronBlogs: {
        date: '',
        time: '',
        body: '',
        permlink: 'my-new-blog',
        parent_permlink: 'blockchain',
        title: '',
        parent_author: '',
        json_metadata: ''
      }
    }
  },
  mounted () {
    this.fetchData()
  },
  methods: {
    async fetchData () {
      try {
        const response = await axios.get(process.env.FETCH)
        const data = response.data
        this.cronBlogs = data.map(entry => ({
          ...entry,
          date: moment(entry.date).format('MMM DD, YYYY')
        }))
      } catch (error) {
        console.error('Failed to fetch data', error)
      }
    },

    async deleteBlog (id) {
      try {
        const response = await axios.delete(`${process.env.DELETE}/${id}`)
        await this.fetchData()
      } catch (error) {
        console.error('Failed to delete', error.response.data.error)
      }
    }

  }
}
</script>

  <style>
  th, td {
  text-align: center;
  }

  #th_post {
  width: 25%;
  }
  #th_title {
  width: 25%;
  }
  #th_permlink {
  width: 35%;
  }

  #date_th {
  white-space: nowrap;
  }

  tbody tr td:nth-child(3) {
  padding-bottom: 20px;
  }

  tbody tr td:nth-child(4) {
  padding-top: 20px;
  }

  .table {
  text-align: center;
  }
  </style>
