import { Client, PrivateKey } from '@hiveio/dhive';
import cron from 'node-cron';
import fetchMongoNative from './fetchMongoNative';

const key = process.env.HIVE_KEY;
const author = process.env.AUTHOR;

if (!process.env.HIVE_NODE || !key || !author) {
  throw new Error('Missing environment variables');
}

const client = new Client(process.env.HIVE_NODE);

const broadcastMultiplePosts = async (payloadArray, dateTimeArray) => {
  if (dateTimeArray.length === 0) {
    console.log('All blogs posted');
    return;
  }

  const dateTimeStringChild = dateTimeArray.shift();
  const payloadChild = payloadArray.shift();

  cron.schedule(dateTimeStringChild, async () => {
    console.log('\n\n *** Running cron job...');
    try {
      const privateKey = PrivateKey.fromString(key);

      const result = await client.broadcast.sendOperations(payloadChild, privateKey);
      console.log('\n\n *** Successfully persisted onto blockchain! \n Blog id: ', result);
      await broadcastMultiplePosts(payloadArray, dateTimeArray);
    } catch (error) {
      console.error('\n\n *** Error: ', error);
    }
  });
};

const processMongoData = async (resolve) => {
  try {
    const payloadArray = [];
    const dateTimeArray = [];

    for (const obj of resolve) {
      const { date, time, _id, __v, ...other } = obj;
      other.parent_permlink = 'parent';

      const payload = [['comment', { author, ...other, json_metadata: '' }]];
      console.log('\n\n *** Payload = ', payload);
      payloadArray.push(payload);

      const [_, month, day] = new Date(date).toString().split(' ');
      const [hours, minutes] = time.split(':');
      const dateTimeString = `${minutes} ${hours} ${day} ${month} *`;
      console.log('\n\n *** dateTimeString = ', dateTimeString);
      dateTimeArray.push(dateTimeString);
    }

    await broadcastMultiplePosts(payloadArray, dateTimeArray);
  } catch (error) {
    console.error('Error parsing JSON:', error);
  }
};

fetchMongoNative()
  .then(processMongoData)
  .catch((error) => {
    console.error(`Error fetching with native Mongo: ${error}`);
  });
