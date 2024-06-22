<template>
  <div class="login">
    <b-modal id="cronpostModal" title="Cron Post" hide-footer centered>
      <template>
        <div>
            <div class="form-group">
              <label for="date">Date</label>
              <input type="date" class="form-control" id="date" v-model="cronBlogs.date">
            </div>
            <div class="form-group">
              <label for="time">Time</label>
              <input type="time" class="form-control" id="time" v-model="cronBlogs.time">
            </div>
            <div class="form-group">
              <label for="post">Post</label>
              <textarea class="form-control" id="post" rows="3" v-model="cronBlogs.post"></textarea>
            </div>
            <button class="btn btn-primary" @click.prevent="submitBlog">Enter and Publish Date time</button>
        </div>
        <div class="card mt-4">
  <div v-if="Object.keys(cronBlogs).length > 0" class="card-header">
    Existing Items
  </div>
  <div v-if='Object.keys(cronBlogs).length>0' class="card-body">
    <table class="table table-striped">
      <thead>
        <tr>
          <th>Date</th>
          <th>Time</th>
          <th>Post</th>
          <th>Delete</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in cronBlogs" :key="item._id">
          <td>{{ item.date }}</td>
          <td>{{ item.time }}</td>
          <td>{{ item.post }}</td>
          <td>
            <button @click.prevent ="deleteBlog(item._id)" class="btn btn-danger">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
      </template>
    </b-modal>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'CronPostModal',
  data () {
    return {
      cronBlogs: {
        date: '',
        time: '',
        post: ''
      }
    }
  },
  mounted() {
    this.fetchData();
  },
  methods: {
    async fetchData() {
      try {
        const response = await axios.get('http://13.212.183.88/api/v1/cronblogs/fetchBlogsFromMongo');
        const data = response.data;
        console.log('mongo data = ',data);
        this.cronBlogs = data;
      } catch (error) {
        console.error(error);
      }
    },

    async submitBlog() {
      try {
        const response = await axios.post('http://13.212.183.88/api/v1/cronblogs/insertBlog', {
          date: this.cronBlogs.date,
          time: this.cronBlogs.time,
          post: this.cronBlogs.post
        });
        this.cronBlogs = { date: '', time: '', post: '' };
        this.fetchData();
      } catch (error) {
        console.error(error);
      }
    },

    async deleteBlog(id) {
      try {
        const path = `http://13.212.183.88/api/v1/cronblogs/deleteBlogsFromMongo/${id}`
        const response = await axios.delete(path)
        this.fetchData();
      } catch ( error ) {
        console.error('Failed to delete',error.response.data.error);
      }
    },
  },
}
</script>
