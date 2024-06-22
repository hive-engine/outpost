import { Client, PrivateKey } from '@hiveio/dhive';
import cron from 'node-cron';
import fetchMongoNative from './fetchMongoNative';
import axios from 'axios'

const key = process.env.HIVE_KEY;
const author = process.env.AUTHOR;

if (!process.env.HIVE_NODE || !key || !author) {
  throw new Error('Missing environment variables');
}

const client = new Client(process.env.HIVE_NODE);

const broadcastMultiplePosts = async (payload, dateTimeString, _id) => {

  cron.schedule(dateTimeString, async () => {
    console.log('\n\n *** Running cron job...');
    try {
      const privateKey = PrivateKey.fromString(key);

      const result = await client.broadcast.sendOperations(payload, privateKey);
      console.log('\n\n *** Successfully persisted onto blockchain! \n Blog id: ', result);
      const response = await axios.delete(`${process.env.DELETE}/${_id}`)
      console.log('\n\n *** Successfully deleted from schedule post! \n Post id: ', _id);
    } catch (error) {
      console.error('\n\n *** Error: ', error);
    }
  });
};

const processMongoData = async (resolve) => {
  try {

    for (const obj of resolve) {
      const { date, time, _id, __v, ...other } = obj;
      other.parent_permlink = 'parent';

      const payload = [['comment', { author, ...other, json_metadata: "{\"tags\":[\"honouree\"]}" }]];
      const [_, month, day] = new Date(date).toString().split(' ');
      const [hours, minutes] = time.split(':');
      const dateTimeString = `${minutes} ${hours} ${day} ${month} *`;

      await broadcastMultiplePosts(payload, dateTimeString, _id);
    }

  } catch (error) {
    console.error('Error parsing JSON:', error);
  }
};

const worker = async () => {

  cron.schedule('* * * * *', async () => {
    console.log('Worker Running')

    fetchMongoNative()
      .then(processMongoData)
      .catch((error) => {
        console.error(`Error fetching with native Mongo: ${error}`);
      });
  });

}

worker().catch((error) => {
  console.error(`Worker Failed: ${error}`);
});



