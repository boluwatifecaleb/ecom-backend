import crypto from 'crypto';

export const verifyWebhookSignature = (req, res, next) => {
  const signature = req.get('x-paystack-signature');
  const isBuffer = Buffer.isBuffer(req.body);

  if (!signature || !isBuffer) {
    return res.status(401).json({
      message: 'Invalid signature',
      debug: { signaturePresent: !!signature, bodyIsBuffer: isBuffer },
    });
  }

    const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(req.body)
    .digest('hex');

  // Both variables 'hash' and 'signature' are hex strings. 
  // Let's create buffers explicitly declaring they are 'hex' format:
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(signature, 'hex');

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({
      message: 'Invalid signature',
      debug: { serverHashLength: a.length, receivedLength: b.length },
    });
  }
  next();
};