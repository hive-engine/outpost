import express from 'express';
import mongoose from 'mongoose';
import moment from 'moment';

const router = express.Router();
const Schema = mongoose.Schema;
const connection_string = process.env.MONGO_URL;

const connectToDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');
  } catch (error) {
  console.error('Error connecting to the database:', error);
  process.exit(1);
}
};

connectToDatabase();

const blogSchema = new Schema({
  parent_permlink: String,
  permlink: String,
  title: String,
  body: String,
  json_metadata: String,
  parent_author: String,
  date: String,
  time: String,
});

const BlogModel = mongoose.model('comment', blogSchema);

router.get('/fetchBlogsFromMongo', async (req, res) => {
  try {
    const blogs = await BlogModel.find();
    res.json(blogs);
  } catch (error) {
    console.error('Error fetching data from MongoDB:', error);
    res.status(500).json({ error: 'Failed fetching data from MongoDB: Internal Server Error' });
  }
});

router.post('/insertBlog', async (req, res) => {
  const {
      time, 
      body, 
      parent_permlink, 
      permlink, 
      title,
      json_metadata,
      parent_author
  } = req.body;
  
  const date = moment(req.body.date).format('MMM DD, YYYY');

  const newBlog = new BlogModel({
    date, 
    time, 
    parent_permlink, 
    permlink, 
    title, 
    body,
    json_metadata,
    parent_author
  });

  try {
    await newBlog.save();
    res.status(200).json({ message: 'Blog post inserted successfully' });
  } catch (err) {
     console.error(err);
     res.status(500).json({ message: 'Failed to insert blog post' });
  }
});

router.delete('/deleteBlogsFromMongo/:id', async (req, res) => {
  try {
  const blog = await BlogModel.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }
      await blog.deleteOne();
    res.json({ message: 'Blog deleted!' });
    } catch (error) {
    res.status(500).json({ error: 'Failed to delete blog' });
  }
});

module.exports = router;
