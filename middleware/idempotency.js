import crypto from 'crypto';
import redis from '../config/redis.js';

const PROCESSING_TTL = 60;        // seconds the "in progress" lock lives
const RESULT_TTL = 60 * 60 * 24;  // seconds a finished result is kept (24h)

export const idempotency = async (req, res, next) => {
  const key = req.get('Idempotency-Key');
  if (!key) {
    return res.status(400).json({ message: 'Idempotency-Key header is required' });
  }

  // scoped per user, so two users can never collide on the same key
  const redisKey = `idem:${req.user.id}:${key}`;

  // fingerprint of the request body, to catch a key reused for a different request
  const bodyHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(req.body || {}))
    .digest('hex');

  // try to claim the key atomically
  const claimed = await redis.set(
    redisKey,
    { status: 'processing', bodyHash },
    { nx: true, ex: PROCESSING_TTL }
  );

  if (!claimed) {
    // someone already used this key: decide what to do
    const existing = await redis.get(redisKey);

    if (!existing) {
      return res.status(409).json({ message: 'Please retry the request' });
    }
    if (existing.bodyHash !== bodyHash) {
      return res.status(422).json({ message: 'Idempotency-Key was already used with a different request' });
    }
    if (existing.status === 'processing') {
      return res.status(409).json({ message: 'A request with this key is still being processed' });
    }
    // finished before: replay the saved response
    return res.status(existing.statusCode).json(existing.body);
  }

  // we own the key: let the controller run, but capture what it sends back
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    const save =
      res.statusCode >= 200 && res.statusCode < 300
        ? redis.set(redisKey, { status: 'done', bodyHash, statusCode: res.statusCode, body }, { ex: RESULT_TTL })
        : redis.del(redisKey); // failures are not cached, so a retry runs again

    save
      .catch((err) => console.error('Idempotency save error:', err.message))
      .finally(() => originalJson(body));
    return res;
  };

  next();
};