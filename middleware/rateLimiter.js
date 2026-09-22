import redis from '../config/redis.js';

const WINDOW_SECONDS = 60;   // time window: 1 minute
const MAX_REQUESTS = 20;     // max requests allowed per window

export const rateLimiter = async (req, res, next) => {
  try {
    const clientKey = `ratelimit:${req.ip}`;

    const currentCount = await redis.incr(clientKey);

    if (currentCount === 1) {
      // first request from this client in this window — start the clock
      await redis.expire(clientKey, WINDOW_SECONDS);
    }

    if (currentCount > MAX_REQUESTS) {
      return res.status(429).json({
        message: 'Too many requests, please try again later.',
      });
    }

    next();
  } catch (error) {
    // if Redis itself fails, don't block real traffic — just let it through
    console.error('Rate limiter error:', error.message);
    next();
  }
};