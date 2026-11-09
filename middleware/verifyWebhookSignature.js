import crypto from 'crypto';

export const verifyWebhookSignature = (req, res, next) => {
  const signature = req.get('x-paystack-signature');
  if (!signature || !Buffer.isBuffer(req.body)) {
    return res.status(401).json({ message: 'Invalid signature' });
  }

  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(req.body)
    .digest('hex');

  const a = Buffer.from(hash);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ message: 'Invalid signature' });
  }
  next();
};