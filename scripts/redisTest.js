import redis from '../config/redis.js';

try {
  console.log('Redis says:', await redis.ping());
} catch (err) {
  console.error('Redis error:', err.message);
}
process.exit(0);