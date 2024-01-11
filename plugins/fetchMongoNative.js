import { MongoClient } from 'mongodb';

const url = process.env.MONGO_URL;
const dbName = process.env.DB_NAME;
const collectionName = process.env.COLLECTION_NAME;

export default async function fetchMongoNative() {
  try {
    const client = new MongoClient(url);
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    const data = await collection.find().toArray();
    await client.close();
    return data;
  } catch (err) {
    console.error('Error fetching data from MongoDB:', err);
    throw err;
  }
}
