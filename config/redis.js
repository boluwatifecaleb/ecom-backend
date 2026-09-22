import 'dotenv/config';
// import dotenv/config is used to read the .env file and  copies
// its values into process.env, so that they can be accessed in the code.
import { Redis } from '@upstash/redis'
import RedisIO from 'ioredis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

export const invalidateProductCache = async () => {
    const keys = await redis.keys('products:*');
    if (keys.length > 0) {
        await redis.del(...keys);
    console.log(`Cache invalidated: cleared ${keys.length} key(s)`);
  }
};

export const bullConnection = new RedisIO(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export default redis;